import { useEffect, useState } from 'react'
import { nombreLegible } from '../utils/formato.js'
import { IconoCerrar, IconoFiltros, IconoFlecha, IconoLupa } from './Iconos.jsx'
import SelectorMultiple from './SelectorMultiple.jsx'

const VERSIONES = [
  { valor: '11', texto: 'TRD 11', detalle: 'vigente' },
  { valor: '10', texto: 'TRD 10', detalle: '2020' },
]
const LISTAS = ['centros', 'dependencias', 'series', 'subseries', 'anios']

/**
 * Barra de consulta: buscador, versión de la TRD, panel de filtros en cascada que se pliega
 * y etiquetas de lo que se está consultando, cada una con su botón para quitarla.
 */
export default function BarraConsulta({ estado, opciones, onCambiar, onLimpiar, nombreCentro, nombrePlantilla }) {
  const [texto, setTexto] = useState(estado.texto)
  const [textoAplicado, setTextoAplicado] = useState(estado.texto)
  const [panelAbierto, setPanelAbierto] = useState(true)

  // Si la búsqueda cambia desde afuera (una etiqueta o "Limpiar filtros"), el campo la sigue.
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

  const activos = LISTAS.reduce((suma, campo) => suma + estado[campo].length, 0)
  const limpiar = () => {
    // Vacía también lo escrito: así se cancela una búsqueda que aún no se había aplicado.
    setTexto('')
    onLimpiar()
  }
  const quitar = (campo, valor) => onCambiar(campo, estado[campo].filter((v) => v !== valor))
  const alternarAnio = (anio) =>
    onCambiar('anios', estado.anios.includes(anio) ? estado.anios.filter((a) => a !== anio) : [...estado.anios, anio])

  const nombreDe = (lista, valor) => {
    const opcion = lista.find((o) => o.valor === valor)
    return opcion ? `${valor} ${nombreLegible(opcion.nombre)}` : valor
  }
  const etiquetas = [
    ...estado.centros.map((v) => ({ campo: 'centros', valor: v, texto: nombreCentro(v) })),
    ...estado.dependencias.map((v) => ({ campo: 'dependencias', valor: v, texto: nombrePlantilla(v) })),
    ...estado.series.map((v) => ({ campo: 'series', valor: v, texto: nombreDe(opciones.series, v) })),
    ...estado.subseries.map((v) => ({ campo: 'subseries', valor: v, texto: nombreDe(opciones.subseries, v) })),
    ...estado.anios.map((v) => ({ campo: 'anios', valor: v, texto: `Año ${v}` })),
  ]

  return (
    <div className="consulta">
      <div className="consulta__barra">
        <div className="buscador">
          <IconoLupa tamano={20} className="buscador__icono" />
          <label htmlFor="buscar" className="solo-lector">
            Buscar por código o nombre
          </label>
          <input
            id="buscar"
            type="search"
            className="buscador__campo"
            placeholder="Buscar por código o nombre: 85.15, emprendimiento, actas…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>

        <fieldset className="segmentado">
          <legend className="solo-lector">Versión de la tabla de retención</legend>
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
                <strong>{v.texto}</strong> · <span className="segmentado__detalle">{v.detalle}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <button
          type="button"
          className="boton boton--contorno boton-filtros"
          aria-expanded={panelAbierto}
          aria-controls="panel-filtros"
          onClick={() => setPanelAbierto(!panelAbierto)}
        >
          <IconoFiltros tamano={18} />
          Filtros
          {activos > 0 && (
            <span className="contador contador--oscuro" aria-label={`${activos} activos`}>
              {activos}
            </span>
          )}
          <IconoFlecha direccion={panelAbierto ? 'arriba' : 'abajo'} />
        </button>
      </div>

      {panelAbierto && (
        <div className="panel-filtros" id="panel-filtros">
          <div className="panel-filtros__campos">
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
              <div className="pildoras" role="group" aria-labelledby="etiqueta-anio">
                <button
                  type="button"
                  className="pildora"
                  aria-pressed={estado.anios.length === 0}
                  onClick={() => onCambiar('anios', [])}
                >
                  Todos
                </button>
                {opciones.anios.map((a) => (
                  <button
                    key={a.valor}
                    type="button"
                    className="pildora"
                    aria-pressed={estado.anios.includes(a.valor)}
                    onClick={() => alternarAnio(a.valor)}
                  >
                    {a.nombre}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="panel-filtros__pie">
            <p className="ayuda">
              Cada filtro solo muestra opciones que existen con los anteriores. Se puede elegir uno o varios valores.
            </p>
            <div className="panel-filtros__acciones">
              <button type="button" className="boton boton--enlace" onClick={limpiar}>
                Limpiar filtros
              </button>
              <button type="button" className="boton boton--contorno-gris" onClick={() => setPanelAbierto(false)}>
                Ocultar filtros
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="consultando">
        <span className="consultando__titulo">Consultando:</span>
        <span className="etiqueta-filtro etiqueta-filtro--trd">TRD {estado.trd}</span>
        {etiquetas.map((e) => (
          <span key={`${e.campo}-${e.valor}`} className="etiqueta-filtro">
            {e.texto}
            <button
              type="button"
              className="etiqueta-filtro__quitar"
              aria-label={`Quitar ${e.texto}`}
              onClick={() => quitar(e.campo, e.valor)}
            >
              <IconoCerrar tamano={12} />
            </button>
          </span>
        ))}
        {estado.texto && (
          <span className="etiqueta-filtro">
            “{estado.texto}”
            <button
              type="button"
              className="etiqueta-filtro__quitar"
              aria-label={`Quitar la búsqueda ${estado.texto}`}
              onClick={() => onCambiar('texto', '')}
            >
              <IconoCerrar tamano={12} />
            </button>
          </span>
        )}
      </div>
    </div>
  )
}
