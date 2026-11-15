/**
 * Lectura del reporte de OnBase (.xlsx) en el navegador con SheetJS (Fase 4).
 * Las celdas se entregan como el mismo texto que lee scripts/generar_expedientes_sql.py del XML:
 * los textos tal cual y los números como String(valor) (la fecha llega como número de serie).
 */
import { columnasFaltantes } from './normalizar.js'

export const TAMANO_MAXIMO = 15 * 1024 * 1024

/** Revisa el archivo antes de leerlo; devuelve el motivo del rechazo o null. */
export function revisarArchivo(archivo) {
  if (!archivo) return 'Elija el archivo del reporte.'
  if (!/\.xlsx$/i.test(archivo.name)) return 'El archivo debe ser un Excel .xlsx (el reporte de OnBase).'
  if (archivo.size > TAMANO_MAXIMO) return 'El archivo pesa más de 15 MB.'
  if (archivo.size === 0) return 'El archivo está vacío.'
  return null
}

/**
 * Filas de la primera hoja: { filas, primera }, con filas como listas de texto y primera el número
 * de fila del Excel donde está el encabezado. Lanza un error si no es un Excel válido o si faltan
 * columnas obligatorias. SheetJS se carga solo cuando hace falta, como en utils/exportar.js.
 */
export async function leerFilas(contenido) {
  const { read, utils } = await import('xlsx')
  let libro
  try {
    libro = read(contenido, { type: 'array', cellDates: false, cellText: false, cellHTML: false })
  } catch {
    throw new Error('No se pudo leer el archivo. Revise que sea el reporte de OnBase en formato .xlsx.')
  }
  const hoja = libro.Sheets[libro.SheetNames[0]]
  if (!hoja?.['!ref']) throw new Error('La primera hoja del archivo está vacía.')
  const rango = utils.decode_range(hoja['!ref'])
  const filas = []
  for (let r = rango.s.r; r <= rango.e.r; r++) {
    const fila = []
    for (let c = rango.s.c; c <= rango.e.c; c++) fila.push(textoCelda(hoja[utils.encode_cell({ r, c })]))
    filas.push(fila)
  }
  const faltan = columnasFaltantes(filas[0] ?? [])
  if (faltan.length) {
    throw new Error(`Al reporte le faltan ${faltan.length === 1 ? 'la columna' : 'las columnas'}: ${faltan.join(', ')}.`)
  }
  return { filas, primera: rango.s.r + 1 }
}

const ENTIDADES = { lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' }

function desescapar(xml) {
  return xml.replace(/&(lt|gt|quot|apos|amp|#\d+|#x[0-9a-fA-F]+);/g, (_, e) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTIDADES[e],
  )
}

/**
 * Texto de una celda, como el que lee el script de Python del XML. Para los textos se usa el XML
 * original de la celda (celda.r), uniendo sus <t>: el valor ya procesado de SheetJS (celda.v)
 * cambia los saltos de línea \r\n por \n, y el script los conserva.
 */
function textoCelda(celda) {
  if (!celda) return ''
  if (celda.t === 's' && typeof celda.r === 'string' && celda.r.includes('<t')) {
    return [...celda.r.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => desescapar(m[1])).join('')
  }
  if (celda.t === 'b') return celda.v ? '1' : '0'
  if (celda.t === 'e') return celda.w ?? ''
  return celda.v === undefined || celda.v === null ? '' : String(celda.v)
}

/** Revisa y lee un archivo elegido en el navegador. */
export async function leerExcel(archivo) {
  const problema = revisarArchivo(archivo)
  if (problema) throw new Error(problema)
  return await leerFilas(new Uint8Array(await archivo.arrayBuffer()))
}
