import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { encajarMenu } from '../utils/menus.js'
import { IconoDescarga, IconoFlecha, IconoImprimir } from './Iconos.jsx'

const FORMATOS = [
  { valor: 'excel', texto: 'Excel (.xlsx)' },
  { valor: 'pdf', texto: 'PDF' },
]

/**
 * Menú "Exportar" (Excel o PDF) y botón "Imprimir", en la consulta y en la ficha. El menú queda
 * completo en la pantalla (encajarMenu, como los demás) y se cierra con Esc o con un clic fuera.
 * onExportar recibe 'excel' o 'pdf'; generando es el formato que se está generando, o null.
 */
export default function BotonesExportar({ onExportar, generando, deshabilitado, chico, id }) {
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef(null)
  const boton = useRef(null)
  const menu = useRef(null)
  const clase = `boton ${chico ? 'boton--chico ' : ''}`

  useLayoutEffect(() => {
    if (!abierto) return undefined
    const encajar = () => encajarMenu(menu.current)
    encajar()
    menu.current?.querySelector('button')?.focus()
    window.addEventListener('resize', encajar)
    return () => window.removeEventListener('resize', encajar)
  }, [abierto])

  // Esc se atiende antes que el de la ficha (fase de captura): cierra el menú, no la ficha.
  useEffect(() => {
    if (!abierto) return undefined
    const alHacerClic = (e) => !contenedor.current?.contains(e.target) && setAbierto(false)
    const alTeclear = (e) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setAbierto(false)
      boton.current?.focus()
    }
    document.addEventListener('mousedown', alHacerClic)
    document.addEventListener('keydown', alTeclear, true)
    return () => {
      document.removeEventListener('mousedown', alHacerClic)
      document.removeEventListener('keydown', alTeclear, true)
    }
  }, [abierto])

  const elegir = (formato) => {
    setAbierto(false)
    boton.current?.focus()
    onExportar(formato)
  }

  return (
    <div className="botones-exportar">
      <div className="menu-exportar" ref={contenedor}>
        <button
          type="button"
          className={`${clase}boton--primario`}
          ref={boton}
          aria-expanded={abierto}
          aria-controls={`${id}-menu`}
          onClick={() => setAbierto((a) => !a)}
          disabled={deshabilitado || generando !== null}
        >
          <IconoDescarga />
          {generando ? `Generando ${generando === 'pdf' ? 'PDF' : 'Excel'}…` : 'Exportar'}
          <IconoFlecha direccion={abierto ? 'arriba' : 'abajo'} />
        </button>
        {abierto && (
          <div className="menu-exportar__menu" id={`${id}-menu`} ref={menu}>
            {FORMATOS.map((f) => (
              <button key={f.valor} type="button" className="menu-exportar__opcion" onClick={() => elegir(f.valor)}>
                {f.texto}
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="button" className={`${clase}boton--contorno`} onClick={() => window.print()} disabled={deshabilitado}>
        <IconoImprimir />
        Imprimir
      </button>
    </div>
  )
}
