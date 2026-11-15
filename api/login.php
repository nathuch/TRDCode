<?php
// Inicio de sesión de la persona encargada. Recibe por POST un JSON { "correo": ..., "clave": ... }.
// Solo entran usuarios activos. Ante cualquier fallo responde el mismo mensaje, sin decir si el
// correo existe. Con bloqueo (5 fallos de la pareja correo + IP, o 20 desde la IP, en 15 minutos)
// responde 429 con lo que falta.

require __DIR__ . '/lib/auth.php';

exigirMetodo('POST');
$entrada = leerJson();
$correo = normalizarCorreo(textoDe($entrada, 'correo'));
$clave = textoDe($entrada, 'clave');
if ($correo === '' || $clave === '') {
    responderError('Escriba el correo y la contraseña.', 400);
}

try {
    $ip = ipCliente();
    $espera = segundosDeBloqueo($correo, $ip);
    if ($espera > 0) {
        responderBloqueo($espera);
    }

    $pdo = conexion();
    $consulta = $pdo->prepare('SELECT id, nombre, clave_hash, activo FROM usuarios WHERE correo = ?');
    $consulta->execute([$correo]);
    $usuario = $consulta->fetch() ?: null;

    $claveCorrecta = password_verify($clave, $usuario['clave_hash'] ?? HASH_FICTICIO);
    if (!$claveCorrecta || $usuario === null || (int) $usuario['activo'] !== 1) {
        registrarFallo($correo, $ip);
        $espera = segundosDeBloqueo($correo, $ip);
        if ($espera > 0) {
            responderBloqueo($espera);
        }
        responderError(MENSAJE_CREDENCIALES, 401);
    }

    if (password_needs_rehash($usuario['clave_hash'], PASSWORD_DEFAULT)) {
        $pdo->prepare('UPDATE usuarios SET clave_hash = ? WHERE id = ?')
            ->execute([password_hash($clave, PASSWORD_DEFAULT), (int) $usuario['id']]);
    }
    limpiarFallos($correo);
    iniciarSesionUsuario((int) $usuario['id']);
    responderOk(datosDeSesion($usuario['nombre']));
} catch (Throwable $e) {
    error_log('TRDCode login.php: ' . $e->getMessage());
    responderError('No se pudo iniciar sesión. Intente de nuevo más tarde.');
}
