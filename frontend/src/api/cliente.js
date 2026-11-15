/**
 * Llamadas a la API en PHP. Las rutas son relativas (sin barra inicial) para que la
 * aplicación funcione en cualquier carpeta del servidor sin volver a compilar.
 *
 * La cookie de sesión viaja sola (same-origin). El token CSRF llega con sesion.php y login.php,
 * se guarda aquí y se agrega en la cabecera X-CSRF-Token de los servicios que cambian datos.
 */

let tokenCsrf = null

/** Error de la API con el código HTTP y, si hay bloqueo, los segundos que faltan. */
export class ErrorApi extends Error {
  constructor(mensaje, estado, esperaSegundos = null) {
    super(mensaje)
    this.estado = estado
    this.esperaSegundos = esperaSegundos
  }
}

async function llamar(ruta, { metodo = 'GET', cuerpo, conCsrf = false } = {}) {
  const cabeceras = { Accept: 'application/json' }
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json'
  if (conCsrf && tokenCsrf) cabeceras['X-CSRF-Token'] = tokenCsrf
  const respuesta = await fetch(ruta, {
    method: metodo,
    credentials: 'same-origin',
    headers: cabeceras,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
  let datos
  try {
    datos = await respuesta.json()
  } catch {
    throw new ErrorApi(`El servidor respondió ${respuesta.status} sin datos válidos.`, respuesta.status)
  }
  if (!datos.ok) {
    throw new ErrorApi(datos.error || 'El servidor no pudo atender la solicitud.', respuesta.status, datos.espera_segundos)
  }
  return datos.datos
}

/** Guarda el token de la sesión y devuelve { sesion, nombre }. */
function recordarSesion(datos) {
  tokenCsrf = datos.sesion ? datos.csrf : null
  return { sesion: datos.sesion, nombre: datos.nombre ?? null }
}

export async function obtenerDatos() {
  return llamar('api/datos.php')
}

export async function obtenerSesion() {
  return recordarSesion(await llamar('api/sesion.php'))
}

export async function iniciarSesion(correo, clave) {
  return recordarSesion(await llamar('api/login.php', { metodo: 'POST', cuerpo: { correo, clave } }))
}

export async function cerrarSesion() {
  try {
    await llamar('api/logout.php', { metodo: 'POST', cuerpo: {}, conCsrf: true })
  } catch (e) {
    // Si la sesión ya había vencido (401), igual queda cerrada.
    if (e.estado !== 401) throw e
  }
  tokenCsrf = null
}

export async function cambiarClave(actual, nueva) {
  return recordarSesion(
    await llamar('api/cambiar_clave.php', { metodo: 'POST', cuerpo: { actual, nueva }, conCsrf: true }),
  )
}
