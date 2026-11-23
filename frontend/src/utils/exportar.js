/**
 * Exportar a Excel lo que se ve (Fase 8, #53 y #54). Parte de las filas de aplicarFiltros() y de la
 * pestaña elegida (o de la ficha abierta), así que exporta exactamente lo que está en pantalla: sin
 * sesión, los nombres de los IPC e IPR llegan ya ocultos de la API; con sesión, los reales (#82). El archivo se genera en el navegador con SheetJS,
 * que se carga solo al exportar. Los filtros en texto sirven también al PDF y a la impresión.
 */
import { codigoFila, ETIQUETA_ESTADO, etiquetaAcceso, fechaLarga, textoDisposicion } from './formato.js'

function listaONada(valores, todos) {
  return valores.length ? valores.join(', ') : todos
}

export const textoTrd = (trd) => (trd === '11' ? '11 (vigente, 2025)' : '10 (2020)')

/**
 * Filtros aplicados, como pares [rótulo, valor]: siempre la TRD y, después, solo los que se usaron.
 * contexto.pestana es el texto de la pestaña de la consulta ('Todas' no se anota).
 */
export function filtrosAplicados(estado, contexto) {
  const { nombrePlantilla, nombreCentro, pestana } = contexto
  const lista = [['TRD', textoTrd(estado.trd)]]
  const agregar = (singular, plural, valores) => {
    if (valores.length) lista.push([valores.length === 1 ? singular : plural, valores.join(', ')])
  }
  agregar('Centro', 'Centros', estado.centros.map(nombreCentro))
  agregar('Dependencia', 'Dependencias', estado.dependencias.map(nombrePlantilla))
  agregar('Serie', 'Series', estado.series)
  agregar('Subserie', 'Subseries', estado.subseries)
  agregar('Año', 'Años', estado.anios.map(String))
  if (estado.texto) lista.push(['Búsqueda', `"${estado.texto}"`])
  if (pestana && pestana !== 'Todas') lista.push(['Pestaña', pestana])
  return lista
}

/** 'TRD 11 (vigente, 2025) · Centro: Industria y Construcción · Pestaña: Con expedientes'. */
export function lineaFiltros(estado, contexto) {
  const lista = filtrosAplicados(estado, contexto)
  const partes = lista.map(([rotulo, valor]) => (rotulo === 'TRD' ? `TRD ${valor}` : `${rotulo}: ${valor}`))
  if (lista.length === 1) partes.push('sin otros filtros')
  return partes.join(' · ')
}

/** 'Datos al 10 de agosto de 2026', o el aviso de que no hay expedientes cargados. */
export function textoDatosAl(carga) {
  return carga ? `Datos al ${fechaLarga(carga.fecha_reporte)}` : 'Sin carga de expedientes: solo la TRD'
}

/**
 * Contenido de las tres hojas, sin depender de SheetJS (se prueba aparte). opciones.ficha es la
 * fila de la ficha abierta, cuando se exporta desde ella.
 */
export function datosLibro(filas, estado, contexto, { ficha = null } = {}) {
  const { nombrePlantilla, nombreCentro, centroDeDependencia, carga, pestana } = contexto

  const series = filas.map((f) => ({
    Dependencia: nombrePlantilla(f.plantilla),
    'Código serie': f.codigo_serie,
    Serie: f.nombre_serie,
    'Código subserie': f.codigo_subserie,
    Subserie: f.nombre_subserie,
    'Retención AG (años)': f.trd?.retencion_ag ?? '',
    'Retención AC (años)': f.trd?.retencion_ac ?? '',
    'Disposición final': f.trd ? textoDisposicion(f.trd.disposicion) : '',
    Estado: ETIQUETA_ESTADO[f.estado],
    Expedientes: f.cantidad,
  }))

  // Control de acceso con las mismas palabras de la ficha (Público, Clasificado, Reservado).
  const expedientes = filas.flatMap((f) =>
    f.expedientes.map((e) => ({
      Centro: nombreCentro(centroDeDependencia(e.codigo_dependencia)),
      Dependencia: nombrePlantilla(f.plantilla),
      'Código serie': f.codigo_serie,
      'Código subserie': f.codigo_subserie,
      'Código expediente': e.codigo,
      'Nombre del expediente': e.nombre,
      'Fecha de creación': e.fecha_creacion,
      'Control de acceso': etiquetaAcceso(e.control_acceso),
    })),
  )

  const filtros = [
    ['Filtro', 'Valor'],
    ['TRD', textoTrd(estado.trd)],
    ['Centros', listaONada(estado.centros.map(nombreCentro), 'Todos')],
    ['Dependencias', listaONada(estado.dependencias.map(nombrePlantilla), 'Todas')],
    ['Series', listaONada(estado.series, 'Todas')],
    ['Subseries', listaONada(estado.subseries, 'Todas')],
    ['Años', listaONada(estado.anios.map(String), 'Todos')],
    ['Búsqueda', estado.texto || '—'],
    ['Exportado desde', ficha ? `Ficha de ${codigoFila(ficha)}` : `Consulta, pestaña "${pestana ?? 'Todas'}"`],
    ['Datos al', carga ? fechaLarga(carga.fecha_reporte) : 'Sin carga de expedientes'],
    ['Descargado', new Date().toLocaleString('es-CO')],
  ]
  return { series, expedientes, filtros }
}

const dos = (n) => String(n).padStart(2, '0')

/** '2026-11-15' con la fecha local. */
export function fechaArchivo(fecha = new Date()) {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`
}

/**
 * Nombre del Excel o del PDF, con la fecha de descarga: TRDCode_consulta_2026-11-15.xlsx, o desde la
 * ficha TRDCode_ficha_85.15_2026-11-15.pdf.
 */
export function nombreArchivo(ficha, extension, fecha = new Date()) {
  const origen = ficha ? `ficha_${codigoFila(ficha)}` : 'consulta'
  return `TRDCode_${origen}_${fechaArchivo(fecha)}.${extension}`
}

export async function exportarExcel(filas, estado, contexto, opciones = {}) {
  const XLSX = await import('xlsx')
  const { series, expedientes, filtros } = datosLibro(filas, estado, contexto, opciones)
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(series), 'Series y subseries')
  const hojaExpedientes = expedientes.length
    ? XLSX.utils.json_to_sheet(expedientes)
    : XLSX.utils.aoa_to_sheet([['No hay expedientes en lo filtrado.']])
  XLSX.utils.book_append_sheet(libro, hojaExpedientes, 'Expedientes')
  XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(filtros), 'Filtros')
  const nombre = nombreArchivo(opciones.ficha, 'xlsx')
  XLSX.writeFile(libro, nombre)
  return nombre
}
