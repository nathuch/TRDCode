<?php
// Historial de cargas guardadas: la activa y las anteriores que se conservan, con la fecha del reporte,
// cuándo se cargó, quién la hizo y cuántos expedientes tiene. GET, con sesión.

require __DIR__ . '/lib/validar.php';

exigirMetodo('GET');

try {
    requerirSesion();
    $consulta = conexion()->query(
        "SELECT c.id, c.fecha_reporte, c.fecha_carga, c.archivo, c.total_expedientes, c.estado, u.nombre AS usuario
         FROM cargas c JOIN usuarios u ON u.id = c.usuario_id
         WHERE c.estado IN ('activa', 'reemplazada')
         ORDER BY c.estado = 'activa' DESC, c.id DESC"
    );
    $cargas = [];
    foreach ($consulta as $c) {
        $c['id'] = (int) $c['id'];
        $c['total_expedientes'] = (int) $c['total_expedientes'];
        $cargas[] = $c;
    }
    responderOk(['cargas' => $cargas]);
} catch (Throwable $e) {
    error_log('TRDCode cargas.php: ' . $e->getMessage());
    responderError('No se pudo leer el historial de cargas.');
}
