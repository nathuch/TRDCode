<?php
// Vuelve a una carga anterior: POST con un JSON { "carga_id": n }, con sesión y token CSRF. Solo
// acepta una carga reemplazada; en una transacción la activa pasa a reemplazada y la elegida a activa.

require __DIR__ . '/lib/validar.php';

exigirMetodo('POST');

try {
    requerirSesion();
    requerirCsrf();
    $id = enteroDe(leerJson(), 'carga_id');
    if ($id === null) {
        responderError('Elija la carga a la que quiere volver.', 400);
    }

    $pdo = conexion();
    $pdo->beginTransaction();
    $consulta = $pdo->prepare('SELECT estado FROM cargas WHERE id = ? FOR UPDATE');
    $consulta->execute([$id]);
    if ($consulta->fetchColumn() !== 'reemplazada') {
        $pdo->rollBack();
        responderError('Solo se puede volver a una carga anterior guardada.', 409);
    }
    $pdo->exec("UPDATE cargas SET estado = 'reemplazada' WHERE estado = 'activa'");
    $pdo->prepare("UPDATE cargas SET estado = 'activa' WHERE id = ?")->execute([$id]);
    $pdo->commit();

    // Dos cargas pueden tener la misma fecha de datos: se devuelve también cuándo se cargó y quién.
    $consulta = $pdo->prepare(
        'SELECT c.fecha_reporte, c.fecha_carga, c.total_expedientes, u.nombre AS usuario
         FROM cargas c JOIN usuarios u ON u.id = c.usuario_id WHERE c.id = ?'
    );
    $consulta->execute([$id]);
    $carga = $consulta->fetch();
    responderOk([
        'carga_id' => $id,
        'fecha_reporte' => $carga['fecha_reporte'],
        'fecha_carga' => $carga['fecha_carga'],
        'usuario' => $carga['usuario'],
        'total_expedientes' => (int) $carga['total_expedientes'],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('TRDCode restaurar_carga.php: ' . $e->getMessage());
    responderError('No se pudo volver a esa carga.');
}
