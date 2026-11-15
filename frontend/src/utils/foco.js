/**
 * Manejo del foco en ventanas modales (la ficha y los diálogos): con Tab y Mayús+Tab el foco da la
 * vuelta dentro de la ventana en lugar de pasar a la página que queda detrás.
 */

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'

/** Elementos enfocables y visibles (los de un <details> cerrado no cuentan). */
export function enfocables(contenedor) {
  return [...contenedor.querySelectorAll(ENFOCABLES)].filter((e) => e.getClientRects().length > 0)
}

/** Para el keydown de una ventana modal: con Tab, el foco no sale del contenedor. */
export function retenerFoco(evento, contenedor) {
  if (evento.key !== 'Tab' || !contenedor) return
  const lista = enfocables(contenedor)
  if (lista.length === 0) return
  const [inicio, fin] = [lista[0], lista.at(-1)]
  const actual = document.activeElement
  if (!contenedor.contains(actual)) {
    evento.preventDefault()
    inicio.focus()
  } else if (evento.shiftKey && actual === inicio) {
    evento.preventDefault()
    fin.focus()
  } else if (!evento.shiftKey && actual === fin) {
    evento.preventDefault()
    inicio.focus()
  }
}
