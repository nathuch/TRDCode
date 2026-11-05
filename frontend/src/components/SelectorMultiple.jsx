import { useEffect, useId, useRef } from 'react'
import { nombreLegible } from '../utils/formato.js'
import { IconoFlecha } from './Iconos.jsx'

/** Lista desplegable con casillas para elegir uno o varios valores. Sin selección muestra "Todas"/"Todos". */
export default function SelectorMultiple({ etiqueta, opciones, seleccion, onCambiar, todos, plural, conCodigo }) {
  const ref = useRef(null)
  const id = useId()

  // Se cierra al hacer clic fuera o con Escape.
  useEffect(() => {
    const cerrar = (evento) => {
      if (!ref.current?.open) return
      if (evento.type === 'keydown' ? evento.key === 'Escape' : !ref.current.contains(evento.target)) {
        ref.current.open = false
      }
    }
    document.addEventListener('click', cerrar)
    document.addEventListener('keydown', cerrar)
    return () => {
      document.removeEventListener('click', cerrar)
      document.removeEventListener('keydown', cerrar)
    }
  }, [])

  const elegidas = opciones.filter((o) => seleccion.includes(o.valor))
  let resumen = todos
  if (seleccion.length === 1) resumen = elegidas[0] ? texto(elegidas[0], conCodigo) : seleccion[0]
  else if (seleccion.length > 1) resumen = `${seleccion.length} ${plural}`

  const alternar = (valor) =>
    onCambiar(seleccion.includes(valor) ? seleccion.filter((v) => v !== valor) : [...seleccion, valor])

  return (
    <div className="campo">
      <span className="campo__etiqueta" id={id}>
        {etiqueta}
      </span>
      <details className="selector" ref={ref}>
        <summary aria-labelledby={id} className={seleccion.length ? 'selector__resumen activo' : 'selector__resumen'}>
          <span className="selector__texto">{resumen}</span>
          <IconoFlecha className="selector__flecha" />
        </summary>
        <div className="selector__lista" role="group" aria-labelledby={id}>
          {opciones.length === 0 && <p className="selector__vacio">No hay opciones con los filtros anteriores.</p>}
          {opciones.map((o) => (
            <label key={o.valor} className="selector__opcion">
              <input type="checkbox" checked={seleccion.includes(o.valor)} onChange={() => alternar(o.valor)} />
              <span>{texto(o, conCodigo)}</span>
            </label>
          ))}
          {seleccion.length > 0 && (
            <button type="button" className="selector__quitar" onClick={() => onCambiar([])}>
              Quitar selección
            </button>
          )}
        </div>
      </details>
    </div>
  )
}

function texto(opcion, conCodigo) {
  return conCodigo ? `${opcion.valor} · ${nombreLegible(opcion.nombre)}` : opcion.nombre
}
