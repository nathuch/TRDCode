/**
 * Llamadas a la API en PHP. Las rutas son relativas (sin barra inicial) para que la
 * aplicación funcione en cualquier carpeta del servidor sin volver a compilar.
 */

export async function obtenerDatos() {
  const respuesta = await fetch('api/datos.php', {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
  let cuerpo
  try {
    cuerpo = await respuesta.json()
  } catch {
    throw new Error(`El servidor respondió ${respuesta.status} sin datos válidos.`)
  }
  if (!cuerpo.ok) throw new Error(cuerpo.error || 'El servidor no pudo entregar los datos.')
  return cuerpo.datos
}
