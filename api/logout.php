<?php
// Cierra la sesión. Solo acepta POST, con sesión iniciada y el token CSRF.

require __DIR__ . '/lib/auth.php';

exigirMetodo('POST');

try {
    requerirSesion(true);
    requerirCsrf();
    cerrarSesion();
    responderOk(['sesion' => false]);
} catch (Throwable $e) {
    error_log('TRDCode logout.php: ' . $e->getMessage());
    responderError('No se pudo cerrar la sesión.');
}
