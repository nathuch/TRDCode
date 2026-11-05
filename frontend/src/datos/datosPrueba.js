/**
 * Datos reales para las pruebas: la salida de api/datos.php guardada en
 * datos-prueba/datos.json, que no va al repositorio. Para generarla:
 *   C:\xampp\php\php.exe api/datos.php > datos-prueba/datos.json
 * Si no existe, las pruebas que la usan se saltan.
 */
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ruta = fileURLToPath(new URL('../../../datos-prueba/datos.json', import.meta.url))

export const hayDatosReales = existsSync(ruta)

export function cargarDatosReales() {
  const texto = readFileSync(ruta, 'utf8').replace(/^\uFEFF/, '')
  return JSON.parse(texto).datos
}
