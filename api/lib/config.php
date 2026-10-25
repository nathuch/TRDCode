<?php
// Lee la configuración del archivo .env y la devuelve como arreglo.
// El .env no va al repositorio (la plantilla es .env.example). Se busca primero en la
// ruta de la variable de entorno TRDCODE_ENV y, si no está, en la raíz del proyecto.
// En producción el .env debe quedar fuera de la carpeta pública, indicado con TRDCODE_ENV.
$ruta = getenv('TRDCODE_ENV') ?: dirname(__DIR__, 2) . '/.env';
if (!is_file($ruta)) {
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
