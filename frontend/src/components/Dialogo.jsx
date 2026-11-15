import { useEffect, useRef } from 'react'
import { IconoCerrar } from './Iconos.jsx'

const ENFOCABLES = 'input:not([disabled]), button:not([disabled]), a[href]'

/**
 * Ventana modal: al abrir pone el foco en el primer campo, lo mantiene adentro con Tab,
 * se cierra con Esc o con la ×, y al cerrar devuelve el foco a donde estaba.
 */
export default function Dialogo({ id, titulo, descripcion, onCerrar, children }) {
  const caja = useRef(null)
  const cerrar = useRef(onCerrar)

  useEffect(() => {
    cerrar.current = onCerrar
  }, [onCerrar])

  useEffect(() => {
    const anterior = document.activeElement
    const primero = caja.current.querySelector('input') ?? caja.current.querySelector(ENFOCABLES)
    primero?.focus()

    const alTeclear = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        cerrar.current()
      } else if (e.key === 'Tab') {
        const enfocables = [...caja.current.querySelectorAll(ENFOCABLES)]
        if (enfocables.length === 0) return
        const [inicio, fin] = [enfocables[0], enfocables.at(-1)]
        if (e.shiftKey && document.activeElement === inicio) {
          e.preventDefault()
          fin.focus()
        } else if (!e.shiftKey && document.activeElement === fin) {
          e.preventDefault()
          inicio.focus()
        }
      }
    }
    document.addEventListener('keydown', alTeclear)
    return () => {
      document.removeEventListener('keydown', alTeclear)
      if (anterior?.isConnected) anterior.focus()
    }
  }, [])

  return (
    <div className="dialogo-fondo">
      <section
        className="dialogo"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={descripcion ? `${id}-descripcion` : undefined}
        ref={caja}
      >
        <header className="dialogo__encabezado">
          <div>
            <h2 id={`${id}-titulo`}>{titulo}</h2>
            {descripcion && (
              <p id={`${id}-descripcion`} className="dialogo__descripcion">
                {descripcion}
              </p>
            )}
          </div>
          <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
            <IconoCerrar tamano={20} />
          </button>
        </header>
        <div className="dialogo__cuerpo">{children}</div>
      </section>
    </div>
  )
}
