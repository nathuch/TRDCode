<?php
// Sesión de la persona encargada, token CSRF y límite de intentos de inicio de sesión.
// - La cookie de sesión es HttpOnly y SameSite=Strict, y lleva Secure solo si la petición llega por HTTPS.
// - La sesión solo se abre si llega la cookie: los visitantes de la consulta pública no crean sesiones.
// - Se cierra tras 30 minutos sin actividad, o si la usuaria deja de estar activa.
// - Los servicios que cambian datos exigen el token CSRF en la cabecera X-CSRF-Token.
// - Tras 5 fallos en 15 minutos se bloquea el correo y, por separado, la IP, hasta que pasen 15 minutos.
// Nunca se registran contraseñas ni hashes.

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/respuesta.php';

const SESION_NOMBRE = 'TRDCODE_SESION';
const SESION_INACTIVIDAD = 1800; // segundos
const INTENTOS_MAXIMOS = 5;
const INTENTOS_MINUTOS = 15;
const MENSAJE_CREDENCIALES = 'Correo o contraseña incorrectos.';
// Hash de una cadena al azar que se descartó: si el correo no existe se verifica contra él,
// para que la respuesta tarde lo mismo y no delate qué correos existen.
const HASH_FICTICIO = '$2y$10$rKUMZbE49Wg6cFa9Fyey5OEsbQfc6PEzEq6IJza5Sn.iQVohI7pQW';

function usandoHttps(): bool
{
    return (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off')
        || (int) ($_SERVER['SERVER_PORT'] ?? 0) === 443;
}

/** Carpeta de la aplicación (la que contiene api/), para que la cookie no salga de ella: /TRDCode/ o /. */
function rutaCookie(): string
{
    $carpeta = str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/api/x.php'), 2));
    return rtrim($carpeta, '/') . '/';
}

/**
 * Abre la sesión. Con $crear = false solo la abre si llega la cookie y pertenece a una sesión
 * iniciada y vigente; si no, la descarta y devuelve false.
 */
function abrirSesion(bool $crear): bool
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return true;
    }
    if (!$crear && empty($_COOKIE[SESION_NOMBRE])) {
        return false;
    }
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_trans_sid', '0');
    ini_set('session.gc_maxlifetime', (string) SESION_INACTIVIDAD);
    session_name(SESION_NOMBRE);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => rutaCookie(),
        'secure' => usandoHttps(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();

    $vencida = isset($_SESSION['ultima_actividad']) && time() - $_SESSION['ultima_actividad'] > SESION_INACTIVIDAD;
    if ($vencida || (!$crear && empty($_SESSION['usuario_id']))) {
        cerrarSesion();
        if (!$crear) {
            return false;
        }
        session_start();
    }
    return true;
}

function cerrarSesion(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return;
    }
    $_SESSION = [];
    $p = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 3600,
        'path' => $p['path'],
        'secure' => $p['secure'],
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_destroy();
}

/** Usuaria de la sesión abierta, si sigue activa: [id, correo, nombre]. Renueva la hora de actividad. */
function usuarioActual(): ?array
{
    if (session_status() !== PHP_SESSION_ACTIVE || empty($_SESSION['usuario_id'])) {
        return null;
    }
    $consulta = conexion()->prepare('SELECT id, correo, nombre FROM usuarios WHERE id = ? AND activo = 1');
    $consulta->execute([(int) $_SESSION['usuario_id']]);
    $usuario = $consulta->fetch();
    if (!$usuario) {
        cerrarSesion();
        return null;
    }
    $_SESSION['ultima_actividad'] = time();
    return $usuario;
}

/** Responde 401 si no hay una sesión iniciada; si la hay, devuelve la usuaria. */
function requerirSesion(): array
{
    $usuario = abrirSesion(false) ? usuarioActual() : null;
    if ($usuario === null) {
        responderError('Su sesión terminó. Ingrese de nuevo.', 401);
    }
    return $usuario;
}

/** Responde 403 si la cabecera X-CSRF-Token no trae el token de la sesión. */
function requerirCsrf(): void
{
    $enviado = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $guardado = $_SESSION['csrf'] ?? '';
    if (!is_string($enviado) || !is_string($guardado) || $guardado === '' || !hash_equals($guardado, $enviado)) {
        responderError('La solicitud no es válida. Recargue la página e intente de nuevo.', 403);
    }
}

/** Inicia la sesión de la usuaria con un id de sesión nuevo y un token CSRF nuevo. */
function iniciarSesionUsuario(int $id): void
{
    abrirSesion(true);
    session_regenerate_id(true);
    $_SESSION = [
        'usuario_id' => $id,
        'csrf' => bin2hex(random_bytes(32)),
        'ultima_actividad' => time(),
    ];
}

/** Lo que el frontend necesita saber de la sesión. Nunca incluye el correo ni el hash. */
function datosDeSesion(string $nombre): array
{
    return ['sesion' => true, 'nombre' => $nombre, 'csrf' => $_SESSION['csrf']];
}

/** Cuerpo JSON de la petición. Exigir JSON obliga a otro sitio a pasar por CORS para enviarlo. */
function leerJson(): array
{
    $tipo = (string) ($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '');
    if (stripos($tipo, 'application/json') !== 0) {
        responderError('La solicitud debe enviarse como JSON.', 415);
    }
    $datos = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($datos)) {
        responderError('La solicitud no es válida.', 400);
    }
    return $datos;
}

/** Valor de texto de la petición ('' si falta o no es texto). */
function textoDe(array $entrada, string $campo): string
{
    return is_string($entrada[$campo] ?? null) ? $entrada[$campo] : '';
}

function normalizarCorreo(string $correo): string
{
    return mb_substr(mb_strtolower(trim($correo)), 0, 120);
}

function ipCliente(): string
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
}

/**
 * Segundos que faltan para que se levante el bloqueo del correo o de la IP (0 si no hay bloqueo).
 * Hay bloqueo si hay 5 fallos en los últimos 15 minutos; dura hasta 15 minutos después del quinto
 * fallo más reciente. Las horas las calcula la base (NOW()), así no importa la zona horaria de PHP.
 */
function segundosDeBloqueo(string $correo, string $ip): int
{
    $espera = 0;
    // Columnas fijas, no vienen de la petición.
    foreach (['correo' => $correo, 'ip' => $ip] as $columna => $valor) {
        $consulta = conexion()->prepare(
            'SELECT TIMESTAMPDIFF(SECOND, NOW(), fecha + INTERVAL ' . INTENTOS_MINUTOS . " MINUTE)
             FROM intentos_login
             WHERE $columna = ? AND fecha > NOW() - INTERVAL " . INTENTOS_MINUTOS . ' MINUTE
             ORDER BY fecha DESC LIMIT 1 OFFSET ' . (INTENTOS_MAXIMOS - 1)
        );
        $consulta->execute([$valor]);
        $segundos = $consulta->fetchColumn();
        if ($segundos !== false) {
            $espera = max($espera, (int) $segundos, 1);
        }
    }
    return $espera;
}

function registrarFallo(string $correo, string $ip): void
{
    $pdo = conexion();
    $pdo->exec('DELETE FROM intentos_login WHERE fecha < NOW() - INTERVAL 1 DAY');
    $pdo->prepare('INSERT INTO intentos_login (correo, ip, fecha) VALUES (?, ?, NOW())')->execute([$correo, $ip]);
}

function limpiarFallos(string $correo): void
{
    conexion()->prepare('DELETE FROM intentos_login WHERE correo = ?')->execute([$correo]);
}

function responderBloqueo(int $segundos): void
{
    $minutos = (int) ceil($segundos / 60);
    header('Retry-After: ' . $segundos);
    responderError(
        'Demasiados intentos fallidos. Intente de nuevo en ' . ($minutos === 1 ? '1 minuto.' : "$minutos minutos."),
        429,
        ['espera_segundos' => $segundos]
    );
}
