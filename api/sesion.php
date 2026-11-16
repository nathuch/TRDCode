<?php
// Dice si hay una sesión iniciada y, si la hay, el nombre de la usuaria y el token CSRF
// que el frontend debe enviar en los servicios que cambian datos. Solo acepta GET.

require __DIR__ . '/lib/auth.php';

exigirMetodo('GET');

try {
    $usuario = abrirSesion(false) ? usuarioActual() : null;
    responderOk($usuario === null ? ['sesion' => false] : datosDeSesion($usuario['nombre'], $usuario['debe_cambiar_clave']));
} catch (Throwable $e) {
    error_log('TRDCode sesion.php: ' . $e->getMessage());
    responderError('No se pudo consultar la sesión.');
}
