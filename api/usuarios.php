<?php
// "Usuarios": lista de cuentas con nombre, correo, estado y último ingreso. GET, con sesión (todas las
// cuentas activas administran). Marca la propia (es_yo) y la del sistema (es_sistema). Sin hashes.

require __DIR__ . '/lib/usuarios.php';

exigirMetodo('GET');

try {
    $yo = requerirSesion();
    $consulta = conexion()->prepare(
        'SELECT id, nombre, correo, activo, debe_cambiar_clave, ultimo_ingreso FROM usuarios
         ORDER BY correo = ?, activo DESC, nombre'
    );
    $consulta->execute([CORREO_SISTEMA]);
    $cuentas = [];
    foreach ($consulta as $c) {
        $cuentas[] = [
            'id' => (int) $c['id'],
            'nombre' => $c['nombre'],
            'correo' => $c['correo'],
            'activo' => (int) $c['activo'] === 1,
            'debe_cambiar_clave' => (int) $c['debe_cambiar_clave'] === 1,
            'ultimo_ingreso' => $c['ultimo_ingreso'],
            'es_yo' => (int) $c['id'] === (int) $yo['id'],
            'es_sistema' => $c['correo'] === CORREO_SISTEMA,
        ];
    }
    responderOk(['cuentas' => $cuentas]);
} catch (Throwable $e) {
    error_log('TRDCode usuarios.php: ' . $e->getMessage());
    responderError('No se pudo leer la lista de cuentas.');
}
