import { ESTADOS } from '../datos/cruce.js'
import { codigoFila, ETIQUETA_ESTADO, formatoNumero, nombreFila, textoDisposicion } from '../utils/formato.js'

/**
 * Series y subseries agrupadas como en la TRD: una fila por serie y debajo sus subseries.
 * Si lo filtrado abarca varias dependencias, cada una va en su propia sección.
 */
export default function TablaResultados({ filas, nombrePlantilla, onAbrir, fichaAbierta }) {
  if (filas.length === 0) {
    return <p className="vacio">No hay series ni subseries con estos filtros.</p>
  }
  const secciones = []
  for (const fila of filas) {
    if (secciones.at(-1)?.plantilla !== fila.plantilla) secciones.push({ plantilla: fila.plantilla, filas: [] })
    secciones.at(-1).filas.push(fila)
  }
  const conSecciones = secciones.length > 1

  return (
    <div className="tabla-caja">
      <table className="tabla">
        <thead>
          <tr>
            <th scope="col">Código</th>
            <th scope="col">Serie / subserie</th>
            <th scope="col" className="centrado">
              Retención AG / AC (años)
            </th>
            <th scope="col">Disposición final</th>
            <th scope="col" className="numero">
              Expedientes
            </th>
          </tr>
        </thead>
        {secciones.map((seccion) => (
          <tbody key={seccion.plantilla}>
            {conSecciones && (
              <tr className="tabla__seccion">
                <th colSpan={5} scope="colgroup">
                  {nombrePlantilla(seccion.plantilla)}
                </th>
              </tr>
            )}
            {conEncabezados(seccion.filas).map((item) =>
              item.encabezado ? (
                <tr key={`serie-${item.codigo}`} className="tabla__serie">
                  <td>{item.codigo}</td>
                  <td colSpan={4}>{item.nombre}</td>
                </tr>
              ) : (
                <Fila key={item.llave} fila={item} onAbrir={onAbrir} abierta={item.llave === fichaAbierta} />
              ),
            )}
          </tbody>
        ))}
      </table>
    </div>
  )
}

/** Inserta una fila de encabezado antes de las subseries de cada serie. */
function conEncabezados(filas) {
  const resultado = []
  let serieActual = null
  for (const fila of filas) {
    if (fila.codigo_subserie && fila.codigo_serie !== serieActual) {
      resultado.push({ encabezado: true, codigo: fila.codigo_serie, nombre: fila.nombre_serie })
    }
    serieActual = fila.codigo_serie
    resultado.push(fila)
  }
  return resultado
}

function Fila({ fila, onAbrir, abierta }) {
  const esSerie = !fila.codigo_subserie
  const clases = ['tabla__fila', esSerie ? 'tabla__fila--serie' : '', abierta ? 'abierta' : ''].join(' ')
  return (
    <tr className={clases}>
      <td>{codigoFila(fila)}</td>
      <td className={esSerie ? '' : 'sangria'}>
        <button type="button" className="enlace-fila" onClick={() => onAbrir(fila.llave)}>
          {nombreFila(fila)}
        </button>
      </td>
      <td className="centrado">{fila.trd ? `${fila.trd.retencion_ag ?? '—'} / ${fila.trd.retencion_ac ?? '—'}` : '—'}</td>
      <td className="disposicion">{fila.trd ? textoDisposicion(fila.trd.disposicion) : '—'}</td>
      <td className="numero">
        <Cantidad fila={fila} />
      </td>
    </tr>
  )
}

function Cantidad({ fila }) {
  if (fila.estado === ESTADOS.CON) return formatoNumero(fila.cantidad)
  if (fila.estado === ESTADOS.FUERA) {
    return (
      <span className="cantidad-con-etiqueta">
        <span className="etiqueta etiqueta--fuera">{ETIQUETA_ESTADO.fuera}</span> {formatoNumero(fila.cantidad)}
      </span>
    )
  }
  return <span className="etiqueta etiqueta--sin">{ETIQUETA_ESTADO[fila.estado]}</span>
}
