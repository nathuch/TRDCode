// P-28: una instalación nueva del paquete, recién hecha con docs/INSTALACION.md (sin expedientes y con
// la primera cuenta creada con consola/crear_primera_cuenta.php).
// Uso: TRDCODE_CORREO=... TRDCODE_CLAVE=... node scripts/pruebas-navegador/instalacion.mjs <url>
// Revisa que la instalación empiece vacía y que no se pueda descargar nada privado; entra con la primera
// cuenta, hace la primera carga del reporte de agosto desde "Actualizar datos" y comprueba la consulta
// (643 expedientes; 85.15 con 17). CREA UNA CARGA: se niega a correr si la instalación ya tiene una.
// Las credenciales llegan por variables de entorno y nunca se imprimen.
import { existsSync } from 'node:fs'
import { abrirNavegador, boton, direccion, registro, REPORTE } from './comun.mjs'

const URL_APP = direccion()
const correo = process.env.TRDCODE_CORREO
const clave = process.env.TRDCODE_CLAVE
if (!process.argv[2] || !correo || !clave) {
  console.log('Uso: TRDCODE_CORREO=... TRDCODE_CLAVE=... node scripts/pruebas-navegador/instalacion.mjs <url>')
  process.exit(1)
}
if (!existsSync(REPORTE)) {
  console.log('Falta datos-prueba/reporte-tolima-2026-08-10.xlsx.')
  process.exit(1)
}

const r = registro()
const estado = async (ruta) => (await fetch(URL_APP + ruta, { redirect: 'manual' })).status
const datosApi = async () => (await fetch(`${URL_APP}api/datos.php`).then((x) => x.json())).datos

r.seccion(`Instalación nueva en ${URL_APP}`)
const antes = await datosApi()
if (antes.carga !== null || antes.expedientes.length > 0) {
  console.log('La instalación ya tiene una carga de expedientes: esta prueba es solo para una instalación nueva.')
  process.exit(1)
}
r.comprobar('la API responde sin carga y sin expedientes', antes.carga === null && antes.expedientes.length === 0)
r.comprobar(`trae los 3 centros, las 9 dependencias y la TRD (${antes.trd.length} registros)`, antes.centros.length === 3 && antes.dependencias.length === 9 && antes.trd.length > 0)
r.comprobar('los nombres de los centros llegan con tildes', antes.centros.some((c) => c.nombre === 'Industria y Construcción'))

r.seccion('Nada privado se puede descargar')
const privadas = ['.env', '.env.example', '.htaccess', 'api/lib/config.php', 'api/lib/db.php', 'api/lib/auth.php', 'api/lib/.htaccess',
  'consola/crear_primera_cuenta.php', 'consola/', 'consola/.htaccess', 'assets/', 'api/', 'database/schema.sql', 'datos-prueba/expedientes.sql']
for (const ruta of privadas) {
  const codigo = await estado(ruta)
  r.comprobar(`${ruta} → ${codigo}`, codigo === 403 || codigo === 404)
}
const robots = await fetch(`${URL_APP}robots.txt`).then((x) => x.text())
r.comprobar('robots.txt pide no indexar (Disallow: /)', /Disallow:\s*\/\s*$/m.test(robots))
r.comprobar('index.html usa rutas relativas (funciona en esta carpeta sin volver a compilar)', !/(src|href)="\/(?!\/)/.test(await fetch(URL_APP).then((x) => x.text())))

const n = await abrirNavegador({ prefijo: 'instalacion' })
const { ev, esperarA, tecla, clic, escribir, elegirArchivo, ir, foto } = n
try {
  r.seccion('Primera cuenta y primera carga')
  await ir(`${URL_APP}#actualizar`, `!!document.querySelector('#actualizar-titulo')`)
  await clic(`document.querySelector('.acceso__enlace')`)
  await esperarA(`!!document.querySelector('input[name=correo]')`)
  await escribir('input[name=correo]', correo)
  await escribir('input[name=clave]', clave)
  await tecla('Enter')
  r.comprobar('la primera cuenta entra y ve "Actualizar datos"', await esperarA(`!!document.querySelector('input[type=file]')`))
  r.comprobar('no hay cargas guardadas', await esperarA(`document.querySelectorAll('#historial-titulo ~ .tabla-caja tbody tr').length === 0`))
  await elegirArchivo(REPORTE)
  await esperarA(`document.querySelector('input[name=fecha]').value === '2026-08-10'`)
  await clic(boton('Revisar el archivo'))
  r.comprobar('lee el reporte y muestra la revisión', await esperarA(`!!document.querySelector('#revision-titulo')`, 30000))
  const tarjetas = await ev(`[...document.querySelectorAll('.revision__tarjetas .tarjeta-dato')].map(t => t.textContent)`)
  r.comprobar('7.531 filas; 3.385 expedientes: 1.781 / 1.084 / 520', tarjetas[0].includes('7.531') && tarjetas[1].includes('3.385') && tarjetas[1].includes('Industria y Construcción: 1.781') && tarjetas[1].includes('Comercio y Servicios: 1.084') && tarjetas[1].includes('Agropecuario La Granja: 520'))
  await clic(boton('Cargar'))
  r.comprobar('termina: "Se cargaron 3.385 expedientes", datos al 10 de agosto de 2026', await esperarA(`(document.querySelector('#listo-titulo ~ .aviso-exito')?.textContent ?? '').includes('3.385 expedientes') && document.querySelector('#listo-titulo ~ .aviso-exito').textContent.includes('10 de agosto de 2026')`, 120000))
  r.comprobar('el historial muestra una carga, en uso', await esperarA(`document.querySelectorAll('#historial-titulo ~ .tabla-caja tbody tr').length === 1`))
  await foto('01-primera-carga')

  r.seccion('Consulta')
  const despues = await datosApi()
  r.comprobar(`la API entrega 3.385 expedientes (${despues.expedientes.length})`, despues.expedientes.length === 3385)
  r.comprobar('ningún expediente IPC o IPR llega con su nombre', despues.expedientes.filter((e) => e.control_acceso !== 'IPU').every((e) => String(e.nombre).startsWith('Nombre reservado')))
  await ir(`${URL_APP}#centros=73.9226&dependencias=00.9000.4`, `!!document.querySelector('.total__numero')`)
  r.comprobar('TRD 11, Industria y Construcción, Formación Profesional: 643 expedientes', await esperarA(`document.querySelector('.total__numero').textContent === '643'`))
  r.comprobar('arriba dice "Datos al 10 de agosto de 2026"', await esperarA(`document.body.textContent.includes('Datos al 10 de agosto de 2026')`))
  await clic(`[...document.querySelectorAll('tr.tabla__fila')].find(tr => tr.querySelector('.col-codigo').textContent.trim() === '85.15').querySelector('.fila__boton')`)
  r.comprobar('la ficha de 85.15 tiene 17 expedientes', await esperarA(`(document.querySelector('.ficha__cantidad')?.textContent ?? '').trim().startsWith('17 expedientes')`))
  // Con la sesión de la primera cuenta se ven los nombres reales (#82): sin captura.
  r.comprobar('  con sesión, sus 17 nombres reales (ninguno "Nombre reservado")', await esperarA(`document.querySelectorAll('.ficha .expedientes:not(.solo-impresion) .expediente').length === 17 && !document.querySelector('.ficha').textContent.includes('Nombre reservado')`))
  await tecla('Escape')
  await esperarA(`!document.querySelector('.ficha')`)
  await clic(`document.querySelector('.acceso__usuaria')`)
  await clic(boton('Salir'))
  await esperarA(`!!document.querySelector('.acceso__enlace')`)
  await clic(`[...document.querySelectorAll('tr.tabla__fila')].find(tr => tr.querySelector('.col-codigo').textContent.trim() === '85.15').querySelector('.fila__boton')`)
  r.comprobar('  al salir, los 17 salen como "Nombre reservado"', await esperarA(`(() => { const t = document.querySelector('.ficha')?.textContent ?? ''; return (t.match(/Nombre reservado/g) ?? []).length >= 17 })()`))
  await foto('02-ficha-85.15')
} catch (e) {
  r.error(e)
} finally {
  await n.cerrar()
  r.terminar()
}
