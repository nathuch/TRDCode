import { useEffect, useRef, useState } from 'react'
import { ESTADOS } from '../datos/cruce.js'
import {
  codigoFila,
  fechaCorta,
  formatoNumero,
  nombreFila,
  nombreLegible,
  textoAcceso,
  textoClasificacion,
  textoSoporte,
} from '../utils/formato.js'
import Disposicion from './Disposicion.jsx'
import { IconoCandado, IconoCerrar, IconoDescarga } from './Iconos.jsx'

const POR_PAGINA = 50
const TIPOS_VISIBLES = 20

const anios = (n) => (n === 1 ? '1 año' : `${n} años`)

/** Ficha de una serie o subserie: panel lateral con los datos de la TRD y sus expedientes. */
export default function Ficha({ fila, nombrePlantilla, nombreCentroDeDependencia, onCerrar, onExportar, exportando }) {
  const cerrar = useRef(null)

  useEffect(() => {
    cerrar.current?.focus()
    const conEscape = (e) => e.key === 'Escape' && onCerrar()
    document.addEventListener('keydown', conEscape)
    return () => document.removeEventListener('keydown', conEscape)
  }, [onCerrar])

  const { trd } = fila
  return (
    <div className="ficha-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <section className="ficha" role="dialog" aria-modal="true" aria-labelledby="ficha-titulo">
        <header className="ficha__encabezado">
          <div className="ficha__titulos">
            <p className="ficha__dependencia">
              {nombrePlantilla(fila.plantilla)} · TRD {fila.version}
              {fila.codigo_subserie && ` · Serie ${fila.codigo_serie} ${nombreLegible(fila.nombre_serie)}`}
            </p>
            <h2 id="ficha-titulo">
              <span className="ficha__codigo">{codigoFila(fila)}</span> {nombreLegible(nombreFila(fila))}
            </h2>
          </div>
          <button type="button" className="boton-icono" ref={cerrar} onClick={onCerrar} aria-label="Cerrar la ficha">
            <IconoCerrar tamano={20} />
          </button>
        </header>

        <div className="ficha__cuerpo">
          {fila.estado === ESTADOS.FUERA ? (
            <p className="aviso-ambar">
              Este código está en el reporte de OnBase pero no aparece en la TRD {fila.version} de{' '}
              {nombrePlantilla(fila.plantilla)}. Se muestra con el nombre que trae el reporte.
            </p>
          ) : (
            <>
              <div className="ficha__tarjetas">
                <div className="tarjeta-dato">
                  <span className="tarjeta-dato__titulo">Retención</span>
                  <span className="tarjeta-dato__valor">
                    {trd.retencion_ag != null && trd.retencion_ac != null
                      ? `${anios(trd.retencion_ag + trd.retencion_ac)} en total`
                      : '—'}
                  </span>
                  <span className="tarjeta-dato__detalle">
                    {trd.retencion_ag ?? '—'} {trd.retencion_ag === 1 ? 'año' : 'años'} en gestión +{' '}
                    {trd.retencion_ac ?? '—'} en archivo central
                  </span>
                </div>
                <div className="tarjeta-dato">
                  <span className="tarjeta-dato__titulo">Disposición final</span>
                  <span className="tarjeta-dato__valor">
                    <Disposicion codigos={trd.disposicion} />
                  </span>
                  <span className="tarjeta-dato__detalle">
                    Soporte: {textoSoporte(trd.soporte)}
                    {trd.clasificacion.length > 0 && (
                      <>
                        <br />
                        {textoClasificacion(trd.clasificacion)}
                      </>
                    )}
                  </span>
                </div>
              </div>

              {trd.inicio_retencion && (
                <section className="ficha__seccion">
                  <h3>Cuándo empieza a contar</h3>
                  <p>{trd.inicio_retencion}</p>
                </section>
              )}

              <section className="ficha__seccion">
                <h3>Tipos documentales ({formatoNumero(trd.tipos.length)})</h3>
                <TiposDocumentales tipos={trd.tipos} />
              </section>

              {trd.procedimiento && (
                <details className="ficha__procedimiento">
                  <summary>Ver el procedimiento de la TRD</summary>
                  <p>{trd.procedimiento}</p>
                </details>
              )}
            </>
          )}

          <section className="ficha__seccion">
            <div className="ficha__seccion-encabezado">
              <h3>Expedientes ({formatoNumero(fila.cantidad)})</h3>
              <button type="button" className="boton boton--primario boton--chico" onClick={onExportar} disabled={exportando}>
                <IconoDescarga />
                {exportando ? 'Generando…' : 'Exportar a Excel'}
              </button>
            </div>
            <Expedientes key={fila.llave} expedientes={fila.expedientes} centroDe={nombreCentroDeDependencia} />
          </section>
        </div>
      </section>
    </div>
  )
}

/** Tipos documentales en orden, bajo su subtítulo (grupo) cuando lo tienen. */
function TiposDocumentales({ tipos }) {
  const [todos, setTodos] = useState(false)
  if (tipos.length === 0) return <p className="texto-suave">Sin tipos documentales.</p>
  const visibles = todos ? tipos : tipos.slice(0, TIPOS_VISIBLES)
  const grupos = []
  for (const tipo of visibles) {
    if (!grupos.length || grupos.at(-1).grupo !== tipo.grupo) grupos.push({ grupo: tipo.grupo, tipos: [] })
    grupos.at(-1).tipos.push(tipo.nombre)
  }
  return (
    <>
      {grupos.map((g, i) => (
        <div key={i} className="tipos">
          {g.grupo && <p className="tipos__grupo">{g.grupo}</p>}
          <ul>
            {g.tipos.map((t, j) => (
              <li key={j}>{t}</li>
            ))}
          </ul>
        </div>
      ))}
      {tipos.length > TIPOS_VISIBLES && (
        <button type="button" className="boton boton--enlace" onClick={() => setTodos(!todos)}>
          {todos ? 'Ver menos' : `Ver los ${formatoNumero(tipos.length)} tipos documentales`}
        </button>
      )}
    </>
  )
}

/** Listado de expedientes, del más reciente al más antiguo, en páginas de 50. */
function Expedientes({ expedientes, centroDe }) {
  const [pagina, setPagina] = useState(0)
  if (expedientes.length === 0) return <p className="texto-suave">No hay expedientes con los filtros elegidos.</p>
  const paginas = Math.ceil(expedientes.length / POR_PAGINA)
  const desde = pagina * POR_PAGINA
  const visibles = expedientes.slice(desde, desde + POR_PAGINA)
  const variosCentros = new Set(expedientes.map((e) => centroDe(e.codigo_dependencia))).size > 1

  return (
    <>
      <ul className="expedientes">
        {visibles.map((e) => {
          const reservado = e.control_acceso !== 'IPU'
          return (
            <li key={e.codigo} className="expediente">
              <span className="expediente__codigo">{e.codigo}</span>
              <span className={reservado ? 'expediente__nombre reservado' : 'expediente__nombre'}>
                {reservado && <IconoCandado tamano={14} />}
                {e.nombre}
                {reservado && <span className="solo-lector"> (acceso {textoAcceso(e.control_acceso).toLowerCase()})</span>}
                {variosCentros && <span className="expediente__centro">{centroDe(e.codigo_dependencia)}</span>}
              </span>
              <span className="expediente__fecha">{fechaCorta(e.fecha_creacion)}</span>
            </li>
          )
        })}
      </ul>
      {paginas > 1 && (
        <nav className="paginacion" aria-label="Páginas de expedientes">
          <button type="button" className="boton boton--contorno-gris" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>
            Anteriores
          </button>
          <span>
            {desde + 1}–{Math.min(desde + POR_PAGINA, expedientes.length)} de {formatoNumero(expedientes.length)}
          </span>
          <button
            type="button"
            className="boton boton--contorno-gris"
            disabled={pagina >= paginas - 1}
            onClick={() => setPagina(pagina + 1)}
          >
            Siguientes
          </button>
        </nav>
      )}
    </>
  )
}
