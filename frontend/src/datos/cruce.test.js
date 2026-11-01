import { describe, expect, it } from 'vitest'
import { armarIndice, ESTADOS, resumen } from './cruce.js'
import { cargarDatosReales, hayDatosReales } from './datosPrueba.js'
import { aplicarFiltros, ESTADO_INICIAL } from './filtros.js'

const dependencias = [
  { codigo: '73.9226.2', codigo_centro: '73.9226', plantilla: '00.9000.2', nombre: 'Administración Educativa' },
  { codigo: '73.9123.4', codigo_centro: '73.9123', plantilla: '00.9000.4', nombre: 'Formación Profesional Integral' },
]
const trd = [
  { version: '11', plantilla: '00.9000.2', codigo_serie: '27', codigo_subserie: '', nombre_serie: 'DERECHOS DE PETICIÓN', nombre_subserie: '' },
  { version: '11', plantilla: '00.9000.4', codigo_serie: '85', codigo_subserie: '85.15', nombre_serie: 'PROGRAMAS', nombre_subserie: 'Programas de Emprendimiento' },
  { version: '11', plantilla: '00.9000.4', codigo_serie: '85', codigo_subserie: '85.16', nombre_serie: 'PROGRAMAS', nombre_subserie: 'Programas de Formación' },
]
const expediente = (codigo, dependencia, serie, subserie, anio) => ({
  codigo,
  nombre: `Expediente ${codigo}`,
  trd_version: '11',
  codigo_dependencia: dependencia,
  codigo_serie: serie,
  codigo_subserie: subserie,
  nombre_serie: 'PROGRAMAS',
  nombre_subserie: 'Subserie del reporte',
  fecha_creacion: `${anio}-03-01`,
  anio,
})

describe('cruce con datos de ejemplo', () => {
  const expedientes = [
    expediente('2025EX-000001', '73.9123.4', '85', '85.15', 2025),
    expediente('2025EX-000002', '73.9123.4', '85', '85.15', 2025),
    expediente('2024EX-000003', '73.9123.4', '85', '85.18', 2024),
  ]
  const entradas = armarIndice(trd, dependencias, expedientes)

  it('A-07: La Granja no recibe series de la plantilla 00.9000.2', () => {
    const granja = entradas.filter((e) => e.centro === '73.9123')
    expect(granja.length).toBeGreaterThan(0)
    expect(granja.some((e) => e.plantilla === '00.9000.2')).toBe(false)
  })

  it('A-08: con el año 2023, una subserie que solo tiene expedientes de 2025 queda "sin expedientes en el período" con 0', () => {
    const filas = aplicarFiltros({ ...ESTADO_INICIAL, anios: [2023] }, entradas)
    const f8515 = filas.find((f) => f.codigo_subserie === '85.15')
    expect(f8515.cantidad).toBe(0)
    expect(f8515.estado).toBe(ESTADOS.SIN_PERIODO)
    // Sin expedientes en todo el reporte es otro estado.
    expect(filas.find((f) => f.codigo_subserie === '85.16').estado).toBe(ESTADOS.SIN)
  })

  it('un código que no está en la TRD se muestra con el nombre del reporte', () => {
    const fuera = aplicarFiltros(ESTADO_INICIAL, entradas).find((f) => f.codigo_subserie === '85.18')
    expect(fuera.estado).toBe(ESTADOS.FUERA)
    expect(fuera.cantidad).toBe(1)
    expect(fuera.nombre_subserie).toBe('Subserie del reporte')
  })
})

describe.skipIf(!hayDatosReales)('cruce con el reporte de agosto (datos-prueba/datos.json)', () => {
  const datos = hayDatosReales ? cargarDatosReales() : null
  const entradas = hayDatosReales ? armarIndice(datos.trd, datos.dependencias, datos.expedientes) : []
  const consulta = { ...ESTADO_INICIAL, trd: '11', centros: ['73.9226'], dependencias: ['00.9000.4'] }
  const filas = hayDatosReales ? aplicarFiltros(consulta, entradas) : []
  const fila = (codigo) => filas.find((f) => (f.codigo_subserie || f.codigo_serie) === codigo)

  it('A-06: TRD 11, Industria y Construcción, Formación Profesional suma 643 expedientes', () => {
    expect(resumen(filas).expedientes).toBe(643)
  })

  it('A-06: la serie 37 Historias académicas tiene 308', () => {
    expect(fila('37').cantidad).toBe(308)
  })

  it('A-06: la 85.18 aparece como "No está en la TRD" con 39', () => {
    expect(fila('85.18').estado).toBe(ESTADOS.FUERA)
    expect(fila('85.18').cantidad).toBe(39)
  })

  it('la 85.15 tiene 17 expedientes', () => {
    expect(fila('85.15').cantidad).toBe(17)
  })

  it('A-07: La Granja no tiene series de la plantilla 00.9000.2', () => {
    expect(entradas.some((e) => e.centro === '73.9123' && e.plantilla === '00.9000.2')).toBe(false)
  })

  it('los tres centros suman 3.385 expedientes (1.781 / 1.084 / 520)', () => {
    const porCentro = (centro) =>
      entradas.filter((e) => e.centro === centro).reduce((suma, e) => suma + e.expedientes.length, 0)
    expect([porCentro('73.9226'), porCentro('73.9310'), porCentro('73.9123')]).toEqual([1781, 1084, 520])
  })
})
