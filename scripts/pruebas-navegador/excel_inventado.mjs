// Excel inventado (sin datos de personas) con filas válidas, filas con problemas, un código repetido y
// una fila de otro centro. Se genera al correr la prueba con el SheetJS del frontend: los .xlsx no van
// al repositorio (CLAUDE.md y .gitignore).
//   9 filas: 3 para cargar (una por centro), 1 de otro centro y 5 con problemas
//   (código inválido, fecha vacía, TRD 9 y el código repetido en las filas 9 y 10).
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { CAPTURAS, RAIZ } from './comun.mjs'

const XLSX = createRequire(join(RAIZ, 'frontend', 'package.json'))('xlsx')

const ENCABEZADO = ['Código', 'Título', 'TRD', 'Serie Código', 'Subserie Serie Nombre', 'Subserie Código', 'Subserie',
  'Fecha Creación', 'Control de Acceso']

function fila(codigo, serie, subserie, fecha, trd = 11) {
  return [codigo, 'Expediente inventado de prueba', trd, serie, 'PROGRAMAS', subserie, 'Programas de Emprendimiento', fecha, 'PÚBLICO']
}

/** Escribe el Excel en la carpeta de capturas y devuelve su ruta. */
export function excelConProblemas() {
  const filas = [
    ENCABEZADO,
    fila('2025EX-900001', '73.9226.4-85', '73.9226.4-85.15', 45500),
    fila('2025EX-900002', '73.9310.4-85', '73.9310.4-85.15', 45600),
    fila('2026EX-900003', '73.9123-27', '', 46000),
    fila('ABC-1', '73.9226.4-85', '73.9226.4-85.15', 45500),
    fila('2025EX-900005', '73.9226.4-85', '73.9226.4-85.15', ''),
    fila('2025EX-900006', '73.9226.4-85', '73.9226.4-85.15', 45500, 9),
    fila('2025EX-900007', '1.7073-39', '1.7073-39.11', 45500),
    fila('2025EX-900008', '73.9226.4-85', '73.9226.4-85.15', 45700),
    fila('2025EX-900008', '73.9226.4-85', '73.9226.4-85.15', 45710),
  ]
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(filas), 'Reporte')
  const ruta = join(CAPTURAS, 'reporte-con-problemas-2026-08-10.xlsx')
  XLSX.writeFile(libro, ruta)
  return ruta
}
