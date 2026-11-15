/**
 * Normalización del reporte de OnBase (Fase 4). Es la misma de scripts/generar_expedientes_sql.py,
 * regla por regla y en el mismo orden, para que el navegador y el script den los mismos expedientes:
 *   - Solo las dependencias de los tres centros (73.9226, 73.9310, 73.9123).
 *   - "Serie Código" 73.9226.4-85 -> dependencia 73.9226.4 y serie 85; "Subserie Código"
 *     73.9226.4-85.15 -> subserie 85.15 (vacía -> '').
 *   - Fecha de creación a AAAA-MM-DD (el Excel la trae como número de fecha).
 *   - Control de acceso PÚBLICO / PÚBLICO CLASIFICADO / PÚBLICO RESERVADO -> IPU / IPC / IPR.
 * A diferencia del script, cada fila con problemas queda en la lista con su número de fila, código y
 * motivo (sin el título), para mostrarla en la vista previa.
 */

// Las mismas de database/datos_iniciales.sql.
export const DEPENDENCIAS = new Set([
  '73.9226',
  '73.9226.2',
  '73.9226.4',
  '73.9310',
  '73.9310.2',
  '73.9310.4',
  '73.9123',
  '73.9123.4',
])
export const COLUMNAS = [
  'Código',
  'Título',
  'TRD',
  'Serie Código',
  'Subserie Serie Nombre',
  'Subserie Código',
  'Subserie',
  'Fecha Creación',
  'Control de Acceso',
]
const CONTROL = { PUBLICO: 'IPU', 'PUBLICO CLASIFICADO': 'IPC', 'PUBLICO RESERVADO': 'IPR' }

export const MOTIVOS = {
  SIN_SERIE: 'sin código de serie',
  CODIGO: 'código de expediente inválido',
  TRD: 'versión de TRD distinta de 10 u 11',
  FECHA: 'fecha de creación vacía o inválida',
  SUBSERIE: 'la subserie no pertenece a la serie',
  REPETIDO: 'código de expediente repetido',
}

function sinTildes(texto) {
  return texto.normalize('NFD').replace(/\p{Mn}/gu, '').toUpperCase().trim()
}

/** Recorta por caracteres, como texto[:n] en Python (no parte los caracteres de dos unidades). */
function recortar(texto, n) {
  const caracteres = Array.from(texto)
  return caracteres.length > n ? caracteres.slice(0, n).join('') : texto
}

function fechaIso(anio, mes, dia) {
  const d = new Date(Date.UTC(anio, mes - 1, dia))
  if (d.getUTCFullYear() !== anio || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null
  return d.toISOString().slice(0, 10)
}

/** Fecha del Excel (número de serie o texto) a AAAA-MM-DD; null si no se reconoce. */
export function fecha(texto) {
  texto = (texto ?? '').trim()
  if (/^\d+(\.\d+)?$/.test(texto)) {
    // Días desde el 30 de diciembre de 1899, sin la hora.
    const d = new Date(Date.UTC(1899, 11, 30) + Math.trunc(Number(texto)) * 86400000)
    return d.toISOString().slice(0, 10)
  }
  let m = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return fechaIso(+m[1], +m[2], +m[3])
  m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return fechaIso(+m[3], +m[2], +m[1])
  m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{1,2}):(\d{1,2}) ([AaPp][Mm])$/)
  if (m && +m[4] >= 1 && +m[4] <= 12 && +m[5] <= 59 && +m[6] <= 61) return fechaIso(+m[3], +m[1], +m[2])
  return null
}

/** '739226' y '73.9226' son lo mismo; se devuelve siempre con puntos. */
export function dependencia(codigo) {
  codigo = codigo.trim()
  if (/^\d{6,7}$/.test(codigo)) {
    codigo = `${codigo.slice(0, 2)}.${codigo.slice(2, 6)}` + (codigo.length > 6 ? `.${codigo.slice(6)}` : '')
  }
  return codigo
}

/** Centro al que pertenece una dependencia descartada: '1.7073.4' -> '1.7073'. */
function centroDescartado(dep) {
  const partes = dep.split('.')
  return dep.includes('.') ? `${partes[0]}.${partes[1]}` : dep
}

/** Columnas obligatorias que no están en el encabezado. */
export function columnasFaltantes(encabezado) {
  const presentes = encabezado.map((c) => String(c ?? '').trim())
  return COLUMNAS.filter((c) => !presentes.includes(c))
}

/**
 * Normaliza las filas del reporte (la primera es el encabezado, que está en la fila `primera` del
 * Excel). Devuelve:
 *   filas: filas de datos leídas (sin contar las vacías, que se saltan como en el script),
 *   validos: expedientes listos para cargar (cada uno con _fila, su número de fila en el Excel),
 *   descartados: { centro: cantidad } de las filas de otros centros,
 *   problemas: [{ fila, codigo, motivo }], en el orden del archivo.
 */
export function normalizar(filas, primera = 1) {
  const faltan = columnasFaltantes(filas[0] ?? [])
  if (faltan.length) throw new Error(`Al reporte le faltan las columnas: ${faltan.join(', ')}`)
  const encabezado = filas[0].map((c) => String(c ?? '').trim())
  const col = Object.fromEntries(COLUMNAS.map((c) => [c, encabezado.indexOf(c)]))

  const validos = []
  const descartados = {}
  const problemas = []
  let leidas = 0
  filas.slice(1).forEach((fila, i) => {
    if (fila.every((v) => String(v ?? '').trim() === '')) return
    leidas++
    const numero = primera + i + 1
    const dato = (c) => String(fila[col[c]] ?? '').trim()
    const serieCodigo = dato('Serie Código')
    if (!serieCodigo.includes('-')) {
      problemas.push({ fila: numero, codigo: dato('Código'), motivo: MOTIVOS.SIN_SERIE })
      return
    }
    const guion = serieCodigo.indexOf('-')
    const dep = dependencia(serieCodigo.slice(0, guion))
    const serie = serieCodigo.slice(guion + 1)
    if (!DEPENDENCIAS.has(dep)) {
      const centro = centroDescartado(dep)
      descartados[centro] = (descartados[centro] ?? 0) + 1
      return
    }
    const subserieCodigo = dato('Subserie Código')
    const subserie = subserieCodigo.includes('-') ? subserieCodigo.slice(subserieCodigo.indexOf('-') + 1) : ''
    const control = dato('Control de Acceso')
    const expediente = {
      codigo: dato('Código'),
      nombre: recortar(dato('Título'), 300),
      trd_version: dato('TRD'),
      codigo_dependencia: dep,
      codigo_serie: serie,
      codigo_subserie: subserie,
      nombre_serie: recortar(dato('Subserie Serie Nombre'), 200),
      nombre_subserie: recortar(dato('Subserie'), 250),
      fecha_creacion: fecha(dato('Fecha Creación')),
      control_acceso: CONTROL[sinTildes(control)] ?? recortar(control, 30),
    }
    let motivo = null
    if (!/^\d{4}EX-\d{6}$/.test(expediente.codigo)) motivo = MOTIVOS.CODIGO
    else if (!['10', '11'].includes(expediente.trd_version)) motivo = MOTIVOS.TRD
    else if (expediente.fecha_creacion === null) motivo = MOTIVOS.FECHA
    else if (subserie && !subserie.startsWith(`${serie}.`)) motivo = MOTIVOS.SUBSERIE
    if (motivo) {
      problemas.push({ fila: numero, codigo: expediente.codigo, motivo })
      return
    }
    expediente.anio = Number(expediente.fecha_creacion.slice(0, 4))
    expediente._fila = numero
    validos.push(expediente)
  })

  // Un código repetido no se carga en ninguna de sus filas; todas quedan marcadas.
  const filasPorCodigo = new Map()
  for (const e of validos) filasPorCodigo.set(e.codigo, [...(filasPorCodigo.get(e.codigo) ?? []), e._fila])
  const repetidos = validos.filter((e) => filasPorCodigo.get(e.codigo).length > 1)
  for (const e of repetidos) {
    const otras = filasPorCodigo.get(e.codigo).filter((f) => f !== e._fila)
    problemas.push({ fila: e._fila, codigo: e.codigo, motivo: `${MOTIVOS.REPETIDO} (también en ${otras.length === 1 ? 'la fila' : 'las filas'} ${otras.join(', ')})` })
  }
  problemas.sort((a, b) => a.fila - b.fila)

  return {
    filas: leidas,
    validos: repetidos.length ? validos.filter((e) => filasPorCodigo.get(e.codigo).length === 1) : validos,
    descartados,
    problemas,
  }
}

/** Expedientes por centro: { '73.9226': n, ... }. */
export function porCentro(expedientes) {
  const cuenta = {}
  for (const e of expedientes) {
    const centro = e.codigo_dependencia.split('.').slice(0, 2).join('.')
    cuenta[centro] = (cuenta[centro] ?? 0) + 1
  }
  return cuenta
}

/**
 * Series y subseries de los expedientes que no están en su versión de la TRD (un aviso, no un error):
 * [{ version, plantilla, codigo_serie, codigo_subserie, nombre, cantidad }].
 */
export function fueraDeTrd(expedientes, trd, dependencias) {
  const existentes = new Set(trd.map((r) => `${r.version}|${r.plantilla}|${r.codigo_serie}|${r.codigo_subserie}`))
  const plantilla = new Map(dependencias.map((d) => [d.codigo, d.plantilla]))
  const grupos = new Map()
  for (const e of expedientes) {
    const p = plantilla.get(e.codigo_dependencia)
    const clave = `${e.trd_version}|${p}|${e.codigo_serie}|${e.codigo_subserie}`
    if (existentes.has(clave)) continue
    if (!grupos.has(clave)) {
      grupos.set(clave, {
        version: e.trd_version,
        plantilla: p,
        codigo_serie: e.codigo_serie,
        codigo_subserie: e.codigo_subserie,
        nombre: e.codigo_subserie ? e.nombre_subserie : e.nombre_serie,
        cantidad: 0,
      })
    }
    grupos.get(clave).cantidad++
  }
  return [...grupos.values()].sort((a, b) => b.cantidad - a.cantidad)
}

/** Fecha que trae el nombre del archivo (reporte-2026-08-10.xlsx, 20260810, 10-08-2026); '' si no hay. */
export function fechaDelNombre(nombre) {
  let m = nombre.match(/(\d{4})[-_.]?(\d{2})[-_.]?(\d{2})/)
  if (m) return fechaIso(+m[1], +m[2], +m[3]) ?? ''
  m = nombre.match(/(\d{2})[-_.](\d{2})[-_.](\d{4})/)
  if (m) return fechaIso(+m[3], +m[2], +m[1]) ?? ''
  return ''
}
