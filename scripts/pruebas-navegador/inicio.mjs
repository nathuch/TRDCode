// Pantalla de inicio: qué muestra, paso a la consulta, atrás/adelante, enlaces compartidos y celular.
// Uso: node scripts/pruebas-navegador/inicio.mjs [http://localhost:5173/]
// No inicia sesión ni cambia datos.
import { abrirNavegador, direccion, registro, SIN_DESPLAZAMIENTO_LATERAL } from './comun.mjs'

const URL_APP = direccion()
const r = registro()
const n = await abrirNavegador({ prefijo: 'inicio' })
const { ev, esperarA, tecla, clic, ir, foto } = n
const enInicio = `!!document.querySelector('#inicio-titulo') && !document.querySelector('.tabla') && !document.querySelector('.total') && !document.querySelector('#panel-filtros')`
const enConsulta = `!document.querySelector('#inicio-titulo') && !!document.querySelector('.total__numero')`
const tarjeta = (i) => `document.querySelectorAll('.tarjeta-centro')[${i}]`
const segmentado = (zona) => `document.querySelector('${zona} .segmentado input:checked')?.value`

try {
  r.seccion(`Inicio en ${URL_APP}`)
  await ir(URL_APP)
  r.comprobar('sin filtros abre el inicio: título, sin tabla, sin totales ni panel de filtros', await esperarA(`${enInicio} && document.querySelectorAll('.tarjeta-centro').length === 3`))
  r.comprobar('el título dice "¿Qué serie o subserie busca?"', await ev(`document.querySelector('#inicio-titulo').textContent.trim() === '¿Qué serie o subserie busca?'`))
  const nombres = await ev(`[...document.querySelectorAll('.tarjeta-centro__nombre')].map(n => n.textContent)`)
  r.comprobar(`tres tarjetas en orden: ${nombres.join(' / ')}`, JSON.stringify(nombres) === '["Industria y Construcción","Comercio y Servicios","Agropecuario La Granja"]')
  r.comprobar('las tarjetas son enlaces reales con "Ver series"', await ev(`[...document.querySelectorAll('.tarjeta-centro')].every(a => a.tagName === 'A' && a.getAttribute('href').startsWith('#centros=') && a.textContent.includes('Ver series'))`))
  r.comprobar('hay un enlace "Ver todas las series" a #consulta', await ev(`document.querySelector('.inicio__todas')?.getAttribute('href') === '#consulta'`))
  r.comprobar('abajo dice "Datos al ..."', await ev(`/Datos al \\d+ de \\w+ de \\d{4}/.test(document.querySelector('.inicio__fecha')?.textContent ?? '')`))
  r.comprobar('el encabezado tiene el acceso y no repite la fecha', await ev(`!!document.querySelector('.acceso__enlace, .acceso__usuaria') && !document.querySelector('.encabezado .sello')`))
  r.comprobar('el buscador (con etiqueta) y el selector TRD 11 / TRD 10 están', await ev(`document.querySelector('#inicio-buscar').labels.length === 1 && document.querySelectorAll('.inicio .segmentado input[type=radio]').length === 2 && ${segmentado('.inicio')} === '11'`))
  await foto('01-computador')

  await clic(tarjeta(0))
  r.comprobar('clic en Industria y Construcción: pasa a la consulta con el centro', await esperarA(`${enConsulta} && location.hash === '#centros=73.9226'`))
  r.comprobar('  el foco pasa a los resultados y el encabezado muestra la fecha', await ev(`document.activeElement?.id === 'resultados' && !!document.querySelector('.encabezado .sello')`))
  await ev('history.back()')
  r.comprobar('"atrás" vuelve al inicio', await esperarA(`${enInicio} && location.hash === ''`))
  await ev('history.forward()')
  r.comprobar('"adelante" vuelve a la consulta del centro', await esperarA(`${enConsulta} && location.hash === '#centros=73.9226'`))
  await clic(`document.querySelector('.encabezado__inicio')`)
  r.comprobar('el título del encabezado (un enlace real) vuelve al inicio', await esperarA(`${enInicio} && location.hash === ''`) && (await ev(`document.querySelector('.encabezado__inicio').tagName === 'A'`)))

  await ev(`document.querySelector('#inicio-buscar').focus()`)
  await n.cdp('Input.insertText', { text: 'emprendimiento' })
  await tecla('Enter')
  r.comprobar('buscar con Enter pasa a la consulta con la búsqueda y aparece la 85.15', await esperarA(`${enConsulta} && location.hash === '#buscar=emprendimiento' && document.querySelector('#buscar').value === 'emprendimiento' && document.querySelector('.tabla').textContent.includes('85.15')`))
  await ev('history.back()')
  await esperarA(enInicio)
  await ev(`document.querySelector('#inicio-buscar').focus()`)
  await n.cdp('Input.insertText', { text: '85.15' })
  await clic(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Buscar')`)
  r.comprobar('el botón Buscar también busca', await esperarA(`${enConsulta} && location.hash === '#buscar=85.15'`))
  await ev('history.back()')
  await esperarA(enInicio)
  await ev(`document.querySelector('#inicio-buscar').focus()`)
  await tecla('Enter')
  r.comprobar('Enter con el buscador vacío no sale del inicio', (await esperarA(enConsulta, 800)) === false && (await ev(enInicio)))

  await clic(`[...document.querySelectorAll('.inicio .segmentado__opcion')][1]`)
  r.comprobar('con la TRD 10 elegida, las tarjetas la llevan', await esperarA(`${segmentado('.inicio')} === '10'`) && (await ev(`document.querySelector('.tarjeta-centro').getAttribute('href') === '#trd=10&centros=73.9226'`)))
  await clic(`document.querySelector('.inicio__todas')`)
  r.comprobar('"Ver todas las series" abre la consulta en la TRD 10', await esperarA(`${enConsulta} && location.hash === '#trd=10' && ${segmentado('.consulta')} === '10'`))
  await ev('history.back()')
  r.comprobar('al volver, el inicio conserva la TRD 10', await esperarA(`${enInicio} && ${segmentado('.inicio')} === '10'`))
  await clic(`[...document.querySelectorAll('.inicio .segmentado__opcion')][0]`)
  await esperarA(`${segmentado('.inicio')} === '11'`)

  await ev(`document.querySelector('.tarjeta-centro').focus()`)
  await tecla('Tab')
  await tecla('Enter')
  r.comprobar('con el teclado (Tab y Enter) la segunda tarjeta abre Comercio y Servicios', await esperarA(`${enConsulta} && location.hash === '#centros=73.9310'`))
  await clic(`document.querySelector('.encabezado__inicio')`)
  await esperarA(enInicio)
  await clic(`document.querySelector('.inicio__todas')`)
  r.comprobar('"Ver todas las series" abre la consulta completa', await esperarA(`${enConsulta} && location.hash === '#consulta'`))
  await ir(`${URL_APP}#consulta`, enConsulta)
  r.comprobar('al recargar #consulta sigue en la consulta', await ev(enConsulta))
  await ir(`${URL_APP}#centros=73.9226&dependencias=00.9000.4&ficha=11|00.9000.4|85|85.15`, enConsulta)
  r.comprobar('un enlace compartido con ficha abre directo la consulta (643) con la ficha de 85.15', await esperarA(`document.querySelector('.total__numero')?.textContent === '643' && document.querySelector('#ficha-titulo')?.textContent.includes('85.15')`))

  r.seccion('Celular (390 x 844)')
  await n.celular()
  await ir(URL_APP, `document.querySelectorAll('.tarjeta-centro').length === 3`)
  r.comprobar('sin desplazamiento lateral', await ev(SIN_DESPLAZAMIENTO_LATERAL))
  r.comprobar('las tarjetas van una debajo de otra', await ev(`(() => { const [a, b] = [...document.querySelectorAll('.tarjeta-centro')].map(t => t.getBoundingClientRect()); return b.top >= a.bottom })()`))
  await foto('02-celular')
} catch (e) {
  r.error(e)
} finally {
  await n.cerrar()
  r.terminar()
}
