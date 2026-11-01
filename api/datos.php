<?php
// Entrega en un solo JSON lo que necesita la consulta: centros, dependencias, la TRD con sus
// tipos documentales y los expedientes de la carga activa. Es público y solo acepta GET.
// Con ocultar_nombres_reservados activo, el nombre de los expedientes que no son de información
// pública (IPC, IPR o sin clasificar) se reemplaza en la consulta: el nombre real no sale del servidor.

require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/respuesta.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    header('Allow: GET');
    responderError('Método no permitido.', 405);
}

/** Convierte un valor SET de MySQL ('CT,D') en lista. */
function lista(?string $valor): array
{
    return $valor === null || $valor === '' ? [] : explode(',', $valor);
}

try {
    $pdo = conexion();

    $centros = $pdo->query('SELECT codigo, nombre FROM centros ORDER BY nombre')->fetchAll();
    $dependencias = $pdo->query(
        'SELECT codigo, codigo_centro, plantilla, nombre FROM dependencias ORDER BY codigo'
    )->fetchAll();

    $registros = [];
    $consulta = $pdo->query(
        'SELECT id, version, plantilla, proceso, codigo_serie, nombre_serie, codigo_subserie, nombre_subserie,
                soporte, clasificacion, retencion_ag, retencion_ac, inicio_retencion, disposicion, procedimiento
         FROM trd_registros ORDER BY version, plantilla, codigo_serie, codigo_subserie'
    );
    foreach ($consulta as $r) {
        $id = (int) $r['id'];
        $registros[$id] = [
            'version' => $r['version'],
            'plantilla' => $r['plantilla'],
            'proceso' => $r['proceso'],
            'codigo_serie' => $r['codigo_serie'],
            'nombre_serie' => $r['nombre_serie'],
            'codigo_subserie' => $r['codigo_subserie'],
            'nombre_subserie' => $r['nombre_subserie'],
            'soporte' => lista($r['soporte']),
            'clasificacion' => lista($r['clasificacion']),
            'retencion_ag' => $r['retencion_ag'] === null ? null : (int) $r['retencion_ag'],
            'retencion_ac' => $r['retencion_ac'] === null ? null : (int) $r['retencion_ac'],
            'inicio_retencion' => $r['inicio_retencion'],
            'disposicion' => lista($r['disposicion']),
            'procedimiento' => $r['procedimiento'],
            'tipos' => [],
        ];
    }
    $consulta = $pdo->query('SELECT trd_id, grupo, nombre FROM trd_tipos_documentales ORDER BY trd_id, orden');
    foreach ($consulta as $t) {
        $id = (int) $t['trd_id'];
        if (isset($registros[$id])) {
            $registros[$id]['tipos'][] = ['grupo' => $t['grupo'], 'nombre' => $t['nombre']];
        }
    }

    $carga = $pdo->query(
        "SELECT id, fecha_reporte, fecha_carga, total_expedientes FROM cargas
         WHERE estado = 'activa' ORDER BY id DESC LIMIT 1"
    )->fetch() ?: null;

    $expedientes = [];
    if ($carga !== null) {
        $nombre = config()['ocultar_nombres_reservados']
            ? "CASE WHEN e.control_acceso = 'IPU' THEN e.nombre
                    ELSE CONCAT('Nombre reservado (', COALESCE(NULLIF(e.control_acceso, ''), 'sin clasificar'), ')') END"
            : 'e.nombre';
        $consulta = $pdo->prepare(
            "SELECT e.codigo, $nombre AS nombre, e.trd_version, e.codigo_dependencia, e.codigo_serie,
                    e.codigo_subserie, e.nombre_serie, e.nombre_subserie, e.fecha_creacion, e.anio, e.control_acceso
             FROM expedientes e WHERE e.carga_id = ? ORDER BY e.fecha_creacion DESC, e.codigo"
        );
        $consulta->execute([(int) $carga['id']]);
        foreach ($consulta as $e) {
            $e['anio'] = $e['anio'] === null ? null : (int) $e['anio'];
            $expedientes[] = $e;
        }
        $carga = [
            'fecha_reporte' => $carga['fecha_reporte'],
            'fecha_carga' => $carga['fecha_carga'],
            'total_expedientes' => (int) $carga['total_expedientes'],
        ];
    }

    responderOk([
        'carga' => $carga,
        'centros' => $centros,
        'dependencias' => $dependencias,
        'trd' => array_values($registros),
        'expedientes' => $expedientes,
    ]);
} catch (Throwable $e) {
    error_log('TRDCode datos.php: ' . $e->getMessage());
    responderError('No se pudieron leer los datos. Revise la conexión a la base de datos.');
}
