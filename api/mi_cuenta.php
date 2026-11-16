<?php
// "Mi cuenta": cambia el nombre completo de la usuaria de la sesión. POST con un JSON { "nombre": ... },
// con sesión y token CSRF. (El correo se cambia en cambiar_correo.php y la contraseña en cambiar_clave.php.)

require __DIR__ . '/lib/usuarios.php';

exigirMetodo('POST');

try {
    $usuario = requerirSesion();
    requerirCsrf();
    $nombre = nombreValido(textoDe(leerJson(), 'nombre'));
    conexion()->prepare('UPDATE usuarios SET nombre = ? WHERE id = ?')->execute([$nombre, (int) $usuario['id']]);
    responderOk(datosDeSesion($nombre));
} catch (Throwable $e) {
    error_log('TRDCode mi_cuenta.php: ' . $e->getMessage());
    responderError('No se pudo guardar el nombre.');
}
