<?php
// Base temporal para las pruebas que crean cargas, sin tocar la base real.
//   php base_temporal.php crear    crea trdcode_prueba con los scripts de database/ y datos-prueba/expedientes.sql,
//                                  y escribe datos-prueba/prueba.env (copia del .env con DB_NAME=trdcode_prueba)
//   php base_temporal.php borrar   borra la base y ese .env
// datos-prueba/ no va al repositorio. No imprime los valores del .env.

if (PHP_SAPI !== 'cli') {
    exit("Solo desde la terminal.\n");
}
$raiz = dirname(__DIR__, 2);
$env = "$raiz/datos-prueba/prueba.env";
$c = require "$raiz/api/lib/config.php";
if ($c['db_name'] === 'trdcode_prueba') {
    exit("Corra este ayudante con el .env real (sin TRDCODE_ENV).\n");
}
$pdo = new PDO($c['db_dsn_servidor'], $c['db_user'], $c['db_pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

if (($argv[1] ?? '') === 'borrar') {
    $pdo->exec('DROP DATABASE IF EXISTS trdcode_prueba');
    if (is_file($env)) {
        unlink($env);
    }
    exit("Base temporal borrada.\n");
}
if (($argv[1] ?? '') !== 'crear') {
    exit("Uso: php base_temporal.php crear|borrar\n");
}
if (!is_file("$raiz/datos-prueba/expedientes.sql")) {
    exit("Falta datos-prueba/expedientes.sql (vea scripts/generar_expedientes_sql.py).\n");
}
$pdo->exec('DROP DATABASE IF EXISTS trdcode_prueba');
$pdo->exec('CREATE DATABASE trdcode_prueba CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$pdo->exec('USE trdcode_prueba');
foreach (['database/schema.sql', 'database/datos_iniciales.sql', 'database/trd.sql', 'datos-prueba/expedientes.sql'] as $archivo) {
    $pdo->exec(file_get_contents("$raiz/$archivo"));
}
$origen = getenv('TRDCODE_ENV') ?: "$raiz/.env";
file_put_contents($env, preg_replace('/^DB_NAME=.*$/m', 'DB_NAME=trdcode_prueba', file_get_contents($origen)));
echo 'Base temporal creada: ' . $pdo->query('SELECT COUNT(*) FROM expedientes')->fetchColumn() . " expedientes.\n";
echo "Para usarla: TRDCODE_ENV=$env (ruta completa; vea el README).\n";
