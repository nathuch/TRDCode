/**
 * Cruce de los expedientes del reporte con la TRD (Fase 5).
 *
 * Cada dependencia recibe las series y subseries de la TRD de su plantilla, en cada
 * versión; así La Granja, que no tiene la dependencia .2, no recibe las series de
 * Administración Educativa. Los expedientes se agregan a la entrada de su llave
 * dependencia|versión|serie|subserie; si su código no existe en esa versión de la TRD,
 * se crea una entrada "fuera de la TRD" con el nombre que trae el reporte.
 */

export const ESTADOS = {
  CON: 'con',
  SIN: 'sin',
  SIN_PERIODO: 'sin_periodo',
  FUERA: 'fuera',
}

function llave(dependencia, version, serie, subserie) {
  return `${dependencia}|${version}|${serie}|${subserie}`
}

export function armarIndice(trd, dependencias, expedientes) {
  const porPlantilla = new Map()
  for (const registro of trd) {
    const clave = `${registro.version}|${registro.plantilla}`
    if (!porPlantilla.has(clave)) porPlantilla.set(clave, [])
    porPlantilla.get(clave).push(registro)
  }
  const versiones = [...new Set(trd.map((r) => r.version))]
  const dependenciaDe = new Map(dependencias.map((d) => [d.codigo, d]))

  const entradas = new Map()
  for (const dependencia of dependencias) {
    for (const version of versiones) {
      for (const registro of porPlantilla.get(`${version}|${dependencia.plantilla}`) ?? []) {
        const clave = llave(dependencia.codigo, version, registro.codigo_serie, registro.codigo_subserie)
        entradas.set(clave, {
          llave: clave,
          version,
          dependencia: dependencia.codigo,
          centro: dependencia.codigo_centro,
          plantilla: dependencia.plantilla,
          codigo_serie: registro.codigo_serie,
          codigo_subserie: registro.codigo_subserie,
          nombre_serie: registro.nombre_serie,
          nombre_subserie: registro.nombre_subserie,
          trd: registro,
          expedientes: [],
        })
      }
    }
  }

  for (const expediente of expedientes) {
    const dependencia = dependenciaDe.get(expediente.codigo_dependencia)
    if (!dependencia) continue
    const subserie = expediente.codigo_subserie ?? ''
    const clave = llave(dependencia.codigo, expediente.trd_version, expediente.codigo_serie, subserie)
    let entrada = entradas.get(clave)
    if (!entrada) {
      entrada = {
        llave: clave,
        version: expediente.trd_version,
        dependencia: dependencia.codigo,
        centro: dependencia.codigo_centro,
        plantilla: dependencia.plantilla,
        codigo_serie: expediente.codigo_serie,
        codigo_subserie: subserie,
        nombre_serie: expediente.nombre_serie,
        nombre_subserie: expediente.nombre_subserie,
        trd: null,
        expedientes: [],
      }
      entradas.set(clave, entrada)
    }
    entrada.expedientes.push(expediente)
  }
  return [...entradas.values()]
}

/** Expedientes de la entrada creados en los años elegidos (sin años elegidos, todos). */
export function expedientesEnPeriodo(expedientes, anios) {
  if (!anios?.length) return expedientes
  const elegidos = new Set(anios.map(Number))
  return expedientes.filter((e) => elegidos.has(e.anio))
}

/**
 * Estado de una serie o subserie: con expedientes en el período, sin expedientes en todo
 * el reporte, sin expedientes en el período filtrado (pero sí en otros años) o fuera de la TRD.
 */
export function clasificar({ trd, total, cantidad }) {
  if (!trd) return ESTADOS.FUERA
  if (cantidad > 0) return ESTADOS.CON
  return total > 0 ? ESTADOS.SIN_PERIODO : ESTADOS.SIN
}

/** Totales de las tarjetas: expedientes, con expedientes, sin expedientes y fuera de la TRD. */
export function resumen(filas) {
  const cuenta = { expedientes: 0, con: 0, sin: 0, fuera: 0 }
  for (const fila of filas) {
    cuenta.expedientes += fila.cantidad
    if (fila.estado === ESTADOS.CON) cuenta.con++
    else if (fila.estado === ESTADOS.FUERA) cuenta.fuera++
    else cuenta.sin++
  }
  return cuenta
}
