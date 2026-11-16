<?php
// Cuentas editables (RF-17): validaciones comunes de "Mi cuenta" y "Usuarios". Todas las cuentas
// activas administran las demás. Las cuentas no se borran: las cargas guardan quién las hizo.
// Nunca se devuelven ni se registran contraseñas ni hashes.

require_once __DIR__ . '/auth.php';

// Usuario técnico que registra la carga inicial (scripts/generar_expedientes_sql.py). No inicia sesión
// ni se puede editar; en la lista aparece como "Sistema".
const CORREO_SISTEMA = 'carga-inicial@trdcode.local';

/** Nombre completo válido (recortado), o responde 400. */
function nombreValido(string $nombre): string
{
    $nombre = trim(preg_replace('/\s+/u', ' ', $nombre));
    if ($nombre === '') {
        responderError('Escriba el nombre completo.', 400);
    }
    if (mb_strlen($nombre) > 120) {
        responderError('El nombre es demasiado largo (máximo 120 caracteres).', 400);
    }
    return $nombre;
}

/**
 * Correo válido (en minúsculas) que no usa otra cuenta, o responde 400 o 409. $excepto es la cuenta
 * que se está editando.
 */
function correoValido(string $correo, ?int $excepto = null): string
{
    $correo = normalizarCorreo($correo);
    if ($correo === '' || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        responderError('El correo no es válido.', 400);
    }
    if ($correo === CORREO_SISTEMA) {
        responderError('Ese correo está reservado.', 409);
    }
    $consulta = conexion()->prepare('SELECT COUNT(*) FROM usuarios WHERE correo = ? AND id <> ?');
    $consulta->execute([$correo, $excepto ?? 0]);
    if ((int) $consulta->fetchColumn() > 0) {
        responderError('Ese correo ya lo usa otra cuenta.', 409);
    }
    return $correo;
}

/**
 * Otra cuenta que se puede administrar desde "Usuarios": responde 400 si no llega el id, 404 si no
 * existe, 403 si es la cuenta "Sistema" y 409 si es la propia (esa se edita en "Mi cuenta").
 */
function otraCuenta(array $entrada, array $yo): array
{
    $id = $entrada['id'] ?? null;
    if (!is_int($id) || $id <= 0) {
        responderError('Falta la cuenta.', 400);
    }
    $consulta = conexion()->prepare('SELECT id, correo, nombre, activo FROM usuarios WHERE id = ?');
    $consulta->execute([$id]);
    $cuenta = $consulta->fetch();
    if (!$cuenta) {
        responderError('Esa cuenta no existe.', 404);
    }
    if ($cuenta['correo'] === CORREO_SISTEMA) {
        responderError('La cuenta del sistema no se puede modificar.', 403);
    }
    if ((int) $cuenta['id'] === (int) $yo['id']) {
        responderError('Su propia cuenta se modifica en "Mi cuenta".', 409);
    }
    return $cuenta;
}

/** Cuentas activas que pueden entrar (sin contar la del sistema). */
function cuentasActivas(): int
{
    $consulta = conexion()->prepare('SELECT COUNT(*) FROM usuarios WHERE activo = 1 AND correo <> ?');
    $consulta->execute([CORREO_SISTEMA]);
    return (int) $consulta->fetchColumn();
}
