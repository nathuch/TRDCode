<?php
// Router del servidor de desarrollo de PHP. Solo atiende los servicios de api/ (api/datos.php, ...)
// y responde 404 a todo lo demás: así el .env, datos-prueba/ y api/lib/ no se pueden pedir.
// Uso, desde la raíz del proyecto:
//   C:\xampp\php\php.exe -S 127.0.0.1:8000 scripts/servidor_dev.php
// Vite (npm run dev) reenvía a este servidor las llamadas a api/.

$ruta = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('#^/api/[a-z_]+\.php$#', $ruta) && is_file(__DIR__ . '/..' . $ruta)) {
    return false; // el servidor integrado ejecuta el archivo pedido
}
http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo 'No encontrado';
