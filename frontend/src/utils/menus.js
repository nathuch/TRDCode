/**
 * Menús desplegables (position: absolute dentro de su contenedor) que siempre quedan completos en la
 * pantalla: se alinean al borde izquierdo del botón que los abre si caben hacia la derecha; si no, al
 * borde derecho; y nunca pasan los márgenes laterales de la página (16 px).
 */

const MARGEN = 16

export function encajarMenu(menu) {
  if (!menu?.offsetParent) return
  const ancho = document.documentElement.clientWidth
  menu.style.maxWidth = `${ancho - 2 * MARGEN}px`
  menu.style.left = '0px'
  menu.style.right = 'auto'
  const contenedor = menu.offsetParent.getBoundingClientRect()
  const medida = menu.getBoundingClientRect().width
  if (contenedor.left + medida <= ancho - MARGEN) return
  if (contenedor.right - medida >= MARGEN) {
    menu.style.left = 'auto'
    menu.style.right = '0px'
    return
  }
  // No cabe alineado a ningún borde del botón: se pega al margen izquierdo de la página.
  menu.style.left = `${MARGEN - contenedor.left}px`
}
