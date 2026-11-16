// Menús desplegables completos dentro de la pantalla: el menú de la usuaria y los selectores de filtros,
// a 320, 390 y 768 px de ancho y en computador (1.280 px). Cada menú abierto debe quedar entero, sin pasar
// los márgenes laterales (16 px), alineado a un borde de su botón y sin desplazamiento lateral.
// Uso: node scripts/pruebas-navegador/menus.mjs [http://localhost:5173/]
// Crea una cuenta temporal para abrir el menú de la usuaria y la borra al terminar. No cambia datos.
import {
  abrirNavegador,
  comprobarMismaBase,
  cuentaTemporal,
  direccion,
  espera,
  php,
  registro,
  SIN_DESPLAZAMIENTO_LATERAL,
} from './comun.mjs'

const URL_APP = direccion()
await comprobarMismaBase(URL_APP)
const r = registro()
const cuenta = cuentaTemporal('prueba-ui-menus')
php('cuenta_temporal.php', 'crear', cuenta.correo, cuenta.clave)
const n = await abrirNavegador({ prefijo: 'menus' })
const { ev, esperarA, tecla, clic, ir, foto } = n
const ANCHOS = [320, 390, 768, 1280]
const MARGEN = 16
const SELECTORES = ['Centro', 'Dependencia', 'Serie', 'Subserie']

/** Medidas del menú abierto y de su botón: dentro de los márgenes y alineado a un borde del botón. */
const medir = (menu, boton) => ev(`(() => {
  const m = document.querySelector(${JSON.stringify(menu)}).getBoundingClientRect()
  const b = document.querySelector(${JSON.stringify(boton)}).getBoundingClientRect()
  const ancho = document.documentElement.clientWidth
  return {
    izquierda: Math.round(m.left), derecha: Math.round(m.right), ancho,
    dentro: m.left >= ${MARGEN} - 0.5 && m.right <= ancho - ${MARGEN} + 0.5 && m.width > 0,
    alineado: Math.abs(m.left - b.left) < 1 || Math.abs(m.right - b.right) < 1 || Math.abs(m.left - ${MARGEN}) < 1,
  }
})()`)
const describir = (m) => `${m.izquierda}–${m.derecha} de ${m.ancho} px`

try {
  await ir(`${URL_APP}#centros=73.9226&dependencias=00.9000.4`, `!!document.querySelector('.total__numero')`)
  await clic(`document.querySelector('.acceso__enlace')`)
  await esperarA(`!!document.querySelector('input[name=correo]')`)
  await n.escribir('input[name=correo]', cuenta.correo)
  await n.escribir('input[name=clave]', cuenta.clave)
  await tecla('Enter')
  await esperarA(`!!document.querySelector('.acceso__usuaria')`)

  for (const ancho of ANCHOS) {
    r.seccion(`${ancho} px de ancho`)
    await n.tamano(ancho)
    await ir(`${URL_APP}#centros=73.9226&dependencias=00.9000.4`, `!!document.querySelector('.total__numero') && !!document.querySelector('.acceso__usuaria')`)

    await clic(`document.querySelector('.acceso__usuaria')`)
    await esperarA(`!!document.querySelector('.acceso__menu')`)
    const menu = await medir('.acceso__menu', '.acceso__usuaria')
    r.comprobar(`menú de la usuaria completo, dentro de los márgenes y alineado a su botón (${describir(menu)})`, menu.dentro && menu.alineado && (await ev(SIN_DESPLAZAMIENTO_LATERAL)))
    if (ancho === 320) await foto('320-menu-usuaria')
    await tecla('Escape')
    await esperarA(`!document.querySelector('.acceso__menu')`)

    if (!(await ev(`!!document.querySelector('#panel-filtros')`))) await clic(`document.querySelector('.boton-filtros')`)
    await esperarA(`!!document.querySelector('#panel-filtros')`)
    for (const [i, nombre] of SELECTORES.entries()) {
      await clic(`document.querySelectorAll('.selector summary')[${i}]`)
      await esperarA(`document.querySelectorAll('.selector')[${i}].open`)
      await espera(100)
      await ev(`document.querySelectorAll('.selector')[${i}].setAttribute('data-medir', '')`)
      const lista = await medir('.selector[data-medir] .selector__lista', '.selector[data-medir] summary')
      r.comprobar(`selector ${nombre}: lista completa, dentro de los márgenes y alineada (${describir(lista)})`, lista.dentro && lista.alineado && (await ev(SIN_DESPLAZAMIENTO_LATERAL)))
      if (ancho === 320 && i === 0) await foto('320-selector-centro')
      if (ancho === 768 && i === 1) await foto('768-selector-dependencia')
      await ev(`document.querySelectorAll('.selector')[${i}].removeAttribute('data-medir')`)
      await tecla('Escape')
      await esperarA(`!document.querySelectorAll('.selector')[${i}].open`)
    }
  }
} catch (e) {
  r.error(e)
} finally {
  await n.cerrar()
  php('cuenta_temporal.php', 'borrar', cuenta.correo)
  r.terminar()
}
