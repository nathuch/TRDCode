import { describe, expect, it } from 'vitest'
import { armarIndice } from '../datos/cruce.js'
import { cargarDatosReales, hayDatosReales } from '../datos/datosPrueba.js'
import { aplicarFiltros, ESTADO_INICIAL } from '../datos/filtros.js'
import { datosLibro, nombreArchivo } from './exportar.js'

it('el archivo se llama TRDCode-AAAA-MM-DD.xlsx con la fecha de descarga', () => {
  expect(nombreArchivo(new Date(2026, 7, 5))).toBe('TRDCode-2026-08-05.xlsx')
})

describe.skipIf(!hayDatosReales)('exportar con el reporte de agosto (datos-prueba/datos.json)', () => {
  const datos = hayDatosReales ? cargarDatosReales() : null
  const entradas = hayDatosReales ? armarIndice(datos.trd, datos.dependencias, datos.expedientes) : []
  const estado = { ...ESTADO_INICIAL, centros: ['73.9226'], dependencias: ['00.9000.4'] }
  const filas = hayDatosReales ? aplicarFiltros(estado, entradas) : []
  const contexto = hayDatosReales
    ? {
        nombrePlantilla: (p) => datos.dependencias.find((d) => d.plantilla === p)?.nombre ?? p,
        nombreCentro: (c) => datos.centros.find((x) => x.codigo === c)?.nombre ?? c,
        centroDeDependencia: (d) => datos.dependencias.find((x) => x.codigo === d)?.codigo_centro,
        carga: datos.carga,
      }
    : null

  it('P-09: las hojas tienen las mismas filas que la pantalla', () => {
    const libro = datosLibro(filas, estado, contexto)
    expect(libro.series).toHaveLength(filas.length)
    expect(libro.expedientes).toHaveLength(643)
    expect(libro.filtros[0]).toEqual(['Filtro', 'Valor'])
  })

  it('desde la ficha de 85.15 salen sus 17 expedientes', () => {
    const ficha = filas.find((f) => f.codigo_subserie === '85.15')
    const libro = datosLibro([ficha], estado, contexto)
    expect(libro.series).toHaveLength(1)
    expect(libro.expedientes).toHaveLength(17)
    expect(libro.expedientes[0].Centro).toBe('Industria y Construcción')
  })

  it('RNF-09: los nombres reservados salen ocultos en el Excel', () => {
    const reservados = datosLibro(filas, estado, contexto).expedientes.filter((e) => e['Control de acceso'] !== 'Pública')
    expect(reservados.length).toBeGreaterThan(0)
    expect(reservados.every((e) => e['Nombre del expediente'].startsWith('Nombre reservado ('))).toBe(true)
  })
})
