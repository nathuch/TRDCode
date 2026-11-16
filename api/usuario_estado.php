<?php
// "Usuarios": activa o desactiva otra cuenta. POST con un JSON { "id": n, "activo": true|false }, con
// sesión y token CSRF. Nadie puede desactivarse a sí misma y siempre queda al menos una cuenta activa.
// Al desactivar, sus sesiones abiertas se cierran. Las cuentas no se borran: las cargas guardan quién
// las hizo.

require __DIR__ . '/lib/usuarios.php';

exigirMetodo('POST');

try {
    $yo = requerirSesion();
    requerirCsrf();
    $entrada = leerJson();
    $activo = $entrada['activo'] ?? null;
    if (!is_bool($activo)) {
        responderError('Indique si la cuenta queda activa o inactiva.', 400);
    }
    if (($entrada['id'] ?? null) === (int) $yo['id'] && !$activo) {
        responderError('No puede desactivar su propia cuenta.', 409);
    }
    $cuenta = otraCuenta($entrada, $yo);

    $pdo = conexion();
    $pdo->beginTransaction();
    // Se bloquean las cuentas activas para que dos desactivaciones a la vez no dejen ninguna.
    $pdo->prepare('SELECT id FROM usuarios WHERE activo = 1 AND correo <> ? FOR UPDATE')->execute([CORREO_SISTEMA]);
    if (!$activo && (int) $cuenta['activo'] === 1 && cuentasActivas() <= 1) {
        $pdo->rollBack();
        responderError('Debe quedar al menos una cuenta activa.', 409);
    }
    $pdo->prepare('UPDATE usuarios SET activo = ? WHERE id = ?')->execute([$activo ? 1 : 0, (int) $cuenta['id']]);
    if (!$activo) {
        cerrarSesionesDe((int) $cuenta['id']);
    }
    $pdo->commit();
    responderOk(['id' => (int) $cuenta['id'], 'activo' => $activo]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('TRDCode usuario_estado.php: ' . $e->getMessage());
    responderError('No se pudo cambiar el estado de la cuenta.');
}
