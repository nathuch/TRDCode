<?php
// Inicia la importación de un reporte. Recibe por POST un JSON { "fecha_reporte": "AAAA-MM-DD",
// "archivo": "...", "total_esperado": n }, con sesión y token CSRF. Pasa a fallida cualquier carga
// en proceso de más de 30 minutos y crea una carga nueva en proceso, que la consulta no ve hasta
// que se finaliza.

require __DIR__ . '/lib/validar.php';

exigirMetodo('POST');

try {
    $usuario = requerirSesion();
    requerirCsrf();
    $entrada = leerJson();
    $fecha = fechaValida(textoDe($entrada, 'fecha_reporte'));
    if ($fecha === null) {
        responderError('Escriba la fecha del reporte.', 400);
    }
    $total = enteroDe($entrada, 'total_esperado');
    if ($total === null || $total > TOTAL_MAXIMO) {
        responderError('La cantidad de expedientes no es válida.', 400);
    }
    $archivo = mb_substr(basename(str_replace('\\', '/', textoDe($entrada, 'archivo'))), 0, 200);

    $pdo = conexion();
    $futura = $pdo->prepare('SELECT ? > CURDATE()');
    $futura->execute([$fecha]);
    if ((int) $futura->fetchColumn() === 1) {
        responderError('La fecha del reporte no puede ser posterior a hoy.', 400);
    }

    $pdo->beginTransaction();
    $vencidas = marcarImportacionesVencidas($pdo);
    $pdo->prepare(
        "INSERT INTO cargas (usuario_id, fecha_reporte, fecha_carga, archivo, total_esperado, total_expedientes, estado)
         VALUES (?, ?, NOW(), ?, ?, 0, 'en_proceso')"
    )->execute([(int) $usuario['id'], $fecha, $archivo === '' ? null : $archivo, $total]);
    $cargaId = (int) $pdo->lastInsertId();
    $pdo->commit();

    $_SESSION['importacion'] = $cargaId;
    responderOk(['carga_id' => $cargaId, 'lote_maximo' => LOTE_MAXIMO, 'vencidas' => $vencidas]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('TRDCode importar_iniciar.php: ' . $e->getMessage());
    responderError('No se pudo iniciar la importación.');
}
