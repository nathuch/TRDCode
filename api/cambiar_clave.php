<?php
// Cambia la contraseña de la usuaria de la sesión. Recibe por POST un JSON { "actual": ..., "nueva": ... },
// con sesión iniciada y el token CSRF. Se permite con una contraseña temporal: es justamente lo que hay
// que hacer antes de seguir. La nueva debe tener entre 10 y 72 caracteres (bcrypt ignora lo que pase de
// 72 bytes) y se guarda con password_hash(). Los fallos de la contraseña actual cuentan para el bloqueo.
// Al cambiarla se quita la marca de contraseña temporal y se cierran las otras sesiones de la cuenta.

require __DIR__ . '/lib/auth.php';

exigirMetodo('POST');

try {
    $usuario = requerirSesion(true);
    requerirCsrf();
    $entrada = leerJson();
    $actual = textoDe($entrada, 'actual');
    $nueva = textoDe($entrada, 'nueva');
    if ($actual === '' || $nueva === '') {
        responderError('Escriba la contraseña actual y la nueva.', 400);
    }
    $motivo = motivoClaveInvalida($nueva);
    if ($motivo !== null) {
        responderError(str_replace('La contraseña', 'La nueva contraseña', $motivo), 400);
    }

    $hash = verificarClaveActual($usuario, $actual);
    if (password_verify($nueva, $hash)) {
        responderError('La nueva contraseña debe ser distinta de la actual.', 400);
    }

    conexion()->prepare('UPDATE usuarios SET clave_hash = ?, debe_cambiar_clave = 0 WHERE id = ?')
        ->execute([password_hash($nueva, PASSWORD_DEFAULT), (int) $usuario['id']]);
    limpiarFallos($usuario['correo']);
    // Las demás sesiones de la cuenta se cierran; esta sigue, con un id nuevo.
    $_SESSION['version'] = cerrarSesionesDe((int) $usuario['id']);
    session_regenerate_id(true);
    responderOk(datosDeSesion($usuario['nombre']));
} catch (Throwable $e) {
    error_log('TRDCode cambiar_clave.php: ' . $e->getMessage());
    responderError('No se pudo cambiar la contraseña.');
}
