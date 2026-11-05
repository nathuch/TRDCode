/** Texto en minúsculas y sin tildes, para comparar "HISTORIAS ACADÉMICAS" con "historias". */
export function normalizarTexto(texto) {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** Ordena códigos como 2, 02.10, 02.9 por sus partes numéricas: 02.9 va antes que 02.10. */
export function compararCodigos(a, b) {
  const pa = (a ?? '').split('.').map(Number)
  const pb = (b ?? '').split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diferencia = (pa[i] ?? -1) - (pb[i] ?? -1)
    if (diferencia !== 0) return diferencia
  }
  return 0
}
