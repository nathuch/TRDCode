<?php
// "Usuarios": crea una cuenta o edita otra. POST con un JSON, con sesión y token CSRF.
//   Crear:  { "nombre": ..., "correo": ..., "clave": ... }  la clave es temporal: se pide cambiarla al entrar.
//   Editar: { "id": n, "nombre": ..., "correo": ... }       no la propia (va en "Mi cuenta") ni la del sistema.
// El correo debe ser válido y no usarlo otra cuenta.

require __DIR__ . '/lib/usuarios.php';

exigirMetodo('POST');

try {
    $yo = requerirSesion();
    requerirCsrf();
    $entrada = leerJson();
    $pdo = conexion();

    if (!array_key_exists('id', $entrada)) {
        $nombre = nombreValido(textoDe($entrada, 'nombre'));
        $correo = correoValido(textoDe($entrada, 'correo'));
        $motivo = motivoClaveInvalida(textoDe($entrada, 'clave'));
        if ($motivo !== null) {
            responderError(str_replace('La contraseña', 'La contraseña temporal', $motivo), 400);
        }
        $pdo->prepare('INSERT INTO usuarios (correo, nombre, clave_hash, activo, debe_cambiar_clave) VALUES (?, ?, ?, 1, 1)')
            ->execute([$correo, $nombre, password_hash(textoDe($entrada, 'clave'), PASSWORD_DEFAULT)]);
        responderOk(['id' => (int) $pdo->lastInsertId()]);
    }

    $cuenta = otraCuenta($entrada, $yo);
    $nombre = nombreValido(textoDe($entrada, 'nombre'));
    $correo = correoValido(textoDe($entrada, 'correo'), (int) $cuenta['id']);
    $pdo->prepare('UPDATE usuarios SET nombre = ?, correo = ? WHERE id = ?')->execute([$nombre, $correo, (int) $cuenta['id']]);
    responderOk(['id' => (int) $cuenta['id']]);
} catch (PDOException $e) {
    // Dos altas simultáneas con el mismo correo: la llave única de la tabla lo impide.
    if ($e->getCode() === '23000') {
        responderError('Ese correo ya lo usa otra cuenta.', 409);
    }
    error_log('TRDCode usuario_guardar.php: ' . errorSinDatos($e));
    responderError('No se pudo guardar la cuenta.');
} catch (Throwable $e) {
    error_log('TRDCode usuario_guardar.php: ' . errorSinDatos($e));
    responderError('No se pudo guardar la cuenta.');
}
