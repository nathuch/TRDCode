// "Usuarios" y "Mi cuenta" (RF-17): crear, editar, contraseña temporal, desactivar y activar; la ventana
// que obliga a cambiar la contraseña temporal; nombre, correo y contraseña propios; y celular a 390 px.
// Uso: node scripts/pruebas-navegador/usuarios.mjs [http://localhost:5173/]
// Usa cuentas temporales (correo prueba-...@trdcode.local y claves al azar) y las borra al terminar.
// No toca las demás cuentas ni las cargas.
import {
  abrirNavegador,
  boton,
  comprobarMismaBase,
  cuentaTemporal,
  direccion,
  php,
  registro,
  SIN_DESPLAZAMIENTO_LATERAL,
  ZONAS_CHICAS,
} from './comun.mjs'

const URL_APP = direccion()
await comprobarMismaBase(URL_APP)
const r = registro()
const a = cuentaTemporal('prueba-ui-usuarios-a')
const c = cuentaTemporal('prueba-ui-usuarios-c')
const correosUsados = [a.correo, c.correo]
const otroCorreoC = cuentaTemporal('prueba-ui-usuarios-c2').correo
correosUsados.push(otroCorreoC)
php('cuenta_temporal.php', 'crear', a.correo, a.clave)
const n = await abrirNavegador({ prefijo: 'usuarios' })
const { ev, esperarA, tecla, clic, escribir, ir, foto } = n
const fila = (texto) => `[...document.querySelectorAll('.tabla--usuarios tbody tr')].find(tr => tr.textContent.includes(${JSON.stringify(texto)}))`
const enFila = (texto, boton) => `[...${fila(texto)}.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(boton)})`
const enDialogo = (texto) => `[...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent.trim() === ${JSON.stringify(texto)})`
const campoDialogo = (nombre) => `[role=dialog] input[name=${nombre}]`
const avisoExito = () => ev(`[...document.querySelectorAll('[role=status]')].map(e => e.textContent).join(' | ')`)

async function entrar(correo, clave) {
  await clic(`document.querySelector('.acceso__enlace')`)
  await esperarA(`!!document.querySelector('input[name=correo]')`)
  await escribir('input[name=correo]', correo)
  await escribir('input[name=clave]', clave)
  await tecla('Enter')
}
async function salir() {
  await clic(`document.querySelector('.acceso__usuaria')`)
  await clic(boton('Salir'))
  await esperarA(`!!document.querySelector('.acceso__enlace')`)
}

try {
  r.seccion(`Usuarios en ${URL_APP}`)
  await ir(`${URL_APP}#consulta`, `!!document.querySelector('.total__numero')`)
  await entrar(a.correo, a.clave)
  await esperarA(`!!document.querySelector('.acceso__usuaria')`)
  await clic(`document.querySelector('.acceso__usuaria')`)
  const opciones = await ev(`[...document.querySelectorAll('.acceso__opcion')].map(b => b.textContent.trim())`)
  r.comprobar(`el menú tiene ${opciones.join(', ')}`, JSON.stringify(opciones) === '["Actualizar datos","Usuarios","Mi cuenta","Salir"]')
  await clic(boton('Usuarios'))
  r.comprobar('"Usuarios" abre la pantalla con el foco en su título', await esperarA(`location.hash === '#usuarios' && document.activeElement?.id === 'usuarios-titulo'`))
  r.comprobar('la lista muestra la propia cuenta como "Usted", con "Editar en Mi cuenta"', await esperarA(`!!${fila(a.correo)}`) && (await ev(`${fila(a.correo)}.textContent.includes('Usted') && !!${enFila(a.correo, 'Editar en Mi cuenta')} && !${enFila(a.correo, 'Desactivar')}`)))
  r.comprobar('la cuenta del sistema sale como "Sistema", sin acciones', await ev(`(() => { const f = [...document.querySelectorAll('.tabla--usuarios tbody tr')].find(tr => tr.textContent.includes('Sistema')); return !f || f.querySelectorAll('button').length === 0 })()`))
  r.comprobar('la lista tiene nombre, correo, estado y último ingreso', await ev(`[...document.querySelectorAll('.tabla--usuarios thead th')].map(t => t.textContent.trim()).slice(0, 4).join('|') === 'Nombre|Correo|Estado|Último ingreso'`))

  await clic(boton('Nueva cuenta'))
  await esperarA(`!!document.querySelector('${campoDialogo('nombre')}')`)
  r.comprobar('"Nueva cuenta" abre un formulario con etiquetas y el foco en el nombre', await ev(`[...document.querySelectorAll('[role=dialog] input')].every(i => i.labels.length === 1) && document.activeElement?.name === 'nombre'`))
  await escribir(campoDialogo('nombre'), 'Cuenta C de prueba')
  await escribir(campoDialogo('correo'), a.correo)
  await escribir(campoDialogo('clave'), c.clave)
  await escribir(campoDialogo('clave-repetida'), c.clave)
  await tecla('Enter')
  r.comprobar('un correo que ya usa otra cuenta se rechaza en el formulario', await esperarA(`(document.querySelector('[role=dialog] [role=alert]')?.textContent ?? '').includes('ya lo usa otra cuenta')`))
  await ev(`(() => { const i = document.querySelector('${campoDialogo('correo')}'); i.focus(); i.select() })()`)
  await n.cdp('Input.insertText', { text: c.correo })
  await tecla('Enter')
  r.comprobar('crea la cuenta y avisa que debe entregar la contraseña temporal', await esperarA(`!document.querySelector('[role=dialog]') && !!${fila(c.correo)}`) && (await avisoExito()).includes('Cuenta creada'))
  r.comprobar('  la cuenta nueva sale activa, con "Contraseña temporal" y sin ingresos', await ev(`(() => { const t = ${fila(c.correo)}.textContent; return t.includes('Activa') && t.includes('Contraseña temporal') && t.includes('Nunca') })()`))
  await foto('01-lista')

  await clic(enFila(c.correo, 'Editar'))
  await esperarA(`!!document.querySelector('${campoDialogo('nombre')}')`)
  await ev(`(() => { const i = document.querySelector('${campoDialogo('nombre')}'); i.focus(); i.select() })()`)
  await n.cdp('Input.insertText', { text: 'Cuenta C editada' })
  await tecla('Enter')
  r.comprobar('edita el nombre de otra cuenta', await esperarA(`!document.querySelector('[role=dialog]') && ${fila(c.correo)}?.textContent.includes('Cuenta C editada')`))

  await clic(enFila(c.correo, 'Contraseña temporal'))
  await esperarA(`!!document.querySelector('${campoDialogo('clave')}')`)
  await escribir(campoDialogo('clave'), 'corta')
  await escribir(campoDialogo('clave-repetida'), 'corta')
  await tecla('Enter')
  r.comprobar('una contraseña temporal corta se rechaza', await esperarA(`(document.querySelector('[role=dialog] [role=alert]')?.textContent ?? '').includes('10 caracteres')`))
  for (const nombre of ['clave', 'clave-repetida']) {
    await ev(`(() => { const i = document.querySelector('${campoDialogo(nombre)}'); i.focus(); i.select() })()`)
    await n.cdp('Input.insertText', { text: c.clave })
  }
  await tecla('Enter')
  r.comprobar('pone una contraseña temporal a otra cuenta', await esperarA(`!document.querySelector('[role=dialog]')`) && (await avisoExito()).includes('contraseña temporal'))

  await clic(enFila(c.correo, 'Desactivar'))
  r.comprobar('"Desactivar" pide confirmación', await esperarA(`(document.querySelector('[role=dialog]')?.textContent ?? '').includes('¿Desactivar la cuenta')`))
  await tecla('Escape')
  r.comprobar('  Esc cancela', await esperarA(`!document.querySelector('[role=dialog]')`) && (await ev(`${fila(c.correo)}.textContent.includes('Activa')`)))
  await clic(enFila(c.correo, 'Desactivar'))
  await esperarA(`!!document.querySelector('[role=dialog]')`)
  await clic(enDialogo('Desactivar'))
  r.comprobar('al confirmar, la cuenta queda inactiva y aparece "Activar"', await esperarA(`${fila(c.correo)}?.textContent.includes('Inactiva') && !!${enFila(c.correo, 'Activar')}`))
  await clic(enFila(c.correo, 'Activar'))
  r.comprobar('"Activar" la deja activa de nuevo', await esperarA(`${fila(c.correo)}?.textContent.includes('Activa') && !!${enFila(c.correo, 'Desactivar')}`))

  r.seccion('Celular (390 x 844)')
  await n.celular()
  await ir(`${URL_APP}#usuarios`, `!!document.querySelector('.tabla--usuarios tbody tr')`)
  r.comprobar('la lista se apila (cada dato con su rótulo) y no hay desplazamiento lateral', (await ev(`getComputedStyle(document.querySelector('.tabla--usuarios tr')).display === 'block'`)) && (await ev(SIN_DESPLAZAMIENTO_LATERAL)))
  const chicas = await ev(ZONAS_CHICAS)
  r.comprobar(`zonas táctiles de 24 px o más: ${JSON.stringify(chicas)}`, chicas.length === 0)
  await foto('02-celular-lista')
  await clic(boton('Nueva cuenta'))
  await esperarA(`!!document.querySelector('[role=dialog]')`)
  r.comprobar('el formulario de nueva cuenta cabe en la pantalla', await ev(`(() => { const d = document.querySelector('.dialogo').getBoundingClientRect(); return d.left >= 0 && d.right <= window.innerWidth })() && ${SIN_DESPLAZAMIENTO_LATERAL}`))
  await tecla('Escape')
  await n.computador()

  r.seccion('Contraseña temporal: obliga a cambiarla')
  await ir(`${URL_APP}#consulta`, `!!document.querySelector('.total__numero')`)
  await salir()
  await entrar(c.correo, c.clave)
  r.comprobar('al entrar con la temporal aparece "Cambie su contraseña temporal"', await esperarA(`(document.querySelector('[role=dialog]')?.textContent ?? '').includes('Cambie su contraseña temporal')`))
  r.comprobar('  sin botón para cerrar', await ev(`!document.querySelector('[role=dialog] button[aria-label="Cerrar"]') && !${enDialogo('Cancelar')} && !!${enDialogo('Salir')}`))
  await tecla('Escape')
  r.comprobar('  Esc no la cierra', await ev(`!!document.querySelector('[role=dialog]')`))
  let dentro = true
  for (let i = 0; i < 10; i++) {
    await tecla('Tab')
    dentro &&= await ev(`!!document.activeElement?.closest('[role=dialog]')`)
  }
  r.comprobar('  y Tab no sale de ella', dentro)
  await foto('03-obligatoria')
  const nueva = cuentaTemporal('x').clave
  const campos = `[...document.querySelectorAll('[role=dialog] input')]`
  await ev(`${campos}[0].focus()`)
  await n.cdp('Input.insertText', { text: c.clave })
  await ev(`${campos}[1].focus()`)
  await n.cdp('Input.insertText', { text: nueva })
  await ev(`${campos}[2].focus()`)
  await n.cdp('Input.insertText', { text: nueva })
  await tecla('Enter')
  r.comprobar('al cambiarla, la ventana se cierra y puede usar la aplicación', await esperarA(`!document.querySelector('[role=dialog]') && document.querySelector('.acceso__nombre')?.textContent === 'Cuenta C editada'`))
  c.clave = nueva

  r.seccion('Mi cuenta')
  await clic(`document.querySelector('.acceso__usuaria')`)
  await clic(boton('Mi cuenta'))
  r.comprobar('"Mi cuenta" abre la pantalla con el nombre actual', await esperarA(`location.hash === '#cuenta' && document.querySelector('input[name=nombre]')?.value === 'Cuenta C editada'`))
  await ev(`(() => { const i = document.querySelector('input[name=nombre]'); i.focus(); i.select() })()`)
  await n.cdp('Input.insertText', { text: 'Cuenta C con nombre propio' })
  await clic(boton('Guardar el nombre'))
  r.comprobar('cambia el nombre y el encabezado lo muestra', await esperarA(`document.querySelector('.acceso__nombre')?.textContent === 'Cuenta C con nombre propio'`) && (await avisoExito()).includes('Nombre guardado'))
  await escribir('input[name=correo-nuevo]', otroCorreoC)
  await escribir('input[name=clave-actual]', 'clave-equivocada')
  await clic(boton('Cambiar el correo'))
  r.comprobar('cambiar el correo con la contraseña equivocada se rechaza', await esperarA(`(document.querySelector('#cuenta-aviso-correo')?.textContent ?? '').includes('no es correcta')`))
  await escribir('input[name=clave-actual]', c.clave)
  await clic(boton('Cambiar el correo'))
  r.comprobar('con la contraseña correcta cambia el correo', await esperarA(`(document.querySelector('#cuenta-aviso-correo')?.textContent ?? '').includes('Correo cambiado')`))
  await clic(boton('Cambiar la contraseña'))
  await esperarA(`document.querySelectorAll('[role=dialog] input').length === 3`)
  const otra = cuentaTemporal('x').clave
  await ev(`${campos}[0].focus()`)
  await n.cdp('Input.insertText', { text: c.clave })
  await ev(`${campos}[1].focus()`)
  await n.cdp('Input.insertText', { text: otra })
  await ev(`${campos}[2].focus()`)
  await n.cdp('Input.insertText', { text: otra })
  await tecla('Enter')
  r.comprobar('cambia la contraseña desde Mi cuenta', await esperarA(`(document.querySelector('[role=dialog] [role=status]')?.textContent ?? '').includes('se cambió')`))
  await clic(enDialogo('Listo'))
  await n.celular()
  await ir(`${URL_APP}#cuenta`, `!!document.querySelector('input[name=nombre]')`)
  r.comprobar('Mi cuenta en celular: sin desplazamiento lateral', await ev(SIN_DESPLAZAMIENTO_LATERAL))
  await foto('04-celular-cuenta')
  await n.computador()
  await salir()
  await entrar(otroCorreoC, otra)
  r.comprobar('entra con el correo y la contraseña nuevos', await esperarA(`document.querySelector('.acceso__nombre')?.textContent === 'Cuenta C con nombre propio'`))
} catch (e) {
  r.error(e)
} finally {
  await n.cerrar()
  php('cuenta_temporal.php', 'borrar', ...correosUsados)
  r.terminar()
}
