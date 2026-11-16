import { useEffect, useRef, useState } from 'react'
import { ESTADOS } from '../datos/cruce.js'
import { retenerFoco } from '../utils/foco.js'
import {
  codigoFila,
  etiquetaAcceso,
  fechaCorta,
  formatoNumero,
  nombreFila,
  nombreLegible,
  textoClasificacion,
  textoSoporte,
} from '../utils/formato.js'
import BotonesExportar from './BotonesExportar.jsx'
import Disposicion from './Disposicion.jsx'
import { IconoCandado, IconoCerrar } from './Iconos.jsx'

const POR_PAGINA = 50
const TIPOS_VISIBLES = 20

const anios = (n) => (n === 1 ? '1 año' : `${n} años`)

/**
 * Ficha de una serie o subserie: panel lateral con los datos de la TRD y sus expedientes.
 * Al imprimir sale completa: todos los tipos documentales, el procedimiento y todos los expedientes
 * (no solo la página de 50 que se ve), con una línea de filtros y fecha de los datos (lineaImpresion).
 */
export default function Ficha({ fila, nombrePlantilla, nombreCentroDeDependencia, onCerrar, onExportar, generando, lineaImpresion }) {
  const cerrar = useRef(null)
  const panel = useRef(null)

  // Esc cierra; Tab no sale de la ficha. Al cerrar, App devuelve el foco a la fila que la abrió.
  useEffect(() => {
    cerrar.current?.focus()
    const alTeclear = (e) => {
      if (e.key === 'Escape') onCerrar()
      else retenerFoco(e, panel.current)
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  const { trd } = fila
  return (
    <div className="ficha-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <section className="ficha" role="dialog" aria-modal="true" aria-labelledby="ficha-titulo" ref={panel}>
        <header className="ficha__encabezado">
          <div className="ficha__titulos">
            <p className="solo-impresion impresion-cabecera__marca">TRDCode · SENA Regional Tolima</p>
            <p className="ficha__dependencia">
              {nombrePlantilla(fila.plantilla)} · TRD {fila.version}
              {fila.codigo_subserie && ` · Serie ${fila.codigo_serie} ${nombreLegible(fila.nombre_serie)}`}
            </p>
            <h2 id="ficha-titulo">
              <span className="ficha__codigo">{codigoFila(fila)}</span> {nombreLegible(nombreFila(fila))}
            </h2>
            <p className="ficha__cantidad">
              {formatoNumero(fila.cantidad)} {fila.cantidad === 1 ? 'expediente' : 'expedientes'}
            </p>
            <p className="solo-impresion impresion-cabecera__linea">{lineaImpresion}</p>
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
                <>
                  <details className="ficha__procedimiento solo-pantalla">
                    <summary>Ver el procedimiento de la TRD</summary>
                    <p>{trd.procedimiento}</p>
                  </details>
                  <section className="ficha__seccion solo-impresion">
                    <h3>Procedimiento</h3>
                    <p>{trd.procedimiento}</p>
                  </section>
                </>
              )}
            </>
          )}

          <section className="ficha__seccion">
            <div className="ficha__seccion-encabezado">
              <h3>Expedientes ({formatoNumero(fila.cantidad)})</h3>
              <BotonesExportar id="exportar-ficha" chico onExportar={onExportar} generando={generando} />
            </div>
            <Expedientes key={fila.llave} expedientes={fila.expedientes} centroDe={nombreCentroDeDependencia} />
          </section>
        </div>
      </section>
    </div>
  )
}

/**
 * Tipos documentales en orden, bajo su subtítulo (grupo) cuando lo tienen. En pantalla se ven los
 * primeros 20 hasta pedir los demás; al imprimir salen todos.
 */
function TiposDocumentales({ tipos }) {
  const [todos, setTodos] = useState(false)
  if (tipos.length === 0) return <p className="texto-suave">Sin tipos documentales.</p>
  const grupos = []
  tipos.forEach((tipo, i) => {
    if (!grupos.length || grupos.at(-1).grupo !== tipo.grupo) grupos.push({ grupo: tipo.grupo, tipos: [], desde: i })
    grupos.at(-1).tipos.push(tipo.nombre)
  })
  const oculto = (i) => !todos && i >= TIPOS_VISIBLES
  return (
    <>
      {grupos.map((g, i) => (
        <div key={i} className={oculto(g.desde) ? 'tipos solo-impresion' : 'tipos'}>
          {g.grupo && <p className="tipos__grupo">{g.grupo}</p>}
          <ul>
            {g.tipos.map((t, j) => (
              <li key={j} className={oculto(g.desde + j) ? 'solo-impresion' : undefined}>
                {t}
              </li>
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

  const lista = (items, clase) => (
    <ul className={clase}>
      {items.map((e) => {
        const reservado = e.control_acceso !== 'IPU'
        return (
          <li key={e.codigo} className="expediente">
            <span className="expediente__codigo">{e.codigo}</span>
            <span className={reservado ? 'expediente__nombre reservado' : 'expediente__nombre'}>
              {e.nombre}
              {variosCentros && <span className="expediente__centro">{centroDe(e.codigo_dependencia)}</span>}
            </span>
            <span className={reservado ? 'etiqueta-acceso etiqueta-acceso--restringida' : 'etiqueta-acceso'}>
              <span className="solo-lector">Control de acceso: </span>
              {reservado && <IconoCandado tamano={12} />}
              {etiquetaAcceso(e.control_acceso)}
            </span>
            <span className="expediente__fecha">{fechaCorta(e.fecha_creacion)}</span>
          </li>
        )
      })}
    </ul>
  )

  return (
    <>
      {lista(visibles, paginas > 1 ? 'expedientes solo-pantalla' : 'expedientes')}
      {/* Al imprimir, todos los expedientes; en pantalla no se muestra (display: none). */}
      {paginas > 1 && lista(expedientes, 'expedientes solo-impresion')}
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
