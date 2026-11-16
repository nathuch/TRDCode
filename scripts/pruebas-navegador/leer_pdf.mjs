/**
 * Lee el texto de un PDF generado por TRDCode (jsPDF sin comprimir, fuentes estándar): cada página
 * es un flujo de contenido con cadenas "(texto) Tj". Lo usan pdf.test.js (npm test) y exportar.mjs.
 * No sirve para PDF de otros programas.
 */

function desescapar(cadena) {
  return cadena.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, c) => {
    const simples = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' }
    return simples[c] ?? String.fromCharCode(parseInt(c, 8))
  })
}

/**
 * Recibe el PDF como texto latin1 (Buffer.toString('latin1') o la salida de doc.output()).
 * Devuelve { paginas: [[líneas de texto]], texto } con las líneas en el orden en que se dibujan.
 */
export function leerPdf(binario) {
  if (binario.includes('/FlateDecode')) throw new Error('El PDF está comprimido: este lector no lo entiende.')
  const paginas = []
  for (const [, flujo] of binario.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    const lineas = [...flujo.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map(([, c]) => desescapar(c))
    if (lineas.length) paginas.push(lineas)
  }
  return { paginas, texto: paginas.map((p) => p.join('\n')).join('\n') }
}
