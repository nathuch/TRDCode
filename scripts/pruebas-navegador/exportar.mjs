// Exportar e imprimir (Fase 8, #53 a #57): menú "Exportar" (Excel y PDF) y botón "Imprimir", en la
// consulta y en la ficha. Descarga de verdad el PDF y el Excel, los lee y compara su contenido con lo
// que se ve; revisa la impresión con la emulación de medio de impresión del navegador.
// Uso: node scripts/pruebas-navegador/exportar.mjs [http://localhost:5173/]
// Con una cuenta temporal (que borra al terminar) revisa que, con sesión, la ficha, el Excel y el PDF
// lleven los nombres reales de los IPC e IPR y que al salir vuelvan a ocultarse (#82). No crea cargas.
// Los archivos descargados van a una carpeta temporal que se borra al terminar. No imprime títulos de
// expedientes: solo códigos y cantidades.
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { armarIndice } from '../../frontend/src/datos/cruce.js'
import { aplicarFiltros, ESTADO_INICIAL } from '../../frontend/src/datos/filtros.js'
import { abrirNavegador, boton, CAPTURAS, comprobarMismaBase, cuentaTemporal, direccion, espera, php, RAIZ, registro } from './comun.mjs'
import { leerPdf } from './leer_pdf.mjs'

const XLSX = createRequire(join(RAIZ, 'frontend', 'package.json'))('xlsx')
const URL_APP = direccion()
await comprobarMismaBase(URL_APP)
const r = registro()
const cuenta = cuentaTemporal('prueba-ui-exportar')
let cuentaCreada = false
const descargas = mkdtempSync(join(tmpdir(), 'trdcode-descargas-'))
const dos = (x) => String(x).padStart(2, '0')
const hoy = new Date()
const FECHA = `${hoy.getFullYear()}-${dos(hoy.getMonth() + 1)}-${dos(hoy.getDate())}`

// Lo esperado se calcula con los mismos datos de la API y la misma lógica de filtros de la aplicación.
const datos = (await fetch(`${URL_APP}api/datos.php`).then((x) => x.json())).datos
const entradas = armarIndice(datos.trd, datos.dependencias, datos.expedientes)
const estado = { ...ESTADO_INICIAL, centros: ['73.9226'], dependencias: ['00.9000.4'] }
const filas = aplicarFiltros(estado, entradas)
const f8515 = filas.find((f) => f.codigo_subserie === '85.15')
const fConMas = filas.filter((f) => f.cantidad > 50).sort((a, b) => b.cantidad - a.cantidad)[0]
const totalCon = filas.filter((f) => f.estado === 'con').reduce((s, f) => s + f.cantidad, 0)

const n = await abrirNavegador({ prefijo: 'exportar' })
const { cdp, ev, esperarA, tecla, clic, escribir, ir, tamano, computador, foto } = n
await cdp('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: descargas })

const conTotal = `!!document.querySelector('.total__numero')`
const filaBoton = (codigo) => `[...document.querySelectorAll('tr.tabla__fila')].find(tr => tr.querySelector('.col-codigo').textContent.trim() === '${codigo}').querySelector('.fila__boton')`
const dentroDe = (sel) => `!!document.querySelector('${sel}')`
const BOTON_EXPORTAR = (zona) => `document.querySelector('${zona} .menu-exportar > button')`
const MENU = (zona) => `document.querySelector('${zona} .menu-exportar__menu')`
const opcion = (zona, texto) => `[...document.querySelectorAll('${zona} .menu-exportar__opcion')].find(b => b.textContent.trim() === ${JSON.stringify(texto)})`
// Visible = ocupa lugar en la página (display: none no deja rectángulos).
const VISIBLE = `const visible = (e) => !!e && e.getClientRects().length > 0`

/** Espera el archivo descargado con ese nombre; devuelve su ruta (o null si no llega). */
async function descargado(nombre, ms = 20000) {
  for (let t = 0; t < ms; t += 200) {
    const archivo = readdirSync(descargas).find((a) => a === nombre)
    if (archivo) {
      await espera(300)
      return join(descargas, archivo)
    }
    await espera(200)
  }
  return null
}

/** Abre el menú "Exportar" de la zona, elige el formato y devuelve la ruta del archivo con el nombre esperado. */
async function exportar(zona, formato, nombre) {
  for (const a of readdirSync(descargas)) rmSync(join(descargas, a))
  await clic(BOTON_EXPORTAR(zona))
  await esperarA(dentroDe(`${zona} .menu-exportar__menu`))
  await clic(opcion(zona, formato))
  return descargado(nombre)
}

/** El menú queda completo en la pantalla, sin pasar los márgenes de 16 px. */
const menuEncaja = (zona) =>
  ev(`(() => { const m = ${MENU(zona)}; if (!m) return false; const b = m.getBoundingClientRect(); const w = document.documentElement.clientWidth; return b.left >= 15.5 && b.right <= w - 15.5 && b.width > 0 })()`)

const hojas = (ruta) => {
  const libro = XLSX.read(readFileSync(ruta))
  const json = (h) => XLSX.utils.sheet_to_json(libro.Sheets[h])
  return { nombres: libro.SheetNames, series: json('Series y subseries'), expedientes: json('Expedientes'), filtros: XLSX.utils.sheet_to_json(libro.Sheets.Filtros, { header: 1 }) }
}
const filtro = (libro, nombre) => libro.filtros.find(([f]) => f === nombre)?.[1]

/** Las líneas siguientes al código de cada expediente reservado dicen "Nombre reservado". */
function sinNombresReservados(pdf, expedientes) {
  const lineas = pdf.texto.split('\n')
  return expedientes
    .filter((e) => e.control_acceso !== 'IPU')
    .every((e) => {
      const i = lineas.indexOf(e.codigo)
      return i >= 0 && lineas[i + 1].startsWith('Nombre reservado')
    })
}

function encabezadoYPie(pdf) {
  return pdf.paginas.every(
    (p, i) => p.includes('TRDCode') && p.some((l) => l.includes('SENA Regional Tolima')) && p.some((l) => l.startsWith('Generado el ')) && p.includes(`Página ${i + 1} de ${pdf.paginas.length}`),
  )
}

try {
  r.seccion(`Consulta, en ${URL_APP}`)
  await ir(`${URL_APP}#centros=73.9226&dependencias=00.9000.4`, conTotal)
  await esperarA(`document.querySelector('.total__numero').textContent === '643'`)
  const sello = await ev(`document.querySelector('.sello')?.textContent.trim() ?? ''`)
  r.comprobar('"Exportar a Excel" pasó a un menú "Exportar", con el botón "Imprimir" al lado', (await ev(`!${boton('Exportar a Excel')}`)) && (await ev(`${BOTON_EXPORTAR('.total')}?.textContent.trim() === 'Exportar'`)) && (await ev(`!!${boton('Imprimir')}`)))
  await clic(BOTON_EXPORTAR('.total'))
  r.comprobar('el menú ofrece Excel y PDF, y el foco pasa a la primera opción', (await esperarA(dentroDe('.total .menu-exportar__menu'))) && (await ev(`[...document.querySelectorAll('.total .menu-exportar__opcion')].map(b => b.textContent.trim()).join('|') === 'Excel (.xlsx)|PDF' && document.activeElement === ${opcion('.total', 'Excel (.xlsx)')}`)))
  r.comprobar('  y queda completo dentro de la pantalla', await menuEncaja('.total'))
  await foto('01-menu')
  await tecla('Escape')
  r.comprobar('Esc lo cierra y el foco vuelve a "Exportar"', await esperarA(`!${MENU('.total')} && document.activeElement === ${BOTON_EXPORTAR('.total')}`))

  // PDF de la consulta: el resumen de lo que se ve.
  const rutaResumen = await exportar('.total', 'PDF', `TRDCode_consulta_${FECHA}.pdf`)
  r.comprobar(`descarga TRDCode_consulta_${FECHA}.pdf`, !!rutaResumen)
  const resumen = leerPdf(readFileSync(rutaResumen, 'latin1'))
  const codigosPantalla = await ev(`[...document.querySelectorAll('#tabla-resultados .col-codigo')].map(c => c.textContent.trim()).filter(Boolean)`)
  r.comprobar(`el PDF tiene título, "${sello}" y los filtros en texto`, resumen.texto.includes('Consulta de series y subseries documentales') && resumen.texto.includes(sello) && resumen.texto.includes('Filtros: TRD 11 (vigente, 2025) · Centro: Industria y Construcción · Dependencia: '))
  r.comprobar(`  el total: 643 expedientes en ${filas.length} series y subseries`, resumen.texto.includes(`643 expedientes en ${filas.length} series y subseries`))
  r.comprobar(`  la tabla con los ${codigosPantalla.length} códigos de la pantalla (series, grupos y subseries)`, codigosPantalla.length > 0 && codigosPantalla.every((c) => resumen.paginas.some((p) => p.includes(c))))
  r.comprobar(`  encabezado y pie con "Página N de ${resumen.paginas.length}" en cada página`, resumen.paginas.length > 1 && encabezadoYPie(resumen))
  r.comprobar('  tildes y ñ correctas', resumen.texto.includes('Retención') && resumen.texto.includes('Disposición final') && resumen.texto.includes('Código') && !/[\u0080-\u009f]/.test(resumen.texto))
  r.comprobar('  sin expedientes (solo con la ficha abierta)', !resumen.texto.includes('Nombre reservado') && !f8515.expedientes.some((e) => resumen.texto.includes(e.codigo)))

  // Excel de una pestaña: lo mismo que se ve en ella.
  await clic(`document.querySelector('#pestana-con')`)
  await esperarA(`document.querySelector('#pestana-con').getAttribute('aria-selected') === 'true'`)
  const filasCon = await ev(`document.querySelectorAll('#tabla-resultados tr.tabla__fila').length`)
  const rutaExcel = await exportar('.total', 'Excel (.xlsx)', `TRDCode_consulta_${FECHA}.xlsx`)
  r.comprobar(`descarga TRDCode_consulta_${FECHA}.xlsx (el mismo nombre que el PDF)`, !!rutaExcel)
  const libro = hojas(rutaExcel)
  r.comprobar('el Excel tiene las tres hojas', libro.nombres.join('|') === 'Series y subseries|Expedientes|Filtros')
  r.comprobar(`  con la pestaña "Con expedientes": ${filasCon} series y subseries y ${totalCon} expedientes, como en pantalla`, libro.series.length === filasCon && libro.expedientes.length === totalCon)
  r.comprobar('  la hoja Filtros dice de qué pestaña sale', filtro(libro, 'Exportado desde') === 'Consulta, pestaña "Con expedientes"' && filtro(libro, 'Centros') === 'Industria y Construcción')
  r.comprobar('  los reservados sin nombre y el acceso con las palabras de la ficha', libro.expedientes.filter((e) => e['Control de acceso'] !== 'Público').every((e) => e['Nombre del expediente'].startsWith('Nombre reservado')) && libro.expedientes.every((e) => ['Público', 'Clasificado', 'Reservado', 'Sin clasificar'].includes(e['Control de acceso'])))
  const rutaPdfCon = await exportar('.total', 'PDF', `TRDCode_consulta_${FECHA}.pdf`)
  r.comprobar('el PDF de esa pestaña la anota en los filtros', leerPdf(readFileSync(rutaPdfCon, 'latin1')).texto.includes('Pestaña: Con expedientes'))
  await clic(`document.querySelector('#pestana-todas')`)

  r.seccion('Ficha de 85.15')
  await clic(filaBoton('85.15'))
  await esperarA(`!!document.querySelector('.ficha')`)
  r.comprobar('la ficha tiene su menú "Exportar" y "Imprimir"', (await ev(`${BOTON_EXPORTAR('.ficha')}?.textContent.trim() === 'Exportar'`)) && (await ev(`[...document.querySelectorAll('.ficha button')].some(b => b.textContent.trim() === 'Imprimir')`)))
  await clic(BOTON_EXPORTAR('.ficha'))
  await esperarA(dentroDe('.ficha .menu-exportar__menu'))
  r.comprobar('  el menú queda completo dentro de la pantalla', await menuEncaja('.ficha'))
  await tecla('Escape')
  r.comprobar('  Esc cierra el menú pero no la ficha', await esperarA(`!${MENU('.ficha')} && !!document.querySelector('.ficha') && document.activeElement === ${BOTON_EXPORTAR('.ficha')}`))

  const rutaFicha = await exportar('.ficha', 'PDF', `TRDCode_ficha_85.15_${FECHA}.pdf`)
  r.comprobar(`descarga TRDCode_ficha_85.15_${FECHA}.pdf`, !!rutaFicha)
  const pdfFicha = leerPdf(readFileSync(rutaFicha, 'latin1'))
  const codigosFicha = await ev(`[...document.querySelectorAll('.ficha .expedientes:not(.solo-impresion) .expediente__codigo')].map(c => c.textContent.trim())`)
  r.comprobar('el PDF lleva título, filtros, total y la fila de 85.15', pdfFicha.texto.includes('Ficha de la subserie 85.15') && pdfFicha.texto.includes('Filtros: TRD 11') && pdfFicha.texto.includes('17 expedientes') && pdfFicha.paginas[0].includes('85.15'))
  r.comprobar('  su detalle: retención, cuándo empieza a contar, disposición y tipos documentales', ['Retención', 'Cuándo empieza a contar', 'Disposición final', `Tipos documentales (${f8515.trd.tipos.length})`].every((t) => pdfFicha.texto.includes(t)))
  r.comprobar('  P-10: los 17 expedientes (los mismos de la ficha) con su control de acceso', pdfFicha.texto.includes('Expedientes (17)') && codigosFicha.length === 17 && f8515.expedientes.every((e) => codigosFicha.includes(e.codigo) && pdfFicha.texto.includes(e.codigo)) && pdfFicha.texto.split('\n').filter((l) => l === 'Clasificado').length === 17)
  r.comprobar('  ningún nombre reservado: los IPC e IPR salen como "Nombre reservado"', sinNombresReservados(pdfFicha, f8515.expedientes))
  r.comprobar(`  encabezado y pie en las ${pdfFicha.paginas.length} páginas`, encabezadoYPie(pdfFicha))

  const rutaExcelFicha = await exportar('.ficha', 'Excel (.xlsx)', `TRDCode_ficha_85.15_${FECHA}.xlsx`)
  r.comprobar(`descarga TRDCode_ficha_85.15_${FECHA}.xlsx`, !!rutaExcelFicha)
  const libroFicha = hojas(rutaExcelFicha)
  r.comprobar('el Excel de la ficha: 1 subserie, sus 17 expedientes y "Ficha de 85.15" en Filtros', libroFicha.series.length === 1 && libroFicha.series[0]['Código subserie'] === '85.15' && libroFicha.expedientes.length === 17 && f8515.expedientes.every((e) => libroFicha.expedientes.some((x) => x['Código expediente'] === e.codigo)) && filtro(libroFicha, 'Exportado desde') === 'Ficha de 85.15')

  r.seccion('Imprimir (emulación del medio de impresión)')
  await cdp('Emulation.setEmulatedMedia', { media: 'print' })
  const fichaImpresa = await ev(`(() => { ${VISIBLE}
    const fuera = [...document.querySelector('.pagina').children].filter(e => !e.classList.contains('ficha-fondo'))
    const ficha = document.querySelector('.ficha')
    return {
      soloFicha: fuera.every(e => !visible(e)) && getComputedStyle(document.querySelector('.ficha-fondo')).position === 'static',
      sinControles: [...ficha.querySelectorAll('button, summary, nav')].every(e => !visible(e)),
      linea: visible(ficha.querySelector('.impresion-cabecera__linea')) ? ficha.querySelector('.impresion-cabecera__linea').textContent : '',
      expedientes: [...ficha.querySelectorAll('.expediente')].filter(visible).length,
      tarjetas: [...ficha.querySelectorAll('.tarjeta-dato, .expediente')].every(e => getComputedStyle(e).breakInside === 'avoid'),
    } })()`)
  r.comprobar('con la ficha abierta se imprime solo la ficha, sin el fondo ni el panel lateral', fichaImpresa.soloFicha)
  r.comprobar('  sin botones, menús ni paginación', fichaImpresa.sinControles)
  r.comprobar('  con la línea de la fecha de los datos y los filtros', fichaImpresa.linea.includes(sello) && fichaImpresa.linea.includes('Centro: Industria y Construcción'))
  r.comprobar('  sus 17 expedientes; las tarjetas y los expedientes no se cortan', fichaImpresa.expedientes === 17 && fichaImpresa.tarjetas)
  await foto('02-ficha-impresa')
  // La hoja impresa queda con las capturas para revisarla a ojo (85.15 no tiene nombres a la vista: todos son IPC).
  const fichaPdf = await cdp('Page.printToPDF', { printBackground: true })
  writeFileSync(join(CAPTURAS, 'exportar-impresion-ficha-85.15.pdf'), Buffer.from(fichaPdf.result.data, 'base64'))
  await cdp('Emulation.setEmulatedMedia', { media: '' })
  await tecla('Escape')
  await esperarA(`!document.querySelector('.ficha')`)

  // Una ficha con más de 50 expedientes: en pantalla, páginas de 50; al imprimir, todos.
  const codigoMas = fConMas.codigo_subserie || fConMas.codigo_serie
  await clic(filaBoton(codigoMas))
  await esperarA(`!!document.querySelector('.ficha .paginacion')`)
  const enPantalla = await ev(`(() => { ${VISIBLE}; return [...document.querySelectorAll('.ficha .expediente')].filter(visible).length })()`)
  await cdp('Emulation.setEmulatedMedia', { media: 'print' })
  const impresa = await ev(`(() => { ${VISIBLE}
    const tipos = [...document.querySelectorAll('.ficha .tipos li')]
    return { expedientes: [...document.querySelectorAll('.ficha .expediente')].filter(visible).length, tipos: tipos.filter(visible).length, totalTipos: tipos.length } })()`)
  r.comprobar(`ficha de ${codigoMas} (${fConMas.cantidad} expedientes): en pantalla ${enPantalla}, al imprimir los ${fConMas.cantidad}`, enPantalla === 50 && impresa.expedientes === fConMas.cantidad)
  r.comprobar(`  y todos sus tipos documentales (${impresa.totalTipos})`, impresa.tipos === impresa.totalTipos && impresa.totalTipos === fConMas.trd.tipos.length)
  await cdp('Emulation.setEmulatedMedia', { media: '' })
  await tecla('Escape')
  await esperarA(`!document.querySelector('.ficha')`)

  await cdp('Emulation.setEmulatedMedia', { media: 'print' })
  const consulta = await ev(`(() => { ${VISIBLE}
    const ocultos = ['.superior', '.pestanas', '.botones-exportar', '.encabezado', '.consulta', '#panel-filtros', '.acceso'].map(s => document.querySelector(s)).filter(Boolean)
    const botones = [...document.querySelectorAll('main button')].filter(visible)
    const cab = document.querySelector('.impresion-cabecera')
    return {
      sinControles: ocultos.every(e => !visible(e)) && botones.every(b => b.classList.contains('fila__boton')) && [...document.querySelectorAll('.col-accion')].every(e => !visible(e)),
      linea: visible(cab) ? cab.textContent : '',
      filas: [...document.querySelectorAll('#tabla-resultados tr.tabla__fila')].filter(visible).length,
      grupos: [...document.querySelectorAll('.tabla__bloque')].every(t => getComputedStyle(t).breakInside === 'avoid') && [...document.querySelectorAll('.tabla__bloque')].length > 0,
      cabecera: getComputedStyle(document.querySelector('.tabla thead')).display === 'table-header-group',
    } })()`)
  r.comprobar('la consulta se imprime sin encabezado interactivo, filtros, botones, pestañas ni menús', consulta.sinControles)
  r.comprobar('  con una línea de filtros y la fecha de los datos', consulta.linea.includes('TRDCode') && consulta.linea.includes(sello) && consulta.linea.includes('Filtros: TRD 11 (vigente, 2025) · Centro: Industria y Construcción'))
  r.comprobar(`  con las mismas ${filas.length} series y subseries que se ven`, consulta.filas === filas.length)
  r.comprobar('  los grupos de una serie no se cortan entre páginas y la cabecera se repite', consulta.grupos && consulta.cabecera)
  await foto('03-consulta-impresa')
  const impreso = await cdp('Page.printToPDF', { printBackground: true })
  r.comprobar('el navegador genera la hoja impresa (Page.printToPDF)', !!impreso.result?.data)
  writeFileSync(join(CAPTURAS, 'exportar-impresion-consulta.pdf'), Buffer.from(impreso.result.data, 'base64'))
  await cdp('Emulation.setEmulatedMedia', { media: '' })
  r.comprobar('en pantalla la línea de impresión no se ve', await ev(`(() => { ${VISIBLE}; return !visible(document.querySelector('.impresion-cabecera')) })()`))

  // #82: con sesión, la ficha, el Excel y el PDF llevan los nombres reales de los IPC e IPR; al salir,
  // vuelven a ocultarse. Sin capturas en esta sección: tendrían nombres de personas.
  r.seccion('Nombres de los expedientes IPC e IPR con sesión (#82)')
  php('cuenta_temporal.php', 'crear', cuenta.correo, cuenta.clave)
  cuentaCreada = true
  await clic(`document.querySelector('.acceso__enlace')`)
  await esperarA(`!!document.querySelector('[role=dialog] input[name=correo]')`)
  await escribir('input[name=correo]', cuenta.correo)
  await escribir('input[name=clave]', cuenta.clave)
  await tecla('Enter')
  r.comprobar('ingresa con una cuenta temporal', await esperarA(`!!document.querySelector('.acceso__nombre')`))
  // Los nombres que entrega la API con la sesión de la página (no se imprimen).
  const conSesion = await ev(`fetch('api/datos.php').then(r => r.json()).then(j => Object.fromEntries(j.datos.expedientes.filter(e => e.control_acceso !== 'IPU').map(e => [e.codigo, e.nombre])))`)
  const reservados8515 = f8515.expedientes.filter((e) => e.control_acceso !== 'IPU').map((e) => e.codigo)
  r.comprobar(`  la API envía los nombres reales de los ${reservados8515.length} IPC de 85.15`, reservados8515.length > 0 && reservados8515.every((c) => conSesion[c] && !conSesion[c].startsWith('Nombre reservado')))
  await clic(filaBoton('85.15'))
  await esperarA(`!!document.querySelector('.ficha')`)
  const nombresFicha = () => ev(`Object.fromEntries([...document.querySelectorAll('.ficha .expedientes:not(.solo-impresion) .expediente')].map(li => [li.querySelector('.expediente__codigo').textContent.trim(), { nombre: li.querySelector('.expediente__nombre').firstChild.textContent, oculto: li.querySelector('.expediente__nombre').classList.contains('reservado') }]))`)
  const recargados = await esperarA(`!document.querySelector('.ficha .expediente__nombre.reservado')`)
  const enFicha = await nombresFicha()
  r.comprobar('  la ficha muestra los nombres reales, sin el estilo de nombre oculto', recargados && reservados8515.every((c) => enFicha[c]?.nombre === conSesion[c] && !enFicha[c].oculto))
  const excelSesion = hojas(await exportar('.ficha', 'Excel (.xlsx)', `TRDCode_ficha_85.15_${FECHA}.xlsx`))
  r.comprobar('  el Excel de la ficha lleva los nombres reales', excelSesion.expedientes.length === 17 && excelSesion.expedientes.every((e) => !reservados8515.includes(e['Código expediente']) || e['Nombre del expediente'] === conSesion[e['Código expediente']]))
  const pdfSesion = leerPdf(readFileSync(await exportar('.ficha', 'PDF', `TRDCode_ficha_85.15_${FECHA}.pdf`), 'latin1'))
  r.comprobar('  el PDF de la ficha no dice "Nombre reservado"', pdfSesion.texto.includes('Expedientes (17)') && !pdfSesion.texto.includes('Nombre reservado'))

  // La ficha es modal: se cierra para llegar al menú de la usuaria.
  await tecla('Escape')
  await esperarA(`!document.querySelector('.ficha')`)
  await clic(`document.querySelector('.acceso__usuaria')`)
  await clic(boton('Salir'))
  await esperarA(`!!document.querySelector('.acceso__enlace')`)
  await clic(filaBoton('85.15'))
  await esperarA(`!!document.querySelector('.ficha')`)
  r.comprobar('al salir, la ficha vuelve a mostrar "Nombre reservado" en los 17', await esperarA(`[...document.querySelectorAll('.ficha .expedientes:not(.solo-impresion) .expediente__nombre')].filter(e => e.classList.contains('reservado') && e.firstChild.textContent.startsWith('Nombre reservado (')).length === ${reservados8515.length}`, 5000))
  const despues = await nombresFicha()
  r.comprobar('  y ningún nombre real queda en la página', reservados8515.every((c) => despues[c]?.oculto) && !(await ev(`(() => { const t = document.body.innerText; return ${JSON.stringify(reservados8515.map((c) => conSesion[c]))}.some(n => t.includes(n)) })()`)))
  const excelDespues = hojas(await exportar('.ficha', 'Excel (.xlsx)', `TRDCode_ficha_85.15_${FECHA}.xlsx`))
  r.comprobar('  el Excel vuelve a salir con los nombres ocultos', excelDespues.expedientes.filter((e) => reservados8515.includes(e['Código expediente'])).every((e) => e['Nombre del expediente'].startsWith('Nombre reservado (')))
  const pdfDespues = leerPdf(readFileSync(await exportar('.ficha', 'PDF', `TRDCode_ficha_85.15_${FECHA}.pdf`), 'latin1'))
  r.comprobar('  y el PDF también', sinNombresReservados(pdfDespues, f8515.expedientes))
  await tecla('Escape')
  await esperarA(`!document.querySelector('.ficha')`)

  r.seccion('Celular: el menú "Exportar" no se sale de la pantalla')
  for (const ancho of [320, 390]) {
    await tamano(ancho)
    await ir(`${URL_APP}#centros=73.9226&dependencias=00.9000.4`, conTotal)
    await clic(BOTON_EXPORTAR('.total'))
    await esperarA(dentroDe('.total .menu-exportar__menu'))
    r.comprobar(`a ${ancho} px, en la consulta`, await menuEncaja('.total'))
    await tecla('Escape')
    await clic(filaBoton('85.15'))
    await esperarA(`!!document.querySelector('.ficha')`)
    await clic(BOTON_EXPORTAR('.ficha'))
    await esperarA(dentroDe('.ficha .menu-exportar__menu'))
    r.comprobar(`a ${ancho} px, en la ficha`, await menuEncaja('.ficha'))
    await foto(`04-celular-${ancho}`)
    await tecla('Escape')
    await tecla('Escape')
  }
  await computador()
} catch (e) {
  r.error(e)
} finally {
  await n.cerrar()
  if (cuentaCreada) php('cuenta_temporal.php', 'borrar', cuenta.correo)
  if (existsSync(descargas)) rmSync(descargas, { recursive: true, force: true })
  r.terminar()
}
