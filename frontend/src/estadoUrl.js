/**
 * Guarda los filtros y la ficha abierta en la dirección (#centros=73.9226&ficha=...), para que
 * una consulta se pueda compartir con un enlace y se conserve al recargar la página.
 *
 * Una dirección sin filtros, búsqueda ni ficha abre la pantalla de inicio. La consulta completa
 * sin filtros ("Ver todas las series") se guarda como #consulta, para no volver al inicio al recargar.
 */
import { ESTADO_INICIAL } from './datos/filtros.js'

const LISTAS = ['centros', 'dependencias', 'series', 'subseries', 'anios']
const MARCA_CONSULTA = 'consulta'
const CLAVES = ['trd', ...LISTAS, 'buscar', 'ficha', MARCA_CONSULTA]

/** Lee la dirección: { estado, ficha, vista }, con vista 'inicio' o 'consulta'. */
export function leerUrl(hash = window.location.hash) {
  const parametros = new URLSearchParams(hash.replace(/^#/, ''))
  const estado = { ...ESTADO_INICIAL }
  if (['10', '11'].includes(parametros.get('trd'))) estado.trd = parametros.get('trd')
  for (const campo of LISTAS) {
    const valor = parametros.get(campo)
    if (valor) estado[campo] = valor.split(',').filter(Boolean).map((v) => (campo === 'anios' ? Number(v) : v))
  }
  estado.texto = parametros.get('buscar') ?? ''
  const vista = CLAVES.some((clave) => parametros.has(clave)) ? 'consulta' : 'inicio'
  return { estado, ficha: parametros.get('ficha'), vista }
}

/** Hash de una consulta, sin el '#'. Nunca queda vacío: sin filtros es 'consulta'. */
export function armarHash(estado, ficha = null) {
  const parametros = new URLSearchParams()
  if (estado.trd !== ESTADO_INICIAL.trd) parametros.set('trd', estado.trd)
  for (const campo of LISTAS) if (estado[campo].length) parametros.set(campo, estado[campo].join(','))
  if (estado.texto) parametros.set('buscar', estado.texto)
  if (ficha) parametros.set('ficha', ficha)
  return parametros.toString() || MARCA_CONSULTA
}

/** Actualiza la dirección de la consulta sin crear una entrada nueva en el historial. */
export function escribirUrl(estado, ficha) {
  window.history.replaceState(null, '', `#${armarHash(estado, ficha)}`)
}

/** Pasa a una consulta creando una entrada en el historial: "atrás" vuelve a donde se estaba. */
export function irAConsulta(estado) {
  window.history.pushState(null, '', `#${armarHash(estado)}`)
}

/** Vuelve a la pantalla de inicio (dirección sin hash), con su propia entrada en el historial. */
export function irAInicio() {
  window.history.pushState(null, '', window.location.pathname + window.location.search)
}
