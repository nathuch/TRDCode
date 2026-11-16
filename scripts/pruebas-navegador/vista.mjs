// Consulta, ficha y accesibilidad (Fase 7): teclado, ficha (#49), accesibilidad (#52) y celular (#51).
// Uso: node scripts/pruebas-navegador/vista.mjs [http://localhost:5173/]
// Crea una cuenta temporal para ver "Actualizar datos" en celular y la borra al terminar. No crea cargas.
import {
  abrirNavegador,
  boton,
  comprobarMismaBase,
  cuentaTemporal,
  direccion,
  espera,
  php,
  registro,
  SIN_DESPLAZAMIENTO_LATERAL,
  ZONAS_CHICAS,
} from './comun.mjs'
import { excelConProblemas } from './excel_inventado.mjs'

const URL_APP = direccion()
await comprobarMismaBase(URL_APP)
const r = registro()
const cuenta = cuentaTemporal('prueba-ui-vista')
php('cuenta_temporal.php', 'crear', cuenta.correo, cuenta.clave)
const excel = excelConProblemas()
const n = await abrirNavegador({ prefijo: 'vista' })
const { ev, esperarA, tecla, clic, ir, foto } = n
const conTotal = `!!document.querySelector('.total__numero')`
const filaBoton = (codigo) => `[...document.querySelectorAll('tr.tabla__fila')].find(tr => tr.querySelector('.col-codigo').textContent.trim() === '${codigo}').querySelector('.fila__boton')`
const grupo = (codigo) => `[...document.querySelectorAll('tr.tabla__grupo')].find(tr => tr.querySelector('.col-codigo').textContent.trim() === '${codigo}').querySelector('.fila__boton')`
const accesos = () => ev(`[...document.querySelectorAll('.expediente')].map(li => { const a = li.querySelector('.etiqueta-acceso'); return a ? a.textContent.replace('Control de acceso: ', '').trim() + (a.querySelector('svg') ? '+candado' : '') : 'falta' })`)
const pestana = () => ev(`document.activeElement.getAttribute('role') === 'tab' && document.activeElement.getAttribute('aria-selected') === 'true' ? document.activeElement.textContent.replace(/[\\d.]/g, '').trim() : 'otro'`)

try {
  r.seccion(`Computador, en ${URL_APP}`)
  await ir(`${URL_APP}#centros=73.9226&dependencias=00.9000.4`, conTotal)
  r.comprobar('el panel de filtros está abierto al entrar', await ev(`!!document.querySelector('#panel-filtros')`))
  r.comprobar('encabezados h2 por sección: "Buscar y filtrar" y "Resultados de la consulta"', await ev(`(() => { const h = [...document.querySelectorAll('h2')].map(x => x.textContent.trim()); return h.includes('Buscar y filtrar') && h.includes('Resultados de la consulta') })()`))
  const antes = await ev(`document.querySelector('.total__texto').textContent`)
  await clic(`[...document.querySelectorAll('.panel-filtros button')].find(b => b.textContent.trim() === '2025')`)
  r.comprobar('el total se anuncia (aria-live="polite") y cambia al filtrar', (await ev(`document.querySelector('.total__texto').getAttribute('aria-live') === 'polite'`)) && (await esperarA(`document.querySelector('.total__texto').textContent !== ${JSON.stringify(antes)}`)))
  await clic(`[...document.querySelectorAll('.panel-filtros button')].find(b => b.textContent.trim() === 'Todos')`)
  await esperarA(`document.querySelector('.total__numero').textContent === '643'`)

  r.comprobar('las pestañas tienen un solo punto de Tab (la elegida)', await ev(`[...document.querySelectorAll('[role=tab]')].map(t => t.tabIndex).join(',') === '0,-1,-1,-1'`))
  await ev(`document.querySelector('[role=tab][aria-selected=true]').focus()`)
  const recorrido = []
  for (const t of ['ArrowRight', 'ArrowLeft', 'ArrowLeft', 'Home', 'End']) {
    await tecla(t)
    recorrido.push(await pestana())
  }
  r.comprobar(`flechas, Inicio y Fin: ${recorrido.join(' → ')}`, recorrido.join('|') === 'Con expedientes|Todas|Fuera de la TRD|Todas|Fuera de la TRD')
  r.comprobar('  y la tabla sigue a la pestaña', await ev(`document.querySelector('#tabla-resultados').getAttribute('aria-labelledby') === 'pestana-fuera' && document.querySelectorAll('#tabla-resultados tr.tabla__fila').length === 1`))
  await tecla('Home')

  await ev(`${filaBoton('85.15')}.focus()`)
  await tecla('Enter')
  r.comprobar('Enter en la fila 85.15 abre la ficha con el foco en "Cerrar"', await esperarA(`!!document.querySelector('.ficha') && document.activeElement?.getAttribute('aria-label') === 'Cerrar la ficha'`))
  r.comprobar('el encabezado de la ficha dice "17 expedientes"', await ev(`document.querySelector('.ficha__encabezado .ficha__cantidad')?.textContent === '17 expedientes'`))
  const a85 = await accesos()
  r.comprobar(`los 17 expedientes tienen su control de acceso (${[...new Set(a85)].join(', ')})`, a85.length === 17 && a85.every((a) => a === 'Clasificado+candado'))
  let dentro = true
  for (let i = 0; i < 30; i++) {
    await tecla('Tab')
    dentro &&= await ev(`!!document.activeElement?.closest('.ficha')`)
  }
  for (let i = 0; i < 8; i++) {
    await tecla('Tab', true)
    dentro &&= await ev(`!!document.activeElement?.closest('.ficha')`)
  }
  r.comprobar('con Tab (30 veces) y Mayús+Tab (8 veces) el foco no sale de la ficha', dentro)
  await foto('01-ficha')
  await tecla('Escape')
  r.comprobar('al cerrar con Esc, el foco vuelve a la fila 85.15', await esperarA(`!document.querySelector('.ficha') && document.activeElement === ${filaBoton('85.15')}`))

  await clic(filaBoton('37'))
  await esperarA(`!!document.querySelector('.ficha')`)
  const a37 = await accesos()
  r.comprobar(`en la 37, los públicos van sin candado y los demás con candado (${a37.filter((a) => a === 'Público').length} públicos)`, a37.some((a) => a === 'Público') && a37.every((a) => a === 'Público' || a.endsWith('+candado')))
  await clic(`document.querySelector('.ficha button[aria-label="Cerrar la ficha"]')`)
  r.comprobar('al cerrar con la ×, el foco vuelve a la fila 37', await esperarA(`!document.querySelector('.ficha') && document.activeElement === ${filaBoton('37')}`))

  await ev(`document.querySelector('.selector summary').click()`)
  await espera(200)
  const chicas = await ev(ZONAS_CHICAS)
  r.comprobar(`zonas táctiles de 24 px o más (incluye la × de las etiquetas y "Quitar selección"): ${JSON.stringify(chicas)}`, chicas.length === 0 && (await ev(`!!document.querySelector('.selector__quitar') && !!document.querySelector('.etiqueta-filtro__quitar')`)))
  await tecla('Escape')

  r.seccion('Celular (390 x 844)')
  await n.celular()
  await ir(URL_APP, `!!document.querySelector('.tarjeta-centro')`)
  r.comprobar('inicio: sin desplazamiento lateral', await ev(SIN_DESPLAZAMIENTO_LATERAL))
  await ir(`${URL_APP}#centros=73.9226&dependencias=00.9000.4`, conTotal)
  r.comprobar('consulta: el panel de filtros arranca cerrado', await ev(`!document.querySelector('#panel-filtros')`))
  r.comprobar('  se ven el botón "Filtros" y su contador (2), y la tabla empieza en la primera pantalla', await ev(`(() => { const b = document.querySelector('.boton-filtros'); return b.getBoundingClientRect().bottom <= window.innerHeight && b.querySelector('.contador')?.textContent === '2' && document.querySelector('#tabla-resultados').getBoundingClientRect().top < window.innerHeight })()`))
  r.comprobar('consulta: sin desplazamiento lateral', await ev(SIN_DESPLAZAMIENTO_LATERAL))
  const tarjetas = await ev(`[...document.querySelectorAll('tr.tabla__fila')].map(tr => {
    const caja = tr.getBoundingClientRect(); const c = (s) => tr.querySelector(s).getBoundingClientRect()
    const [cod, nom, ret, dis, exp] = ['.col-codigo', '.celda-nombre', '.col-retencion', '.col-disposicion', '.col-expedientes'].map(c)
    const dentro = [cod, nom, ret, dis, exp].every(r => r.left >= caja.left - 1 && r.right <= caja.right + 1 && r.width > 0)
    const filaDos = ret.top >= Math.max(cod.bottom, nom.bottom) - 1 && Math.abs(ret.top - dis.top) < 2 && Math.abs(dis.top - exp.top) < 2
    return dentro && filaDos && getComputedStyle(tr).display === 'grid'
  })`)
  r.comprobar(`resultados en tarjetas: arriba código y nombre, debajo retención, disposición y expedientes (${tarjetas.filter(Boolean).length} de ${tarjetas.length})`, tarjetas.length > 0 && tarjetas.every(Boolean))
  r.comprobar('  con la etiqueta de color de la disposición y sin los encabezados de la tabla a la vista', await ev(`[...document.querySelectorAll('tr.tabla__fila .col-disposicion')].every(td => td.querySelector('.disp') || td.textContent.trim() === '—') && document.querySelector('.tabla--resultados thead').getBoundingClientRect().height <= 1`))
  await foto('02-celular-tarjetas')
  const subseries02 = `[...document.querySelectorAll('tr.tabla__fila--subserie')].filter(tr => tr.querySelector('.col-codigo').textContent.startsWith('02.')).length`
  const enGrupo = await ev(subseries02)
  await clic(grupo('02'))
  const plegado = await ev(subseries02)
  await clic(grupo('02'))
  r.comprobar(`el grupo 02 se pliega y se despliega (${enGrupo} → ${plegado} → ${await ev(subseries02)})`, enGrupo > 0 && plegado === 0 && (await ev(subseries02)) === enGrupo)
  await clic(`document.querySelector('.boton-filtros')`)
  r.comprobar('el botón "Filtros" abre el panel, sin desplazamiento lateral', (await esperarA(`!!document.querySelector('#panel-filtros')`)) && (await ev(SIN_DESPLAZAMIENTO_LATERAL)))
  const chicasCelular = await ev(ZONAS_CHICAS)
  r.comprobar(`zonas táctiles de 24 px o más en celular: ${JSON.stringify(chicasCelular)}`, chicasCelular.length === 0)

  await clic(filaBoton('85.15'))
  await esperarA(`!!document.querySelector('.ficha')`)
  r.comprobar('ficha: ocupa toda la pantalla y sin desplazamiento lateral', await ev(`Math.round(document.querySelector('.ficha').getBoundingClientRect().width) === window.innerWidth && ${SIN_DESPLAZAMIENTO_LATERAL}`))
  await foto('03-celular-ficha')
  await tecla('Escape')

  await clic(`document.querySelector('.acceso__enlace')`)
  await esperarA(`!!document.querySelector('[role=dialog] input[name=correo]')`)
  r.comprobar('ingreso: la ventana cabe y no hay desplazamiento lateral', await ev(`(() => { const d = document.querySelector('.dialogo').getBoundingClientRect(); return d.left >= 0 && d.right <= window.innerWidth })() && ${SIN_DESPLAZAMIENTO_LATERAL}`))
  await foto('04-celular-ingreso')
  await n.escribir('input[name=correo]', cuenta.correo)
  await n.escribir('input[name=clave]', cuenta.clave)
  await tecla('Enter')
  await esperarA(`!!document.querySelector('.acceso__usuaria')`)

  await ir(`${URL_APP}#actualizar`, `!!document.querySelector('.zona-archivo') && document.querySelectorAll('#historial-titulo ~ .tabla-caja tbody tr').length > 0`)
  r.comprobar('actualizar datos: sin desplazamiento lateral y el historial apilado', (await ev(SIN_DESPLAZAMIENTO_LATERAL)) && (await ev(`getComputedStyle(document.querySelector('#historial-titulo ~ .tabla-caja tr')).display === 'block' && getComputedStyle(document.querySelector('#historial-titulo ~ .tabla-caja td'), '::before').content.includes('Datos al')`)))
  await n.elegirArchivo(excel)
  await esperarA(`document.querySelector('input[name=fecha]').value === '2026-08-10'`)
  await clic(boton('Revisar el archivo'))
  await esperarA(`!!document.querySelector('#revision-titulo')`, 20000)
  await clic(`document.querySelector('.revision__resumen')`)
  await esperarA(`document.querySelector('details.revision__problemas')?.open`)
  const chicasRevision = await ev(ZONAS_CHICAS)
  r.comprobar(`  la revisión con la lista de problemas abierta: sin desplazamiento lateral; zonas chicas: ${JSON.stringify(chicasRevision)}`, (await ev(SIN_DESPLAZAMIENTO_LATERAL)) && chicasRevision.length === 0)
  await foto('05-celular-revision')
} catch (e) {
  r.error(e)
} finally {
  await n.cerrar()
  php('cuenta_temporal.php', 'borrar', cuenta.correo)
  r.terminar()
}
