/**
 * Cierre de la sesión por inactividad en el navegador (#82).
 *
 * El servidor cierra la sesión a los 30 minutos sin peticiones, pero la página no se entera hasta la
 * siguiente petición: los nombres reales de los expedientes IPC e IPR quedarían a la vista en una
 * pestaña olvidada. Por eso la página cuenta también la actividad de la persona (mouse, teclado,
 * toques y desplazamiento) y, a los 29 minutos sin actividad, oculta los nombres y cierra la sesión,
 * antes de que lo haga el servidor.
 *
 * La última actividad se comparte entre las pestañas de la aplicación (localStorage), para que una
 * pestaña quieta no cierre la sesión de otra en uso. Si el navegador no deja usar localStorage, cada
 * pestaña cuenta la suya. Mientras hay actividad, la página avisa al servidor (sesion.php) a lo sumo
 * una vez por minuto, para que tampoco él cierre la sesión de alguien que la está usando.
 */

export const INACTIVIDAD_MS = 29 * 60 * 1000
export const AVISO_SERVIDOR_MS = 60 * 1000
const CLAVE = 'trdcode-ultima-actividad'

let enMemoria = Date.now()

/** Anota la actividad de ahora (en esta pestaña y, si se puede, para las demás). */
export function registrarActividad(ahora = Date.now()) {
  enMemoria = ahora
  try {
    localStorage.setItem(CLAVE, String(ahora))
  } catch {
    // Sin localStorage, cuenta solo esta pestaña.
  }
}

/** Hora de la última actividad en cualquier pestaña de la aplicación. */
export function ultimaActividad() {
  try {
    const guardada = Number(localStorage.getItem(CLAVE))
    if (guardada > 0) return guardada
  } catch {
    // Sin localStorage, cuenta solo esta pestaña.
  }
  return enMemoria
}

/** true si pasó el límite sin actividad. */
export function inactiva(ahora, ultima, limite = INACTIVIDAD_MS) {
  return ahora - ultima >= limite
}

/** Eventos que cuentan como actividad. */
export const EVENTOS_ACTIVIDAD = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll']
