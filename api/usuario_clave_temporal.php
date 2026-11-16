<?php
// "Usuarios": pone una contraseña temporal a otra cuenta. POST con un JSON { "id": n, "clave": ... }, con
// sesión y token CSRF. La cuenta deberá cambiarla al entrar; sus sesiones abiertas se cierran y se le
// quitan los intentos fallidos (para que pueda entrar si estaba bloqueada).

require __DIR__ . '/lib/usuarios.php';

exigirMetodo('POST');

try {
    $yo = requerirSesion();
    requerirCsrf();
    $entrada = leerJson();
    $cuenta = otraCuenta($entrada, $yo);
    $clave = textoDe($entrada, 'clave');
    $motivo = motivoClaveInvalida($clave);
    if ($motivo !== null) {
        responderError(str_replace('La contraseña', 'La contraseña temporal', $motivo), 400);
    }
    conexion()->prepare('UPDATE usuarios SET clave_hash = ?, debe_cambiar_clave = 1 WHERE id = ?')
        ->execute([password_hash($clave, PASSWORD_DEFAULT), (int) $cuenta['id']]);
    cerrarSesionesDe((int) $cuenta['id']);
    limpiarFallos($cuenta['correo']);
    responderOk(['id' => (int) $cuenta['id']]);
} catch (Throwable $e) {
    error_log('TRDCode usuario_clave_temporal.php: ' . $e->getMessage());
    responderError('No se pudo poner la contraseña temporal.');
}
