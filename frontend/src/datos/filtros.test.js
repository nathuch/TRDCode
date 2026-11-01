import { describe, expect, it } from 'vitest'
import { armarIndice } from './cruce.js'
import { cargarDatosReales, hayDatosReales } from './datosPrueba.js'
import {
  aplicarFiltros,
  cambiarFiltro,
  ESTADO_INICIAL,
  opcionesDisponibles,
  resultadosEnOtraVersion,
} from './filtros.js'

describe('cambiarFiltro', () => {
  it('A-09: al cambiar el centro con una serie elegida, se limpian serie y subserie', () => {
    const elegido = { ...ESTADO_INICIAL, centros: ['73.9226'], series: ['85'], subseries: ['85.15'] }
    const nuevo = cambiarFiltro(elegido, 'centros', ['73.9310'])
    expect(nuevo.centros).toEqual(['73.9310'])
    expect(nuevo.series).toEqual([])
    expect(nuevo.subseries).toEqual([])
  })

  it('el año no limpia los demás filtros', () => {
    const elegido = { ...ESTADO_INICIAL, series: ['37'] }
    expect(cambiarFiltro(elegido, 'anios', [2025]).series).toEqual(['37'])
  })
})

describe.skipIf(!hayDatosReales)('filtros con el reporte de agosto (datos-prueba/datos.json)', () => {
  const datos = hayDatosReales ? cargarDatosReales() : null
  const entradas = hayDatosReales ? armarIndice(datos.trd, datos.dependencias, datos.expedientes) : []

  it('A-10: buscar "historias" sin tilde encuentra la serie 37 Historias académicas', () => {
    const filas = aplicarFiltros({ ...ESTADO_INICIAL, texto: 'historias' }, entradas)
    expect(filas.some((f) => f.codigo_serie === '37' && /HISTORIAS ACAD/.test(f.nombre_serie))).toBe(true)
  })

  it('P-02: con un centro elegido, la serie solo ofrece opciones de ese centro', () => {
    const estado = { ...ESTADO_INICIAL, centros: ['73.9123'], dependencias: ['00.9000.2'] }
    // La Granja no tiene Administración Educativa: no hay series que ofrecer.
    expect(opcionesDisponibles(estado, entradas, datos).series).toEqual([])
    expect(opcionesDisponibles({ ...ESTADO_INICIAL, centros: ['73.9123'] }, entradas, datos).dependencias.map((d) => d.valor))
      .toEqual(['00.9000', '00.9000.4'])
  })

  it('P-03: con el año 2023 solo se cuentan expedientes de 2023', () => {
    // En el reporte de agosto, los 74 expedientes de 2023 son de la TRD 10.
    const filas = aplicarFiltros({ ...ESTADO_INICIAL, trd: '10', anios: [2023] }, entradas)
    const expedientes = filas.flatMap((f) => f.expedientes)
    expect(expedientes.length).toBe(74)
    expect(expedientes.every((e) => e.anio === 2023)).toBe(true)
  })

  it('P-04: un expediente de la TRD 10 se encuentra con aviso desde la TRD 11', () => {
    const codigo = datos.expedientes.find((e) => e.trd_version === '10').codigo
    const estado = { ...ESTADO_INICIAL, trd: '11', texto: codigo }
    expect(aplicarFiltros(estado, entradas)).toEqual([])
    expect(resultadosEnOtraVersion(estado, entradas)).toEqual({ version: '10', cantidad: 1 })
  })

  it('P-05: con dos centros, los totales suman los de ambos', () => {
    const total = (centros) =>
      aplicarFiltros({ ...ESTADO_INICIAL, centros }, entradas).reduce((suma, f) => suma + f.cantidad, 0)
    expect(total(['73.9226', '73.9310'])).toBe(total(['73.9226']) + total(['73.9310']))
  })

  it('RNF-03: cada cambio de filtro se calcula en menos de un segundo con los 3.385 expedientes', () => {
    const inicio = performance.now()
    aplicarFiltros({ ...ESTADO_INICIAL, texto: 'acta' }, entradas)
    opcionesDisponibles(ESTADO_INICIAL, entradas, datos)
    expect(performance.now() - inicio).toBeLessThan(1000)
  })
})
