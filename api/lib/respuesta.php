<?php
// Respuestas JSON de la API: { "ok": true, "datos": ... } o { "ok": false, "error": "mensaje" }.

/** $cache es la cabecera Cache-Control; datos.php manda 'private, no-store' cuando hay sesión. */
function responderOk($datos, string $cache = 'no-store'): void
{
    enviarJson(200, ['ok' => true, 'datos' => $datos], $cache);
}

/** $extra agrega campos a la respuesta de error (por ejemplo, los segundos que faltan de un bloqueo). */
function responderError(string $mensaje, int $codigoHttp = 500, array $extra = []): void
{
    enviarJson($codigoHttp, ['ok' => false, 'error' => $mensaje] + $extra);
}

/** Responde 405 si la petición no llega con el método esperado. */
function exigirMetodo(string $metodo): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== $metodo) {
        header('Allow: ' . $metodo);
        responderError('Método no permitido.', 405);
    }
}

/**
 * Mensaje de un error para error_log sin los valores citados: MySQL puede citar parte del dato que
 * falló ("Incorrect string value: '...' for column 'nombre'", "Duplicate entry '...'"), y los títulos
 * y correos traen datos de personas.
 */
function errorSinDatos(Throwable $e): string
{
    return get_class($e) . ' ' . $e->getCode() . ': ' . preg_replace("/'[^']*'/u", "'…'", $e->getMessage());
}

function enviarJson(int $codigoHttp, array $cuerpo, string $cache = 'no-store'): void
{
    // Comprime la respuesta si el navegador lo acepta (datos.php pesa alrededor de 1 MB).
    if (PHP_SAPI !== 'cli' && extension_loaded('zlib') && !ini_get('zlib.output_compression')) {
        ob_start('ob_gzhandler');
    }
    http_response_code($codigoHttp);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: ' . $cache);
    echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
