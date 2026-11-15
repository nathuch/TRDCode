<?php
// Prueba la importación del reporte por la API contra el servidor local.
// Uso, desde la raíz del proyecto y con el servidor encendido:
//   C:\xampp\php\php.exe -S 127.0.0.1:8000 scripts/servidor_dev.php
//   C:\xampp\php\php.exe scripts/probar_importacion.php [http://127.0.0.1:8000]
// Toma como reporte los expedientes de la carga activa (la del reporte de agosto) y los envía por la
// API en lotes de 500, como el navegador. Usa una cuenta temporal. Al terminar deja activa la carga
// que estaba y borra las cargas y la cuenta que creó. Para no tocar un historial real, no corre si ya
// hay cargas reemplazadas. No imprime correos, contraseñas ni títulos de expedientes.

if (PHP_SAPI !== 'cli') {
    exit("Este script solo se ejecuta desde la terminal.\n");
}
if (!extension_loaded('curl')) {
    exit("Falta la extensión curl de PHP.\n");
}

$base = rtrim($argv[1] ?? 'http://127.0.0.1:8000', '/') . '/api/';
$c = require __DIR__ . '/../api/lib/config.php';
$pdo = new PDO(
    "mysql:host={$c['db_host']};dbname={$c['db_name']};charset=utf8mb4",
    $c['db_user'],
    $c['db_pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
);
const CAMPOS = ['codigo', 'nombre', 'trd_version', 'codigo_dependencia', 'codigo_serie', 'codigo_subserie',
    'nombre_serie', 'nombre_subserie', 'fecha_creacion', 'anio', 'control_acceso'];
const LOTE = 500;

$total = 0;
$fallas = 0;
$cookie = null;
$csrf = null;

function comprobar(string $descripcion, bool $ok): void
{
    global $total, $fallas;
    $total++;
    if (!$ok) {
        $fallas++;
    }
    echo ($ok ? '  ok     ' : '  FALLA  ') . $descripcion . PHP_EOL;
}

/** Petición a la API. Con $sesion usa la cookie de la cuenta temporal; con $conCsrf, también el token. */
function pedir(string $metodo, string $servicio, $json = null, bool $sesion = true, bool $conCsrf = true): array
{
    global $base, $cookie, $csrf;
    $cabeceras = [];
    $ch = curl_init($base . $servicio);
    if ($json !== null) {
        $cabeceras[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($json));
    }
    if ($sesion && $cookie) {
        $cabeceras[] = 'Cookie: TRDCODE_SESION=' . $cookie;
    }
    if ($sesion && $conCsrf && $csrf) {
        $cabeceras[] = 'X-CSRF-Token: ' . $csrf;
    }
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $metodo,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => true,
        CURLOPT_HTTPHEADER => $cabeceras,
        CURLOPT_ENCODING => '',
        CURLOPT_TIMEOUT => 120,
    ]);
    $respuesta = curl_exec($ch);
    if ($respuesta === false) {
        throw new RuntimeException('No se pudo conectar con ' . $base . ' (' . curl_error($ch) . ').');
    }
    $tamano = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    if (preg_match_all('/^Set-Cookie:\s*TRDCODE_SESION=([^;]*)/mi', substr($respuesta, 0, $tamano), $m) && $sesion) {
        $cookie = end($m[1]);
    }
    $cuerpo = substr($respuesta, $tamano);
    return ['codigo' => curl_getinfo($ch, CURLINFO_RESPONSE_CODE), 'json' => json_decode($cuerpo, true), 'crudo' => $cuerpo];
}

/** Huella de lo que ve la consulta pública. */
function huellaConsulta(): string
{
    return hash('sha256', pedir('GET', 'datos.php', null, false)['crudo']);
}

function estadoCarga(int $id): ?string
{
    global $pdo;
    $consulta = $pdo->prepare('SELECT estado FROM cargas WHERE id = ?');
    $consulta->execute([$id]);
    return $consulta->fetchColumn() ?: null;
}

function expedientesDe(int $id): int
{
    global $pdo;
    $consulta = $pdo->prepare('SELECT COUNT(*) FROM expedientes WHERE carga_id = ?');
    $consulta->execute([$id]);
    return (int) $consulta->fetchColumn();
}

/** Conteos por versión, dependencia, serie y subserie de una carga. */
function conteos(int $id): array
{
    global $pdo;
    $consulta = $pdo->prepare(
        "SELECT CONCAT(trd_version, '|', codigo_dependencia, '|', codigo_serie, '|', codigo_subserie) AS clave, COUNT(*) AS n
         FROM expedientes WHERE carga_id = ? GROUP BY clave ORDER BY clave"
    );
    $consulta->execute([$id]);
    return $consulta->fetchAll(PDO::FETCH_KEY_PAIR);
}

function iniciar(int $total, string $fecha = '2026-08-10'): array
{
    return pedir('POST', 'importar_iniciar.php', ['fecha_reporte' => $fecha, 'archivo' => 'reporte-tolima-2026-08-10.xlsx', 'total_esperado' => $total]);
}

function lote(int $carga, array $expedientes): array
{
    return pedir('POST', 'importar_lote.php', ['carga_id' => $carga, 'expedientes' => $expedientes]);
}

// ---------- Estado inicial ----------
$reemplazadas = (int) $pdo->query("SELECT COUNT(*) FROM cargas WHERE estado = 'reemplazada'")->fetchColumn();
if ($reemplazadas > 0) {
    exit("Hay $reemplazadas cargas anteriores guardadas. Esta prueba solo corre con una sola carga (la activa),\n"
        . "para que su limpieza nunca borre un historial real.\n");
}
$original = (int) $pdo->query("SELECT id FROM cargas WHERE estado = 'activa' ORDER BY id DESC LIMIT 1")->fetchColumn();
if ($original === 0) {
    exit("No hay una carga activa: importe primero datos-prueba/expedientes.sql.\n");
}
$consulta = $pdo->prepare('SELECT ' . implode(', ', CAMPOS) . ' FROM expedientes WHERE carga_id = ? ORDER BY id');
$consulta->execute([$original]);
$fuente = [];
foreach ($consulta->fetchAll() as $i => $e) {
    $e['anio'] = (int) $e['anio'];
    $e['_fila'] = $i + 2;
    $fuente[] = $e;
}
$conteosOriginal = conteos($original);
$huella0 = huellaConsulta();

$sufijo = bin2hex(random_bytes(6));
$correo = "prueba-importacion-$sufijo@trdcode.local";
$clave = bin2hex(random_bytes(12));
$pdo->prepare('INSERT INTO usuarios (correo, nombre, clave_hash, activo) VALUES (?, ?, ?, 1)')
    ->execute([$correo, 'Cuenta de prueba temporal', password_hash($clave, PASSWORD_DEFAULT)]);
$usuarioId = (int) $pdo->lastInsertId();
echo 'Cuenta temporal creada. Fuente: ' . count($fuente) . " expedientes de la carga activa. Servidor: $base\n";

try {
    echo "\nSin sesión (401), sin token (403) y métodos (405)\n";
    $cuerpos = ['importar_iniciar.php' => ['fecha_reporte' => '2026-08-10', 'total_esperado' => 1],
        'importar_lote.php' => ['carga_id' => 1, 'expedientes' => []],
        'importar_finalizar.php' => ['carga_id' => 1],
        'restaurar_carga.php' => ['carga_id' => $original]];
    foreach ($cuerpos as $servicio => $cuerpo) {
        comprobar("$servicio sin sesión responde 401", pedir('POST', $servicio, $cuerpo, false)['codigo'] === 401);
    }
    comprobar('cargas.php sin sesión responde 401', pedir('GET', 'cargas.php', null, false)['codigo'] === 401);
    $r = pedir('POST', 'login.php', ['correo' => $correo, 'clave' => $clave]);
    $csrf = $r['json']['datos']['csrf'] ?? null;
    comprobar('la cuenta temporal inicia sesión', $r['codigo'] === 200 && $csrf !== null);
    foreach ($cuerpos as $servicio => $cuerpo) {
        comprobar("$servicio sin token CSRF responde 403", pedir('POST', $servicio, $cuerpo, true, false)['codigo'] === 403);
    }
    comprobar('GET importar_iniciar.php responde 405', pedir('GET', 'importar_iniciar.php')['codigo'] === 405);
    comprobar('POST cargas.php responde 405', pedir('POST', 'cargas.php', [])['codigo'] === 405);

    echo "\nIniciar\n";
    comprobar('sin fecha del reporte responde 400', iniciar(10, '')['codigo'] === 400);
    comprobar('con una fecha futura responde 400', iniciar(10, date('Y-m-d', strtotime('+2 days')))['codigo'] === 400);
    comprobar('con 0 expedientes responde 400', iniciar(0)['codigo'] === 400);

    echo "\nCarga en proceso vieja\n";
    $pdo->prepare(
        "INSERT INTO cargas (usuario_id, fecha_reporte, fecha_carga, archivo, total_esperado, total_expedientes, estado)
         VALUES (?, '2026-08-10', NOW() - INTERVAL 31 MINUTE, 'vieja.xlsx', 5, 1, 'en_proceso')"
    )->execute([$usuarioId]);
    $vieja = (int) $pdo->lastInsertId();
    $insertar = $pdo->prepare('INSERT INTO expedientes (carga_id, ' . implode(', ', CAMPOS) . ') VALUES (?' . str_repeat(', ?', count(CAMPOS)) . ')');
    $insertar->execute(array_merge([$vieja], array_map(fn($c) => $fuente[0][$c], CAMPOS)));
    $r = iniciar(count($fuente));
    $cortada = (int) ($r['json']['datos']['carga_id'] ?? 0);
    comprobar('al iniciar otra, la que lleva 31 minutos en proceso pasa a fallida', $r['codigo'] === 200 && estadoCarga($vieja) === 'fallida');
    comprobar('  y sus expedientes se borran', expedientesDe($vieja) === 0);

    echo "\nImportación cortada\n";
    for ($i = 0; $i < 2; $i++) {
        $r = lote($cortada, array_slice($fuente, $i * LOTE, LOTE));
        comprobar('lote ' . ($i + 1) . ' de 500 recibido', $r['codigo'] === 200 && ($r['json']['datos']['recibidos'] ?? 0) === ($i + 1) * LOTE);
    }
    comprobar('con la importación a medias, la consulta no cambia', huellaConsulta() === $huella0);
    $historial = pedir('GET', 'cargas.php')['json']['datos']['cargas'] ?? [];
    comprobar('el historial no muestra la carga en proceso', count($historial) === 1 && $historial[0]['id'] === $original);

    echo "\nLotes inválidos\n";
    $siguiente = array_slice($fuente, 2 * LOTE, 10);
    $casos = [
        'código de expediente inválido' => ['codigo' => 'ABC'],
        'dependencia de otro centro' => ['codigo_dependencia' => '1.7073'],
        'subserie de otra serie' => ['codigo_subserie' => '99.01'],
        'fecha inválida' => ['fecha_creacion' => '2026-02-31'],
        'año que no coincide' => ['anio' => 1999],
        'TRD 9' => ['trd_version' => '9'],
        'título de más de 300 caracteres' => ['nombre' => str_repeat('x', 301)],
    ];
    foreach ($casos as $caso => $cambio) {
        $malo = $siguiente;
        $malo[3] = array_merge($malo[3], $cambio);
        $r = lote($cortada, $malo);
        $error = $r['json']['errores'][0] ?? [];
        comprobar("$caso: 400, señala la fila y el código", $r['codigo'] === 400 && ($error['indice'] ?? null) === 3 && ($error['fila'] ?? null) === $malo[3]['_fila']);
    }
    comprobar('las respuestas de error no traen títulos', !str_contains($r['crudo'], '"nombre"'));
    comprobar('ningún lote inválido se guardó', expedientesDe($cortada) === 2 * LOTE);
    $repetido = $siguiente;
    $repetido[5] = $repetido[0];
    comprobar('un código repetido dentro del lote responde 400', lote($cortada, $repetido)['codigo'] === 400);
    comprobar('reenviar un lote ya recibido responde 409', lote($cortada, array_slice($fuente, 0, LOTE))['codigo'] === 409);
    comprobar('un lote de 501 responde 400', lote($cortada, array_slice($fuente, 2 * LOTE, 501))['codigo'] === 400);
    comprobar('un lote para una carga que no es de esta sesión responde 409', lote($original, $siguiente)['codigo'] === 409);
    comprobar('seguía con 1.000 expedientes', expedientesDe($cortada) === 2 * LOTE);
    $r = pedir('POST', 'importar_finalizar.php', ['carga_id' => $cortada]);
    comprobar('finalizar con 1.000 de 3.385 responde 400 y la carga pasa a fallida', $r['codigo'] === 400 && estadoCarga($cortada) === 'fallida' && expedientesDe($cortada) === 0);
    comprobar('la consulta sigue sin cambios', huellaConsulta() === $huella0);

    echo "\nImportación completa del reporte de agosto\n";
    $r = iniciar(count($fuente));
    $nueva = (int) ($r['json']['datos']['carga_id'] ?? 0);
    $lotesBien = 0;
    foreach (array_chunk($fuente, LOTE) as $parte) {
        $lotesBien += lote($nueva, $parte)['codigo'] === 200 ? 1 : 0;
    }
    comprobar("$lotesBien de 7 lotes recibidos", $lotesBien === 7);
    $r = pedir('POST', 'importar_finalizar.php', ['carga_id' => $nueva]);
    comprobar('finalizar activa la carga nueva con 3.385 expedientes', $r['codigo'] === 200 && ($r['json']['datos']['total_expedientes'] ?? 0) === 3385);
    comprobar('  borra las cargas fallidas', ($r['json']['datos']['cargas_borradas'] ?? 0) === 2 && estadoCarga($vieja) === null && estadoCarga($cortada) === null);
    comprobar('  y la anterior pasa a reemplazada', estadoCarga($original) === 'reemplazada');
    $datos = pedir('GET', 'datos.php', null, false)['json']['datos'] ?? [];
    $expedientes = $datos['expedientes'] ?? [];
    $reservados = array_filter($expedientes, fn($e) => $e['control_acceso'] !== 'IPU');
    comprobar('la consulta pública ve 3.385 expedientes de la carga nueva', count($expedientes) === 3385);
    comprobar('  y sigue sin nombres reservados', count($reservados) > 0 && count(array_filter($reservados, fn($e) => !str_starts_with($e['nombre'], 'Nombre reservado'))) === 0);
    $porCentro = $pdo->prepare(
        "SELECT SUBSTRING_INDEX(codigo_dependencia, '.', 2) AS centro, COUNT(*) FROM expedientes WHERE carga_id = ? GROUP BY centro"
    );
    $porCentro->execute([$nueva]);
    $centros = $porCentro->fetchAll(PDO::FETCH_KEY_PAIR);
    comprobar('1.781 / 1.084 / 520 por centro', (int) ($centros['73.9226'] ?? 0) === 1781 && (int) ($centros['73.9310'] ?? 0) === 1084 && (int) ($centros['73.9123'] ?? 0) === 520);
    $cuenta = fn($serie, $subserie = null) => array_sum(array_filter(
        conteos($nueva),
        fn($clave) => str_starts_with($clave, "11|73.9226.4|") && ($serie === null || explode('|', $clave)[2] === $serie)
            && ($subserie === null || explode('|', $clave)[3] === $subserie),
        ARRAY_FILTER_USE_KEY
    ));
    comprobar('TRD 11, Industria y Construcción, Formación Profesional: 643', $cuenta(null) === 643);
    comprobar('  serie 37: 308; 85.18: 39; 85.15: 17', $cuenta('37') === 308 && $cuenta('85', '85.18') === 39 && $cuenta('85', '85.15') === 17);
    comprobar('los conteos por serie y subserie son iguales a los de antes', conteos($nueva) === $conteosOriginal);
    comprobar('un lote después de finalizar responde 409', lote($nueva, $siguiente)['codigo'] === 409);

    echo "\nHistorial y volver a una carga\n";
    $historial = pedir('GET', 'cargas.php')['json']['datos']['cargas'] ?? [];
    comprobar('el historial muestra la activa y la anterior, con quién y cuántos', count($historial) === 2
        && $historial[0]['id'] === $nueva && $historial[0]['estado'] === 'activa' && $historial[0]['usuario'] === 'Cuenta de prueba temporal'
        && $historial[1]['id'] === $original && $historial[1]['total_expedientes'] === 3385);
    comprobar('volver a la carga activa responde 409', pedir('POST', 'restaurar_carga.php', ['carga_id' => $nueva])['codigo'] === 409);
    comprobar('volver a una carga que no existe responde 409', pedir('POST', 'restaurar_carga.php', ['carga_id' => 999999])['codigo'] === 409);
    $r = pedir('POST', 'restaurar_carga.php', ['carga_id' => $original]);
    comprobar('volver a la carga anterior funciona', $r['codigo'] === 200 && estadoCarga($original) === 'activa' && estadoCarga($nueva) === 'reemplazada');
    comprobar('  la respuesta identifica la carga por cuándo se cargó y quién', ($r['json']['datos']['usuario'] ?? '') !== '' && preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $r['json']['datos']['fecha_carga'] ?? '') === 1);
    $despues = pedir('GET', 'cargas.php')['json']['datos']['cargas'] ?? [];
    comprobar('el historial conserva el orden (por fecha de carga); solo cambia cuál está en uso', count($despues) === 2
        && $despues[0]['id'] === $nueva && $despues[0]['estado'] === 'reemplazada'
        && $despues[1]['id'] === $original && $despues[1]['estado'] === 'activa');
    comprobar('la consulta vuelve a ser exactamente la de antes', huellaConsulta() === $huella0);
} catch (Throwable $e) {
    $fallas++;
    echo "\nERROR: " . $e->getMessage() . PHP_EOL;
} finally {
    // Deja activa la carga que estaba y borra lo que creó la prueba (los expedientes se van con su carga).
    $pdo->prepare("UPDATE cargas SET estado = 'reemplazada' WHERE estado = 'activa' AND id <> ?")->execute([$original]);
    $pdo->prepare("UPDATE cargas SET estado = 'activa' WHERE id = ?")->execute([$original]);
    $pdo->prepare('DELETE FROM cargas WHERE usuario_id = ?')->execute([$usuarioId]);
    $pdo->prepare('DELETE FROM intentos_login WHERE correo = ?')->execute([$correo]);
    $pdo->prepare('DELETE FROM usuarios WHERE id = ?')->execute([$usuarioId]);
    $quedan = (int) $pdo->query('SELECT COUNT(*) FROM cargas')->fetchColumn();
    echo "\nCargas y cuenta temporales borradas; la carga original sigue activa ($quedan carga en total).\n";
    comprobar('la consulta quedó como estaba', huellaConsulta() === $huella0);
}

echo "\n" . ($fallas === 0 ? "Todo bien: $total comprobaciones." : "$fallas de $total comprobaciones fallaron.") . PHP_EOL;
exit($fallas === 0 ? 0 : 1);
