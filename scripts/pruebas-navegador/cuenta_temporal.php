<?php
// Ayudante de las pruebas en el navegador. Usa la base del .env del proyecto (o la de TRDCODE_ENV).
// No imprime correos, contraseñas ni datos de expedientes.
//   php cuenta_temporal.php crear <correo> <clave>     crea una cuenta activa "Cuenta de prueba temporal"
//   php cuenta_temporal.php borrar <correo>            borra la cuenta, sus cargas y sus intentos
//   php cuenta_temporal.php revisar-cargas             se niega (sale con error) si hay cargas guardadas
//                                                      además de la activa; si no, imprime el id de la activa
//   php cuenta_temporal.php restaurar <id_carga>       deja activa esa carga (al terminar la prueba de cargas)
//   php cuenta_temporal.php huella                     fecha de carga de la carga activa, para comprobar que la
//                                                      aplicación probada usa esta misma base

if (PHP_SAPI !== 'cli') {
    exit("Solo desde la terminal.\n");
}
$accion = $argv[1] ?? '';
$c = require __DIR__ . '/../../api/lib/config.php';
$pdo = new PDO(
    "mysql:host={$c['db_host']};dbname={$c['db_name']};charset=utf8mb4",
    $c['db_user'],
    $c['db_pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

if ($accion === 'crear') {
    if (!preg_match('/^prueba-[a-z-]+-[0-9a-f]{8}@trdcode\.local$/', $argv[2] ?? '')) {
        fwrite(STDERR, "Solo se crean cuentas temporales de @trdcode.local.\n");
        exit(1);
    }
    $pdo->prepare('INSERT INTO usuarios (correo, nombre, clave_hash, activo) VALUES (?, ?, ?, 1)')
        ->execute([$argv[2], 'Cuenta de prueba temporal', password_hash($argv[3], PASSWORD_DEFAULT)]);
    echo "cuenta temporal creada\n";
} elseif ($accion === 'borrar') {
    $consulta = $pdo->prepare("SELECT id FROM usuarios WHERE correo = ? AND correo LIKE 'prueba-%@trdcode.local'");
    $consulta->execute([$argv[2] ?? '']);
    $id = (int) $consulta->fetchColumn();
    if ($id > 0) {
        // Las cargas de la cuenta temporal se borran con sus expedientes (ON DELETE CASCADE).
        $pdo->prepare('DELETE FROM cargas WHERE usuario_id = ?')->execute([$id]);
        $pdo->prepare('DELETE FROM intentos_login WHERE correo = ?')->execute([$argv[2]]);
        $pdo->prepare('DELETE FROM usuarios WHERE id = ?')->execute([$id]);
    }
    echo "cuenta temporal borrada\n";
} elseif ($accion === 'revisar-cargas') {
    $otras = (int) $pdo->query("SELECT COUNT(*) FROM cargas WHERE estado <> 'activa'")->fetchColumn();
    if ($otras > 0) {
        fwrite(STDERR, "Hay $otras cargas guardadas además de la activa en la base {$c['db_name']}.\n"
            . "Esta prueba crea y restaura cargas: córrala contra una base temporal (vea el README).\n");
        exit(1);
    }
    echo (int) $pdo->query("SELECT id FROM cargas WHERE estado = 'activa' ORDER BY id DESC LIMIT 1")->fetchColumn();
} elseif ($accion === 'restaurar') {
    $id = (int) ($argv[2] ?? 0);
    $pdo->prepare("UPDATE cargas SET estado = 'reemplazada' WHERE estado = 'activa' AND id <> ?")->execute([$id]);
    $pdo->prepare("UPDATE cargas SET estado = 'activa' WHERE id = ?")->execute([$id]);
    echo "carga $id activa\n";
} elseif ($accion === 'huella') {
    echo (string) $pdo->query("SELECT fecha_carga FROM cargas WHERE estado = 'activa' ORDER BY id DESC LIMIT 1")->fetchColumn();
} else {
    fwrite(STDERR, "Uso: php cuenta_temporal.php crear|borrar|revisar-cargas|restaurar|huella ...\n");
    exit(1);
}
