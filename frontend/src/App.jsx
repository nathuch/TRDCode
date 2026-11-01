import { useCallback, useEffect, useMemo, useState } from 'react'
import { obtenerDatos } from './api/cliente.js'
import Ficha from './components/Ficha.jsx'
import Filtros from './components/Filtros.jsx'
import Resumen from './components/Resumen.jsx'
import TablaResultados from './components/TablaResultados.jsx'
import { armarIndice, ESTADOS, resumen } from './datos/cruce.js'
import {
  aplicarFiltros,
  cambiarFiltro,
  ESTADO_INICIAL,
  opcionesDisponibles,
  resultadosEnOtraVersion,
} from './datos/filtros.js'
import { escribirUrl, leerUrl } from './estadoUrl.js'
import { exportarExcel } from './utils/exportar.js'
import { codigoFila, fechaLarga, formatoNumero } from './utils/formato.js'

const inicial = leerUrl()

export default function App() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)
  const [estado, setEstado] = useState(inicial.estado)
  const [llaveFicha, setLlaveFicha] = useState(inicial.ficha)
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    obtenerDatos()
      .then(setDatos)
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => escribirUrl(estado, llaveFicha), [estado, llaveFicha])

  const entradas = useMemo(
    () => (datos ? armarIndice(datos.trd, datos.dependencias, datos.expedientes) : []),
    [datos],
  )
  const opciones = useMemo(() => (datos ? opcionesDisponibles(estado, entradas, datos) : null), [estado, entradas, datos])
  const filas = useMemo(() => aplicarFiltros(estado, entradas), [estado, entradas])
  const totales = useMemo(() => resumen(filas), [filas])
  const otraVersion = useMemo(
    () => (filas.length === 0 ? resultadosEnOtraVersion(estado, entradas) : null),
    [filas, estado, entradas],
  )

  const nombres = useMemo(() => {
    const plantillas = new Map((datos?.dependencias ?? []).map((d) => [d.plantilla, d.nombre]))
    const centros = new Map((datos?.centros ?? []).map((c) => [c.codigo, c.nombre]))
    const centroDeDependencia = new Map((datos?.dependencias ?? []).map((d) => [d.codigo, d.codigo_centro]))
    return {
      nombrePlantilla: (p) => plantillas.get(p) ?? p,
      nombreCentro: (c) => centros.get(c) ?? c,
      centroDeDependencia: (d) => centroDeDependencia.get(d),
      nombreCentroDeDependencia: (d) => centros.get(centroDeDependencia.get(d)) ?? d,
    }
  }, [datos])

  const cambiar = useCallback((campo, valor) => setEstado((actual) => cambiarFiltro(actual, campo, valor)), [])
  const cerrarFicha = useCallback(() => setLlaveFicha(null), [])
  const ficha = filas.find((f) => f.llave === llaveFicha) ?? null
  const fueraDeTrd = filas.filter((f) => f.estado === ESTADOS.FUERA)
  const hayFiltros = JSON.stringify({ ...estado, trd: ESTADO_INICIAL.trd }) !== JSON.stringify(ESTADO_INICIAL)

  const exportar = async (filasAExportar) => {
    setExportando(true)
    try {
      await exportarExcel(filasAExportar, estado, { ...nombres, carga: datos?.carga })
    } catch (e) {
      window.alert(`No se pudo generar el Excel: ${e.message}`)
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="pagina">
      <header className="encabezado">
        <div>
          <h1>Consulta de expedientes por serie y subserie</h1>
          <p className="encabezado__sub">SENA, Regional Tolima · Centros de Formación</p>
        </div>
        {datos?.carga && <span className="sello">Datos al {fechaLarga(datos.carga.fecha_reporte)}</span>}
      </header>

      {error && (
        <div className="contenido">
          <p className="aviso aviso--error" role="alert">
            No se pudieron cargar los datos: {error} Revise que Apache y MySQL estén encendidos.
          </p>
        </div>
      )}
      {!datos && !error && (
        <div className="contenido">
          <p className="cargando" role="status">
            Cargando datos…
          </p>
        </div>
      )}

      {datos && (
        <div className="contenido contenido--columnas">
          <Filtros
            estado={estado}
            opciones={opciones}
            onCambiar={cambiar}
            onLimpiar={() => setEstado({ ...ESTADO_INICIAL, trd: estado.trd })}
            hayFiltros={hayFiltros}
          />

          <main className="resultados">
            {!datos.carga && (
              <p className="aviso">Todavía no hay expedientes cargados: se muestra solo la TRD.</p>
            )}
            <Resumen totales={totales} />

            {fueraDeTrd.length > 0 && (
              <div className="aviso aviso--fuera">
                {fueraDeTrd.map((f) => (
                  <p key={f.llave}>
                    La {f.codigo_subserie ? 'subserie' : 'serie'} <strong>{codigoFila(f)}</strong> tiene{' '}
                    {formatoNumero(f.cantidad)} expedientes en el reporte de OnBase, pero no aparece en la TRD{' '}
                    {f.version} de {nombres.nombrePlantilla(f.plantilla)}.
                  </p>
                ))}
              </div>
            )}

            {otraVersion?.cantidad > 0 && (
              <div className="aviso">
                <p>
                  No hay resultados en la TRD {estado.trd}, pero hay {otraVersion.cantidad}{' '}
                  {otraVersion.cantidad === 1 ? 'resultado' : 'resultados'} en la TRD {otraVersion.version}.
                </p>
                <button type="button" className="boton" onClick={() => cambiar('trd', otraVersion.version)}>
                  Ver en la TRD {otraVersion.version}
                </button>
              </div>
            )}

            <div className="barra">
              <p className="barra__texto">
                {formatoNumero(filas.length)} series y subseries · TRD {estado.trd}
              </p>
              <button
                type="button"
                className="boton boton--primario"
                onClick={() => exportar(filas)}
                disabled={exportando || filas.length === 0}
              >
                {exportando ? 'Generando…' : 'Exportar a Excel'}
              </button>
            </div>

            <TablaResultados
              filas={filas}
              nombrePlantilla={nombres.nombrePlantilla}
              onAbrir={setLlaveFicha}
              fichaAbierta={llaveFicha}
            />
          </main>
        </div>
      )}

      {ficha && (
        <Ficha
          fila={ficha}
          nombrePlantilla={nombres.nombrePlantilla}
          nombreCentroDeDependencia={nombres.nombreCentroDeDependencia}
          onCerrar={cerrarFicha}
          onExportar={() => exportar([ficha])}
          exportando={exportando}
        />
      )}
    </div>
  )
}
