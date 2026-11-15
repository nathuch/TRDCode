<?php
// Cambia la contraseña de la usuaria de la sesión. Recibe por POST un JSON { "actual": ..., "nueva": ... },
// con sesión iniciada y el token CSRF. La nueva debe tener entre 10 y 72 caracteres (bcrypt ignora lo
// que pase de 72 bytes) y se guarda con password_hash(). Los fallos de la contraseña actual cuentan
// para el bloqueo, igual que en el inicio de sesión.

require __DIR__ . '/lib/auth.php';

exigirMetodo('POST');

try {
    $usuario = requerirSesion();
    requerirCsrf();
    $entrada = leerJson();
    $actual = textoDe($entrada, 'actual');
    $nueva = textoDe($entrada, 'nueva');
    if ($actual === '' || $nueva === '') {
        responderError('Escriba la contraseña actual y la nueva.', 400);
    }
    if (mb_strlen($nueva) < 10) {
        responderError('La nueva contraseña debe tener al menos 10 caracteres.', 400);
    }
    if (strlen($nueva) > 72) {
        responderError('La nueva contraseña es demasiado larga (máximo 72 caracteres).', 400);
    }

    $ip = ipCliente();
    $espera = segundosDeBloqueo($usuario['correo'], $ip);
    if ($espera > 0) {
        responderBloqueo($espera);
    }

    $pdo = conexion();
    $consulta = $pdo->prepare('SELECT clave_hash FROM usuarios WHERE id = ?');
    $consulta->execute([(int) $usuario['id']]);
    $hash = (string) $consulta->fetchColumn();
    if (!password_verify($actual, $hash)) {
        registrarFallo($usuario['correo'], $ip);
        $espera = segundosDeBloqueo($usuario['correo'], $ip);
        if ($espera > 0) {
            responderBloqueo($espera);
        }
        responderError('La contraseña actual no es correcta.', 400);
    }
    if (password_verify($nueva, $hash)) {
        responderError('La nueva contraseña debe ser distinta de la actual.', 400);
    }

    $pdo->prepare('UPDATE usuarios SET clave_hash = ? WHERE id = ?')
        ->execute([password_hash($nueva, PASSWORD_DEFAULT), (int) $usuario['id']]);
    limpiarFallos($usuario['correo']);
    session_regenerate_id(true);
    responderOk(datosDeSesion($usuario['nombre']));
} catch (Throwable $e) {
    error_log('TRDCode cambiar_clave.php: ' . $e->getMessage());
    responderError('No se pudo cambiar la contraseña.');
}
