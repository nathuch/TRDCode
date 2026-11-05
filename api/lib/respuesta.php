<?php
// Respuestas JSON de la API: { "ok": true, "datos": ... } o { "ok": false, "error": "mensaje" }.

function responderOk($datos): void
{
    enviarJson(200, ['ok' => true, 'datos' => $datos]);
}

function responderError(string $mensaje, int $codigoHttp = 500): void
{
    enviarJson($codigoHttp, ['ok' => false, 'error' => $mensaje]);
}

function enviarJson(int $codigoHttp, array $cuerpo): void
{
    // Comprime la respuesta si el navegador lo acepta (datos.php pesa alrededor de 1 MB).
    if (PHP_SAPI !== 'cli' && extension_loaded('zlib') && !ini_get('zlib.output_compression')) {
        ob_start('ob_gzhandler');
    }
    http_response_code($codigoHttp);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
