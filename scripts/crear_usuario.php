<?php
// Crea el usuario de la persona encargada o le cambia la contraseña si ya existe.
// Uso, desde la raíz del proyecto:  php scripts/crear_usuario.php
// La contraseña se escribe sin que se vea y solo se guarda su hash.

if (PHP_SAPI !== 'cli') {
    exit("Este script solo se ejecuta desde la terminal.\n");
}

function preguntar(string $texto): string
{
    echo $texto;
    return trim((string) fgets(STDIN));
}

function preguntarOculto(string $texto): string
{
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
    return trim((string) $clave);
}

try {
    $c = require __DIR__ . '/../api/lib/config.php';
} catch (RuntimeException $e) {
    exit($e->getMessage() . " Copie .env.example como .env y complete sus datos.\n");
}
$pdo = new PDO(
    "mysql:host={$c['db_host']};dbname={$c['db_name']};charset=utf8mb4",
    $c['db_user'],
    $c['db_pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$correo = mb_strtolower(preguntar('Correo: '));
if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    exit("El correo no es válido.\n");
}
$consulta = $pdo->prepare('SELECT nombre FROM usuarios WHERE correo = ?');
$consulta->execute([$correo]);
$existente = $consulta->fetchColumn();

$nombre = $existente !== false ? $existente : preguntar('Nombre completo: ');
if ($nombre === '') {
    exit("El nombre es obligatorio.\n");
}

$clave = preguntarOculto('Contraseña (mínimo 10 caracteres): ');
if (mb_strlen($clave) < 10) {
    exit("La contraseña debe tener al menos 10 caracteres.\n");
}
if (preguntarOculto('Repita la contraseña: ') !== $clave) {
    exit("Las contraseñas no coinciden.\n");
}

$hash = password_hash($clave, PASSWORD_DEFAULT);
if ($existente !== false) {
    $pdo->prepare('UPDATE usuarios SET clave_hash = ?, activo = 1 WHERE correo = ?')->execute([$hash, $correo]);
    echo "Contraseña actualizada para $nombre.\n";
} else {
    $pdo->prepare('INSERT INTO usuarios (correo, nombre, clave_hash) VALUES (?, ?, ?)')->execute([$correo, $nombre, $hash]);
    echo "Usuario creado: $nombre.\n";
}
