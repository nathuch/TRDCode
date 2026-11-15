import { useEffect, useRef } from 'react'
import { enfocables, retenerFoco } from '../utils/foco.js'
import { IconoCerrar } from './Iconos.jsx'

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
    const primero = caja.current.querySelector('input') ?? enfocables(caja.current)[0]
    primero?.focus()

    const alTeclear = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        cerrar.current()
      } else {
        retenerFoco(e, caja.current)
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
