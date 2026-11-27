// Capturas del manual de usuario (docs/img/): recorre la aplicación y guarda cada pantalla.
// Uso (solo contra la base temporal de scripts/pruebas-navegador/base_temporal.php, con el servidor de
// desarrollo y TRDCODE_ENV en ruta completa, como en el README de las pruebas en el navegador):
//   node scripts/capturas_manual.mjs [http://localhost:5173/]
// Sin nombres de personas: usa una cuenta temporal inventada ("Cuenta de prueba temporal", correo
// @trdcode.local) que borra al terminar; las fichas que se capturan solo tienen expedientes clasificados,
// que sin sesión salen como "Nombre reservado". Con sesión no se captura ningún listado de expedientes.
// No crea cargas: la vista previa de "Actualizar datos" no se confirma.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { abrirNavegador, boton, comprobarMismaBase, cuentaTemporal, direccion, espera, php, RAIZ, REPORTE } from './pruebas-navegador/comun.mjs'

const URL_APP = direccion()
await comprobarMismaBase(URL_APP)
if (!existsSync(REPORTE)) {
  console.log('Falta datos-prueba/reporte-tolima-2026-08-10.xlsx.')
  process.exit(1)
}
const IMG = join(RAIZ, 'docs', 'img')
mkdirSync(IMG, { recursive: true })
const cuenta = cuentaTemporal('prueba-manual')
// Cuenta de ejemplo que se crea desde "Nueva cuenta", con nombre y correo inventados.
const ejemplo = cuentaTemporal('prueba-manual-ejemplo')
php('cuenta_temporal.php', 'crear', cuenta.correo, cuenta.clave)
const n = await abrirNavegador({ ancho: 1280, alto: 860, prefijo: 'manual' })
const { cdp, ev, esperarA, tecla, clic, escribir, elegirArchivo, ir, tamano, computador } = n
const CONSULTA = `${URL_APP}#centros=73.9226&dependencias=00.9000.4`
const conTotal = `!!document.querySelector('.total__numero')`
const filaBoton = (codigo) => `[...document.querySelectorAll('tr.tabla__fila')].find(tr => tr.querySelector('.col-codigo').textContent.trim() === '${codigo}').querySelector('.fila__boton')`
const guardadas = []

/** Guarda la pantalla visible, o solo la región de los elementos (con un margen). */
async function captura(nombre, selectores = null, margen = 12) {
  await espera(400)
  let clip
  if (selectores) {
    const r = await ev(`(() => {
      const rs = ${JSON.stringify(selectores)}.map(s => document.querySelector(s)).filter(Boolean).map(e => e.getBoundingClientRect())
      if (!rs.length) return null
      const x = Math.max(0, Math.min(...rs.map(r => r.left)) - ${margen}), y = Math.max(0, Math.min(...rs.map(r => r.top)) - ${margen})
      return { x: x + scrollX, y: y + scrollY, width: Math.min(innerWidth, Math.max(...rs.map(r => r.right)) + ${margen}) - x, height: Math.max(...rs.map(r => r.bottom)) + ${margen} - y }
    })()`)
    if (!r) throw new Error(`No se encontró ${selectores.join(', ')} para ${nombre}.`)
    clip = { ...r, scale: 1 }
  }
  const res = await cdp('Page.captureScreenshot', { format: 'png', ...(clip ? { clip, captureBeyondViewport: true } : {}) })
  writeFileSync(join(IMG, `${nombre}.png`), Buffer.from(res.result.data, 'base64'))
  guardadas.push(nombre)
}

async function ingresar() {
  await clic(`document.querySelector('.acceso__enlace')`)
  await esperarA(`!!document.querySelector('[role=dialog] input[name=correo]')`)
  await escribir('input[name=correo]', cuenta.correo)
  await escribir('input[name=clave]', cuenta.clave)
  await tecla('Enter')
  await esperarA(`!!document.querySelector('.acceso__usuaria')`)
}

try {
  // Sin sesión.
  await ir(URL_APP, `!!document.querySelector('#inicio-titulo')`)
  await captura('01-inicio')

  await ir(CONSULTA, conTotal)
  await esperarA(`document.querySelector('.total__numero').textContent === '643'`)
  await ev('window.scrollTo(0, 0)')
  await captura('02-consulta')
  await captura('03-barra-consulta', ['.consulta__barra', '.consultando'])

  if (!(await ev(`!!document.querySelector('#panel-filtros')`))) await clic(`document.querySelector('.boton-filtros')`)
  await clic(`document.querySelectorAll('.selector summary')[0]`)
  await esperarA(`document.querySelectorAll('.selector')[0].open`)
  await captura('04-filtro-centro', ['.selector[open]', '.selector[open] .selector__lista', '#panel-filtros'])
  await tecla('Escape')

  await captura('05-total-pestanas-aviso', ['.total', '.pestanas', '.aviso-fuera'])
  await ev(`document.querySelector('#tabla-resultados').scrollIntoView({ block: 'start' })`)
  await captura('06-tabla')

  await clic(`document.querySelector('.total .menu-exportar > button')`)
  await esperarA(`!!document.querySelector('.total .menu-exportar__menu')`)
  await captura('07-exportar', ['.total', '.total .menu-exportar__menu'])
  await tecla('Escape')

  await clic(filaBoton('85.15'))
  await esperarA(`!!document.querySelector('.ficha') && document.querySelectorAll('.ficha .expediente__nombre.reservado').length >= 17`)
  // Solo expedientes clasificados, con el nombre oculto: no se ve ningún nombre real.
  if (await ev(`[...document.querySelectorAll('.ficha .expediente__nombre')].some(e => !e.firstChild.textContent.startsWith('Nombre reservado ('))`)) throw new Error('La ficha tiene nombres a la vista.')
  await captura('08-ficha')
  await tecla('Escape')

  await ir(`${URL_APP}#buscar=2023EX-000672`, `!!document.querySelector('.aviso-version')`)
  await captura('10-aviso-otra-version', ['.aviso-version'])

  // Celular.
  await tamano(390)
  await ir(URL_APP, `!!document.querySelector('#inicio-titulo')`)
  await captura('11-celular-inicio')
  await ir(CONSULTA, conTotal)
  await ev('window.scrollTo(0, 0)')
  await captura('12-celular-consulta')
  await computador()

  // Ingresar y lo que se hace con sesión.
  await ir(CONSULTA, conTotal)
  await clic(`document.querySelector('.acceso__enlace')`)
  await esperarA(`!!document.querySelector('[role=dialog] input[name=correo]')`)
  await captura('13-ingresar', ['[role=dialog]'])
  await tecla('Escape')
  await ingresar()
  await clic(`document.querySelector('.acceso__usuaria')`)
  await esperarA(`!!document.querySelector('.acceso__menu')`)
  await captura('14-menu-cuenta', ['.acceso__usuaria', '.acceso__menu'], 16)
  await clic(boton('Mi cuenta'))
  await esperarA(`location.hash === '#cuenta'`)
  await captura('15-mi-cuenta')
  await clic(`document.querySelector('.acceso__usuaria')`)
  await clic(boton('Usuarios'))
  await esperarA(`location.hash === '#usuarios' && document.querySelectorAll('tbody tr').length > 0`)
  await clic(boton('Nueva cuenta'))
  await esperarA(`!!document.querySelector('[role=dialog] input[name=nombre]')`)
  await escribir('[role=dialog] input[name=nombre]', 'Persona de Ejemplo')
  await escribir('[role=dialog] input[name=correo]', ejemplo.correo)
  await escribir('[role=dialog] input[name=clave]', ejemplo.clave)
  await escribir('[role=dialog] input[name=clave-repetida]', ejemplo.clave)
  await captura('09-nueva-cuenta', ['[role=dialog]'])
  await tecla('Enter')
  await esperarA(`!document.querySelector('[role=dialog]') && document.querySelectorAll('tbody tr').length >= 3`)
  await captura('16-usuarios')

  await clic(`document.querySelector('.acceso__usuaria')`)
  await clic(boton('Actualizar datos'))
  await esperarA(`!!document.querySelector('input[type=file]') && document.querySelectorAll('#historial-titulo ~ .tabla-caja tbody tr').length > 0`)
  await captura('17-actualizar')
  await ev(`document.querySelector('#historial-titulo').scrollIntoView({ block: 'start' })`)
  await captura('18-historial', ['#historial-titulo', '#historial-titulo ~ .tabla-caja'], 16)
  await elegirArchivo(REPORTE)
  await esperarA(`document.querySelector('input[name=fecha]').value === '2026-08-10'`)
  await clic(boton('Revisar el archivo'))
  await esperarA(`!!document.querySelector('#revision-titulo')`, 60000)
  await ev(`document.querySelector('#revision-titulo').scrollIntoView({ block: 'start' })`)
  await captura('19-revision')
  await clic(boton('Elegir otro archivo'))
  await esperarA(`!!document.querySelector('input[type=file]')`)

  // Aviso del cierre por inactividad (sin ficha ni expedientes a la vista).
  await ir(URL_APP, `!!document.querySelector('#inicio-titulo') && !!document.querySelector('.acceso__usuaria')`)
  await ev(`localStorage.setItem('trdcode-ultima-actividad', String(Date.now() - 30 * 60 * 1000)); document.dispatchEvent(new Event('visibilitychange'))`)
  await esperarA(`!!document.querySelector('.aviso-inactividad')`)
  await captura('20-aviso-inactividad', ['.encabezado', '.aviso-inactividad'])
  console.log(`Capturas guardadas en docs/img: ${guardadas.join(', ')}`)
} catch (e) {
  console.log(`ERROR: ${e.message}`)
  process.exitCode = 1
} finally {
  await n.cerrar()
  php('cuenta_temporal.php', 'borrar', cuenta.correo, ejemplo.correo)
}
