// Utilidades comunes de las pruebas en el navegador: abren Edge (o Chrome) sin ventana y lo manejan
// por el protocolo de depuración (CDP), con teclado y mouse reales. No usan dependencias externas.
// Las pruebas no imprimen títulos de expedientes, correos ni contraseñas.
import { execFileSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const AQUI = dirname(fileURLToPath(import.meta.url))
export const RAIZ = join(AQUI, '..', '..')
const PHP = process.env.PHP ?? 'C:\\xampp\\php\\php.exe'
const NAVEGADORES = [
  process.env.NAVEGADOR,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)

// Las capturas van fuera del repositorio (pueden mostrar la cuenta temporal).
export const CAPTURAS = process.env.CAPTURAS ?? join(tmpdir(), 'trdcode-capturas')
mkdirSync(CAPTURAS, { recursive: true })

export const espera = (ms) => new Promise((r) => setTimeout(r, ms))

/** Dirección de la aplicación: el primer argumento, o el servidor de desarrollo. Siempre termina en '/'. */
export function direccion() {
  const url = process.argv[2] ?? 'http://localhost:5173/'
  return url.endsWith('/') ? url : `${url}/`
}

/** Corre un ayudante PHP de esta carpeta con el PHP de XAMPP (lee el .env del proyecto o TRDCODE_ENV). */
export function php(ayudante, ...argumentos) {
  return execFileSync(PHP, [join(AQUI, ayudante), ...argumentos], { encoding: 'utf8' }).trim()
}

/**
 * Comprueba, sin escribir nada, que la aplicación probada usa la misma base que los ayudantes (la del .env
 * o la de TRDCODE_ENV): compara la carga activa que entrega datos.php con la de la base. Si no coinciden,
 * termina la prueba antes de crear cuentas o cargas.
 */
export async function comprobarMismaBase(url) {
  const datos = await fetch(`${url}api/datos.php`).then((r) => r.json()).catch(() => null)
  const enLaAplicacion = datos?.datos?.carga?.fecha_carga ?? '(sin respuesta)'
  const enLaBase = php('cuenta_temporal.php', 'huella')
  if (enLaAplicacion !== enLaBase) {
    console.log(`La aplicación en ${url} no usa la misma base que las pruebas (carga activa del ${enLaAplicacion} y del ${enLaBase}).`)
    console.log('Revise TRDCODE_ENV: debe tener la ruta completa y ser la misma en el servidor y aquí (vea el README).')
    process.exit(1)
  }
}

/** Cuenta temporal con correo y contraseña al azar; nunca se imprimen. */
export function cuentaTemporal(prefijo) {
  return { correo: `${prefijo}-${randomBytes(4).toString('hex')}@trdcode.local`, clave: randomBytes(12).toString('hex') }
}

/** Abre el navegador sin ventana y devuelve las funciones para manejarlo. */
export async function abrirNavegador({ ancho = 1280, alto = 900, prefijo = 'prueba' } = {}) {
  const ejecutable = NAVEGADORES.find((n) => existsSync(n))
  if (!ejecutable) throw new Error('No se encontró Edge ni Chrome. Indique la ruta con la variable NAVEGADOR.')
  const trabajo = mkdtempSync(join(tmpdir(), 'trdcode-navegador-'))
  const puerto = 9400 + Math.floor(Math.random() * 400)
  const proceso = spawn(
    ejecutable,
    ['--headless=new', `--remote-debugging-port=${puerto}`, `--user-data-dir=${join(trabajo, 'perfil')}`,
      '--no-first-run', '--disable-extensions', `--window-size=${ancho},${alto}`, 'about:blank'],
    { stdio: 'ignore' },
  )
  let paginas
  for (let i = 0; i < 80 && !paginas; i++) {
    await espera(250)
    paginas = await fetch(`http://127.0.0.1:${puerto}/json/list`).then((r) => r.json()).catch(() => null)
  }
  if (!paginas) throw new Error('El navegador no respondió.')
  const ws = new WebSocket(paginas.find((p) => p.type === 'page').webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pendientes = new Map()
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data)
    if (pendientes.has(d.id)) {
      pendientes.get(d.id)(d)
      pendientes.delete(d.id)
    }
  }
  const cdp = (method, params = {}) =>
    new Promise((r) => {
      const n = ++id
      pendientes.set(n, r)
      ws.send(JSON.stringify({ id: n, method, params }))
    })

  /** Evalúa una expresión en la página y devuelve su valor. */
  const ev = async (expresion) => {
    const r = await cdp('Runtime.evaluate', { expression: expresion, returnByValue: true, awaitPromise: true })
    if (r.result.exceptionDetails) throw new Error(`${r.result.exceptionDetails.text} :: ${expresion.slice(0, 120)}`)
    return r.result.result.value
  }
  /** Espera a que la expresión sea verdadera (o se acabe el tiempo); devuelve si se cumplió. */
  const esperarA = async (expresion, ms = 15000) => {
    for (let t = 0; t < ms; t += 100) {
      if (await ev(expresion)) return true
      await espera(100)
    }
    return false
  }
  const CODIGOS = { Enter: 13, Escape: 27, Tab: 9, ArrowRight: 39, ArrowLeft: 37, Home: 36, End: 35 }
  /** Tecla real; con mayus = true, Mayús+tecla. */
  const tecla = async (key, mayus = false) => {
    const base = { key, code: key, windowsVirtualKeyCode: CODIGOS[key], modifiers: mayus ? 8 : 0 }
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', ...base, ...(key === 'Enter' ? { text: '\r' } : {}) })
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
  }
  /** Clic real del mouse en el centro del elemento que devuelve la expresión. */
  const clic = async (expresion) => {
    const r = await ev(`(() => { const e = ${expresion}; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 } })()`)
    for (const type of ['mousePressed', 'mouseReleased']) {
      await cdp('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', clickCount: 1 })
    }
  }
  /** Escribe en el campo (como si se tecleara). */
  const escribir = async (selector, texto) => {
    await ev(`document.querySelector(${JSON.stringify(selector)}).focus()`)
    await cdp('Input.insertText', { text: texto })
  }
  /** Elige un archivo en el primer <input type=file> de la página. */
  const elegirArchivo = async (ruta) => {
    const { result: doc } = await cdp('DOM.getDocument', { depth: -1 })
    const { result: nodo } = await cdp('DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type=file]' })
    await cdp('DOM.setFileInputFiles', { nodeId: nodo.nodeId, files: [ruta.replaceAll('/', '\\')] })
  }
  /** Abre una dirección y espera a que la página esté lista y se cumpla la condición. */
  const ir = async (url, condicion = 'true') => {
    await cdp('Page.navigate', { url })
    await esperarA(`document.readyState === 'complete' && (${condicion})`)
    await espera(250)
  }
  const celular = () => cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  const computador = () => cdp('Emulation.clearDeviceMetricsOverride')
  const foto = async (nombre) => {
    const r = await cdp('Page.captureScreenshot', { format: 'png' })
    writeFileSync(join(CAPTURAS, `${prefijo}-${nombre}.png`), Buffer.from(r.result.data, 'base64'))
  }
  const cerrar = async () => {
    ws.close()
    proceso.kill()
    await espera(500)
    rmSync(trabajo, { recursive: true, force: true })
  }
  await cdp('Page.enable')
  await cdp('DOM.enable')
  return { cdp, ev, esperarA, tecla, clic, escribir, elegirArchivo, ir, celular, computador, foto, cerrar }
}

/** Registro de comprobaciones: imprime "ok" o "FALLA" y cuenta las fallas. */
export function registro() {
  let total = 0
  let fallas = 0
  return {
    comprobar(texto, ok) {
      total++
      if (!ok) fallas++
      console.log(`${ok ? '  ok    ' : '  FALLA '} ${texto}`)
    },
    seccion(texto) {
      console.log(`\n== ${texto}`)
    },
    error(e) {
      fallas++
      console.log(`\nERROR: ${e.message}`)
    },
    terminar() {
      console.log(`\n${fallas === 0 ? `Todo bien: ${total} comprobaciones.` : `${fallas} de ${total} comprobaciones fallaron.`}`)
      console.log(`Capturas en ${CAPTURAS}`)
      process.exitCode = fallas === 0 ? 0 : 1
    },
  }
}

/** Expresión que es verdadera si ni la página ni sus cajas se desplazan de lado. */
export const SIN_DESPLAZAMIENTO_LATERAL = `(document.documentElement.scrollWidth <= window.innerWidth) && [...document.querySelectorAll('.tabla-caja, .ficha, .dialogo, .pestanas, .panel, .consulta')].every(e => e.scrollWidth <= e.clientWidth + 1)`

/** Expresión que devuelve las zonas táctiles visibles de menos de 24 px (para un input en una etiqueta, cuenta la etiqueta). */
export const ZONAS_CHICAS = `(() => [...document.querySelectorAll('button, a[href], summary, select, input:not([type=hidden])')].map(e => {
  const el = e.tagName === 'INPUT' ? (e.closest('label') ?? e) : e
  return { e, b: el.getBoundingClientRect() }
}).filter(({ e, b }) => b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden' && (b.width < 24 || b.height < 24))
  .map(({ e, b }) => (e.className || e.tagName) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height)))()`

/** Botón por su texto (empieza con). */
export const boton = (texto) => `[...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(${JSON.stringify(texto)}))`

/** Ruta del reporte de prueba (datos-prueba/, no va al repositorio). */
export const REPORTE = join(RAIZ, 'datos-prueba', 'reporte-tolima-2026-08-10.xlsx')
