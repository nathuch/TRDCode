/**
 * Agrupado de las series y subseries como se ven en la consulta, compartido por la tabla de
 * resultados, el PDF y la impresión: una sección por dependencia y, dentro de cada sección, las
 * subseries seguidas de una misma serie juntas en un grupo.
 */

/** Divide las filas (ya ordenadas) en secciones por dependencia: [{ plantilla, filas }]. */
export function enSecciones(filas) {
  const secciones = []
  for (const fila of filas) {
    if (secciones.at(-1)?.plantilla !== fila.plantilla) secciones.push({ plantilla: fila.plantilla, filas: [] })
    secciones.at(-1).filas.push(fila)
  }
  return secciones
}

/**
 * Junta las subseries seguidas de una misma serie en un grupo
 * ({ grupo: true, codigo, nombre, filas, total }); las series sin subseries quedan como filas sueltas.
 */
export function agrupar(filas) {
  const items = []
  for (const fila of filas) {
    if (!fila.codigo_subserie) {
      items.push(fila)
      continue
    }
    const ultimo = items.at(-1)
    if (ultimo?.grupo && ultimo.codigo === fila.codigo_serie) ultimo.filas.push(fila)
    else items.push({ grupo: true, codigo: fila.codigo_serie, nombre: fila.nombre_serie, filas: [fila] })
  }
  for (const item of items) if (item.grupo) item.total = item.filas.reduce((suma, f) => suma + f.cantidad, 0)
  return items
}

/**
 * Bloques para pintar una sección sin cortar un grupo: cada grupo de serie es un bloque, y las
 * filas sueltas seguidas van juntas en otro.
 */
export function enBloques(items) {
  const bloques = []
  for (const item of items) {
    if (item.grupo) bloques.push({ grupo: item })
    else if (bloques.at(-1)?.sueltas) bloques.at(-1).sueltas.push(item)
    else bloques.push({ sueltas: [item] })
  }
  return bloques
}
