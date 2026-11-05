/** Textos que se muestran en pantalla para los códigos de la TRD y del reporte. */

const DISPOSICION = {
  CT: 'Conservación total',
  E: 'Eliminación',
  S: 'Selección',
  MT: 'Medio tecnológico',
  M: 'Microfilmar',
  D: 'Digitalizar',
}
const CLASIFICACION = {
  IPU: 'Información pública',
  IPC: 'Información pública clasificada',
  IPR: 'Información pública reservada',
}
const ACCESO = { IPU: 'Pública', IPC: 'Clasificada', IPR: 'Reservada' }
const SOPORTE = { P: 'Papel', EL: 'Electrónico' }

export const ETIQUETA_ESTADO = {
  con: 'Con expedientes',
  sin: 'Sin expedientes',
  sin_periodo: 'Sin expedientes en el período',
  fuera: 'No está en la TRD',
}

/** ['CT', 'D'] -> 'Conservación total y digitalizar'. */
export function textoDisposicion(codigos) {
  const textos = (codigos ?? []).map((c) => DISPOSICION[c] ?? c)
  if (textos.length === 0) return '—'
  return textos.map((t, i) => (i === 0 ? t : t.toLowerCase())).join(' y ')
}

export function textoClasificacion(codigos) {
  return (codigos ?? []).map((c) => CLASIFICACION[c] ?? c).join(', ') || '—'
}

export function textoAcceso(codigo) {
  return ACCESO[codigo] ?? codigo ?? '—'
}

export function textoSoporte(codigos) {
  return (codigos ?? []).map((c) => SOPORTE[c] ?? c).join(' y ') || '—'
}

function anios(n) {
  return n === 1 ? '1 año' : `${n} años`
}

/** 2, 8 -> '2 años en gestión, 8 en central'. */
export function textoRetencion(ag, ac) {
  if (ag == null && ac == null) return '—'
  return `${ag == null ? '—' : anios(ag)} en gestión, ${ac == null ? '—' : ac} en central`
}

/** '2026-08-10' -> '10 de agosto de 2026'. */
export function fechaLarga(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** '2026-08-10' -> '10/08/2026'. */
export function fechaCorta(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

export function codigoFila(fila) {
  return fila.codigo_subserie || fila.codigo_serie
}

export function nombreFila(fila) {
  return fila.codigo_subserie ? fila.nombre_subserie : fila.nombre_serie
}

export function formatoNumero(n) {
  return n.toLocaleString('es-CO')
}

const PALABRAS_MENORES = new Set(['a', 'al', 'con', 'de', 'del', 'e', 'el', 'en', 'la', 'las', 'los', 'o', 'para', 'por', 'u', 'y'])

/**
 * 'DERECHOS DE PETICIÓN' -> 'Derechos de Petición'. Solo cambia los nombres que vienen todo
 * en mayúsculas; las siglas cortas sin vocales (como 'FIC') se dejan igual.
 */
export function nombreLegible(nombre) {
  if (!nombre || nombre !== nombre.toUpperCase()) return nombre
  return nombre
    .toLowerCase()
    .split(' ')
    .map((palabra, i) => {
      const original = palabra.toUpperCase()
      if (original.length >= 2 && original.length <= 4 && !/[AEIOUÁÉÍÓÚ]/.test(original)) return original
      if (i > 0 && PALABRAS_MENORES.has(palabra)) return palabra
      return palabra.charAt(0).toUpperCase() + palabra.slice(1)
    })
    .join(' ')
}

const NOMBRE_DISPOSICION = {
  CT: 'Conservación total',
  E: 'Eliminación',
  S: 'Selección',
  MT: 'Medio tecnológico',
  M: 'Microfilmar',
  D: 'Digitalizar',
}

/** Sigla y nombre de cada disposición: [{ sigla: 'CT', nombre: 'Conservación total' }]. */
export function disposiciones(codigos) {
  return (codigos ?? []).map((sigla) => ({ sigla, nombre: NOMBRE_DISPOSICION[sigla] ?? sigla }))
}

/** 'retención 2 + 8' -> '2 + 8 años'. */
export function retencionCorta(ag, ac) {
  if (ag == null && ac == null) return '—'
  return `${ag ?? '—'} + ${ac ?? '—'} años`
}
