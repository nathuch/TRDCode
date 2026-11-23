<?php
// Pruebas de consola/crear_primera_cuenta.php sobre una base temporal (trdcode_prueba_cuenta) que se
// crea con los scripts de database/, sin expedientes, y se borra al terminar.
// Uso, desde la raíz:  php scripts/probar_primera_cuenta.php [url de la aplicación]
// El servidor de MySQL sale del .env (o de TRDCODE_ENV). Con la url, comprueba además que la carpeta
// consola/ no se pueda abrir desde la web. No imprime contraseñas ni hashes.

if (PHP_SAPI !== 'cli') {
    exit;
}

const BASE = 'trdcode_prueba_cuenta';
$raiz = dirname(__DIR__);
$c = require "$raiz/api/lib/config.php";
if ($c['db_name'] === BASE) {
    exit("Corra la prueba con el .env de la instalación, no con el de la base temporal.\n");
}
$pdo = new PDO($c['db_dsn_servidor'], $c['db_user'], $c['db_pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

$fallos = 0;
$total = 0;
function comprobar(string $descripcion, bool $ok): void
{
    global $fallos, $total;
    $total++;
    if (!$ok) {
        $fallos++;
    }
    echo ($ok ? '  ok   ' : '  FALLA ') . $descripcion . PHP_EOL;
}

/** Corre el script con la entrada dada; devuelve [código de salida, salida y errores]. */
function correr(array $argumentos, string $entrada): array
{
    global $raiz;
    $comando = array_merge([PHP_BINARY, "$raiz/consola/crear_primera_cuenta.php"], $argumentos);
    $proceso = proc_open($comando, [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $tubos);
    fwrite($tubos[0], $entrada);
    fclose($tubos[0]);
    $salida = stream_get_contents($tubos[1]) . stream_get_contents($tubos[2]);
    fclose($tubos[1]);
    fclose($tubos[2]);
    return [proc_close($proceso), $salida];
}

$env = "$raiz/datos-prueba/prueba-cuenta.env";
$pdo->exec('DROP DATABASE IF EXISTS ' . BASE);
$pdo->exec('CREATE DATABASE ' . BASE . ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$pdo->exec('USE ' . BASE);
foreach (['schema.sql', 'datos_iniciales.sql', 'trd.sql'] as $archivo) {
    $pdo->exec(file_get_contents("$raiz/database/$archivo"));
}
if (!is_dir("$raiz/datos-prueba")) {
    mkdir("$raiz/datos-prueba");
}
$origen = getenv('TRDCODE_ENV') ?: "$raiz/.env";
file_put_contents($env, preg_replace('/^DB_NAME=.*$/m', 'DB_NAME=' . BASE, file_get_contents($origen)));

$cuentas = fn () => (int) $pdo->query('SELECT COUNT(*) FROM usuarios')->fetchColumn();
$correo = 'prueba-primera-' . bin2hex(random_bytes(4)) . '@trdcode.local';
$clave = bin2hex(random_bytes(8)); // 16 caracteres al azar
$clave2 = bin2hex(random_bytes(8));

try {
    echo "Argumentos y .env\n";
    [$codigo, $salida] = correr([], '');
    comprobar('sin --env se niega y explica el uso', $codigo !== 0 && str_contains($salida, '--env='));
    [$codigo] = correr(['--env=' . "$raiz/datos-prueba/no-existe.env"], '');
    comprobar('con un .env que no existe se niega', $codigo !== 0);

    echo "Datos inválidos (no crean nada)\n";
    $casos = [
        'correo inválido' => "no-es-correo\nNombre Prueba\n$clave\n$clave\n",
        'correo reservado del sistema' => "carga-inicial@trdcode.local\nNombre Prueba\n$clave\n$clave\n",
        'nombre vacío' => "$correo\n   \n$clave\n$clave\n",
        'contraseña corta' => "$correo\nNombre Prueba\ncorta\ncorta\n",
        'contraseñas distintas' => "$correo\nNombre Prueba\n$clave\n$clave2\n",
        'entrada cortada' => "$correo\n",
    ];
    foreach ($casos as $caso => $entrada) {
        [$codigo] = correr(["--env=$env"], $entrada);
        comprobar("$caso: se niega", $codigo !== 0 && $cuentas() === 0);
    }

    echo "Primera cuenta\n";
    [$codigo, $salida] = correr(["--env=$env"], strtoupper($correo) . "\n  Nombre   de Prueba \n$clave\n$clave\n");
    $fila = $pdo->query('SELECT * FROM usuarios')->fetch();
    comprobar('la crea (código 0)', $codigo === 0 && $cuentas() === 1);
    comprobar('correo en minúsculas y nombre sin espacios de más', $fila && $fila['correo'] === $correo && $fila['nombre'] === 'Nombre de Prueba');
    comprobar('guarda solo el hash de la contraseña', $fila && $fila['clave_hash'] !== $clave && password_verify($clave, $fila['clave_hash']));
    comprobar('queda activa y sin contraseña temporal', $fila && (int) $fila['activo'] === 1 && (int) $fila['debe_cambiar_clave'] === 0);
    comprobar('la salida no muestra la contraseña', !str_contains($salida, $clave));
    comprobar('sin avisos ni errores de PHP en la salida', !preg_match('/Warning|Notice|Deprecated|Fatal/i', $salida));

    echo "Ya hay una cuenta activa\n";
    [$codigo, $salida] = correr(["--env=$env"], "otra-$correo\nOtra Persona\n$clave2\n$clave2\n");
    comprobar('se niega a crear otra y remite a "Usuarios"', $codigo !== 0 && str_contains($salida, 'Usuarios') && $cuentas() === 1);
    $pdo->exec("INSERT INTO usuarios (correo, nombre, clave_hash, activo) VALUES ('carga-inicial@trdcode.local', 'Sistema', '', 0)");

    echo "Sin cuentas activas (recuperar el acceso)\n";
    $pdo->exec('UPDATE usuarios SET activo = 0');
    $version = (int) $pdo->query('SELECT sesion_version FROM usuarios WHERE correo = ' . $pdo->quote($correo))->fetchColumn();
    [$codigo, $salida] = correr(["--env=$env"], "$correo\nNombre Nuevo\n$clave2\n$clave2\n");
    $fila = $pdo->query('SELECT * FROM usuarios WHERE correo = ' . $pdo->quote($correo))->fetch();
    comprobar('reactiva la cuenta del mismo correo, sin duplicarla', $codigo === 0 && str_contains($salida, 'reactivada') && $cuentas() === 2);
    comprobar('con el nombre y la contraseña nuevos', (int) $fila['activo'] === 1 && $fila['nombre'] === 'Nombre Nuevo' && password_verify($clave2, $fila['clave_hash']));
    comprobar('cierra las sesiones anteriores de esa cuenta', (int) $fila['sesion_version'] === $version + 1);
    comprobar('la cuenta del sistema sigue inactiva', (int) $pdo->query("SELECT activo FROM usuarios WHERE correo = 'carga-inicial@trdcode.local'")->fetchColumn() === 0);

    if (isset($argv[1])) {
        echo "Desde la web\n";
        $url = rtrim($argv[1], '/');
        foreach (['consola/crear_primera_cuenta.php', 'consola/', 'consola/.htaccess'] as $ruta) {
            $cabeceras = @get_headers("$url/$ruta");
            $estado = $cabeceras ? (int) substr($cabeceras[0], 9, 3) : 0;
            comprobar("$ruta no se puede abrir (respondió $estado)", in_array($estado, [403, 404], true));
        }
    }
} finally {
    $pdo->exec('DROP DATABASE IF EXISTS ' . BASE);
    if (is_file($env)) {
        unlink($env);
    }
}

echo PHP_EOL . ($fallos === 0 ? "Todo bien: $total comprobaciones." : "$fallos de $total comprobaciones fallaron.") . PHP_EOL;
exit($fallos === 0 ? 0 : 1);
