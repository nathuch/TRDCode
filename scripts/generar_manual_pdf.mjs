// Genera docs/GUIA_USO.pdf a partir de docs/GUIA_USO.md.
// Uso, desde la raíz del proyecto:  node scripts/generar_manual_pdf.mjs
//
// Convierte el Markdown a HTML (solo lo que usa el manual: títulos, párrafos, listas, tablas,
// imágenes, citas, código, negritas y enlaces), le da la línea visual de la aplicación con la
// fuente Work Sans instalada en frontend/node_modules, y lo imprime con Edge sin ventana
// (tamaño carta, número de página y marcadores por sección). No necesita librerías externas.
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const origen = join(raiz, 'docs', 'GUIA_USO.md')
const destino = join(raiz, 'docs', 'GUIA_USO.pdf')
const fuentes = join(raiz, 'frontend', 'node_modules', '@fontsource', 'work-sans', 'files')
const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find(existsSync)
if (!EDGE) throw new Error('No se encontró Microsoft Edge.')

// ---------- Markdown a HTML ----------

const escapar = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Ancla como la de GitHub: "1. Qué es TRDCode" -> "1-qué-es-trdcode". */
const ancla = (t) =>
  t
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s/g, '-')

function enLinea(texto) {
  const codigos = []
  let t = texto.replace(/`([^`]+)`/g, (_, c) => `\u0000${codigos.push(escapar(c)) - 1}\u0000`)
  t = escapar(t)
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codigos[i]}</code>`)
}

const celdas = (linea) =>
  linea
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim())

function bloques(lineas) {
  const html = []
  let i = 0
  while (i < lineas.length) {
    const linea = lineas[i]
    if (!linea.trim()) {
      i++
      continue
    }
    let m
    if (linea.startsWith('```')) {
      const codigo = []
      i++
      while (i < lineas.length && !lineas[i].startsWith('```')) codigo.push(lineas[i++])
      i++
      html.push(`<pre><code>${escapar(codigo.join('\n'))}</code></pre>`)
    } else if ((m = linea.match(/^(#{1,3}) (.+)$/))) {
      const nivel = m[1].length
      html.push(`<h${nivel} id="${ancla(m[2])}">${enLinea(m[2])}</h${nivel}>`)
      i++
    } else if (/^---+$/.test(linea.trim())) {
      html.push('<hr>')
      i++
    } else if ((m = linea.match(/^!\[([^\]]*)\]\(([^)]+)\)$/))) {
      const ruta = pathToFileURL(join(dirname(origen), m[2])).href
      html.push(`<figure><img src="${ruta}" alt="${escapar(m[1])}"><figcaption>${escapar(m[1])}</figcaption></figure>`)
      i++
    } else if (linea.startsWith('|')) {
      const filas = []
      while (i < lineas.length && lineas[i].startsWith('|')) filas.push(lineas[i++])
      const [cabecera, , ...cuerpo] = filas
      html.push(
        '<table><thead><tr>' +
          celdas(cabecera).map((c) => `<th>${enLinea(c)}</th>`).join('') +
          '</tr></thead><tbody>' +
          cuerpo.map((f) => '<tr>' + celdas(f).map((c) => `<td>${enLinea(c)}</td>`).join('') + '</tr>').join('') +
          '</tbody></table>',
      )
    } else if (linea.startsWith('> ')) {
      const cita = []
      while (i < lineas.length && lineas[i].startsWith('>')) cita.push(lineas[i++].replace(/^> ?/, ''))
      html.push(`<blockquote>${bloques(cita)}</blockquote>`)
    } else if (/^(- |\d+\. )/.test(linea)) {
      const ordenada = /^\d+\. /.test(linea)
      const items = []
      while (i < lineas.length) {
        const l = lineas[i]
        if (/^(- |\d+\. )/.test(l)) {
          items.push([l.replace(/^(- |\d+\. )/, '')])
          i++
        } else if (/^ {2,}\S/.test(l) || (!l.trim() && /^ {2,}\S/.test(lineas[i + 1] ?? ''))) {
          // Continuación del ítem (texto o código indentado).
          items.at(-1).push(l.replace(/^ {2,3}/, ''))
          i++
        } else break
      }
      const etiqueta = ordenada ? 'ol' : 'ul'
      html.push(
        `<${etiqueta}>` +
          items
            .map(([primera, ...resto]) => {
              const adentro = resto.length ? bloques(resto) : ''
              return `<li>${enLinea(primera)}${adentro}</li>`
            })
            .join('') +
          `</${etiqueta}>`,
      )
    } else {
      const parrafo = []
      while (i < lineas.length && lineas[i].trim() && !/^(#|\||> |- |\d+\. |```|!\[|---)/.test(lineas[i])) {
        parrafo.push(lineas[i++].trim())
      }
      html.push(`<p>${enLinea(parrafo.join(' '))}</p>`)
    }
  }
  return html.join('\n')
}

const markdown = readFileSync(origen, 'utf8').replace(/\r\n/g, '\n')
const [titulo] = markdown.match(/^# .+$/m)
const cuerpo = bloques(markdown.split('\n'))

const fuente = (peso) => {
  const archivo = join(fuentes, `work-sans-latin-${peso}-normal.woff2`)
  return existsSync(archivo)
    ? `@font-face { font-family: 'Work Sans'; font-weight: ${peso}; src: url('${pathToFileURL(archivo).href}') format('woff2'); }`
    : ''
}

const documento = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${escapar(titulo.slice(2))}</title>
<style>
${[400, 500, 600, 700].map(fuente).join('\n')}
:root { --verde: #2f7a0a; --verde-sena: #39a900; --verde-claro: #e8f3e0; --borde: #e3e7e1; --texto: #1b1f1a; --suave: #5b6459; }
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Work Sans', 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; line-height: 1.5; color: var(--texto); }
h1 { font-size: 24pt; margin: 0 0 6pt; padding-top: 10pt; border-top: 5pt solid var(--verde-sena); }
h1 + p { color: var(--suave); font-size: 12pt; }
h2 { font-size: 16pt; color: var(--verde); margin: 22pt 0 8pt; padding-bottom: 4pt; border-bottom: 1px solid var(--borde); break-after: avoid; }
h3 { font-size: 12pt; margin: 16pt 0 6pt; break-after: avoid; }
p, li { orphans: 3; widows: 3; }
p { margin: 0 0 8pt; }
ul, ol { margin: 0 0 8pt; padding-left: 18pt; }
li { margin: 2pt 0; }
a { color: var(--verde); text-decoration: none; }
code { font-family: Consolas, 'Courier New', monospace; font-size: 9.5pt; background: #f1f3f0; padding: 0 3pt; border-radius: 3pt; }
pre { background: #f1f3f0; padding: 8pt 10pt; border-radius: 6pt; white-space: pre-wrap; word-break: break-all; break-inside: avoid; }
pre code { padding: 0; background: none; }
hr { border: 0; border-top: 1px solid var(--borde); margin: 14pt 0; }
table { width: 100%; border-collapse: collapse; margin: 4pt 0 12pt; font-size: 9.5pt; break-inside: auto; }
tr { break-inside: avoid; }
th { text-align: left; background: var(--verde-claro); color: #2f6b0f; font-weight: 600; }
th, td { padding: 5pt 7pt; border: 1px solid var(--borde); vertical-align: top; }
blockquote { margin: 0 0 10pt; padding: 8pt 12pt; border-left: 4pt solid #ebcb7a; background: #fff8e6; }
blockquote p { margin: 0; }
figure { margin: 8pt 0 14pt; break-inside: avoid; }
figure img { display: block; max-width: 100%; max-height: 6.2in; margin: 0 auto; border: 1px solid var(--borde); border-radius: 4pt; }
figcaption { margin-top: 4pt; text-align: center; font-size: 8.5pt; color: var(--suave); }
#contenido + ol { columns: 2; }
</style></head><body>
${cuerpo}
</body></html>`

// ---------- HTML a PDF con Edge ----------

const trabajo = mkdtempSync(join(tmpdir(), 'trdcode-manual-'))
const html = join(trabajo, 'GUIA_USO.html')
writeFileSync(html, documento, 'utf8')

const puerto = 9400 + Math.floor(Math.random() * 400)
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${puerto}`, `--user-data-dir=${join(trabajo, 'perfil')}`,
  '--no-first-run', '--disable-extensions', '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' })
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
let paginas
for (let i = 0; i < 60 && !paginas; i++) {
  await espera(250)
  paginas = await fetch(`http://127.0.0.1:${puerto}/json/list`).then((r) => r.json()).catch(() => null)
}
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
const enviar = (method, params = {}) =>
  new Promise((r) => {
    const n = ++id
    pendientes.set(n, r)
    ws.send(JSON.stringify({ id: n, method, params }))
  })

try {
  await enviar('Page.enable')
  await enviar('Page.navigate', { url: pathToFileURL(html).href })
  for (let i = 0; i < 60; i++) {
    const r = await enviar('Runtime.evaluate', {
      expression: `document.readyState === 'complete' && [...document.images].every(i => i.complete) && document.fonts.status === 'loaded'`,
      returnByValue: true,
    })
    if (r.result.result.value) break
    await espera(250)
  }
  const pie = `<div style="width:100%; font-family:'Segoe UI',Arial,sans-serif; font-size:8px; color:#5b6459; padding:0 0.6in; display:flex; justify-content:space-between;">
    <span>TRDCode · Manual de usuario · SENA, Regional Tolima</span>
    <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`
  const r = await enviar('Page.printToPDF', {
    paperWidth: 8.5,
    paperHeight: 11,
    marginTop: 0.6,
    marginBottom: 0.7,
    marginLeft: 0.6,
    marginRight: 0.6,
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: pie,
    generateDocumentOutline: true,
  })
  if (r.error) throw new Error(r.error.message)
  writeFileSync(destino, Buffer.from(r.result.data, 'base64'))
  console.log(`Listo: ${destino}`)
} finally {
  ws.close()
  edge.kill()
  await espera(500)
  rmSync(trabajo, { recursive: true, force: true })
}
