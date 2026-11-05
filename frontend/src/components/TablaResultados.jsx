import { useState } from 'react'
import { ESTADOS } from '../datos/cruce.js'
import { codigoFila, ETIQUETA_ESTADO, formatoNumero, nombreFila, nombreLegible, retencionCorta } from '../utils/formato.js'
import Disposicion from './Disposicion.jsx'
import { IconoFlecha } from './Iconos.jsx'

/**
 * Series y subseries como en la TRD. Una serie con subseries es una fila de grupo que se
 * pliega, con su total; una serie sin subseries es una fila normal. Si lo filtrado abarca
 * varias dependencias, cada una va en su propia sección. Toda la fila abre la ficha.
 */
export default function TablaResultados({ filas, nombrePlantilla, onAbrir, fichaAbierta }) {
  const [plegados, setPlegados] = useState(() => new Set())

  if (filas.length === 0) {
    return <p className="vacio">No hay series ni subseries en esta vista.</p>
  }
  const maximo = Math.max(1, ...filas.map((f) => f.cantidad))
  const secciones = []
  for (const fila of filas) {
    if (secciones.at(-1)?.plantilla !== fila.plantilla) secciones.push({ plantilla: fila.plantilla, filas: [] })
    secciones.at(-1).filas.push(fila)
  }
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
      <table className="tabla">
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
        {secciones.map((seccion) => (
          <tbody key={seccion.plantilla}>
            {conSecciones && (
              <tr className="tabla__seccion">
                <th colSpan={6} scope="colgroup">
                  {nombrePlantilla(seccion.plantilla)}
                </th>
              </tr>
            )}
            {agrupar(seccion.filas).map((item) =>
              item.grupo ? (
                <Grupo
                  key={`${seccion.plantilla}-${item.codigo}`}
                  grupo={item}
                  plegado={plegados.has(`${seccion.plantilla}|${item.codigo}`)}
                  onAlternar={() => alternar(`${seccion.plantilla}|${item.codigo}`)}
                  maximo={maximo}
                  onAbrir={onAbrir}
                  fichaAbierta={fichaAbierta}
                />
              ) : (
                <Fila key={item.llave} fila={item} maximo={maximo} onAbrir={onAbrir} abierta={item.llave === fichaAbierta} />
              ),
            )}
          </tbody>
        ))}
      </table>
    </div>
  )
}

/** Junta las subseries seguidas de una misma serie en un grupo. */
function agrupar(filas) {
  const items = []
  for (const fila of filas) {
    if (!fila.codigo_subserie) {
      items.push(fila)
      continue
    }
    const ultimo = items.at(-1)
    if (ultimo?.grupo && ultimo.codigo === fila.codigo_serie) ultimo.filas.push(fila)
    else items.push({ grupo: true, codigo: fila.codigo_serie, nombre: fila.nombre_serie, filas: [fila] })
  }
  return items
}

function Grupo({ grupo, plegado, onAlternar, maximo, onAbrir, fichaAbierta }) {
  const total = grupo.filas.reduce((suma, f) => suma + f.cantidad, 0)
  const n = grupo.filas.length
  return (
    <>
      <tr className="tabla__grupo" onClick={onAlternar}>
        <td className="col-codigo">{grupo.codigo}</td>
        <td colSpan={2}>
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
        <td className="texto-suave">
          {n} {n === 1 ? 'subserie' : 'subseries'}
        </td>
        <td className="col-expedientes">
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
    </>
  )
}

function Fila({ fila, maximo, onAbrir, abierta, subserie }) {
  const conExpedientes = fila.cantidad > 0
  const clases = ['tabla__fila', subserie ? 'tabla__fila--subserie' : '', conExpedientes ? 'con' : 'sin', abierta ? 'abierta' : '']
  return (
    <tr className={clases.join(' ')} onClick={() => onAbrir(fila.llave)}>
      <td className="col-codigo">{codigoFila(fila)}</td>
      <td>
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
      <td className="col-retencion">{fila.trd ? retencionCorta(fila.trd.retencion_ag, fila.trd.retencion_ac) : '—'}</td>
      <td className="col-disposicion">
        {fila.estado === ESTADOS.FUERA ? (
          <span className="disp disp--fuera">{ETIQUETA_ESTADO.fuera}</span>
        ) : (
          <Disposicion codigos={fila.trd?.disposicion} />
        )}
      </td>
      <td className="col-expedientes">
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
