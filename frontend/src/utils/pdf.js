/**
 * Exportar a PDF lo que se ve (Fase 8, #55). Sin ficha abierta, el resumen de la consulta: título,
 * fecha de los datos, filtros, total y la tabla agrupada como en pantalla. Desde la ficha, lo mismo de
 * esa serie o subserie más su detalle (retención, disposición, tipos documentales) y todos sus
 * expedientes con su control de acceso. Los nombres reservados llegan ya ocultos de la API, igual
 * que en pantalla.
 *
 * contenidoPdf() arma el contenido como datos simples (se prueba sin jsPDF); dibujarPdf() lo
 * dibuja con jsPDF y jspdf-autotable, que se cargan solo al exportar.
 */
import { agrupar, enSecciones } from './agrupar.js'
import { fechaArchivo, lineaFiltros, textoDatosAl, textoTrd } from './exportar.js'
import {
  codigoFila,
  disposiciones,
  ETIQUETA_ESTADO,
  etiquetaAcceso,
  fechaCorta,
  formatoNumero,
  nombreFila,
  nombreLegible,
  retencionCorta,
  textoClasificacion,
  textoSoporte,
} from './formato.js'

const FUERA = 'fuera'
const anios = (n) => (n === 1 ? '1 año' : `${n} años`)
const plural = (n, uno, varios) => `${formatoNumero(n)} ${n === 1 ? uno : varios}`

/** 'CT Conservación total, D Digitalizar', como las etiquetas de la pantalla. */
function textoDisposiciones(codigos) {
  const lista = disposiciones(codigos)
  return lista.length ? lista.map((d) => `${d.sigla} ${d.nombre}`).join(', ') : '—'
}

export const COLUMNAS_TABLA = ['Código', 'Serie / subserie', 'Retención', 'Disposición final', 'Expedientes']

/** Filas de la tabla del resumen: { tipo: 'seccion' | 'grupo' | 'serie' | 'subserie', celdas }. */
export function filasTabla(filas, nombrePlantilla) {
  const secciones = enSecciones(filas)
  const salida = []
  const fila = (f, tipo) => ({
    tipo,
    llave: f.llave,
    celdas: [
      codigoFila(f),
      nombreLegible(nombreFila(f)),
      f.trd ? retencionCorta(f.trd.retencion_ag, f.trd.retencion_ac) : '—',
      f.estado === FUERA ? ETIQUETA_ESTADO.fuera : textoDisposiciones(f.trd?.disposicion),
      f.cantidad > 0 ? formatoNumero(f.cantidad) : ETIQUETA_ESTADO[f.estado],
    ],
  })
  for (const seccion of secciones) {
    if (secciones.length > 1) salida.push({ tipo: 'seccion', celdas: [nombrePlantilla(seccion.plantilla)] })
    for (const item of agrupar(seccion.filas)) {
      if (!item.grupo) {
        salida.push(fila(item, 'serie'))
        continue
      }
      salida.push({
        tipo: 'grupo',
        celdas: [
          item.codigo,
          nombreLegible(item.nombre),
          '',
          plural(item.filas.length, 'subserie', 'subseries'),
          item.total > 0 ? formatoNumero(item.total) : '—',
        ],
      })
      for (const f of item.filas) salida.push(fila(f, 'subserie'))
    }
  }
  return salida
}

/** Detalle de la ficha: pares [rótulo, texto] y los tipos documentales ({ grupo, nombre }). */
function detalleFicha(ficha, nombrePlantilla) {
  if (ficha.estado === FUERA) {
    return {
      datos: [
        [
          'Aviso',
          `Este código está en el reporte de OnBase pero no aparece en la TRD ${ficha.version} de ` +
            `${nombrePlantilla(ficha.plantilla)}. Se muestra con el nombre que trae el reporte.`,
        ],
      ],
      tipos: [],
    }
  }
  const { trd } = ficha
  const { retencion_ag: ag, retencion_ac: ac } = trd
  const datos = [
    [
      'Retención',
      (ag != null && ac != null ? `${anios(ag + ac)} en total: ` : '') +
        `${ag ?? '—'} ${ag === 1 ? 'año' : 'años'} en archivo de gestión + ${ac ?? '—'} en archivo central`,
    ],
  ]
  if (trd.inicio_retencion) datos.push(['Cuándo empieza a contar', trd.inicio_retencion])
  datos.push(['Disposición final', textoDisposiciones(trd.disposicion)])
  datos.push(['Soporte', textoSoporte(trd.soporte)])
  if (trd.clasificacion.length) datos.push(['Clasificación', textoClasificacion(trd.clasificacion)])
  if (trd.procedimiento) datos.push(['Procedimiento', trd.procedimiento])
  return { datos, tipos: trd.tipos.map((t) => ({ grupo: t.grupo || null, nombre: t.nombre })) }
}

/** Expedientes de la ficha, del más reciente al más antiguo (el orden de la pantalla). */
function expedientesFicha(ficha, nombreCentroDeDependencia) {
  const lista = ficha.expedientes
  const variosCentros = new Set(lista.map((e) => nombreCentroDeDependencia(e.codigo_dependencia))).size > 1
  const columnas = ['Código', 'Nombre del expediente', ...(variosCentros ? ['Centro'] : []), 'Fecha de creación', 'Control de acceso']
  const filas = lista.map((e) => [
    e.codigo,
    e.nombre,
    ...(variosCentros ? [nombreCentroDeDependencia(e.codigo_dependencia)] : []),
    fechaCorta(e.fecha_creacion),
    etiquetaAcceso(e.control_acceso),
  ])
  return { columnas, filas, reservados: lista.map((e) => e.control_acceso !== 'IPU') }
}

export function nombreArchivoPdf(ficha, fecha = new Date()) {
  return ficha ? `TRDCode_ficha_${codigoFila(ficha)}_${fechaArchivo(fecha)}.pdf` : `TRDCode_consulta_${fechaArchivo(fecha)}.pdf`
}

/**
 * Todo el contenido del PDF. filas son las que se ven (pestaña elegida) o [ficha]; contexto trae
 * los nombres (nombrePlantilla, nombreCentro, nombreCentroDeDependencia), la carga y la pestaña.
 */
export function contenidoPdf(filas, estado, contexto, { ficha = null, generado = new Date() } = {}) {
  const { nombrePlantilla, nombreCentroDeDependencia, carga } = contexto
  const total = filas.reduce((suma, f) => suma + f.cantidad, 0)
  const contenido = {
    nombreArchivo: nombreArchivoPdf(ficha, generado),
    generado: generado.toLocaleString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
    titulo: 'Consulta de series y subseries documentales',
    subtitulo: null,
    datosAl: textoDatosAl(carga),
    // La ficha no depende de la pestaña: sus filtros son los de la consulta.
    filtros: lineaFiltros(estado, ficha ? { ...contexto, pestana: null } : contexto),
    total: `${plural(total, 'expediente', 'expedientes')} en ${plural(filas.length, 'serie o subserie', 'series y subseries')}`,
    tabla: { columnas: COLUMNAS_TABLA, filas: filasTabla(filas, nombrePlantilla) },
    leyenda: 'Retención: años en archivo de gestión + años en archivo central.',
    detalle: null,
    expedientes: null,
  }
  if (ficha) {
    const tipo = ficha.codigo_subserie ? 'subserie' : 'serie'
    contenido.titulo = `Ficha de la ${tipo} ${codigoFila(ficha)} ${nombreLegible(nombreFila(ficha))}`
    contenido.subtitulo =
      `${nombrePlantilla(ficha.plantilla)} · TRD ${textoTrd(ficha.version)}` +
      (ficha.codigo_subserie ? ` · Serie ${ficha.codigo_serie} ${nombreLegible(ficha.nombre_serie)}` : '')
    contenido.total = plural(ficha.cantidad, 'expediente', 'expedientes')
    contenido.detalle = detalleFicha(ficha, nombrePlantilla)
    contenido.expedientes = expedientesFicha(ficha, nombreCentroDeDependencia)
  }
  return contenido
}

// Con las fuentes estándar, jsPDF solo escribe bien los caracteres hasta el 255 (Latin-1): las tildes,
// la ñ, ¿ y ¡ salen bien; la raya, las comillas curvas o los puntos suspensivos salen como basura.
const REEMPLAZOS = { '—': '-', '–': '-', '‒': '-', '−': '-', '…': '...', '“': '"', '”': '"', '„': '"', '‘': "'", '’': "'", '‚': "'", '•': '-' }
// Tabulador, espacio duro y espacios tipográficos (los que pone toLocaleString antes de "p. m.").
const esEspacio = (n) => n === 0x09 || n === 0xa0 || n === 0x202f || n === 0x205f || (n >= 0x2000 && n <= 0x200b)

/** Texto que las fuentes estándar del PDF pueden escribir; lo demás se aproxima, nunca sale basura. */
export function textoPdf(texto) {
  let salida = ''
  // NFC une las tildes escritas aparte (e + tilde) en un solo carácter.
  for (const c of String(texto ?? '').normalize('NFC')) {
    const n = c.codePointAt(0)
    if (esEspacio(n)) salida += ' '
    else if (REEMPLAZOS[c]) salida += REEMPLAZOS[c]
    else if (n <= 0xff) salida += c
    else {
      // Una letra con un signo que no está en Latin-1 (ő, ł…) se escribe sin el signo; lo demás, '?'.
      const base = c.normalize('NFD')[0]
      salida += base.codePointAt(0) <= 0xff ? base : '?'
    }
  }
  return salida
}

const VERDE = [47, 122, 10]
const VERDE_SENA = [57, 169, 0]
const VERDE_CLARO = [232, 243, 224]
const GRIS_FONDO = [244, 246, 243]
const TEXTO = [27, 31, 26]
const SUAVE = [91, 100, 89]
const MARGEN = 14
const ARRIBA = 22 // espacio del encabezado de cada página (mm)
const ABAJO = 16 // espacio del pie

/** Dibuja el contenido con jsPDF y autoTable; devuelve el documento (hoja A4 horizontal). */
export function dibujarPdf(c, jsPDF, autoTable) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const ancho = doc.internal.pageSize.getWidth()
  const alto = doc.internal.pageSize.getHeight()
  const util = ancho - 2 * MARGEN
  let y = ARRIBA + 4

  const parrafo = (texto, { tamano = 10, negrita = false, color = TEXTO, despues = 2 } = {}) => {
    doc.setFont('helvetica', negrita ? 'bold' : 'normal')
    doc.setFontSize(tamano)
    doc.setTextColor(...color)
    const alturaLinea = tamano * 0.42
    for (const linea of doc.splitTextToSize(textoPdf(texto), util)) {
      if (y + alturaLinea > alto - ABAJO) {
        doc.addPage()
        y = ARRIBA + 4
      }
      y += alturaLinea
      doc.text(linea, MARGEN, y)
    }
    y += despues
  }
  // Un subtítulo nunca queda solo al final de una página.
  const subtitulo = (texto) => {
    if (y > alto - ABAJO - 30) {
      doc.addPage()
      y = ARRIBA + 4
    }
    y += 3
    parrafo(texto, { tamano: 12, negrita: true, color: VERDE, despues: 2.5 })
  }
  const tabla = (opciones) => {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGEN, right: MARGEN, top: ARRIBA + 2, bottom: ABAJO + 2 },
      theme: 'grid',
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.6, textColor: TEXTO, lineColor: [210, 216, 207], lineWidth: 0.2, overflow: 'linebreak', valign: 'middle' },
      headStyles: { fillColor: VERDE, textColor: 255, fontStyle: 'bold' },
      ...opciones,
    })
    y = doc.lastAutoTable.finalY + 4
  }
  const celdas = (lista) => lista.map(textoPdf)

  parrafo(c.titulo, { tamano: 16, negrita: true, despues: 1 })
  if (c.subtitulo) parrafo(c.subtitulo, { tamano: 10, color: SUAVE, despues: 1 })
  parrafo(c.datosAl, { tamano: 10, negrita: true, color: VERDE, despues: 1 })
  parrafo(`Filtros: ${c.filtros}`, { tamano: 9, color: SUAVE, despues: 2 })
  parrafo(c.total, { tamano: 12, negrita: true, despues: 3 })

  tabla({
    head: [celdas(c.tabla.columnas)],
    body: c.tabla.filas.map((f) => {
      if (f.tipo === 'seccion') {
        return [{ content: textoPdf(f.celdas[0]), colSpan: 5, styles: { fontStyle: 'bold', fillColor: VERDE_CLARO, textColor: VERDE } }]
      }
      const estilo = f.tipo === 'grupo' ? { fontStyle: 'bold', fillColor: GRIS_FONDO } : {}
      return celdas(f.celdas).map((texto, i) => ({
        content: texto,
        styles: { ...estilo, ...(f.tipo === 'subserie' && i < 2 ? { cellPadding: { top: 1.6, bottom: 1.6, right: 1.6, left: 5 } } : {}) },
      }))
    }),
    columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 24 }, 3: { cellWidth: 62 }, 4: { cellWidth: 30, halign: 'right' } },
  })
  parrafo(c.leyenda, { tamano: 8, color: SUAVE })

  if (c.detalle) {
    subtitulo('Detalle')
    tabla({
      body: c.detalle.datos.map(([rotulo, texto]) => [{ content: textoPdf(rotulo), styles: { fontStyle: 'bold', fillColor: GRIS_FONDO } }, textoPdf(texto)]),
      columnStyles: { 0: { cellWidth: 52 } },
    })
    if (c.detalle.tipos.length) {
      subtitulo(`Tipos documentales (${formatoNumero(c.detalle.tipos.length)})`)
      const filas = []
      let grupo = null
      let n = 0
      for (const t of c.detalle.tipos) {
        if (t.grupo && t.grupo !== grupo) filas.push([{ content: textoPdf(t.grupo), colSpan: 2, styles: { fontStyle: 'bold', fillColor: GRIS_FONDO } }])
        grupo = t.grupo
        filas.push([String((n += 1)), textoPdf(t.nombre)])
      }
      tabla({ head: [['N.º', 'Tipo documental']], body: filas, columnStyles: { 0: { cellWidth: 14, halign: 'right' } } })
    }
  }

  if (c.expedientes) {
    subtitulo(`Expedientes (${formatoNumero(c.expedientes.filas.length)})`)
    if (c.expedientes.filas.length === 0) parrafo('No hay expedientes con los filtros elegidos.', { tamano: 9, color: SUAVE })
    else {
      const ultima = c.expedientes.columnas.length - 1
      tabla({
        head: [celdas(c.expedientes.columnas)],
        body: c.expedientes.filas.map(celdas),
        columnStyles: { 0: { cellWidth: 34 }, [ultima - 1]: { cellWidth: 34 }, [ultima]: { cellWidth: 30 } },
        didParseCell: (d) => {
          if (d.section === 'body' && c.expedientes.reservados[d.row.index] && (d.column.index === 1 || d.column.index === ultima)) {
            d.cell.styles.textColor = SUAVE
            d.cell.styles.fontStyle = 'italic'
          }
        },
      })
    }
  }

  // Encabezado y pie en cada página.
  const paginas = doc.getNumberOfPages()
  for (let i = 1; i <= paginas; i += 1) {
    doc.setPage(i)
    doc.setDrawColor(...VERDE_SENA)
    doc.setLineWidth(0.8)
    doc.line(MARGEN, 10, ancho - MARGEN, 10)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...VERDE)
    doc.text('TRDCode', MARGEN, 15.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SUAVE)
    doc.text(textoPdf(' · SENA Regional Tolima'), MARGEN + doc.getTextWidth('TRDCode') + 0.6, 15.5)
    doc.text(textoPdf(`Generado el ${c.generado}`), ancho - MARGEN, 15.5, { align: 'right' })
    doc.setDrawColor(210, 216, 207)
    doc.setLineWidth(0.2)
    doc.line(MARGEN, alto - 11, ancho - MARGEN, alto - 11)
    doc.setFontSize(8)
    doc.text(textoPdf(`${c.titulo} · ${c.datosAl}`).slice(0, 150), MARGEN, alto - 7)
    doc.text(`Página ${i} de ${paginas}`, ancho - MARGEN, alto - 7, { align: 'right' })
  }
  return doc
}

/** Genera el PDF y lo descarga; devuelve el nombre del archivo. */
export async function exportarPdf(filas, estado, contexto, opciones = {}) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const contenido = contenidoPdf(filas, estado, contexto, opciones)
  dibujarPdf(contenido, jsPDF, autoTable).save(contenido.nombreArchivo)
  return contenido.nombreArchivo
}
