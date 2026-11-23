<?php
// Crea la primera cuenta de TRDCode desde la consola, en una instalación nueva.
// Uso:  php consola/crear_primera_cuenta.php --env=C:\ruta\TRDCode.env
//
// - Solo funciona si la base todavía no tiene ninguna cuenta activa. Las demás cuentas se crean
//   desde "Usuarios" en la aplicación.
// - Si el correo ya pertenece a una cuenta desactivada, la vuelve a activar con el nombre y la
//   contraseña nuevos (sirve para recuperar el acceso cuando no queda ninguna cuenta activa).
// - La contraseña se escribe sin que se vea y solo se guarda su hash.
// - Esta carpeta está bloqueada para la web (.htaccess) y el script se niega a correr fuera de la consola.

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
// Se pregunta una sola vez y antes de leer: después de un fgets(), stream_isatty() descarta lo que
// quedó en el búfer de la entrada.
define('ENTRADA_ES_TERMINAL', stream_isatty(STDIN));

function terminar(string $mensaje, int $codigo = 1): void
{
    fwrite($codigo === 0 ? STDOUT : STDERR, $mensaje . PHP_EOL);
    exit($codigo);
}

function preguntar(string $texto): string
{
    echo $texto;
    $linea = fgets(STDIN);
    if ($linea === false) {
        terminar(PHP_EOL . 'Se canceló: no llegó ninguna respuesta.');
    }
    return trim($linea);
}

/** Pide un dato sin mostrarlo en pantalla. Con la entrada redirigida (pruebas), la lee tal cual. */
function preguntarOculto(string $texto): string
{
    if (!ENTRADA_ES_TERMINAL) {
        return preguntar($texto);
    }
    echo $texto;
    if (PHP_OS_FAMILY === 'Windows') {
        $ps = '$c = Read-Host -AsSecureString; '
            . '[Runtime.InteropServices.Marshal]::PtrToStringAuto('
            . '[Runtime.InteropServices.Marshal]::SecureStringToBSTR($c))';
        $clave = shell_exec('powershell -NoProfile -Command "' . $ps . '"');
    } else {
        shell_exec('stty -echo');
        $clave = fgets(STDIN);
        shell_exec('stty echo');
        echo PHP_EOL;
    }
    return rtrim((string) $clave, "\r\n");
}

$opciones = getopt('', ['env:']);
$env = is_string($opciones['env'] ?? null) ? $opciones['env'] : '';
if ($env === '') {
    terminar('Indique la ruta del archivo .env, por ejemplo:' . PHP_EOL
        . '  php consola/crear_primera_cuenta.php --env=C:\xampp\TRDCode.env');
}
$rutaEnv = realpath($env);
if ($rutaEnv === false || !is_file($rutaEnv)) {
    terminar("No se encontró el archivo .env: $env");
}
// config.php toma primero la ruta de TRDCODE_ENV.
putenv('TRDCODE_ENV=' . $rutaEnv);

require_once __DIR__ . '/../api/lib/usuarios.php';

try {
    $pdo = conexion();
    $pdo->query('SELECT 1 FROM usuarios LIMIT 1');
} catch (Throwable $e) {
    terminar('No se pudo usar la base de datos. Revise los datos del .env y que la base esté instalada '
        . '(schema.sql, datos_iniciales.sql y trd.sql).' . PHP_EOL . 'Detalle: ' . $e->getMessage());
}

$activas = cuentasActivas();
if ($activas > 0) {
    terminar("La base ya tiene $activas cuenta(s) activa(s); este script solo crea la primera. "
        . 'Las demás cuentas se crean desde "Usuarios" en la aplicación.');
}

echo 'Base: ' . config()['db_name'] . PHP_EOL;
echo 'Primera cuenta de TRDCode (la persona encargada de actualizar los datos).' . PHP_EOL;

$correo = normalizarCorreo(preguntar('Correo: '));
if ($correo === '' || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    terminar('El correo no es válido.');
}
if ($correo === CORREO_SISTEMA) {
    terminar('Ese correo está reservado.');
}

$nombre = trim((string) preg_replace('/\s+/u', ' ', preguntar('Nombre completo: ')));
if ($nombre === '') {
    terminar('El nombre es obligatorio.');
}
if (mb_strlen($nombre) > 120) {
    terminar('El nombre es demasiado largo (máximo 120 caracteres).');
}

$clave = preguntarOculto('Contraseña (mínimo 10 caracteres): ');
$motivo = motivoClaveInvalida($clave);
if ($motivo !== null) {
    terminar($motivo);
}
if (preguntarOculto('Repita la contraseña: ') !== $clave) {
    terminar('Las contraseñas no coinciden.');
}
$hash = password_hash($clave, PASSWORD_DEFAULT);

$pdo->beginTransaction();
// Se vuelve a contar con bloqueo, por si otra persona creó una cuenta mientras tanto.
$consulta = $pdo->prepare('SELECT COUNT(*) FROM usuarios WHERE activo = 1 AND correo <> ? FOR UPDATE');
$consulta->execute([CORREO_SISTEMA]);
if ((int) $consulta->fetchColumn() > 0) {
    $pdo->rollBack();
    terminar('Mientras tanto se creó otra cuenta activa; no se hizo ningún cambio.');
}
$consulta = $pdo->prepare('SELECT id FROM usuarios WHERE correo = ?');
$consulta->execute([$correo]);
$id = $consulta->fetchColumn();
if ($id !== false) {
    $pdo->prepare(
        'UPDATE usuarios SET nombre = ?, clave_hash = ?, activo = 1, debe_cambiar_clave = 0,
         sesion_version = sesion_version + 1 WHERE id = ?'
    )->execute([$nombre, $hash, (int) $id]);
    $pdo->commit();
    terminar("Cuenta reactivada: $nombre. Ya puede entrar a TRDCode con ese correo.", 0);
}
$pdo->prepare('INSERT INTO usuarios (correo, nombre, clave_hash) VALUES (?, ?, ?)')
    ->execute([$correo, $nombre, $hash]);
$pdo->commit();
terminar("Cuenta creada: $nombre. Ya puede entrar a TRDCode con ese correo.", 0);
