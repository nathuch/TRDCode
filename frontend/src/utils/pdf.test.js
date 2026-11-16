import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { describe, expect, it } from 'vitest'
import { leerPdf } from '../../../scripts/pruebas-navegador/leer_pdf.mjs'
import { armarIndice } from '../datos/cruce.js'
import { cargarDatosReales, hayDatosReales } from '../datos/datosPrueba.js'
import { aplicarFiltros, ESTADO_INICIAL } from '../datos/filtros.js'
import { lineaFiltros } from './exportar.js'
import { contenidoPdf, dibujarPdf, nombreArchivoPdf, textoPdf } from './pdf.js'

const ACCESOS = new Set(['Público', 'Clasificado', 'Reservado', 'Sin clasificar'])

describe('textoPdf: lo que las fuentes estándar del PDF pueden escribir', () => {
  it('conserva tildes, ñ, ¿, ¡, · y º', () => {
    expect(textoPdf('¿Retención? ¡Sí! Niño · N.º 5 ÁÉÍÓÚ Ü')).toBe('¿Retención? ¡Sí! Niño · N.º 5 ÁÉÍÓÚ Ü')
  })
  it('cambia la raya, los puntos suspensivos y las comillas curvas por equivalentes simples', () => {
    expect(textoPdf('a — b – c… “d” ‘e’')).toBe('a - b - c... "d" \'e\'')
  })
  it('une las tildes escritas aparte y aproxima o marca lo que no tiene', () => {
    expect(textoPdf(`Informacio${String.fromCodePoint(0x301)}n`)).toBe('Información')
    expect(textoPdf('Erdős Ω')).toBe('Erdos ?')
    expect(textoPdf(`3:42${String.fromCodePoint(0x202f)}p.${String.fromCodePoint(0xa0)}m.`)).toBe('3:42 p. m.')
  })
})

describe('nombre del PDF', () => {
  it('lleva la fecha: TRDCode_consulta_AAAA-MM-DD.pdf, o el código de la ficha', () => {
    expect(nombreArchivoPdf(null, new Date(2026, 10, 15))).toBe('TRDCode_consulta_2026-11-15.pdf')
    expect(nombreArchivoPdf({ codigo_serie: '85', codigo_subserie: '85.15' }, new Date(2026, 10, 5))).toBe('TRDCode_ficha_85.15_2026-11-05.pdf')
  })
})

describe('filtros en texto', () => {
  const contexto = { nombrePlantilla: (p) => `Dep ${p}`, nombreCentro: (c) => `Centro ${c}` }
  it('sin filtros: la TRD y "sin otros filtros"', () => {
    expect(lineaFiltros(ESTADO_INICIAL, contexto)).toBe('TRD 11 (vigente, 2025) · sin otros filtros')
  })
  it('solo los filtros usados, en singular o plural, con la búsqueda y la pestaña', () => {
    const estado = { ...ESTADO_INICIAL, trd: '10', centros: ['1'], series: ['37', '85'], texto: 'acta' }
    expect(lineaFiltros(estado, { ...contexto, pestana: 'Con expedientes' })).toBe(
      'TRD 10 (2020) · Centro: Centro 1 · Series: 37, 85 · Búsqueda: "acta" · Pestaña: Con expedientes',
    )
    expect(lineaFiltros(estado, { ...contexto, pestana: 'Todas' })).not.toContain('Pestaña')
  })
})

describe.skipIf(!hayDatosReales)('PDF con el reporte de agosto (datos-prueba/datos.json)', () => {
  const datos = hayDatosReales ? cargarDatosReales() : null
  const entradas = hayDatosReales ? armarIndice(datos.trd, datos.dependencias, datos.expedientes) : []
  const estado = { ...ESTADO_INICIAL, centros: ['73.9226'], dependencias: ['00.9000.4'] }
  const filas = hayDatosReales ? aplicarFiltros(estado, entradas) : []
  const contexto = hayDatosReales
    ? {
        nombrePlantilla: (p) => datos.dependencias.find((d) => d.plantilla === p)?.nombre ?? p,
        nombreCentro: (c) => datos.centros.find((x) => x.codigo === c)?.nombre ?? c,
        nombreCentroDeDependencia: (d) => {
          const centro = datos.dependencias.find((x) => x.codigo === d)?.codigo_centro
          return datos.centros.find((x) => x.codigo === centro)?.nombre ?? d
        },
        carga: datos.carga,
        pestana: 'Todas',
      }
    : null
  const ficha = filas.find((f) => f.codigo_subserie === '85.15')
  const dibujar = (contenido) => leerPdf(dibujarPdf(contenido, jsPDF, autoTable).output())

  describe('sin ficha: el resumen de lo que se ve', () => {
    const c = hayDatosReales ? contenidoPdf(filas, estado, contexto) : null

    it('título, fecha de los datos, filtros y total (P-09: 643 expedientes)', () => {
      expect(c.titulo).toBe('Consulta de series y subseries documentales')
      expect(c.datosAl).toBe('Datos al 10 de agosto de 2026')
      expect(c.filtros).toBe(
        `TRD 11 (vigente, 2025) · Centro: Industria y Construcción · Dependencia: ${contexto.nombrePlantilla('00.9000.4')}`,
      )
      expect(c.total).toBe(`643 expedientes en ${filas.length} series y subseries`)
      expect(c.detalle).toBeNull()
      expect(c.expedientes).toBeNull()
    })

    it('la tabla tiene cada serie o subserie de la pantalla, agrupada como en pantalla', () => {
      const filasDeDatos = c.tabla.filas.filter((f) => f.tipo === 'serie' || f.tipo === 'subserie')
      expect(filasDeDatos.map((f) => f.llave)).toEqual(filas.map((f) => f.llave))
      expect(c.tabla.filas.some((f) => f.tipo === 'seccion')).toBe(false) // una sola dependencia
      // Cada subserie va bajo el grupo de su serie, y el grupo suma sus expedientes.
      let grupo = null
      for (const f of c.tabla.filas) {
        if (f.tipo === 'grupo') grupo = f
        else if (f.tipo === 'serie') grupo = null
        else expect(f.celdas[0].startsWith(`${grupo.celdas[0]}.`)).toBe(true)
      }
      expect(c.tabla.filas.find((f) => f.tipo !== 'subserie' && f.celdas[0] === '37')?.celdas[4]).toBe('308')
      expect(c.tabla.filas.find((f) => f.celdas[0] === '85.18')?.celdas.slice(3)).toEqual(['No está en la TRD', '39'])
    })

    it('la pestaña elegida se anota en los filtros', () => {
      const conExpedientes = filas.filter((f) => f.estado === 'con')
      const otra = contenidoPdf(conExpedientes, estado, { ...contexto, pestana: 'Con expedientes' })
      expect(otra.filtros).toContain('Pestaña: Con expedientes')
      expect(otra.total).toBe(`604 expedientes en ${conExpedientes.length} series y subseries`)
    })

    it('el PDF dibujado tiene encabezado, pie con "Página N de M" y la tabla en cada página', () => {
      const pdf = dibujar(c)
      expect(pdf.paginas.length).toBeGreaterThan(1)
      pdf.paginas.forEach((pagina, i) => {
        expect(pagina).toContain('TRDCode')
        expect(pagina.some((l) => l.includes('SENA Regional Tolima'))).toBe(true)
        expect(pagina.some((l) => l.startsWith('Generado el '))).toBe(true)
        expect(pagina).toContain(`Página ${i + 1} de ${pdf.paginas.length}`)
        expect(pagina).toContain('Código') // la cabecera de la tabla se repite
      })
      expect(pdf.texto).toContain('Datos al 10 de agosto de 2026')
      expect(pdf.texto).toContain('Retención')
      expect(pdf.texto).not.toContain('Nombre reservado') // sin ficha no hay expedientes
    })

    it('con varias dependencias, cada una en su sección', () => {
      const varias = aplicarFiltros({ ...ESTADO_INICIAL, centros: ['73.9226'] }, entradas)
      const secciones = contenidoPdf(varias, estado, contexto).tabla.filas.filter((f) => f.tipo === 'seccion')
      expect(secciones.length).toBe(new Set(varias.map((f) => f.plantilla)).size)
    })
  })

  describe('desde la ficha de 85.15 (P-10)', () => {
    const c = hayDatosReales ? contenidoPdf([ficha], estado, contexto, { ficha }) : null

    it('lleva lo de esa subserie y su detalle', () => {
      expect(c.titulo.startsWith('Ficha de la subserie 85.15 ')).toBe(true)
      expect(c.total).toBe('17 expedientes')
      expect(c.tabla.filas.map((f) => f.tipo)).toEqual(['grupo', 'subserie'])
      const rotulos = c.detalle.datos.map(([r]) => r)
      expect(rotulos).toEqual(expect.arrayContaining(['Retención', 'Cuándo empieza a contar', 'Disposición final']))
      expect(c.detalle.tipos).toHaveLength(ficha.trd.tipos.length)
    })

    it('trae los 17 expedientes con su control de acceso, y los reservados sin nombre', () => {
      expect(c.expedientes.filas).toHaveLength(17)
      const acceso = c.expedientes.columnas.indexOf('Control de acceso')
      expect(c.expedientes.filas.every((f) => ACCESOS.has(f[acceso]))).toBe(true)
      ficha.expedientes.forEach((e, i) => {
        if (e.control_acceso !== 'IPU') expect(c.expedientes.filas[i][1].startsWith('Nombre reservado')).toBe(true)
      })
    })

    it('el PDF dibujado tiene los 17 códigos y ningún nombre reservado', () => {
      const pdf = dibujar(c)
      for (const e of ficha.expedientes) expect(pdf.texto).toContain(e.codigo)
      const reservados = ficha.expedientes.filter((e) => e.control_acceso !== 'IPU').length
      expect(pdf.texto.split('\n').filter((l) => l.startsWith('Nombre reservado')).length).toBeGreaterThanOrEqual(reservados)
      expect(pdf.texto).toContain('Tipos documentales')
      expect(pdf.texto).toContain('Cuándo empieza a contar')
    })
  })
})
