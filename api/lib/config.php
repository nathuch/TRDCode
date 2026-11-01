<?php
// Lee la configuración del archivo .env y la devuelve como arreglo.
// El .env no va al repositorio (la plantilla es .env.example) ni a la carpeta pública.
// Se busca en este orden:
//   1. La ruta de la variable de entorno TRDCODE_ENV.
//   2. Fuera de la carpeta pública, junto a ella, con el nombre de la carpeta de la aplicación:
//      con la aplicación en C:\xampp\htdocs\TRDCode, el archivo es C:\xampp\TRDCode.env.
//   3. La raíz del proyecto (solo en desarrollo).
$raiz = dirname(__DIR__, 2);
$candidatas = [getenv('TRDCODE_ENV') ?: null];
if (!empty($_SERVER['DOCUMENT_ROOT'])) {
    $candidatas[] = dirname(realpath($_SERVER['DOCUMENT_ROOT']) ?: $_SERVER['DOCUMENT_ROOT']) . '/' . basename($raiz) . '.env';
}
$candidatas[] = $raiz . '/.env';
$ruta = null;
foreach ($candidatas as $candidata) {
    if ($candidata !== null && is_file($candidata)) {
        $ruta = $candidata;
        break;
    }
}
if ($ruta === null) {
    throw new RuntimeException('No se encontró el archivo .env de TRDCode.');
}

$valores = [];
foreach (file($ruta, FILE_IGNORE_NEW_LINES) as $linea) {
    $linea = trim($linea);
    if ($linea === '' || $linea[0] === '#' || !str_contains($linea, '=')) {
        continue;
    }
    [$clave, $valor] = array_map('trim', explode('=', $linea, 2));
    // Admite valores entre comillas: DB_PASS="clave con espacios"
    if (strlen($valor) >= 2 && ($valor[0] === '"' || $valor[0] === "'") && $valor[-1] === $valor[0]) {
        $valor = substr($valor, 1, -1);
    }
    $valores[$clave] = $valor;
}

return [
    'db_host' => $valores['DB_HOST'] ?? 'localhost',
    'db_name' => $valores['DB_NAME'] ?? 'trdcode',
    'db_user' => $valores['DB_USER'] ?? '',
    'db_pass' => $valores['DB_PASS'] ?? '',
    // Solo se desactiva con "false" explícito: ante un valor mal escrito, los nombres siguen ocultos.
    'ocultar_nombres_reservados' => strtolower($valores['OCULTAR_NOMBRES_RESERVADOS'] ?? 'true') !== 'false',
];
