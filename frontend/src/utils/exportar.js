/**
 * Exportar a Excel lo que se ve (Fase 8, #54). Parte de las filas de aplicarFiltros(),
 * así que exporta exactamente lo filtrado; los nombres reservados llegan ya ocultos de la API.
 * El archivo se genera en el navegador con SheetJS, que se carga solo al exportar.
 */
import { ETIQUETA_ESTADO, fechaLarga, textoAcceso, textoDisposicion } from './formato.js'

function listaONada(valores, todos) {
  return valores.length ? valores.join(', ') : todos
}

/** Contenido de las tres hojas, sin depender de SheetJS (se prueba aparte). */
export function datosLibro(filas, estado, contexto) {
  const { nombrePlantilla, nombreCentro, centroDeDependencia, carga } = contexto

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

  const expedientes = filas.flatMap((f) =>
    f.expedientes.map((e) => ({
      Centro: nombreCentro(centroDeDependencia(e.codigo_dependencia)),
      Dependencia: nombrePlantilla(f.plantilla),
      'Código serie': f.codigo_serie,
      'Código subserie': f.codigo_subserie,
      'Código expediente': e.codigo,
      'Nombre del expediente': e.nombre,
      'Fecha de creación': e.fecha_creacion,
      'Control de acceso': textoAcceso(e.control_acceso),
    })),
  )

  const filtros = [
    ['Filtro', 'Valor'],
    ['TRD', estado.trd === '11' ? '11 (vigente, 2025)' : '10 (2020)'],
    ['Centros', listaONada(estado.centros.map(nombreCentro), 'Todos')],
    ['Dependencias', listaONada(estado.dependencias.map(nombrePlantilla), 'Todas')],
    ['Series', listaONada(estado.series, 'Todas')],
    ['Subseries', listaONada(estado.subseries, 'Todas')],
    ['Años', listaONada(estado.anios.map(String), 'Todos')],
    ['Búsqueda', estado.texto || '—'],
    ['Datos al', carga ? fechaLarga(carga.fecha_reporte) : 'Sin carga de expedientes'],
    ['Descargado', new Date().toLocaleString('es-CO')],
  ]
  return { series, expedientes, filtros }
}

export function nombreArchivo(fecha = new Date()) {
  const dos = (n) => String(n).padStart(2, '0')
  return `TRDCode-${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}.xlsx`
}

export async function exportarExcel(filas, estado, contexto) {
  const XLSX = await import('xlsx')
  const { series, expedientes, filtros } = datosLibro(filas, estado, contexto)
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(series), 'Series y subseries')
  const hojaExpedientes = expedientes.length
    ? XLSX.utils.json_to_sheet(expedientes)
    : XLSX.utils.aoa_to_sheet([['No hay expedientes en lo filtrado.']])
  XLSX.utils.book_append_sheet(libro, hojaExpedientes, 'Expedientes')
  XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(filtros), 'Filtros')
  const nombre = nombreArchivo()
  XLSX.writeFile(libro, nombre)
  return nombre
}
