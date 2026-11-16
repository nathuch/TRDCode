// Ingreso de la encargada: formulario, errores, bloqueo, menú, cambio de contraseña y salida.
// Uso: node scripts/pruebas-navegador/ingreso.mjs [http://localhost:5173/]
// Crea una cuenta temporal (correo y contraseña al azar) y la borra al terminar; no usa la cuenta real.
import { abrirNavegador, boton, comprobarMismaBase, cuentaTemporal, direccion, php, registro } from './comun.mjs'

const URL_APP = direccion()
await comprobarMismaBase(URL_APP)
const r = registro()
const cuenta = cuentaTemporal('prueba-ui-ingreso')
const nueva = cuentaTemporal('x').clave
php('cuenta_temporal.php', 'crear', cuenta.correo, cuenta.clave)
const n = await abrirNavegador({ prefijo: 'ingreso' })
const { ev, esperarA, tecla, clic, escribir, ir, foto } = n
const foco = () => ev(`(() => { const a = document.activeElement; return a ? (a.getAttribute('name') || a.className || a.tagName) : '' })()`)
const aviso = () => ev(`document.querySelector('[role=alert]')?.textContent ?? ''`)
const enDialogo = (texto) => `[...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent.trim() === ${JSON.stringify(texto)})`
const reemplazar = (selector, texto) => ev(`(() => { const i = document.querySelector(${JSON.stringify(selector)}); i.focus(); i.select() })()`).then(() => n.cdp('Input.insertText', { text: texto }))

try {
  r.seccion(`Ingreso en ${URL_APP}`)
  await ir(`${URL_APP}#consulta`, `!!document.querySelector('.total__numero')`)
  r.comprobar('la consulta carga sin sesión y el encabezado muestra "Ingresar"', await esperarA(`!!document.querySelector('.acceso__enlace')`))
  await clic(`document.querySelector('.acceso__enlace')`)
  r.comprobar('se abre el formulario con el foco en el correo', await esperarA(`!!document.querySelector('[role=dialog]')`) && (await foco()) === 'correo')
  r.comprobar('los campos tienen etiqueta', await ev(`[...document.querySelectorAll('[role=dialog] input')].every(i => i.labels.length === 1 && i.labels[0].textContent.trim().length > 0)`))
  await tecla('Escape')
  r.comprobar('Esc cierra y el foco vuelve a "Ingresar"', await esperarA(`!document.querySelector('[role=dialog]')`) && (await foco()) === 'acceso__enlace')

  await clic(`document.querySelector('.acceso__enlace')`)
  await esperarA(`!!document.querySelector('[role=dialog]')`)
  for (let i = 0; i < 4; i++) await tecla('Tab', true)
  r.comprobar('Mayús+Tab no saca el foco del formulario', await ev(`document.querySelector('[role=dialog]').contains(document.activeElement)`))
  await ev(`document.querySelector('input[name=correo]').focus()`)
  await tecla('Enter')
  r.comprobar('Enter sin datos pide el correo y la contraseña', await esperarA(`(document.querySelector('[role=alert]')?.textContent ?? '').includes('Escriba el correo')`))
  await escribir('input[name=correo]', cuenta.correo)
  await escribir('input[name=clave]', 'clave-equivocada')
  await tecla('Enter')
  r.comprobar('mientras envía, el botón dice "Ingresando…" y está deshabilitado', await esperarA(`${boton('Ingresando')}?.disabled === true`, 2000))
  await esperarA(`(document.querySelector('[role=alert]')?.textContent ?? '').includes('incorrectos')`)
  r.comprobar('contraseña incorrecta: "Correo o contraseña incorrectos." y se borra la contraseña', (await aviso()) === 'Correo o contraseña incorrectos.' && (await ev(`document.querySelector('input[name=clave]').value === ''`)))
  await escribir('input[name=clave]', cuenta.clave)
  await tecla('Enter')
  r.comprobar('con la contraseña correcta: el nombre en el encabezado y el foco en él', await esperarA(`document.querySelector('.acceso__nombre')?.textContent === 'Cuenta de prueba temporal'`) && (await foco()) === 'acceso__usuaria')

  await clic(`document.querySelector('.acceso__usuaria')`)
  const opciones = await ev(`[...document.querySelectorAll('.acceso__opcion')].map(b => b.textContent.trim())`)
  r.comprobar(`el menú tiene ${opciones.join(', ')}`, JSON.stringify(opciones) === '["Actualizar datos","Usuarios","Mi cuenta","Salir"]')
  await foto('01-menu')
  await tecla('Escape')
  r.comprobar('Esc cierra el menú', await esperarA(`!document.querySelector('.acceso__menu')`))

  // La contraseña se cambia en "Mi cuenta" (RF-17).
  await clic(`document.querySelector('.acceso__usuaria')`)
  await clic(boton('Mi cuenta'))
  await esperarA(`location.hash === '#cuenta'`)
  await clic(boton('Cambiar la contraseña'))
  await esperarA(`document.querySelectorAll('[role=dialog] input').length === 3`)
  const campo = (i) => `document.querySelectorAll('[role=dialog] input')[${i}]`
  await ev(`${campo(0)}.focus()`)
  await n.cdp('Input.insertText', { text: cuenta.clave })
  await ev(`${campo(1)}.focus()`)
  await n.cdp('Input.insertText', { text: nueva })
  await ev(`${campo(2)}.focus()`)
  await n.cdp('Input.insertText', { text: `${nueva}x` })
  await tecla('Enter')
  r.comprobar('si la confirmación no coincide, lo avisa', await esperarA(`(document.querySelector('[role=alert]')?.textContent ?? '').includes('no coinciden')`))
  await ev(`${campo(2)}.select()`)
  await n.cdp('Input.insertText', { text: nueva })
  await tecla('Enter')
  r.comprobar('cambio de contraseña correcto', await esperarA(`(document.querySelector('[role=dialog] [role=status]')?.textContent ?? '').includes('se cambió')`))
  await clic(enDialogo('Listo'))

  await clic(`document.querySelector('.acceso__usuaria')`)
  await clic(boton('Salir'))
  r.comprobar('"Salir" vuelve a mostrar "Ingresar" y el servidor ya no tiene sesión', await esperarA(`!!document.querySelector('.acceso__enlace')`) && (await ev(`fetch('api/sesion.php').then(r => r.json()).then(j => j.datos.sesion)`)) === false)

  await clic(`document.querySelector('.acceso__enlace')`)
  await esperarA(`!!document.querySelector('[role=dialog]')`)
  await escribir('input[name=correo]', cuenta.correo)
  for (let i = 0; i < 5; i++) {
    await reemplazar('input[name=clave]', 'clave-equivocada')
    await tecla('Enter')
    await esperarA(`${boton('Ingresar')}?.disabled === true`, 1500)
    await esperarA(`!${boton('Ingresando')}`, 5000)
  }
  r.comprobar('al quinto fallo avisa el bloqueo y deja el botón deshabilitado', (await aviso()).startsWith('Demasiados intentos fallidos') && (await ev(`document.querySelector('[role=dialog] button[type=submit]').disabled`)))
  await foto('02-bloqueo')
} catch (e) {
  r.error(e)
} finally {
  await n.cerrar()
  php('cuenta_temporal.php', 'borrar', cuenta.correo)
  r.terminar()
}
