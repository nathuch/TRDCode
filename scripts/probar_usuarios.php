<?php
// Prueba las cuentas editables (RF-17) contra el servidor local: "Mi cuenta" y "Usuarios".
// Uso, desde la raíz del proyecto y con el servidor encendido:
//   C:\xampp\php\php.exe scripts/probar_usuarios.php [http://127.0.0.1:8000]
// Usa cuentas temporales (prueba-...@trdcode.local, con claves al azar) que crea y borra al terminar.
// El caso "la última cuenta activa" desactiva las demás cuentas, así que solo corre en la base temporal
// (trdcode_prueba, scripts/pruebas-navegador/base_temporal.php); en otra base se salta.
// No imprime correos, contraseñas ni hashes.

if (PHP_SAPI !== 'cli') {
    exit("Este script solo se ejecuta desde la terminal.\n");
}

$base = rtrim($argv[1] ?? 'http://127.0.0.1:8000', '/') . '/api/';
$c = require __DIR__ . '/../api/lib/config.php';
$pdo = new PDO(
    $c['db_dsn'],
    $c['db_user'],
    $c['db_pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
);
$total = 0;
$fallas = 0;
$sufijo = bin2hex(random_bytes(4));
$clave = fn() => bin2hex(random_bytes(10));
$correo = fn(string $quien) => "prueba-usuarios-$quien-$sufijo@trdcode.local";

function comprobar(string $descripcion, bool $ok): void
{
    global $total, $fallas;
    $total++;
    if (!$ok) {
        $fallas++;
    }
    echo ($ok ? '  ok     ' : '  FALLA  ') . $descripcion . PHP_EOL;
}

/** Petición con la sesión $s (cookie y token propios; se actualizan con la respuesta). */
function pedir(array &$s, string $metodo, string $servicio, $json = null, bool $conCsrf = true): array
{
    global $base;
    $cabeceras = [];
    $ch = curl_init($base . $servicio);
    if ($json !== null) {
        $cabeceras[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($json));
    }
    if (!empty($s['cookie'])) {
        $cabeceras[] = 'Cookie: TRDCODE_SESION=' . $s['cookie'];
    }
    if ($conCsrf && !empty($s['csrf'])) {
        $cabeceras[] = 'X-CSRF-Token: ' . $s['csrf'];
    }
    curl_setopt_array($ch, [CURLOPT_CUSTOMREQUEST => $metodo, CURLOPT_RETURNTRANSFER => true, CURLOPT_HEADER => true,
        CURLOPT_HTTPHEADER => $cabeceras, CURLOPT_ENCODING => '', CURLOPT_TIMEOUT => 60]);
    $respuesta = curl_exec($ch);
    if ($respuesta === false) {
        throw new RuntimeException('No se pudo conectar con ' . $base);
    }
    $tamano = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    if (preg_match_all('/^Set-Cookie:\s*TRDCODE_SESION=([^;]*)/mi', substr($respuesta, 0, $tamano), $m)) {
        $s['cookie'] = end($m[1]);
    }
    $j = json_decode(substr($respuesta, $tamano), true);
    if (isset($j['datos']['csrf'])) {
        $s['csrf'] = $j['datos']['csrf'];
    }
    return ['codigo' => curl_getinfo($ch, CURLINFO_RESPONSE_CODE), 'json' => $j, 'crudo' => substr($respuesta, $tamano)];
}

function entrar(string $correo, string $clave): array
{
    $s = ['cookie' => null, 'csrf' => null];
    $r = pedir($s, 'POST', 'login.php', ['correo' => $correo, 'clave' => $clave]);
    $s['respuesta'] = $r;
    return $s;
}

function haySesion(array $s): bool
{
    $copia = $s;
    return (pedir($copia, 'GET', 'sesion.php')['json']['datos']['sesion'] ?? null) === true;
}

function idDe(string $correo): int
{
    global $pdo;
    $consulta = $pdo->prepare('SELECT id FROM usuarios WHERE correo = ?');
    $consulta->execute([$correo]);
    return (int) $consulta->fetchColumn();
}

function cuenta(int $id): array
{
    global $pdo;
    $consulta = $pdo->prepare('SELECT nombre, correo, activo, debe_cambiar_clave, ultimo_ingreso FROM usuarios WHERE id = ?');
    $consulta->execute([$id]);
    return $consulta->fetch() ?: [];
}

// Huella de las cuentas y cargas que no son de la prueba: al final deben seguir iguales.
$huella = fn() => md5(json_encode([
    $pdo->query("SELECT id, correo, nombre, clave_hash, activo, debe_cambiar_clave, sesion_version FROM usuarios WHERE correo NOT LIKE 'prueba-%' ORDER BY id")->fetchAll(PDO::FETCH_NUM),
    $pdo->query('SELECT id, estado, usuario_id FROM cargas ORDER BY id')->fetchAll(PDO::FETCH_NUM),
]));
$antes = $huella();

$cuentas = ['a' => ['correo' => $correo('a'), 'clave' => $clave()], 'b' => ['correo' => $correo('b'), 'clave' => $clave()]];
$crear = $pdo->prepare('INSERT INTO usuarios (correo, nombre, clave_hash, activo) VALUES (?, ?, ?, 1)');
$crear->execute([$cuentas['a']['correo'], 'Prueba A', password_hash($cuentas['a']['clave'], PASSWORD_DEFAULT)]);
$crear->execute([$cuentas['b']['correo'], 'Prueba B', password_hash($cuentas['b']['clave'], PASSWORD_DEFAULT)]);
$idA = idDe($cuentas['a']['correo']);
$idB = idDe($cuentas['b']['correo']);
$correoC = $correo('c');
echo "Cuentas temporales creadas. Base: {$c['db_name']}. Servidor: $base\n";

try {
    echo "\nSin sesión (401), sin token (403) y métodos (405)\n";
    $nadie = ['cookie' => null, 'csrf' => null];
    $servicios = ['mi_cuenta.php' => ['nombre' => 'x'], 'cambiar_correo.php' => ['correo' => 'x@y.co', 'clave' => 'x'],
        'usuario_guardar.php' => ['nombre' => 'x'], 'usuario_clave_temporal.php' => ['id' => $idB, 'clave' => 'x'],
        'usuario_estado.php' => ['id' => $idB, 'activo' => false]];
    foreach ($servicios as $servicio => $cuerpo) {
        comprobar("$servicio sin sesión responde 401", pedir($nadie, 'POST', $servicio, $cuerpo)['codigo'] === 401);
    }
    comprobar('usuarios.php sin sesión responde 401', pedir($nadie, 'GET', 'usuarios.php')['codigo'] === 401);
    $a = entrar($cuentas['a']['correo'], $cuentas['a']['clave']);
    comprobar('la cuenta A entra y el login informa que no tiene contraseña temporal', $a['respuesta']['codigo'] === 200 && ($a['respuesta']['json']['datos']['debe_cambiar_clave'] ?? null) === false);
    comprobar('  y se guarda su último ingreso', cuenta($idA)['ultimo_ingreso'] !== null);
    foreach ($servicios as $servicio => $cuerpo) {
        comprobar("$servicio sin token CSRF responde 403", pedir($a, 'POST', $servicio, $cuerpo, false)['codigo'] === 403);
    }
    comprobar('GET usuario_guardar.php responde 405', pedir($a, 'GET', 'usuario_guardar.php')['codigo'] === 405);
    comprobar('POST usuarios.php responde 405', pedir($a, 'POST', 'usuarios.php', [])['codigo'] === 405);

    echo "\nLista de cuentas\n";
    $r = pedir($a, 'GET', 'usuarios.php');
    $lista = $r['json']['datos']['cuentas'] ?? [];
    $porId = array_column($lista, null, 'id');
    comprobar('lista las cuentas con nombre, correo, estado y último ingreso', isset($porId[$idA], $porId[$idB]) && array_key_exists('ultimo_ingreso', $porId[$idA]) && $porId[$idB]['activo'] === true);
    comprobar('marca la propia cuenta', ($porId[$idA]['es_yo'] ?? false) === true && ($porId[$idB]['es_yo'] ?? true) === false);
    $sistema = array_values(array_filter($lista, fn($x) => $x['es_sistema']));
    comprobar('la cuenta del sistema sale marcada como tal (' . count($sistema) . ')', count($sistema) <= 1 && (count($sistema) === 0 || end($lista)['es_sistema']));
    comprobar('la respuesta no trae hashes ni contraseñas', !str_contains($r['crudo'], '$2y$') && !str_contains($r['crudo'], 'clave_hash'));
    if ($sistema) {
        $r = pedir($a, 'POST', 'usuario_guardar.php', ['id' => $sistema[0]['id'], 'nombre' => 'X', 'correo' => $correo('x')]);
        comprobar('la cuenta del sistema no se puede editar (403)', $r['codigo'] === 403);
        comprobar('  ni desactivar ni cambiar su clave (403)', pedir($a, 'POST', 'usuario_estado.php', ['id' => $sistema[0]['id'], 'activo' => true])['codigo'] === 403
            && pedir($a, 'POST', 'usuario_clave_temporal.php', ['id' => $sistema[0]['id'], 'clave' => $clave()])['codigo'] === 403);
    }

    echo "\nCrear una cuenta\n";
    $claveC = $clave();
    $r = pedir($a, 'POST', 'usuario_guardar.php', ['nombre' => '  Prueba   C ', 'correo' => strtoupper($correoC), 'clave' => $claveC]);
    $idC = (int) ($r['json']['datos']['id'] ?? 0);
    $c3 = cuenta($idC);
    comprobar('crea la cuenta C activa, con el correo en minúsculas y el nombre limpio', $r['codigo'] === 200 && $c3['correo'] === $correoC && $c3['nombre'] === 'Prueba C' && (int) $c3['activo'] === 1);
    comprobar('  con contraseña temporal', (int) $c3['debe_cambiar_clave'] === 1);
    comprobar('un correo que ya usa otra cuenta responde 409', pedir($a, 'POST', 'usuario_guardar.php', ['nombre' => 'X', 'correo' => $cuentas['b']['correo'], 'clave' => $clave()])['codigo'] === 409);
    comprobar('un correo inválido responde 400', pedir($a, 'POST', 'usuario_guardar.php', ['nombre' => 'X', 'correo' => 'no-es-correo', 'clave' => $clave()])['codigo'] === 400);
    comprobar('sin nombre responde 400', pedir($a, 'POST', 'usuario_guardar.php', ['nombre' => '  ', 'correo' => $correo('y'), 'clave' => $clave()])['codigo'] === 400);
    comprobar('una contraseña temporal de menos de 10 caracteres responde 400', pedir($a, 'POST', 'usuario_guardar.php', ['nombre' => 'X', 'correo' => $correo('y'), 'clave' => 'corta'])['codigo'] === 400);

    echo "\nContraseña temporal: obliga a cambiarla\n";
    $sc = entrar($correoC, $claveC);
    comprobar('C entra y el login informa que debe cambiar la contraseña', $sc['respuesta']['codigo'] === 200 && ($sc['respuesta']['json']['datos']['debe_cambiar_clave'] ?? null) === true);
    comprobar('sesion.php también lo informa', (pedir($sc, 'GET', 'sesion.php')['json']['datos']['debe_cambiar_clave'] ?? null) === true);
    $r = pedir($sc, 'GET', 'cargas.php');
    comprobar('con la contraseña temporal no puede hacer nada más (403 debe_cambiar_clave)', $r['codigo'] === 403 && ($r['json']['debe_cambiar_clave'] ?? false) === true);
    comprobar('  ni ver los usuarios ni cambiar su nombre', pedir($sc, 'GET', 'usuarios.php')['codigo'] === 403 && pedir($sc, 'POST', 'mi_cuenta.php', ['nombre' => 'X'])['codigo'] === 403);
    $nuevaC = $clave();
    comprobar('cambia la contraseña (200)', pedir($sc, 'POST', 'cambiar_clave.php', ['actual' => $claveC, 'nueva' => $nuevaC])['codigo'] === 200);
    comprobar('  y ya puede usar la aplicación', pedir($sc, 'GET', 'cargas.php')['codigo'] === 200 && (int) cuenta($idC)['debe_cambiar_clave'] === 0);

    echo "\nEditar otra cuenta\n";
    $nuevoCorreoB = $correo('b2');
    $r = pedir($a, 'POST', 'usuario_guardar.php', ['id' => $idB, 'nombre' => 'Prueba B editada', 'correo' => $nuevoCorreoB]);
    comprobar('edita el nombre y el correo de B', $r['codigo'] === 200 && cuenta($idB)['nombre'] === 'Prueba B editada' && cuenta($idB)['correo'] === $nuevoCorreoB);
    $cuentas['b']['correo'] = $nuevoCorreoB;
    comprobar('  B entra con el correo nuevo', entrar($nuevoCorreoB, $cuentas['b']['clave'])['respuesta']['codigo'] === 200);
    comprobar('poner a B el correo de C responde 409', pedir($a, 'POST', 'usuario_guardar.php', ['id' => $idB, 'nombre' => 'X', 'correo' => $correoC])['codigo'] === 409);
    comprobar('editar la propia cuenta desde Usuarios responde 409 (va en "Mi cuenta")', pedir($a, 'POST', 'usuario_guardar.php', ['id' => $idA, 'nombre' => 'X', 'correo' => $correo('a')])['codigo'] === 409);
    comprobar('editar una cuenta que no existe responde 404', pedir($a, 'POST', 'usuario_guardar.php', ['id' => 99999999, 'nombre' => 'X', 'correo' => $correo('z')])['codigo'] === 404);

    echo "\nContraseña temporal a otra cuenta: cierra sus sesiones\n";
    $sb = entrar($cuentas['b']['correo'], $cuentas['b']['clave']);
    comprobar('B tiene una sesión abierta', haySesion($sb));
    $temporalB = $clave();
    comprobar('A le pone una contraseña temporal a B (200)', pedir($a, 'POST', 'usuario_clave_temporal.php', ['id' => $idB, 'clave' => $temporalB])['codigo'] === 200);
    comprobar('  la sesión abierta de B se cierra', !haySesion($sb));
    comprobar('  la sesión de A sigue', haySesion($a));
    $sb = entrar($cuentas['b']['correo'], $temporalB);
    comprobar('  B entra con la temporal y debe cambiarla', ($sb['respuesta']['json']['datos']['debe_cambiar_clave'] ?? null) === true);
    $cuentas['b']['clave'] = $clave();
    pedir($sb, 'POST', 'cambiar_clave.php', ['actual' => $temporalB, 'nueva' => $cuentas['b']['clave']]);
    comprobar('ponerse una contraseña temporal a sí misma responde 409', pedir($a, 'POST', 'usuario_clave_temporal.php', ['id' => $idA, 'clave' => $clave()])['codigo'] === 409);

    echo "\nDesactivar y activar\n";
    $sb = entrar($cuentas['b']['correo'], $cuentas['b']['clave']);
    comprobar('B tiene una sesión abierta', haySesion($sb));
    $r = pedir($a, 'POST', 'usuario_estado.php', ['id' => $idB, 'activo' => false]);
    comprobar('A desactiva a B (200)', $r['codigo'] === 200 && (int) cuenta($idB)['activo'] === 0);
    comprobar('  la sesión abierta de B se cierra', !haySesion($sb));
    $r = entrar($cuentas['b']['correo'], $cuentas['b']['clave'])['respuesta'];
    comprobar('  B ya no puede entrar (el mismo mensaje genérico)', $r['codigo'] === 401 && ($r['json']['error'] ?? '') === 'Correo o contraseña incorrectos.');
    comprobar('A vuelve a activar a B y B entra', pedir($a, 'POST', 'usuario_estado.php', ['id' => $idB, 'activo' => true])['codigo'] === 200 && entrar($cuentas['b']['correo'], $cuentas['b']['clave'])['respuesta']['codigo'] === 200);
    $r = pedir($a, 'POST', 'usuario_estado.php', ['id' => $idA, 'activo' => false]);
    comprobar('nadie puede desactivarse a sí misma (409)', $r['codigo'] === 409 && str_contains($r['json']['error'] ?? '', 'propia') && (int) cuenta($idA)['activo'] === 1);
    comprobar('sin indicar el estado responde 400', pedir($a, 'POST', 'usuario_estado.php', ['id' => $idB])['codigo'] === 400);

    echo "\nLa última cuenta activa\n";
    if ($c['db_name'] === 'trdcode_prueba') {
        // Se dejan inactivas todas las cuentas menos A (y se restauran al terminar el caso).
        $activas = $pdo->query("SELECT id FROM usuarios WHERE activo = 1 AND id <> $idA")->fetchAll(PDO::FETCH_COLUMN);
        $pdo->exec("UPDATE usuarios SET activo = 0 WHERE id <> $idA");
        $unica = (int) $pdo->query("SELECT COUNT(*) FROM usuarios WHERE activo = 1 AND correo <> 'carga-inicial@trdcode.local'")->fetchColumn();
        $r = pedir($a, 'POST', 'usuario_estado.php', ['id' => $idA, 'activo' => false]);
        comprobar("con A como única cuenta activa ($unica), no puede desactivarse y la base no queda sin cuentas activas", $unica === 1 && $r['codigo'] === 409 && (int) cuenta($idA)['activo'] === 1);
        comprobar('  activar a otra sigue funcionando', pedir($a, 'POST', 'usuario_estado.php', ['id' => $idB, 'activo' => true])['codigo'] === 200);
        if ($activas) {
            $marcas = implode(',', array_fill(0, count($activas), '?'));
            $pdo->prepare("UPDATE usuarios SET activo = 1 WHERE id IN ($marcas)")->execute($activas);
        }
    } else {
        echo "  (se salta: solo corre en la base temporal trdcode_prueba)\n";
    }

    echo "\nMi cuenta\n";
    $r = pedir($a, 'POST', 'mi_cuenta.php', ['nombre' => ' Prueba A  renombrada ']);
    comprobar('cambia el nombre y la sesión lo devuelve', $r['codigo'] === 200 && ($r['json']['datos']['nombre'] ?? '') === 'Prueba A renombrada' && cuenta($idA)['nombre'] === 'Prueba A renombrada');
    comprobar('un nombre vacío responde 400', pedir($a, 'POST', 'mi_cuenta.php', ['nombre' => ''])['codigo'] === 400);
    $nuevoCorreoA = $correo('a2');
    comprobar('cambiar el correo con la contraseña equivocada responde 400', pedir($a, 'POST', 'cambiar_correo.php', ['correo' => $nuevoCorreoA, 'clave' => 'equivocada'])['codigo'] === 400);
    comprobar('cambiar el correo a uno que usa otra cuenta responde 409', pedir($a, 'POST', 'cambiar_correo.php', ['correo' => $correoC, 'clave' => $cuentas['a']['clave']])['codigo'] === 409);
    comprobar('un correo inválido responde 400', pedir($a, 'POST', 'cambiar_correo.php', ['correo' => 'sin-arroba', 'clave' => $cuentas['a']['clave']])['codigo'] === 400);
    $r = pedir($a, 'POST', 'cambiar_correo.php', ['correo' => $nuevoCorreoA, 'clave' => $cuentas['a']['clave']]);
    comprobar('con la contraseña correcta cambia el correo', $r['codigo'] === 200 && cuenta($idA)['correo'] === $nuevoCorreoA && !str_contains($r['crudo'], $nuevoCorreoA));
    $cuentas['a']['correo'] = $nuevoCorreoA;
    comprobar('  A entra con el correo nuevo y no con el anterior', entrar($nuevoCorreoA, $cuentas['a']['clave'])['respuesta']['codigo'] === 200 && entrar($correo('a'), $cuentas['a']['clave'])['respuesta']['codigo'] === 401);
    $pdo->prepare('DELETE FROM intentos_login WHERE correo LIKE ?')->execute(["prueba-usuarios-%-$sufijo@trdcode.local"]);
    for ($i = 1; $i <= 4; $i++) {
        pedir($a, 'POST', 'cambiar_correo.php', ['correo' => $correo('a3'), 'clave' => 'equivocada']);
    }
    $r = pedir($a, 'POST', 'cambiar_correo.php', ['correo' => $correo('a3'), 'clave' => 'equivocada']);
    comprobar('los fallos con la contraseña actual cuentan para el bloqueo (429 al quinto)', $r['codigo'] === 429);
    comprobar('  bloqueada, tampoco con la contraseña correcta (429)', pedir($a, 'POST', 'cambiar_correo.php', ['correo' => $correo('a3'), 'clave' => $cuentas['a']['clave']])['codigo'] === 429);
    $pdo->prepare('DELETE FROM intentos_login WHERE correo LIKE ?')->execute(["prueba-usuarios-%-$sufijo@trdcode.local"]);
    $sa2 = entrar($cuentas['a']['correo'], $cuentas['a']['clave']);
    $nuevaA = $clave();
    comprobar('cambiar la propia contraseña cierra las otras sesiones de la cuenta', pedir($a, 'POST', 'cambiar_clave.php', ['actual' => $cuentas['a']['clave'], 'nueva' => $nuevaA])['codigo'] === 200 && haySesion($a) && !haySesion($sa2));
} catch (Throwable $e) {
    $fallas++;
    echo "\nERROR: " . $e->getMessage() . PHP_EOL;
} finally {
    $marca = "prueba-usuarios-%-$sufijo@trdcode.local";
    $pdo->prepare('DELETE FROM intentos_login WHERE correo LIKE ?')->execute([$marca]);
    $pdo->prepare('DELETE FROM usuarios WHERE correo LIKE ?')->execute([$marca]);
    echo "\nCuentas temporales borradas.\n";
    comprobar('las demás cuentas y las cargas quedaron como estaban', $huella() === $antes);
}

echo "\n" . ($fallas === 0 ? "Todo bien: $total comprobaciones." : "$fallas de $total comprobaciones fallaron.") . PHP_EOL;
exit($fallas === 0 ? 0 : 1);
