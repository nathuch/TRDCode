import { Fragment, useState } from 'react'
import { ESTADOS } from '../datos/cruce.js'
import { agrupar, enBloques, enSecciones } from '../utils/agrupar.js'
import { codigoFila, ETIQUETA_ESTADO, formatoNumero, nombreFila, nombreLegible, retencionCorta } from '../utils/formato.js'
import Disposicion from './Disposicion.jsx'
import { IconoFlecha } from './Iconos.jsx'

/**
 * Series y subseries como en la TRD. Una serie con subseries es una fila de grupo que se
 * pliega, con su total; una serie sin subseries es una fila normal. Si lo filtrado abarca
 * varias dependencias, cada una va en su propia sección. Toda la fila abre la ficha.
 * En pantallas angostas cada fila se muestra como tarjeta (styles.css), sin desplazamiento lateral;
 * data-etiqueta da el rótulo de cada dato en la tarjeta.
 */
export default function TablaResultados({ filas, nombrePlantilla, onAbrir, fichaAbierta }) {
  const [plegados, setPlegados] = useState(() => new Set())

  if (filas.length === 0) {
    return <p className="vacio">No hay series ni subseries en esta vista.</p>
  }
  const maximo = Math.max(1, ...filas.map((f) => f.cantidad))
  const secciones = enSecciones(filas)
  const conSecciones = secciones.length > 1

  const alternar = (clave) =>
    setPlegados((actual) => {
      const nuevo = new Set(actual)
      if (nuevo.has(clave)) nuevo.delete(clave)
      else nuevo.add(clave)
      return nuevo
    })

  return (
    <div className="tabla-caja">
      <table className="tabla tabla--resultados">
        <thead>
          <tr>
            <th scope="col" className="col-codigo">
              Código
            </th>
            <th scope="col">Serie / subserie</th>
            <th scope="col" className="col-retencion">
              Retención
            </th>
            <th scope="col" className="col-disposicion">
              Disposición final
            </th>
            <th scope="col" className="col-expedientes">
              Expedientes
            </th>
            <th scope="col" className="col-accion">
              <span className="solo-lector">Abrir</span>
            </th>
          </tr>
        </thead>
        {/* Cada grupo de serie va en su propio tbody para que al imprimir no se corte entre páginas. */}
        {secciones.map((seccion) => (
          <Fragment key={seccion.plantilla}>
            {conSecciones && (
              <tbody className="tabla__cabeza-seccion">
                <tr className="tabla__seccion">
                  <th colSpan={6} scope="colgroup">
                    {nombrePlantilla(seccion.plantilla)}
                  </th>
                </tr>
              </tbody>
            )}
            {enBloques(agrupar(seccion.filas)).map((bloque) =>
              bloque.grupo ? (
                <Grupo
                  key={`g-${bloque.grupo.codigo}`}
                  grupo={bloque.grupo}
                  plegado={plegados.has(`${seccion.plantilla}|${bloque.grupo.codigo}`)}
                  onAlternar={() => alternar(`${seccion.plantilla}|${bloque.grupo.codigo}`)}
                  maximo={maximo}
                  onAbrir={onAbrir}
                  fichaAbierta={fichaAbierta}
                />
              ) : (
                <tbody key={`s-${bloque.sueltas[0].llave}`} className="tabla__sueltas">
                  {bloque.sueltas.map((f) => (
                    <Fila key={f.llave} fila={f} maximo={maximo} onAbrir={onAbrir} abierta={f.llave === fichaAbierta} />
                  ))}
                </tbody>
              ),
            )}
          </Fragment>
        ))}
      </table>
    </div>
  )
}

function Grupo({ grupo, plegado, onAlternar, maximo, onAbrir, fichaAbierta }) {
  const { total } = grupo
  const n = grupo.filas.length
  return (
    <tbody className="tabla__bloque">
      <tr className="tabla__grupo" onClick={onAlternar}>
        <td className="col-codigo">{grupo.codigo}</td>
        <td colSpan={2} className="celda-nombre">
          <button
            type="button"
            className="fila__boton"
            aria-expanded={!plegado}
            onClick={(e) => {
              e.stopPropagation()
              onAlternar()
            }}
          >
            {grupo.nombre}
          </button>
        </td>
        <td className="texto-suave celda-subseries">
          {n} {n === 1 ? 'subserie' : 'subseries'}
        </td>
        <td className="col-expedientes" data-etiqueta="Expedientes">
          <strong>{total > 0 ? formatoNumero(total) : '—'}</strong>
        </td>
        <td className="col-accion">
          <IconoFlecha direccion={plegado ? 'derecha' : 'abajo'} />
        </td>
      </tr>
      {!plegado &&
        grupo.filas.map((f) => (
          <Fila key={f.llave} fila={f} maximo={maximo} onAbrir={onAbrir} abierta={f.llave === fichaAbierta} subserie />
        ))}
    </tbody>
  )
}

function Fila({ fila, maximo, onAbrir, abierta, subserie }) {
  const conExpedientes = fila.cantidad > 0
  const clases = ['tabla__fila', subserie ? 'tabla__fila--subserie' : '', conExpedientes ? 'con' : 'sin', abierta ? 'abierta' : '']
  return (
    <tr className={clases.join(' ')} onClick={() => onAbrir(fila.llave)} data-llave={fila.llave}>
      <td className="col-codigo">{codigoFila(fila)}</td>
      <td className="celda-nombre">
        <button
          type="button"
          className="fila__boton"
          onClick={(e) => {
            e.stopPropagation()
            onAbrir(fila.llave)
          }}
        >
          {nombreLegible(nombreFila(fila))}
        </button>
      </td>
      <td className="col-retencion" data-etiqueta="Retención">
        {fila.trd ? retencionCorta(fila.trd.retencion_ag, fila.trd.retencion_ac) : '—'}
      </td>
      <td className="col-disposicion" data-etiqueta="Disposición">
        {fila.estado === ESTADOS.FUERA ? (
          <span className="disp disp--fuera">{ETIQUETA_ESTADO.fuera}</span>
        ) : (
          <Disposicion codigos={fila.trd?.disposicion} />
        )}
      </td>
      <td className="col-expedientes" data-etiqueta="Expedientes">
        {conExpedientes ? (
          <span className="cantidad">
            <span className="barra" aria-hidden="true">
              <span className="barra__relleno" style={{ width: `${Math.max(3, (fila.cantidad / maximo) * 100)}%` }} />
            </span>
            <strong>{formatoNumero(fila.cantidad)}</strong>
          </span>
        ) : (
          <span className="texto-suave">{ETIQUETA_ESTADO[fila.estado]}</span>
        )}
      </td>
      <td className="col-accion">
        <IconoFlecha direccion="derecha" />
      </td>
    </tr>
  )
}
