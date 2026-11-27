import { describe, expect, it } from 'vitest'
import { armarIndice } from '../datos/cruce.js'
import { cargarDatosReales, hayDatosReales } from '../datos/datosPrueba.js'
import { aplicarFiltros, ESTADO_INICIAL } from '../datos/filtros.js'
import { datosLibro, nombreArchivo } from './exportar.js'
import { ocultarNombres } from './formato.js'

describe('nombre del archivo, igual para el Excel y el PDF', () => {
  it('desde la consulta: TRDCode_consulta_AAAA-MM-DD, con la fecha de descarga', () => {
    expect(nombreArchivo(null, 'xlsx', new Date(2026, 7, 5))).toBe('TRDCode_consulta_2026-08-05.xlsx')
    expect(nombreArchivo(null, 'pdf', new Date(2026, 10, 15))).toBe('TRDCode_consulta_2026-11-15.pdf')
  })
  it('desde la ficha: TRDCode_ficha_<código>_AAAA-MM-DD', () => {
    expect(nombreArchivo({ codigo_serie: '85', codigo_subserie: '85.15' }, 'xlsx', new Date(2026, 10, 5))).toBe('TRDCode_ficha_85.15_2026-11-05.xlsx')
    expect(nombreArchivo({ codigo_serie: '37', codigo_subserie: '' }, 'pdf', new Date(2026, 10, 5))).toBe('TRDCode_ficha_37_2026-11-05.pdf')
  })
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
    const libro = datosLibro([ficha], estado, contexto, { ficha })
    expect(libro.series).toHaveLength(1)
    expect(libro.expedientes).toHaveLength(17)
    expect(libro.expedientes[0].Centro).toBe('Industria y Construcción')
    expect(libro.filtros.find(([f]) => f === 'Exportado desde')[1]).toBe('Ficha de 85.15')
  })

  it('sin ficha, la hoja Filtros dice de qué pestaña sale', () => {
    const libro = datosLibro(filas, estado, { ...contexto, pestana: 'Con expedientes' })
    expect(libro.filtros.find(([f]) => f === 'Exportado desde')[1]).toBe('Consulta, pestaña "Con expedientes"')
  })

  it('el control de acceso usa las palabras de la ficha', () => {
    const accesos = new Set(datosLibro(filas, estado, contexto).expedientes.map((e) => e['Control de acceso']))
    expect([...accesos].every((a) => ['Público', 'Clasificado', 'Reservado', 'Sin clasificar'].includes(a))).toBe(true)
  })

  it('RNF-09: los nombres reservados salen ocultos en el Excel', () => {
    const reservados = datosLibro(filas, estado, contexto).expedientes.filter((e) => e['Control de acceso'] !== 'Público')
    expect(reservados.length).toBeGreaterThan(0)
    expect(reservados.every((e) => e['Nombre del expediente'].startsWith('Nombre reservado ('))).toBe(true)
  })

  it('#82: con sesión el Excel lleva los nombres reales, y después de salir otra vez ocultos', () => {
    // Simula la respuesta con sesión poniendo nombres inventados a los expedientes que no son IPU.
    const conSesion = { ...datos, expedientes: datos.expedientes.map((e) => (e.control_acceso === 'IPU' ? e : { ...e, nombre: `PRUEBA ${e.codigo}` })) }
    const libroDe = (d) => datosLibro(aplicarFiltros(estado, armarIndice(d.trd, d.dependencias, d.expedientes)), estado, contexto).expedientes
      .filter((e) => e['Control de acceso'] !== 'Público')
    const conNombres = libroDe(conSesion)
    expect(conNombres.length).toBeGreaterThan(0)
    expect(conNombres.every((e) => e['Nombre del expediente'] === `PRUEBA ${e['Código expediente']}`)).toBe(true)
    expect(libroDe(ocultarNombres(conSesion)).every((e) => e['Nombre del expediente'].startsWith('Nombre reservado ('))).toBe(true)
  })
})
