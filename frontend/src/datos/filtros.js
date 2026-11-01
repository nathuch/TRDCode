/**
 * Filtros en cascada y buscador (Fase 6). Todo parte de las entradas de armarIndice().
 *
 * Orden de la cascada: TRD -> centro -> dependencia -> serie -> subserie, más el año.
 * La TRD es de selección única; los demás filtros admiten varios valores. La dependencia
 * se elige por plantilla ("Formación Profesional Integral"), que vale para todos los centros.
 */
import { clasificar, ESTADOS, expedientesEnPeriodo } from './cruce.js'
import { compararCodigos, normalizarTexto } from './texto.js'

export const ESTADO_INICIAL = {
  trd: '11',
  centros: [],
  dependencias: [],
  series: [],
  subseries: [],
  anios: [],
  texto: '',
}

// Al cambiar un filtro se limpian los que dependen de él.
const DEPENDIENTES = {
  trd: ['series', 'subseries'],
  centros: ['dependencias', 'series', 'subseries'],
  dependencias: ['series', 'subseries'],
  series: ['subseries'],
}

export const ORDEN_PLANTILLAS = ['00.9000', '00.9000.2', '00.9000.4']

export function cambiarFiltro(estado, campo, valor) {
  const nuevo = { ...estado, [campo]: valor }
  for (const dependiente of DEPENDIENTES[campo] ?? []) nuevo[dependiente] = []
  return nuevo
}

function dentro(lista, valor) {
  return lista.length === 0 || lista.includes(valor)
}

/** Entradas de la TRD elegida que pasan los filtros anteriores a `hasta` en la cascada. */
function entradasDeLaCascada(estado, entradas, hasta) {
  const pasos = ['centros', 'dependencias', 'series', 'subseries']
  const usados = pasos.includes(hasta) ? pasos.slice(0, pasos.indexOf(hasta)) : pasos
  return entradas.filter(
    (e) =>
      e.version === estado.trd &&
      (!usados.includes('centros') || dentro(estado.centros, e.centro)) &&
      (!usados.includes('dependencias') || dentro(estado.dependencias, e.plantilla)) &&
      (!usados.includes('series') || dentro(estado.series, e.codigo_serie)) &&
      (!usados.includes('subseries') || dentro(estado.subseries, e.codigo_subserie)),
  )
}

/** Opciones válidas de cada filtro según los anteriores: [{ valor, nombre }]. */
export function opcionesDisponibles(estado, entradas, catalogo) {
  const nombreCentro = new Map(catalogo.centros.map((c) => [c.codigo, c.nombre]))
  const nombreDependencia = new Map(catalogo.dependencias.map((d) => [d.plantilla, d.nombre]))

  const unicas = (lista, valor, nombre, ordenar) => {
    const mapa = new Map()
    for (const e of lista) {
      const v = valor(e)
      if (v !== '' && !mapa.has(v)) mapa.set(v, nombre(e))
    }
    return [...mapa].map(([v, n]) => ({ valor: v, nombre: n })).sort(ordenar)
  }
  const porCodigo = (a, b) => compararCodigos(a.valor, b.valor)

  const paraSeries = entradasDeLaCascada(estado, entradas, 'series')
  const paraSubseries = entradasDeLaCascada(estado, entradas, 'subseries')
  const paraAnios = entradasDeLaCascada(estado, entradas, 'anios')
  const anios = new Set()
  for (const e of paraAnios) for (const x of e.expedientes) if (x.anio) anios.add(x.anio)

  return {
    centros: unicas(
      entradasDeLaCascada(estado, entradas, 'centros'),
      (e) => e.centro,
      (e) => nombreCentro.get(e.centro) ?? e.centro,
      (a, b) => a.nombre.localeCompare(b.nombre),
    ),
    dependencias: unicas(
      entradasDeLaCascada(estado, entradas, 'dependencias'),
      (e) => e.plantilla,
      (e) => nombreDependencia.get(e.plantilla) ?? e.plantilla,
      (a, b) => ORDEN_PLANTILLAS.indexOf(a.valor) - ORDEN_PLANTILLAS.indexOf(b.valor),
    ),
    series: unicas(paraSeries, (e) => e.codigo_serie, (e) => e.nombre_serie, porCodigo),
    subseries: unicas(paraSubseries, (e) => e.codigo_subserie, (e) => e.nombre_subserie, porCodigo),
    anios: [...anios].sort().map((a) => ({ valor: a, nombre: String(a) })),
  }
}

function coincideEntrada(entrada, buscado) {
  return [entrada.codigo_serie, entrada.nombre_serie, entrada.codigo_subserie, entrada.nombre_subserie].some(
    (t) => t && normalizarTexto(t).includes(buscado),
  )
}

function coincideExpediente(expediente, buscado) {
  return normalizarTexto(expediente.codigo).includes(buscado) || normalizarTexto(expediente.nombre).includes(buscado)
}

/**
 * Filas visibles: una por serie o subserie (y plantilla), con los expedientes que pasan
 * los filtros sumados entre los centros elegidos. Es lo que muestran la tabla y las exportaciones.
 */
export function aplicarFiltros(estado, entradas) {
  const buscado = normalizarTexto(estado.texto)
  const filas = new Map()
  for (const entrada of entradasDeLaCascada(estado, entradas, 'anios')) {
    let expedientes = expedientesEnPeriodo(entrada.expedientes, estado.anios)
    if (buscado && !coincideEntrada(entrada, buscado)) {
      expedientes = expedientes.filter((e) => coincideExpediente(e, buscado))
      if (expedientes.length === 0) continue
    }
    const clave = `${entrada.version}|${entrada.plantilla}|${entrada.codigo_serie}|${entrada.codigo_subserie}`
    if (!filas.has(clave)) {
      filas.set(clave, {
        llave: clave,
        version: entrada.version,
        plantilla: entrada.plantilla,
        codigo_serie: entrada.codigo_serie,
        codigo_subserie: entrada.codigo_subserie,
        nombre_serie: entrada.nombre_serie,
        nombre_subserie: entrada.nombre_subserie,
        trd: entrada.trd,
        total: 0,
        expedientes: [],
      })
    }
    const fila = filas.get(clave)
    fila.total += entrada.expedientes.length
    fila.expedientes.push(...expedientes)
  }

  const resultado = []
  for (const fila of filas.values()) {
    fila.cantidad = fila.expedientes.length
    fila.estado = clasificar(fila)
    // Un código fuera de la TRD sin expedientes en lo filtrado no tiene nada que mostrar.
    if (fila.estado === ESTADOS.FUERA && fila.cantidad === 0) continue
    fila.expedientes.sort((a, b) => (b.fecha_creacion ?? '').localeCompare(a.fecha_creacion ?? ''))
    resultado.push(fila)
  }
  return resultado.sort(
    (a, b) =>
      ORDEN_PLANTILLAS.indexOf(a.plantilla) - ORDEN_PLANTILLAS.indexOf(b.plantilla) ||
      compararCodigos(a.codigo_serie, b.codigo_serie) ||
      compararCodigos(a.codigo_subserie, b.codigo_subserie),
  )
}

/** Con texto de búsqueda, cuántas series o subseries aparecen en la otra versión de la TRD. */
export function resultadosEnOtraVersion(estado, entradas) {
  if (!normalizarTexto(estado.texto)) return null
  const otra = estado.trd === '11' ? '10' : '11'
  const filas = aplicarFiltros({ ...estado, trd: otra, series: [], subseries: [] }, entradas)
  return { version: otra, cantidad: filas.length }
}
