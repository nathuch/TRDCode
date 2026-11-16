/**
 * Llamadas a la API en PHP. Las rutas son relativas (sin barra inicial) para que la
 * aplicación funcione en cualquier carpeta del servidor sin volver a compilar.
 *
 * La cookie de sesión viaja sola (same-origin). El token CSRF llega con sesion.php y login.php,
 * se guarda aquí y se agrega en la cabecera X-CSRF-Token de los servicios que cambian datos.
 */

let tokenCsrf = null

/**
 * Error de la API con el código HTTP, los segundos que faltan si hay bloqueo y, en un lote rechazado,
 * los expedientes señalados ([{ indice, fila, codigo, motivo }]).
 */
export class ErrorApi extends Error {
  constructor(mensaje, estado, esperaSegundos = null, errores = [], debeCambiarClave = false) {
    super(mensaje)
    this.estado = estado
    this.esperaSegundos = esperaSegundos
    this.errores = errores
    // 403 porque la cuenta tiene una contraseña temporal que debe cambiar antes de seguir.
    this.debeCambiarClave = debeCambiarClave
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
    throw new ErrorApi(
      datos.error || 'El servidor no pudo atender la solicitud.',
      respuesta.status,
      datos.espera_segundos,
      datos.errores ?? [],
      datos.debe_cambiar_clave === true,
    )
  }
  return datos.datos
}

/** Guarda el token de la sesión y devuelve { sesion, nombre, debeCambiarClave }. */
function recordarSesion(datos) {
  tokenCsrf = datos.sesion ? datos.csrf : null
  return { sesion: datos.sesion, nombre: datos.nombre ?? null, debeCambiarClave: datos.debe_cambiar_clave === true }
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

// Importación del reporte (Fase 4). Todo exige sesión; lo que cambia datos lleva el token CSRF.

export async function obtenerCargas() {
  return (await llamar('api/cargas.php')).cargas
}

export async function iniciarImportacion(fechaReporte, archivo, totalEsperado) {
  return llamar('api/importar_iniciar.php', {
    metodo: 'POST',
    cuerpo: { fecha_reporte: fechaReporte, archivo, total_esperado: totalEsperado },
    conCsrf: true,
  })
}

export async function enviarLote(cargaId, expedientes) {
  return llamar('api/importar_lote.php', { metodo: 'POST', cuerpo: { carga_id: cargaId, expedientes }, conCsrf: true })
}

export async function finalizarImportacion(cargaId) {
  return llamar('api/importar_finalizar.php', { metodo: 'POST', cuerpo: { carga_id: cargaId }, conCsrf: true })
}

export async function restaurarCarga(cargaId) {
  return llamar('api/restaurar_carga.php', { metodo: 'POST', cuerpo: { carga_id: cargaId }, conCsrf: true })
}

// Cuentas editables (RF-17): "Mi cuenta" y "Usuarios". Todo exige sesión y token CSRF.

export async function guardarMiNombre(nombre) {
  return recordarSesion(await llamar('api/mi_cuenta.php', { metodo: 'POST', cuerpo: { nombre }, conCsrf: true }))
}

export async function cambiarCorreo(correo, clave) {
  return llamar('api/cambiar_correo.php', { metodo: 'POST', cuerpo: { correo, clave }, conCsrf: true })
}

export async function obtenerUsuarios() {
  return (await llamar('api/usuarios.php')).cuentas
}

/** Sin id crea la cuenta (con contraseña temporal); con id edita el nombre y el correo de otra cuenta. */
export async function guardarUsuario(cuenta) {
  return llamar('api/usuario_guardar.php', { metodo: 'POST', cuerpo: cuenta, conCsrf: true })
}

export async function ponerClaveTemporal(id, clave) {
  return llamar('api/usuario_clave_temporal.php', { metodo: 'POST', cuerpo: { id, clave }, conCsrf: true })
}

export async function cambiarEstadoUsuario(id, activo) {
  return llamar('api/usuario_estado.php', { metodo: 'POST', cuerpo: { id, activo }, conCsrf: true })
}
