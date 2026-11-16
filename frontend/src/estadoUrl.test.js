import { describe, expect, it } from 'vitest'
import { ESTADO_INICIAL } from './datos/filtros.js'
import { armarHash, leerUrl } from './estadoUrl.js'

describe('leerUrl: inicio o consulta', () => {
  it('sin hash abre la pantalla de inicio', () => {
    expect(leerUrl('').vista).toBe('inicio')
    expect(leerUrl('#').vista).toBe('inicio')
  })

  it('un hash con claves desconocidas también abre el inicio', () => {
    expect(leerUrl('#utm_source=correo').vista).toBe('inicio')
  })

  it('con un filtro abre la consulta con ese filtro', () => {
    const { vista, estado } = leerUrl('#centros=73.9226')
    expect(vista).toBe('consulta')
    expect(estado.centros).toEqual(['73.9226'])
  })

  it('con una búsqueda abre la consulta con el texto', () => {
    const { vista, estado } = leerUrl('#buscar=emprendimiento')
    expect(vista).toBe('consulta')
    expect(estado.texto).toBe('emprendimiento')
  })

  it('un enlace compartido con ficha abre la consulta con la ficha', () => {
    const { vista, estado, ficha } = leerUrl('#centros=73.9226&dependencias=00.9000.4&ficha=11|00.9000.4|85|85.15')
    expect(vista).toBe('consulta')
    expect(estado.dependencias).toEqual(['00.9000.4'])
    expect(ficha).toBe('11|00.9000.4|85|85.15')
  })

  it('#consulta abre la consulta completa, sin filtros', () => {
    const { vista, estado } = leerUrl('#consulta')
    expect(vista).toBe('consulta')
    expect(estado).toEqual(ESTADO_INICIAL)
  })

  it('#actualizar, #usuarios y #cuenta abren sus pantallas', () => {
    expect(leerUrl('#actualizar').vista).toBe('actualizar')
    expect(leerUrl('#usuarios').vista).toBe('usuarios')
    expect(leerUrl('#cuenta').vista).toBe('cuenta')
  })

  it('#trd=10 abre la consulta en la TRD 10', () => {
    const { vista, estado } = leerUrl('#trd=10')
    expect(vista).toBe('consulta')
    expect(estado.trd).toBe('10')
  })
})

describe('armarHash', () => {
  it('sin filtros queda como #consulta, nunca vacío', () => {
    expect(armarHash(ESTADO_INICIAL)).toBe('consulta')
  })

  it('lleva los filtros, la TRD distinta de la vigente y la ficha', () => {
    const estado = { ...ESTADO_INICIAL, trd: '10', centros: ['73.9310'], texto: 'actas' }
    expect(armarHash(estado, '10|73.9310|02|02.26')).toBe(
      'trd=10&centros=73.9310&buscar=actas&ficha=10%7C73.9310%7C02%7C02.26',
    )
  })

  it('lo que escribe se vuelve a leer igual', () => {
    const estado = { ...ESTADO_INICIAL, centros: ['73.9226', '73.9123'], anios: [2025], texto: 'historias' }
    const ficha = '11|00.9000.4|37|'
    const leido = leerUrl(`#${armarHash(estado, ficha)}`)
    expect(leido).toEqual({ estado, ficha, vista: 'consulta' })
  })
})
