<?php
// "Mi cuenta": cambia el correo de ingreso de la usuaria de la sesión. POST con un JSON
// { "correo": ..., "clave": ... }, con sesión y token CSRF. Pide la contraseña actual (sus fallos cuentan
// para el bloqueo), valida el formato y que ninguna otra cuenta use ese correo. La respuesta no trae el correo.

require __DIR__ . '/lib/usuarios.php';

exigirMetodo('POST');

try {
    $usuario = requerirSesion();
    requerirCsrf();
    $entrada = leerJson();
    $clave = textoDe($entrada, 'clave');
    if ($clave === '') {
        responderError('Escriba su contraseña actual.', 400);
    }
    $correo = correoValido(textoDe($entrada, 'correo'), (int) $usuario['id']);
    verificarClaveActual($usuario, $clave);
    conexion()->prepare('UPDATE usuarios SET correo = ? WHERE id = ?')->execute([$correo, (int) $usuario['id']]);
    limpiarFallos($usuario['correo']);
    responderOk(['cambiado' => true]);
} catch (Throwable $e) {
    error_log('TRDCode cambiar_correo.php: ' . errorSinDatos($e));
    responderError('No se pudo cambiar el correo.');
}
