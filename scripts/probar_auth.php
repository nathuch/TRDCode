<?php
// Prueba los servicios de sesión de la API contra el servidor local.
// Uso, desde la raíz del proyecto y con el servidor encendido:
//   C:\xampp\php\php.exe -S 127.0.0.1:8000 scripts/servidor_dev.php
//   C:\xampp\php\php.exe scripts/probar_auth.php [http://127.0.0.1:8000]
// Crea dos cuentas temporales (una activa y una inactiva) con correos al azar de @trdcode.local y
// las borra al terminar, junto con sus intentos fallidos. Nunca usa la cuenta real de la encargada.
// No imprime correos, nombres, contraseñas, hashes ni títulos de expedientes.

if (PHP_SAPI !== 'cli') {
    exit("Este script solo se ejecuta desde la terminal.\n");
}
if (!extension_loaded('curl')) {
    exit("Falta la extensión curl de PHP.\n");
}

$base = rtrim($argv[1] ?? 'http://127.0.0.1:8000', '/') . '/api/';
$c = require __DIR__ . '/../api/lib/config.php';
$pdo = new PDO(
    $c['db_dsn'],
    $c['db_user'],
    $c['db_pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
);

$sufijo = bin2hex(random_bytes(6));
$activa = ['correo' => "prueba-auth-$sufijo@trdcode.local", 'clave' => bin2hex(random_bytes(12))];
$inactiva = ['correo' => "prueba-auth-inactiva-$sufijo@trdcode.local", 'clave' => bin2hex(random_bytes(12))];
$inexistente = "prueba-auth-nadie-$sufijo@trdcode.local";
$correosDePrueba = [$activa['correo'], $inactiva['correo'], $inexistente];
const NOMBRE_PRUEBA = 'Cuenta de prueba temporal';
const IP_AJENA = '203.0.113.9'; // red de documentación (RFC 5737): no es de nadie
const MENSAJE = 'Correo o contraseña incorrectos.';

$total = 0;
$fallas = 0;

function comprobar(string $descripcion, bool $ok): void
{
    global $total, $fallas;
    $total++;
    if (!$ok) {
        $fallas++;
    }
    echo ($ok ? '  ok     ' : '  FALLA  ') . $descripcion . PHP_EOL;
}

/** Hace una petición y devuelve el código, el JSON, la cookie de sesión que llegue y su cabecera Set-Cookie. */
function pedir(string $metodo, string $servicio, array $opciones = []): array
{
    global $base;
    $cabeceras = $opciones['cabeceras'] ?? [];
    $ch = curl_init($base . $servicio);
    if (array_key_exists('json', $opciones)) {
        $cabeceras[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($opciones['json']));
    } elseif (isset($opciones['formulario'])) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($opciones['formulario']));
    }
    if (isset($opciones['cookie'])) {
        $cabeceras[] = 'Cookie: TRDCODE_SESION=' . $opciones['cookie'];
    }
    if (isset($opciones['csrf'])) {
        $cabeceras[] = 'X-CSRF-Token: ' . $opciones['csrf'];
    }
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $metodo,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => true,
        CURLOPT_HTTPHEADER => $cabeceras,
        CURLOPT_ENCODING => '',
        CURLOPT_TIMEOUT => 60,
    ]);
    $respuesta = curl_exec($ch);
    if ($respuesta === false) {
        throw new RuntimeException('No se pudo conectar con ' . $base . ' (' . curl_error($ch) . ').');
    }
    $tamano = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $encabezados = substr($respuesta, 0, $tamano);
    $cuerpo = substr($respuesta, $tamano);
    // Si llegan varias cookies de sesión (por ejemplo, al regenerar el id), vale la última, como en el navegador.
    $setCookie = null;
    $cookie = null;
    foreach (preg_split('/\r?\n/', $encabezados) as $linea) {
        if (preg_match('/^Set-Cookie:\s*TRDCODE_SESION=([^;]*)/i', $linea, $m)) {
            $setCookie = $linea;
            $cookie = $m[1];
        }
    }
    return [
        'codigo' => curl_getinfo($ch, CURLINFO_RESPONSE_CODE),
        'json' => json_decode($cuerpo, true),
        'crudo' => $cuerpo,
        'encabezados' => $encabezados,
        'set_cookie' => $setCookie,
        'cookie' => $cookie,
    ];
}

function entrar(string $correo, string $clave, ?string $cookie = null): array
{
    return pedir('POST', 'login.php', ['json' => ['correo' => $correo, 'clave' => $clave], 'cookie' => $cookie]);
}

function error(array $r): string
{
    return (string) ($r['json']['error'] ?? '');
}

function limpiarIntentos(): void
{
    global $pdo, $correosDePrueba;
    $marcas = implode(',', array_fill(0, count($correosDePrueba), '?'));
    $pdo->prepare("DELETE FROM intentos_login WHERE correo IN ($marcas)")->execute($correosDePrueba);
}

// Si ya hay fallos recientes desde esta IP, las pruebas de bloqueo darían otro resultado.
$recientes = (int) $pdo->query(
    "SELECT COUNT(*) FROM intentos_login WHERE ip IN ('127.0.0.1', '::1') AND fecha > NOW() - INTERVAL 15 MINUTE"
)->fetchColumn();
if ($recientes > 0) {
    exit("Hay $recientes intentos fallidos recientes desde 127.0.0.1. Espere 15 minutos y vuelva a ejecutar.\n");
}

$crear = $pdo->prepare('INSERT INTO usuarios (correo, nombre, clave_hash, activo) VALUES (?, ?, ?, ?)');
$crear->execute([$activa['correo'], NOMBRE_PRUEBA, password_hash($activa['clave'], PASSWORD_DEFAULT), 1]);
$crear->execute([$inactiva['correo'], NOMBRE_PRUEBA, password_hash($inactiva['clave'], PASSWORD_DEFAULT), 0]);
echo "Cuentas temporales creadas. Servidor: $base\n";

try {
    echo "\nConsulta pública\n";
    $r = pedir('GET', 'datos.php');
    $expedientes = $r['json']['datos']['expedientes'] ?? [];
    $reservados = array_filter($expedientes, fn($e) => $e['control_acceso'] !== 'IPU');
    $ocultos = array_filter($reservados, fn($e) => str_starts_with($e['nombre'], 'Nombre reservado'));
    comprobar('datos.php responde sin sesión (200) con 3.385 expedientes', $r['codigo'] === 200 && count($expedientes) === 3385);
    comprobar('datos.php no envía nombres de expedientes que no son IPU (' . count($reservados) . ')', count($reservados) > 0 && count($ocultos) === count($reservados));
    comprobar('datos.php no crea sesión', $r['set_cookie'] === null);
    $r = pedir('GET', 'sesion.php');
    comprobar('sesion.php sin cookie: no hay sesión y no crea una', $r['codigo'] === 200 && ($r['json']['datos']['sesion'] ?? null) === false && $r['set_cookie'] === null);

    echo "\nMétodos no permitidos (405)\n";
    foreach ([['GET', 'login.php'], ['GET', 'logout.php'], ['GET', 'cambiar_clave.php'], ['POST', 'sesion.php'], ['POST', 'datos.php']] as [$metodo, $servicio]) {
        $r = pedir($metodo, $servicio, $metodo === 'POST' ? ['json' => []] : []);
        comprobar("$metodo $servicio responde 405 con la cabecera Allow", $r['codigo'] === 405 && stripos($r['encabezados'], "\nAllow:") !== false);
    }

    echo "\nSin sesión (401)\n";
    $r = pedir('POST', 'logout.php', ['json' => []]);
    comprobar('logout.php sin sesión responde 401', $r['codigo'] === 401);
    $r = pedir('POST', 'cambiar_clave.php', ['json' => ['actual' => 'x', 'nueva' => 'y']]);
    comprobar('cambiar_clave.php sin sesión responde 401', $r['codigo'] === 401);
    $r = pedir('POST', 'cambiar_clave.php', ['json' => [], 'cookie' => bin2hex(random_bytes(16))]);
    comprobar('cambiar_clave.php con una cookie inventada responde 401', $r['codigo'] === 401);

    echo "\nInicio de sesión\n";
    $r = pedir('POST', 'login.php', ['formulario' => ['correo' => $activa['correo'], 'clave' => $activa['clave']]]);
    comprobar('login.php rechaza un formulario que no es JSON (415)', $r['codigo'] === 415);
    $r = entrar($activa['correo'], $activa['clave']);
    $sesion1 = $r['cookie'];
    $csrf = $r['json']['datos']['csrf'] ?? '';
    comprobar('login correcto (200) con el nombre y un token CSRF', $r['codigo'] === 200 && ($r['json']['datos']['nombre'] ?? '') === NOMBRE_PRUEBA && preg_match('/^[0-9a-f]{64}$/', $csrf) === 1);
    comprobar('la respuesta no trae el correo ni el hash', !str_contains($r['crudo'], $activa['correo']) && !str_contains($r['crudo'], '$2y$'));
    $atributos = strtolower((string) $r['set_cookie']);
    comprobar('cookie HttpOnly y SameSite=Strict', str_contains($atributos, 'httponly') && str_contains($atributos, 'samesite=strict'));
    comprobar('cookie sin Secure por http', !str_contains($atributos, 'secure'));
    $r = pedir('GET', 'sesion.php', ['cookie' => $sesion1]);
    comprobar('sesion.php con la cookie: hay sesión, con el mismo token', ($r['json']['datos']['sesion'] ?? false) === true && ($r['json']['datos']['csrf'] ?? '') === $csrf);
    $r = entrar(strtoupper($activa['correo']), $activa['clave'], $sesion1);
    $sesion = $r['cookie'];
    $csrf = $r['json']['datos']['csrf'] ?? '';
    comprobar('el correo no distingue mayúsculas', $r['codigo'] === 200);
    comprobar('al entrar se regenera el id de sesión', $sesion !== null && $sesion !== $sesion1);
    $r = pedir('GET', 'sesion.php', ['cookie' => $sesion1]);
    comprobar('el id de sesión anterior ya no sirve', ($r['json']['datos']['sesion'] ?? null) === false);

    echo "\nToken CSRF (403)\n";
    $r = pedir('POST', 'logout.php', ['json' => [], 'cookie' => $sesion]);
    comprobar('logout.php sin token responde 403', $r['codigo'] === 403);
    $r = pedir('POST', 'logout.php', ['json' => [], 'cookie' => $sesion, 'csrf' => str_repeat('0', 64)]);
    comprobar('logout.php con un token equivocado responde 403', $r['codigo'] === 403);
    $r = pedir('POST', 'cambiar_clave.php', ['json' => ['actual' => $activa['clave'], 'nueva' => 'otra-clave-larga'], 'cookie' => $sesion]);
    comprobar('cambiar_clave.php sin token responde 403', $r['codigo'] === 403);

    echo "\nFallos con el mismo mensaje genérico\n";
    $r = entrar($activa['correo'], 'clave-equivocada');
    comprobar('contraseña incorrecta: 401 "' . MENSAJE . '"', $r['codigo'] === 401 && error($r) === MENSAJE && $r['cookie'] === null);
    $r = entrar($inexistente, 'clave-equivocada');
    comprobar('correo que no existe: el mismo 401 y el mismo mensaje', $r['codigo'] === 401 && error($r) === MENSAJE);
    $r = entrar($inactiva['correo'], $inactiva['clave']);
    comprobar('usuario inactivo con su contraseña correcta: el mismo 401, sin sesión', $r['codigo'] === 401 && error($r) === MENSAJE && $r['cookie'] === null);
    limpiarIntentos();

    echo "\nCambio de contraseña\n";
    $nueva = bin2hex(random_bytes(12));
    $cambiar = fn($actual, $otra) => pedir('POST', 'cambiar_clave.php', ['json' => ['actual' => $actual, 'nueva' => $otra], 'cookie' => $sesion, 'csrf' => $csrf]);
    $r = $cambiar('clave-equivocada', $nueva);
    comprobar('con la contraseña actual equivocada responde 400', $r['codigo'] === 400);
    $r = $cambiar($activa['clave'], 'corta');
    comprobar('una nueva de menos de 10 caracteres responde 400', $r['codigo'] === 400 && str_contains(error($r), '10'));
    $r = $cambiar($activa['clave'], $activa['clave']);
    comprobar('una nueva igual a la actual responde 400', $r['codigo'] === 400);
    $r = $cambiar($activa['clave'], $nueva);
    comprobar('cambio correcto (200)', $r['codigo'] === 200);
    $sesion = $r['cookie'] ?? $sesion;
    $consulta = $pdo->prepare('SELECT clave_hash FROM usuarios WHERE correo = ?');
    $consulta->execute([$activa['correo']]);
    $hash = (string) $consulta->fetchColumn();
    comprobar('la nueva se guarda con password_hash()', password_get_info($hash)['algo'] !== null && password_verify($nueva, $hash));
    $r = entrar($activa['correo'], $activa['clave']);
    comprobar('la contraseña anterior ya no sirve', $r['codigo'] === 401);
    $r = entrar($activa['correo'], $nueva);
    comprobar('la nueva sí sirve', $r['codigo'] === 200);
    $sesion = $r['cookie'];
    $csrf = $r['json']['datos']['csrf'] ?? '';
    $activa['clave'] = $nueva;
    limpiarIntentos();

    echo "\nCierre de sesión\n";
    $r = pedir('POST', 'logout.php', ['json' => [], 'cookie' => $sesion, 'csrf' => $csrf]);
    comprobar('logout correcto (200) y borra la cookie', $r['codigo'] === 200 && $r['set_cookie'] !== null && stripos($r['set_cookie'], 'expires=') !== false);
    $r = pedir('GET', 'sesion.php', ['cookie' => $sesion]);
    comprobar('después de salir no hay sesión', ($r['json']['datos']['sesion'] ?? null) === false);
    $r = pedir('POST', 'cambiar_clave.php', ['json' => [], 'cookie' => $sesion, 'csrf' => $csrf]);
    comprobar('con la cookie anterior, cambiar_clave.php responde 401', $r['codigo'] === 401);

    echo "\nUsuaria desactivada con la sesión abierta\n";
    $r = entrar($activa['correo'], $activa['clave']);
    $sesion = $r['cookie'];
    $pdo->prepare('UPDATE usuarios SET activo = 0 WHERE correo = ?')->execute([$activa['correo']]);
    $r = pedir('GET', 'sesion.php', ['cookie' => $sesion]);
    comprobar('al desactivarla, su sesión deja de valer', ($r['json']['datos']['sesion'] ?? null) === false);
    $pdo->prepare('UPDATE usuarios SET activo = 1 WHERE correo = ?')->execute([$activa['correo']]);

    echo "\nCierre por inactividad (30 minutos)\n";
    // Se adelanta el reloj de la sesión en su archivo: el servidor usa el mismo php.ini que este script.
    $r = entrar($activa['correo'], $activa['clave']);
    $sesion = $r['cookie'];
    $carpeta = ini_get('session.save_path') ?: sys_get_temp_dir();
    $archivo = rtrim(preg_replace('/^\d+;/', '', $carpeta), '\\/') . DIRECTORY_SEPARATOR . 'sess_' . $sesion;
    if (is_file($archivo) && is_writable($archivo)) {
        $contenido = (string) file_get_contents($archivo);
        $atrasado = preg_replace('/ultima_actividad\|i:\d+;/', 'ultima_actividad|i:' . (time() - 29 * 60) . ';', $contenido);
        file_put_contents($archivo, $atrasado);
        $r = pedir('GET', 'sesion.php', ['cookie' => $sesion]);
        comprobar('a los 29 minutos sin actividad la sesión sigue', ($r['json']['datos']['sesion'] ?? null) === true);
        $contenido = (string) file_get_contents($archivo);
        file_put_contents($archivo, preg_replace('/ultima_actividad\|i:\d+;/', 'ultima_actividad|i:' . (time() - 31 * 60) . ';', $contenido));
        $r = pedir('GET', 'sesion.php', ['cookie' => $sesion]);
        comprobar('a los 31 minutos sin actividad la sesión se cierra', ($r['json']['datos']['sesion'] ?? null) === false);
    } else {
        echo "  (omitida: no se encontró el archivo de la sesión en $carpeta)\n";
    }

    echo "\nBloqueo de la pareja correo + IP (5 fallos)\n";
    limpiarIntentos();
    for ($i = 1; $i <= 4; $i++) {
        $r = entrar($activa['correo'], 'clave-equivocada');
        comprobar("fallo $i: 401", $r['codigo'] === 401);
    }
    $r = entrar($activa['correo'], 'clave-equivocada');
    $espera = $r['json']['espera_segundos'] ?? 0;
    comprobar('al quinto fallo: 429 con lo que falta', $r['codigo'] === 429 && $espera > 840 && $espera <= 900 && str_contains(error($r), 'minutos'));
    echo '         mensaje: ' . error($r) . PHP_EOL;
    $r = entrar($activa['correo'], $activa['clave']);
    comprobar('bloqueada, la pareja no entra ni con la contraseña correcta (429)', $r['codigo'] === 429 && $r['cookie'] === null);
    $r = entrar($inexistente, 'clave-equivocada');
    comprobar('otro correo desde la misma IP no queda bloqueado (401)', $r['codigo'] === 401);

    echo "\nSin bloqueo solo por correo\n";
    limpiarIntentos();
    $insertar = $pdo->prepare('INSERT INTO intentos_login (correo, ip, fecha) VALUES (?, ?, NOW())');
    for ($i = 0; $i < 5; $i++) {
        $insertar->execute([$activa['correo'], IP_AJENA]);
    }
    $r = entrar($activa['correo'], $activa['clave']);
    comprobar('5 fallos con su correo desde otra IP no la bloquean aquí (200)', $r['codigo'] === 200);

    echo "\nBloqueo de la IP (20 fallos con cualquier correo)\n";
    limpiarIntentos();
    $correosIp = [];
    for ($i = 1; $i <= 20; $i++) {
        $correosIp[] = "prueba-auth-ip$i-$sufijo@trdcode.local";
    }
    array_push($correosDePrueba, ...$correosIp);
    $antes = [];
    foreach (array_slice($correosIp, 0, 19) as $correo) {
        $antes[] = entrar($correo, 'clave-equivocada')['codigo'];
    }
    comprobar('19 fallos con 19 correos distintos: todos 401', array_unique($antes) === [401]);
    $r = entrar($correosIp[19], 'clave-equivocada');
    comprobar('al fallo 20 desde la misma IP: 429 con lo que falta', $r['codigo'] === 429 && ($r['json']['espera_segundos'] ?? 0) > 840);
    $r = entrar($activa['correo'], $activa['clave']);
    comprobar('con la IP bloqueada, ninguna cuenta entra desde ella (429)', $r['codigo'] === 429 && $r['cookie'] === null);
} catch (Throwable $e) {
    $fallas++;
    echo "\nERROR: " . $e->getMessage() . PHP_EOL;
} finally {
    limpiarIntentos();
    $marcas = implode(',', array_fill(0, count($correosDePrueba), '?'));
    $pdo->prepare("DELETE FROM usuarios WHERE correo IN ($marcas)")->execute($correosDePrueba);
    echo "\nCuentas temporales e intentos borrados.\n";
}

echo "\n" . ($fallas === 0 ? "Todo bien: $total comprobaciones." : "$fallas de $total comprobaciones fallaron.") . PHP_EOL;
exit($fallas === 0 ? 0 : 1);
