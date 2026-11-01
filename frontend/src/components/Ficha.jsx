import { useEffect, useRef, useState } from 'react'
import { ESTADOS } from '../datos/cruce.js'
import {
  codigoFila,
  fechaCorta,
  formatoNumero,
  nombreFila,
  textoAcceso,
  textoClasificacion,
  textoDisposicion,
  textoRetencion,
  textoSoporte,
} from '../utils/formato.js'

const POR_PAGINA = 50
const TIPOS_VISIBLES = 20

/** Ficha de una serie o subserie (issue #49): datos de la TRD y listado de expedientes. */
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
          <div>
            <p className="ficha__dependencia">
              {nombrePlantilla(fila.plantilla)} · TRD {fila.version}
            </p>
            <h2 id="ficha-titulo">
              {codigoFila(fila)} {nombreFila(fila)}
            </h2>
          </div>
          <span className="etiqueta etiqueta--cantidad">{formatoNumero(fila.cantidad)} expedientes</span>
          <button type="button" className="boton boton--texto" ref={cerrar} onClick={onCerrar}>
            Cerrar
          </button>
        </header>

        <div className="ficha__cuerpo">
          <div className="ficha__datos">
            {fila.estado === ESTADOS.FUERA ? (
              <p className="aviso aviso--fuera">
                Este código está en el reporte de OnBase pero no aparece en la TRD {fila.version} de{' '}
                {nombrePlantilla(fila.plantilla)}. Se muestra con el nombre que trae el reporte.
              </p>
            ) : (
              <DatosTrd fila={fila} trd={trd} />
            )}
          </div>

          <aside className="ficha__acciones">
            <h3>Sacar lo que ves</h3>
            <button type="button" className="boton boton--primario" onClick={onExportar} disabled={exportando}>
              {exportando ? 'Generando…' : 'Exportar a Excel'}
            </button>
            <p className="ayuda">Incluye esta serie o subserie y sus {formatoNumero(fila.cantidad)} expedientes.</p>
          </aside>
        </div>

        <Expedientes key={fila.llave} expedientes={fila.expedientes} centroDe={nombreCentroDeDependencia} />
      </section>
    </div>
  )
}

function DatosTrd({ fila, trd }) {
  return (
    <dl className="datos">
      {fila.codigo_subserie && (
        <>
          <dt>Serie</dt>
          <dd>
            {fila.codigo_serie} {fila.nombre_serie}
          </dd>
        </>
      )}
      <dt>Retención</dt>
      <dd>
        {textoRetencion(trd.retencion_ag, trd.retencion_ac)}
        {trd.inicio_retencion && <span className="datos__nota">{trd.inicio_retencion}</span>}
      </dd>
      <dt>Disposición final</dt>
      <dd>{textoDisposicion(trd.disposicion)}</dd>
      {trd.clasificacion.length > 0 && (
        <>
          <dt>Clasificación</dt>
          <dd>{textoClasificacion(trd.clasificacion)}</dd>
        </>
      )}
      <dt>Soporte</dt>
      <dd>{textoSoporte(trd.soporte)}</dd>
      <dt>Tipos documentales</dt>
      <dd>
        <TiposDocumentales tipos={trd.tipos} />
      </dd>
      {trd.procedimiento && (
        <>
          <dt>Procedimiento</dt>
          <dd>
            <details>
              <summary>Ver el procedimiento de la TRD</summary>
              <p className="datos__procedimiento">{trd.procedimiento}</p>
            </details>
          </dd>
        </>
      )}
    </dl>
  )
}

/** Tipos documentales en orden, bajo su subtítulo (grupo) cuando lo tienen. */
function TiposDocumentales({ tipos }) {
  const [todos, setTodos] = useState(false)
  if (tipos.length === 0) return <span>—</span>
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
        <button type="button" className="boton boton--texto" onClick={() => setTodos(!todos)}>
          {todos ? 'Ver menos' : `Ver los ${formatoNumero(tipos.length)} tipos documentales`}
        </button>
      )}
    </>
  )
}

/** Listado de expedientes, del más reciente al más antiguo, en páginas de 50. */
function Expedientes({ expedientes, centroDe }) {
  const [pagina, setPagina] = useState(0)
  const paginas = Math.max(1, Math.ceil(expedientes.length / POR_PAGINA))
  const desde = pagina * POR_PAGINA
  const visibles = expedientes.slice(desde, desde + POR_PAGINA)
  const variosCentros = new Set(expedientes.map((e) => centroDe(e.codigo_dependencia))).size > 1

  return (
    <div className="ficha__expedientes">
      <h3>Expedientes</h3>
      {expedientes.length === 0 ? (
        <p className="vacio">No hay expedientes con los filtros elegidos.</p>
      ) : (
        <>
          <div className="tabla-caja">
            <table className="tabla tabla--compacta">
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Nombre</th>
                  <th scope="col">Fecha de creación</th>
                  <th scope="col">Acceso</th>
                  {variosCentros && <th scope="col">Centro</th>}
                </tr>
              </thead>
              <tbody>
                {visibles.map((e) => (
                  <tr key={e.codigo}>
                    <td className="nowrap">{e.codigo}</td>
                    <td className={e.control_acceso === 'IPU' ? '' : 'reservado'}>{e.nombre}</td>
                    <td className="nowrap">{fechaCorta(e.fecha_creacion)}</td>
                    <td>{textoAcceso(e.control_acceso)}</td>
                    {variosCentros && <td>{centroDe(e.codigo_dependencia)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {paginas > 1 && (
            <nav className="paginacion" aria-label="Páginas de expedientes">
              <button type="button" className="boton" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>
                Anteriores
              </button>
              <span>
                {desde + 1}–{Math.min(desde + POR_PAGINA, expedientes.length)} de {formatoNumero(expedientes.length)}
              </span>
              <button
                type="button"
                className="boton"
                disabled={pagina >= paginas - 1}
                onClick={() => setPagina(pagina + 1)}
              >
                Siguientes
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
