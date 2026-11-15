<?php
// Validación de la importación del reporte en el servidor (Fase 4). No se confía en el navegador:
// cada expediente se revisa otra vez con las reglas de frontend/src/datos/normalizar.js y de
// scripts/generar_expedientes_sql.py, y cada lote debe pertenecer a una carga en proceso de la
// misma sesión y de la misma usuaria.

require_once __DIR__ . '/auth.php';

const LOTE_MAXIMO = 500;
const TOTAL_MAXIMO = 100000;
const IMPORTACION_MINUTOS = 30; // una carga en proceso sin actividad por más tiempo pasa a fallida
const CARGAS_ANTERIORES = 2; // además de la activa, se conservan las 2 anteriores

const CAMPOS_TEXTO = [
    'codigo' => 20,
    'nombre' => 300,
    'trd_version' => 4,
    'codigo_dependencia' => 12,
    'codigo_serie' => 10,
    'codigo_subserie' => 12,
    'nombre_serie' => 200,
    'nombre_subserie' => 250,
    'fecha_creacion' => 10,
    'control_acceso' => 30,
];

/** Códigos de las dependencias de los tres centros (tabla dependencias). */
function dependenciasValidas(): array
{
    static $codigos = null;
    if ($codigos === null) {
        $codigos = conexion()->query('SELECT codigo FROM dependencias')->fetchAll(PDO::FETCH_COLUMN);
    }
    return $codigos;
}

/** Motivo por el que un expediente no se puede cargar, o null si es válido. */
function motivoInvalido($e): ?string
{
    if (!is_array($e)) {
        return 'no es un expediente';
    }
    foreach (CAMPOS_TEXTO as $campo => $largo) {
        if (!is_string($e[$campo] ?? null)) {
            return "falta el campo $campo";
        }
        if (mb_strlen($e[$campo]) > $largo) {
            return "el campo $campo pasa de $largo caracteres";
        }
    }
    if (!is_int($e['anio'] ?? null)) {
        return 'falta el año';
    }
    if (!preg_match('/^\d{4}EX-\d{6}$/', $e['codigo'])) {
        return 'código de expediente inválido';
    }
    if (!in_array($e['trd_version'], ['10', '11'], true)) {
        return 'versión de TRD distinta de 10 u 11';
    }
    if (!in_array($e['codigo_dependencia'], dependenciasValidas(), true)) {
        return 'la dependencia no es de los tres centros';
    }
    if ($e['codigo_serie'] === '' || preg_match('/\s/u', $e['codigo_serie'])) {
        return 'código de serie inválido';
    }
    $subserie = $e['codigo_subserie'];
    if ($subserie !== '' && strpos($subserie, $e['codigo_serie'] . '.') !== 0) {
        return 'la subserie no pertenece a la serie';
    }
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $e['fecha_creacion'], $m) || !checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
        return 'fecha de creación vacía o inválida';
    }
    if ($e['anio'] !== (int) $m[1]) {
        return 'el año no coincide con la fecha de creación';
    }
    return null;
}

/**
 * Mensaje de un error para error_log sin los valores citados: MySQL puede citar parte del dato que
 * falló ("Incorrect string value: '...' for column 'nombre'") y los títulos traen nombres de personas.
 */
function errorSinDatos(Throwable $e): string
{
    return get_class($e) . ' ' . $e->getCode() . ': ' . preg_replace("/'[^']*'/u", "'…'", $e->getMessage());
}

/** Fecha AAAA-MM-DD válida, o null. */
function fechaValida(string $texto): ?string
{
    return preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $texto, $m) && checkdate((int) $m[2], (int) $m[3], (int) $m[1])
        ? $texto
        : null;
}

/** Entero positivo de la petición, o null. */
function enteroDe(array $entrada, string $campo): ?int
{
    $valor = $entrada[$campo] ?? null;
    return is_int($valor) && $valor > 0 ? $valor : null;
}

/**
 * La carga en proceso de esta sesión y de esta usuaria. Responde 409 si la carga no se inició en
 * esta sesión, si es de otra usuaria o si ya no está en proceso (terminó o se venció).
 */
function cargaEnProcesoDeLaSesion(?int $cargaId, array $usuario): array
{
    if ($cargaId === null || ($_SESSION['importacion'] ?? null) !== $cargaId) {
        responderError('Esta importación no se inició en esta sesión. Vuelva a empezar.', 409);
    }
    $consulta = conexion()->prepare(
        'SELECT id, usuario_id, total_esperado, total_expedientes, estado FROM cargas WHERE id = ?'
    );
    $consulta->execute([$cargaId]);
    $carga = $consulta->fetch();
    if (!$carga || (int) $carga['usuario_id'] !== (int) $usuario['id'] || $carga['estado'] !== 'en_proceso') {
        unset($_SESSION['importacion']);
        responderError('La importación ya no está en proceso (se venció o terminó). Vuelva a empezar.', 409);
    }
    return $carga;
}

/**
 * Pasa a fallida toda carga en proceso sin actividad por más de 30 minutos y borra sus expedientes.
 * Se llama dentro de una transacción. Devuelve cuántas cargas cambió.
 */
function marcarImportacionesVencidas(PDO $pdo): int
{
    $ids = $pdo->query(
        "SELECT id FROM cargas WHERE estado = 'en_proceso'
         AND fecha_carga < NOW() - INTERVAL " . IMPORTACION_MINUTOS . ' MINUTE FOR UPDATE'
    )->fetchAll(PDO::FETCH_COLUMN);
    if (!$ids) {
        return 0;
    }
    $marcas = implode(',', array_fill(0, count($ids), '?'));
    $pdo->prepare("DELETE FROM expedientes WHERE carga_id IN ($marcas)")->execute($ids);
    $pdo->prepare("UPDATE cargas SET estado = 'fallida', total_expedientes = 0 WHERE id IN ($marcas)")->execute($ids);
    return count($ids);
}
