<?php
// Recibe un lote de hasta 500 expedientes de la importación en curso: POST con un JSON
// { "carga_id": n, "expedientes": [...] }, con sesión y token CSRF. Revalida cada expediente; si uno
// solo es inválido o ya se había recibido, rechaza el lote entero. Inserta en una transacción y solo
// en una carga en proceso de esta sesión. Las respuestas no incluyen títulos de expedientes.

require __DIR__ . '/lib/validar.php';

exigirMetodo('POST');

const CAMPOS_EXPEDIENTE = ['codigo', 'nombre', 'trd_version', 'codigo_dependencia', 'codigo_serie', 'codigo_subserie',
    'nombre_serie', 'nombre_subserie', 'fecha_creacion', 'anio', 'control_acceso'];

/** Datos para señalar un expediente en un error: posición en el lote, fila del Excel y código. */
function senal(int $indice, $e, string $motivo): array
{
    return [
        'indice' => $indice,
        'fila' => is_array($e) && is_int($e['_fila'] ?? null) ? $e['_fila'] : null,
        'codigo' => is_array($e) && is_string($e['codigo'] ?? null) ? mb_substr($e['codigo'], 0, 20) : '',
        'motivo' => $motivo,
    ];
}

try {
    $usuario = requerirSesion();
    requerirCsrf();
    $entrada = leerJson();
    $carga = cargaEnProcesoDeLaSesion(enteroDe($entrada, 'carga_id'), $usuario);

    $lote = $entrada['expedientes'] ?? null;
    if (!is_array($lote) || !array_is_list($lote) || count($lote) === 0 || count($lote) > LOTE_MAXIMO) {
        responderError('Cada lote debe traer entre 1 y ' . LOTE_MAXIMO . ' expedientes.', 400);
    }

    $errores = [];
    $codigos = [];
    foreach ($lote as $i => $e) {
        $motivo = motivoInvalido($e);
        if ($motivo === null && isset($codigos[$e['codigo']])) {
            $motivo = 'código de expediente repetido en el lote';
        }
        if ($motivo !== null) {
            $errores[] = senal($i, $e, $motivo);
        } else {
            $codigos[$e['codigo']] = true;
        }
    }
    if ($errores) {
        responderError('El lote tiene expedientes inválidos; no se cargó ninguno.', 400, ['errores' => array_slice($errores, 0, 50)]);
    }
    if ((int) $carga['total_expedientes'] + count($lote) > (int) $carga['total_esperado']) {
        responderError('El lote pasa de la cantidad anunciada al iniciar la importación.', 400);
    }

    $pdo = conexion();
    $marcas = implode(',', array_fill(0, count($lote), '?'));
    $recibidos = $pdo->prepare("SELECT codigo FROM expedientes WHERE carga_id = ? AND codigo IN ($marcas)");
    $recibidos->execute(array_merge([(int) $carga['id']], array_keys($codigos)));
    $repetidos = $recibidos->fetchAll(PDO::FETCH_COLUMN);
    if ($repetidos) {
        $errores = [];
        foreach ($lote as $i => $e) {
            if (in_array($e['codigo'], $repetidos, true)) {
                $errores[] = senal($i, $e, 'ya se había recibido en esta importación');
            }
        }
        responderError('El lote trae expedientes que ya se habían recibido; no se cargó ninguno.', 409, ['errores' => array_slice($errores, 0, 50)]);
    }

    $fila = '(' . implode(',', array_fill(0, count(CAMPOS_EXPEDIENTE) + 1, '?')) . ')';
    $valores = [];
    foreach ($lote as $e) {
        $valores[] = (int) $carga['id'];
        foreach (CAMPOS_EXPEDIENTE as $campo) {
            $valores[] = $e[$campo];
        }
    }
    $pdo->beginTransaction();
    $pdo->prepare(
        'INSERT INTO expedientes (carga_id, ' . implode(', ', CAMPOS_EXPEDIENTE) . ') VALUES '
        . implode(',', array_fill(0, count($lote), $fila))
    )->execute($valores);
    // fecha_carga guarda la última actividad mientras la carga está en proceso.
    $actualizar = $pdo->prepare(
        "UPDATE cargas SET total_expedientes = total_expedientes + ?, fecha_carga = NOW()
         WHERE id = ? AND estado = 'en_proceso'"
    );
    $actualizar->execute([count($lote), (int) $carga['id']]);
    if ($actualizar->rowCount() !== 1) {
        $pdo->rollBack();
        responderError('La importación ya no está en proceso. Vuelva a empezar.', 409);
    }
    $pdo->commit();

    responderOk(['recibidos' => (int) $carga['total_expedientes'] + count($lote)]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('TRDCode importar_lote.php: ' . errorSinDatos($e));
    responderError('No se pudo guardar el lote.');
}
