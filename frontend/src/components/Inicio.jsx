import { useState } from 'react'
import { ESTADO_INICIAL } from '../datos/filtros.js'
import { armarHash } from '../estadoUrl.js'
import { fechaLarga } from '../utils/formato.js'
import { IconoCalendario, IconoFlecha, IconoLupa } from './Iconos.jsx'
import SelectorTrd from './SelectorTrd.jsx'

// Orden de las tarjetas; un centro que no esté aquí va al final.
const ORDEN_CENTROS = ['73.9226', '73.9310', '73.9123']

/**
 * Pantalla de inicio: buscador, versión de la TRD y una tarjeta por centro. No muestra resultados
 * hasta que se busca o se elige qué ver. Las tarjetas y "Ver todas" son enlaces reales a la consulta
 * (se pueden abrir en otra pestaña); al hacer clic, onIr pasa a la consulta sin recargar.
 */
export default function Inicio({ trd, onCambiarTrd, centros, carga, error, onIr }) {
  const [texto, setTexto] = useState('')

  const ordenados = [...(centros ?? [])].sort((a, b) => posicion(a.codigo) - posicion(b.codigo))
  const destino = (cambios) => ({ ...ESTADO_INICIAL, trd, ...cambios })
  const enlace = (cambios) => ({
    href: `#${armarHash(destino(cambios))}`,
    onClick: (e) => {
      // Ctrl, Shift o la rueda abren en otra pestaña, como cualquier enlace.
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
      e.preventDefault()
      onIr(destino(cambios))
    },
  })

  const buscar = (e) => {
    e.preventDefault()
    const buscado = texto.trim()
    if (buscado) onIr(destino({ texto: buscado }))
  }

  return (
    <main className="contenedor inicio">
      <section className="inicio__busqueda" aria-labelledby="inicio-titulo">
        <h2 id="inicio-titulo" className="inicio__titulo" tabIndex={-1}>
          ¿Qué serie o subserie busca?
        </h2>
        <form className="inicio__formulario" role="search" onSubmit={buscar}>
          <div className="buscador buscador--grande">
            <IconoLupa tamano={22} className="buscador__icono" />
            <label htmlFor="inicio-buscar" className="solo-lector">
              Buscar por código o nombre
            </label>
            <input
              id="inicio-buscar"
              type="search"
              className="buscador__campo"
              placeholder="Código o nombre: 85.15, emprendimiento, actas…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
          <button type="submit" className="boton boton--primario inicio__buscar">
            Buscar
          </button>
        </form>
        <SelectorTrd valor={trd} onCambiar={onCambiarTrd} />
      </section>

      <section className="inicio__centros" aria-labelledby="inicio-centros">
        <h2 id="inicio-centros" className="inicio__subtitulo">
          O explore por centro de formación
        </h2>
        {error ? (
          <p className="aviso-error" role="alert">
            No se pudieron cargar los datos: {error} Revise que Apache y MySQL estén encendidos.
          </p>
        ) : !centros ? (
          <p className="vacio" role="status">
            Cargando centros…
          </p>
        ) : (
          <ul className="inicio__tarjetas">
            {ordenados.map((c) => (
              <li key={c.codigo}>
                <a className="tarjeta-centro" {...enlace({ centros: [c.codigo] })}>
                  <span className="tarjeta-centro__etiqueta">Centro</span>
                  <span className="tarjeta-centro__nombre">{c.nombre}</span>
                  <span className="tarjeta-centro__accion">
                    Ver series <IconoFlecha direccion="derecha" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <a className="inicio__todas" {...enlace({})}>
          Ver todas las series
        </a>
      </section>

      {carga && (
        <p className="inicio__fecha">
          <IconoCalendario />
          Datos al {fechaLarga(carga.fecha_reporte)}
        </p>
      )}
    </main>
  )
}

function posicion(codigo) {
  const i = ORDEN_CENTROS.indexOf(codigo)
  return i === -1 ? ORDEN_CENTROS.length : i
}
