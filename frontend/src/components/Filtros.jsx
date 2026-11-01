import { useEffect, useState } from 'react'
import SelectorMultiple from './SelectorMultiple.jsx'

const VERSIONES = [
  { valor: '11', texto: 'TRD 11', detalle: 'vigente' },
  { valor: '10', texto: 'TRD 10', detalle: '2020' },
]

/** Panel de filtros en cascada (issue #43): TRD única, el resto de selección múltiple, año en botones. */
export default function Filtros({ estado, opciones, onCambiar, onLimpiar, hayFiltros }) {
  const [texto, setTexto] = useState(estado.texto)
  const [textoAplicado, setTextoAplicado] = useState(estado.texto)

  // Si la búsqueda cambia desde afuera (por ejemplo, "Limpiar filtros"), el campo la sigue.
  if (estado.texto !== textoAplicado) {
    setTextoAplicado(estado.texto)
    setTexto(estado.texto)
  }

  // Busca 300 ms después de la última tecla.
  useEffect(() => {
    if (texto === estado.texto) return undefined
    const espera = setTimeout(() => onCambiar('texto', texto), 300)
    return () => clearTimeout(espera)
  }, [texto, estado.texto, onCambiar])

  const alternarAnio = (anio) =>
    onCambiar('anios', estado.anios.includes(anio) ? estado.anios.filter((a) => a !== anio) : [...estado.anios, anio])

  return (
    <aside className="filtros" aria-label="Filtros">
      <h2 className="filtros__titulo">Filtros</h2>

      <fieldset className="segmentado">
        <legend className="campo__etiqueta">Tabla de retención</legend>
        <div className="segmentado__opciones">
          {VERSIONES.map((v) => (
            <label key={v.valor} className={estado.trd === v.valor ? 'segmentado__opcion activa' : 'segmentado__opcion'}>
              <input
                type="radio"
                name="trd"
                value={v.valor}
                checked={estado.trd === v.valor}
                onChange={() => onCambiar('trd', v.valor)}
              />
              <span>
                {v.texto} <small>· {v.detalle}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="ayuda">En los demás filtros se puede elegir uno o varios valores.</p>

      <SelectorMultiple
        etiqueta="Centro"
        opciones={opciones.centros}
        seleccion={estado.centros}
        onCambiar={(v) => onCambiar('centros', v)}
        todos="Todos los centros"
        plural="centros"
      />
      <SelectorMultiple
        etiqueta="Dependencia"
        opciones={opciones.dependencias}
        seleccion={estado.dependencias}
        onCambiar={(v) => onCambiar('dependencias', v)}
        todos="Todas las dependencias"
        plural="dependencias"
      />
      <SelectorMultiple
        etiqueta="Serie"
        opciones={opciones.series}
        seleccion={estado.series}
        onCambiar={(v) => onCambiar('series', v)}
        todos="Todas las series"
        plural="series"
        conCodigo
      />
      <SelectorMultiple
        etiqueta="Subserie"
        opciones={opciones.subseries}
        seleccion={estado.subseries}
        onCambiar={(v) => onCambiar('subseries', v)}
        todos="Todas las subseries"
        plural="subseries"
        conCodigo
      />

      <div className="campo">
        <span className="campo__etiqueta" id="etiqueta-anio">
          Año de creación
        </span>
        <div className="anios" role="group" aria-labelledby="etiqueta-anio">
          {opciones.anios.map((a) => (
            <button
              key={a.valor}
              type="button"
              className="anio"
              aria-pressed={estado.anios.includes(a.valor)}
              onClick={() => alternarAnio(a.valor)}
            >
              {a.nombre}
            </button>
          ))}
          {opciones.anios.length === 0 && <span className="ayuda">Sin expedientes con estos filtros.</span>}
        </div>
      </div>

      <div className="campo">
        <label className="campo__etiqueta" htmlFor="buscar">
          Buscar
        </label>
        <input
          id="buscar"
          type="search"
          className="buscador"
          placeholder="Código o nombre"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </div>

      {(hayFiltros || texto) && (
        <button
          type="button"
          className="boton boton--texto"
          onClick={() => {
            // Vacía también lo escrito: así se cancela una búsqueda que aún no se había aplicado.
            setTexto('')
            onLimpiar()
          }}
        >
          Limpiar filtros
        </button>
      )}
    </aside>
  )
}
