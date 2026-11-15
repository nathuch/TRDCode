<?php
// Termina la importación en curso: POST con un JSON { "carga_id": n }, con sesión y token CSRF.
// Comprueba que hayan llegado todos los expedientes anunciados y, en una sola transacción, activa la
// carga nueva, pasa la anterior a reemplazada y borra las cargas más viejas que la activa y las 2
// anteriores (y las fallidas). Si falta algo, la carga pasa a fallida y la consulta no cambia.

require __DIR__ . '/lib/validar.php';

exigirMetodo('POST');

try {
    $usuario = requerirSesion();
    requerirCsrf();
    $entrada = leerJson();
    $carga = cargaEnProcesoDeLaSesion(enteroDe($entrada, 'carga_id'), $usuario);
    $id = (int) $carga['id'];

    $pdo = conexion();
    $pdo->beginTransaction();
    $contar = $pdo->prepare('SELECT COUNT(*) FROM expedientes WHERE carga_id = ?');
    $contar->execute([$id]);
    $recibidos = (int) $contar->fetchColumn();
    if ($recibidos !== (int) $carga['total_esperado']) {
        $pdo->prepare('DELETE FROM expedientes WHERE carga_id = ?')->execute([$id]);
        $pdo->prepare("UPDATE cargas SET estado = 'fallida', total_expedientes = 0 WHERE id = ?")->execute([$id]);
        $pdo->commit();
        unset($_SESSION['importacion']);
        responderError(
            "Se esperaban {$carga['total_esperado']} expedientes y llegaron $recibidos. La carga no se activó: vuelva a importar el reporte.",
            400
        );
    }

    $pdo->query("SELECT id FROM cargas WHERE estado IN ('activa', 'reemplazada') FOR UPDATE")->fetchAll();
    $pdo->exec("UPDATE cargas SET estado = 'reemplazada' WHERE estado = 'activa'");
    $activar = $pdo->prepare(
        "UPDATE cargas SET estado = 'activa', total_expedientes = ?, fecha_carga = NOW() WHERE id = ? AND estado = 'en_proceso'"
    );
    $activar->execute([$recibidos, $id]);
    if ($activar->rowCount() !== 1) {
        $pdo->rollBack();
        responderError('La importación ya no está en proceso. Vuelva a empezar.', 409);
    }

    // Se conservan la activa y las 2 anteriores más recientes; lo demás (y lo fallido) se borra.
    $reemplazadas = $pdo->query("SELECT id FROM cargas WHERE estado = 'reemplazada' ORDER BY id DESC")->fetchAll(PDO::FETCH_COLUMN);
    $fallidas = $pdo->query("SELECT id FROM cargas WHERE estado = 'fallida'")->fetchAll(PDO::FETCH_COLUMN);
    $borrar = array_merge(array_slice($reemplazadas, CARGAS_ANTERIORES), $fallidas);
    if ($borrar) {
        // Los expedientes se borran con la carga (ON DELETE CASCADE).
        $marcas = implode(',', array_fill(0, count($borrar), '?'));
        $pdo->prepare("DELETE FROM cargas WHERE id IN ($marcas)")->execute($borrar);
    }
    $pdo->commit();
    unset($_SESSION['importacion']);

    $consulta = $pdo->prepare('SELECT fecha_reporte, fecha_carga, total_expedientes FROM cargas WHERE id = ?');
    $consulta->execute([$id]);
    $activa = $consulta->fetch();
    responderOk([
        'carga_id' => $id,
        'fecha_reporte' => $activa['fecha_reporte'],
        'fecha_carga' => $activa['fecha_carga'],
        'total_expedientes' => (int) $activa['total_expedientes'],
        'cargas_borradas' => count($borrar),
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('TRDCode importar_finalizar.php: ' . errorSinDatos($e));
    responderError('No se pudo terminar la importación. La consulta sigue con los datos anteriores.');
}
