/**
 * Guarda los filtros y la ficha abierta en la dirección (#centros=73.9226&ficha=...), para que
 * una consulta se pueda compartir con un enlace y se conserve al recargar la página.
 */
import { ESTADO_INICIAL } from './datos/filtros.js'

const LISTAS = ['centros', 'dependencias', 'series', 'subseries', 'anios']

export function leerUrl(hash = window.location.hash) {
  const parametros = new URLSearchParams(hash.replace(/^#/, ''))
  const estado = { ...ESTADO_INICIAL }
  if (['10', '11'].includes(parametros.get('trd'))) estado.trd = parametros.get('trd')
  for (const campo of LISTAS) {
    const valor = parametros.get(campo)
    if (valor) estado[campo] = valor.split(',').filter(Boolean).map((v) => (campo === 'anios' ? Number(v) : v))
  }
  estado.texto = parametros.get('buscar') ?? ''
  return { estado, ficha: parametros.get('ficha') }
}

export function escribirUrl(estado, ficha) {
  const parametros = new URLSearchParams()
  if (estado.trd !== ESTADO_INICIAL.trd) parametros.set('trd', estado.trd)
  for (const campo of LISTAS) if (estado[campo].length) parametros.set(campo, estado[campo].join(','))
  if (estado.texto) parametros.set('buscar', estado.texto)
  if (ficha) parametros.set('ficha', ficha)
  const hash = parametros.toString()
  window.history.replaceState(null, '', hash ? `#${hash}` : window.location.pathname + window.location.search)
}
