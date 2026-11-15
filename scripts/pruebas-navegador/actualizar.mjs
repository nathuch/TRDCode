// "Actualizar datos" completo: zona para arrastrar, vista previa, carga, historial y volver a una carga.
// Uso (solo contra una base temporal; vea el README): node scripts/pruebas-navegador/actualizar.mjs [url]
// CREA Y RESTAURA CARGAS. Se niega a correr si la base tiene cargas guardadas además de la activa.
// Usa el reporte de datos-prueba/ (no va al repositorio) y un Excel inventado; al terminar deja activa la
// carga que estaba y borra la cuenta temporal con sus cargas.
import { existsSync } from 'node:fs'
import { abrirNavegador, boton, comprobarMismaBase, cuentaTemporal, direccion, espera, php, registro, REPORTE } from './comun.mjs'
import { excelConProblemas } from './excel_inventado.mjs'

const URL_APP = direccion()
await comprobarMismaBase(URL_APP)
let original
try {
  original = php('cuenta_temporal.php', 'revisar-cargas')
} catch {
  // El ayudante ya explicó el motivo en la consola.
  process.exit(1)
}
if (!existsSync(REPORTE)) {
  console.log('Falta datos-prueba/reporte-tolima-2026-08-10.xlsx.')
  process.exit(1)
}
const r = registro()
const cuenta = cuentaTemporal('prueba-ui-actualizar')
php('cuenta_temporal.php', 'crear', cuenta.correo, cuenta.clave)
const excel = excelConProblemas()
const n = await abrirNavegador({ prefijo: 'actualizar' })
const { ev, esperarA, tecla, clic, escribir, elegirArchivo, ir, foto } = n
const alerta = (texto) => `(document.querySelector('[role=alert]')?.textContent ?? '').includes(${JSON.stringify(texto)})`
const texto = (selector) => ev(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? ''`)
const valores = () => ev(`[...document.querySelectorAll('.revision__tarjetas .tarjeta-dato__valor')].map(v => Number(v.textContent.replace(/\\D/g, '')))`)
const filasHistorial = () => ev(`[...document.querySelectorAll('#historial-titulo ~ .tabla-caja tbody tr')].map(tr => [...tr.cells].map(c => c.textContent.trim()))`)
const ponerFecha = (valor) =>
  ev(`(() => { const i = document.querySelector('input[name=fecha]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, '${valor}'); i.dispatchEvent(new Event('input', { bubbles: true })) })()`)
const enDialogo = (t) => `[...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent.trim() === ${JSON.stringify(t)})`

try {
  r.seccion(`Actualizar datos en ${URL_APP}`)
  await ir(`${URL_APP}#actualizar`, `!!document.querySelector('#actualizar-titulo')`)
  r.comprobar('sin sesión, #actualizar pide ingresar y no muestra el formulario', await esperarA(`document.body.textContent.includes('ingrese con la cuenta de la encargada') && !document.querySelector('input[type=file]')`))
  await clic(`document.querySelector('.acceso__enlace')`)
  await esperarA(`!!document.querySelector('input[name=correo]')`)
  await escribir('input[name=correo]', cuenta.correo)
  await escribir('input[name=clave]', cuenta.clave)
  await tecla('Enter')
  r.comprobar('al ingresar aparece el formulario', await esperarA(`!!document.querySelector('input[type=file]')`))
  await clic(`document.querySelector('.encabezado__inicio')`)
  await esperarA(`!!document.querySelector('#inicio-titulo')`)
  await clic(`document.querySelector('.acceso__usuaria')`)
  await clic(boton('Actualizar datos'))
  r.comprobar('"Actualizar datos" del menú abre la pantalla con el foco en su título', await esperarA(`location.hash === '#actualizar' && document.activeElement?.id === 'actualizar-titulo'`))
  r.comprobar('el historial muestra la carga en uso', await esperarA(`document.querySelectorAll('#historial-titulo ~ .tabla-caja tbody tr').length === 1`))
  const h0 = await filasHistorial()
  const autorInicial = h0[0][2]
  r.comprobar(`  (${h0[0][0]}, ${h0[0][3]} expedientes, ${h0[0][4]})`, h0[0][4] === 'En uso')
  r.comprobar('los campos tienen etiqueta', await ev(`[...document.querySelectorAll('.actualizar__formulario input')].every(i => i.labels.length === 1)`))

  await clic(boton('Revisar el archivo'))
  r.comprobar('sin archivo pide elegirlo', await esperarA(alerta('Elija el archivo')))
  r.comprobar('hay una zona grande para arrastrar el archivo', await ev(`(() => { const z = document.querySelector('.zona-archivo'); return z.getBoundingClientRect().height >= 150 && z.textContent.includes('Arrastre aquí') })()`))
  await ev(`(() => {
    window.__dt = new DataTransfer(); window.__dt.items.add(new File(['a,b'], 'no-es-excel.csv', { type: 'text/csv' }))
    document.querySelector('.zona-archivo').dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: window.__dt }))
  })()`)
  r.comprobar('al arrastrar encima, la zona se resalta', await esperarA(`document.querySelector('.zona-archivo').classList.contains('arrastrando')`, 3000))
  await ev(`document.querySelector('.zona-archivo').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: window.__dt }))`)
  r.comprobar('al soltar, vuelve a la normalidad y muestra el archivo elegido', await esperarA(`!document.querySelector('.zona-archivo').classList.contains('arrastrando') && document.querySelector('.zona-archivo__elegido').textContent.includes('no-es-excel.csv')`, 3000))
  await clic(boton('Revisar el archivo'))
  r.comprobar('un .csv soltado en la zona se rechaza', await esperarA(alerta('.xlsx')))

  // Excel inventado con problemas: lista plegable.
  await elegirArchivo(excel)
  await esperarA(`document.querySelector('input[name=fecha]').value === '2026-08-10'`)
  await clic(boton('Revisar el archivo'))
  await esperarA(`!!document.querySelector('#revision-titulo')`, 30000)
  const [f2, c2, d2, p2] = await valores()
  r.comprobar(`Excel inventado: ${f2} filas, ${c2} para cargar, ${d2} de otros centros, ${p2} con problemas`, f2 === 9 && c2 === 3 && d2 === 1 && p2 === 5)
  r.comprobar('la lista de filas con problemas está plegada y dice cuántas son', await ev(`(() => { const d = document.querySelector('details.revision__problemas'); const s = d?.querySelector('summary').textContent ?? ''; return !!d && !d.open && s.includes('5 filas con problemas') && s.includes('2 con el código repetido') })()`))
  await clic(`document.querySelector('.revision__resumen')`)
  r.comprobar('al abrirla muestra las 5 filas, con los repetidos marcados y la otra fila donde están', (await esperarA(`document.querySelector('details.revision__problemas').open && document.querySelectorAll('.revision__problemas tbody tr').length === 5`)) && (await ev(`[...document.querySelectorAll('.revision__problemas tr.fila-repetida')].map(tr => tr.cells[2].textContent).join('|') === 'código de expediente repetido (también en la fila 10)|código de expediente repetido (también en la fila 9)'`)))
  await foto('01-problemas')
  await clic(boton('Elegir otro archivo'))
  await esperarA(`!!document.querySelector('input[type=file]')`)

  // Reporte de agosto.
  await elegirArchivo(REPORTE)
  r.comprobar('propone la fecha del nombre del archivo (2026-08-10)', await esperarA(`document.querySelector('input[name=fecha]').value === '2026-08-10'`))
  const hoy = await ev(`(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') })()`)
  r.comprobar(`el campo de fecha tiene como máximo hoy (${hoy})`, (await ev(`document.querySelector('input[name=fecha]').max`)) === hoy)
  await ponerFecha(new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10))
  await clic(boton('Revisar el archivo'))
  r.comprobar('una fecha futura se rechaza en la pantalla, sin leer el archivo', (await esperarA(alerta('posterior a hoy'))) && !(await ev(`!!document.querySelector('#revision-titulo')`)))
  await ponerFecha('2026-08-10')
  await clic(boton('Revisar el archivo'))
  r.comprobar('lee el archivo y muestra la revisión', await esperarA(`!!document.querySelector('#revision-titulo')`, 30000))
  const rango = (await texto('.revision__rango')).trim()
  r.comprobar(`muestra el rango de fechas de creación (${rango})`, /^Creados del \d+ de \w+ de \d{4} al \d+ de \w+ de \d{4}$/.test(rango))
  const tarjetas = await ev(`[...document.querySelectorAll('.revision__tarjetas .tarjeta-dato')].map(t => t.textContent)`)
  r.comprobar('7.531 filas; 3.385 expedientes para cargar: 1.781 / 1.084 / 520', tarjetas[0].includes('7.531') && tarjetas[1].includes('3.385') && tarjetas[1].includes('Industria y Construcción: 1.781') && tarjetas[1].includes('Comercio y Servicios: 1.084') && tarjetas[1].includes('Agropecuario La Granja: 520'))
  const [filas, cargables, descartadas, problemas] = await valores()
  r.comprobar(`expedientes (${cargables}) + descartadas (${descartadas}) + con problemas (${problemas}) = filas (${filas})`, cargables + descartadas + problemas === filas)
  r.comprobar('avisa que 85.18 no está en la TRD (119 expedientes), como aviso', (await texto('.aviso-fuera')).includes('85.18') && (await texto('.aviso-fuera')).includes('119'))
  await foto('02-revision')

  // Carga con barra de progreso (el rechazo de una fecha futura en el servidor lo prueba probar_importacion.php).
  await clic(boton('Cargar'))
  let maximo = -1
  for (let t = 0; t < 60000; t += 40) {
    const v = await ev(`(() => { const p = document.querySelector('[role=progressbar]'); return p ? Number(p.getAttribute('aria-valuenow')) : (document.querySelector('#listo-titulo') ? -2 : -1) })()`)
    if (v === -2) break
    maximo = Math.max(maximo, v)
    await espera(40)
  }
  r.comprobar(`se vio la barra de progreso (llegó a ${maximo})`, maximo >= 0)
  r.comprobar('termina: "Se cargaron 3.385 expedientes" con datos al 10 de agosto de 2026', await esperarA(`(document.querySelector('#listo-titulo ~ .aviso-exito')?.textContent ?? '').includes('3.385 expedientes') && document.querySelector('#listo-titulo ~ .aviso-exito').textContent.includes('10 de agosto de 2026')`))
  r.comprobar('el historial muestra la nueva en uso y la anterior', await esperarA(`document.querySelectorAll('#historial-titulo ~ .tabla-caja tbody tr').length === 2`))
  const h1 = await filasHistorial()
  r.comprobar(`  nueva: ${h1[0][2]}, ${h1[0][4]}; anterior: ${h1[1][4]}`, h1[0][2] === 'Cuenta de prueba temporal' && h1[0][4] === 'En uso' && h1[1][4] === 'Volver a esta carga')
  await foto('03-listo')

  // Dos cargas con la misma fecha de datos: se distinguen por hora de carga y autor.
  r.comprobar(`dos cargas con la misma fecha de datos (${h1[0][0]}), que se distinguen por hora de carga o autor`, h1[0][0] === h1[1][0] && (h1[0][1] !== h1[1][1] || h1[0][2] !== h1[1][2]))
  const [cargadaNueva, cargadaInicial] = [h1[0][1], h1[1][1]]
  const dialogo = () => ev(`document.querySelector('[role=dialog]')?.textContent ?? ''`)
  const aviso = () => ev(`document.querySelector('#historial-titulo ~ [role=status]')?.textContent ?? ''`)
  const volverEn = (fila) => clic(`document.querySelectorAll('#historial-titulo ~ .tabla-caja tbody tr')[${fila}].querySelector('button')`)
  await volverEn(1)
  r.comprobar('"Volver a esta carga" pide confirmación e identifica la carga por hora, autor y fecha de datos', (await esperarA(`(document.querySelector('[role=dialog]')?.textContent ?? '').includes('¿Volver a esta carga?')`)) && (await dialogo()).includes(`la carga del ${cargadaInicial} (${autorInicial}), con datos al 10 de agosto de 2026`))
  await tecla('Escape')
  r.comprobar('Esc cancela sin cambiar nada', (await esperarA(`!document.querySelector('[role=dialog]')`)) && JSON.stringify(await filasHistorial()) === JSON.stringify(h1))
  await volverEn(1)
  await esperarA(`!!document.querySelector('[role=dialog]')`)
  await clic(enDialogo('Volver a esta carga'))
  await esperarA(`(document.querySelector('#historial-titulo ~ [role=status]')?.textContent ?? '').includes('volvió a la carga')`)
  r.comprobar(`al confirmar: "${await aviso()}"`, (await aviso()) === `La consulta volvió a la carga del ${cargadaInicial} (${autorInicial}), con datos al 10 de agosto de 2026.`)
  await esperarA(`document.querySelectorAll('#historial-titulo ~ .tabla-caja tbody tr')[1]?.cells[4].textContent.trim() === 'En uso'`, 5000)
  const h2 = await filasHistorial()
  r.comprobar('las filas no cambian de lugar: solo se mueve "En uso"', h2.map((f) => f.slice(0, 4)).join('|') === h1.map((f) => f.slice(0, 4)).join('|') && h2[0][4] === 'Volver a esta carga' && h2[1][4] === 'En uso')
  await volverEn(0)
  await esperarA(`!!document.querySelector('[role=dialog]')`)
  r.comprobar('el botón quedó en la carga nueva y el cuadro la identifica', (await dialogo()).includes(`la carga del ${cargadaNueva} (Cuenta de prueba temporal), con datos al 10 de agosto de 2026`))
  await clic(enDialogo('Volver a esta carga'))
  r.comprobar('volver otra vez a la nueva: mismo orden, "En uso" arriba', await esperarA(`document.querySelectorAll('#historial-titulo ~ .tabla-caja tbody tr')[0]?.cells[4].textContent.trim() === 'En uso'`, 5000))

  await clic(boton('Ver la consulta'))
  r.comprobar('"Ver la consulta" abre la consulta (TRD 11) y "atrás" vuelve a actualizar', (await esperarA(`location.hash === '#consulta' && document.querySelector('.total__numero')?.textContent === '2.530'`)) && (await ev('history.back(), true')) && (await esperarA(`location.hash === '#actualizar' && !!document.querySelector('#actualizar-titulo')`)))
  await clic(`document.querySelector('.acceso__usuaria')`)
  await clic(boton('Salir'))
  r.comprobar('al salir, la pantalla vuelve a pedir ingresar', await esperarA(`document.body.textContent.includes('ingrese con la cuenta de la encargada') && !document.querySelector('input[type=file]')`))
} catch (e) {
  r.error(e)
} finally {
  await n.cerrar()
  php('cuenta_temporal.php', 'restaurar', original)
  php('cuenta_temporal.php', 'borrar', cuenta.correo)
  r.terminar()
}
