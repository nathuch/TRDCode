import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { obtenerDatos } from './api/cliente.js'
import Acceso from './components/Acceso.jsx'
import BarraConsulta from './components/BarraConsulta.jsx'
import Ficha from './components/Ficha.jsx'
import { IconoAlerta, IconoCalendario, IconoDescarga } from './components/Iconos.jsx'
import Inicio from './components/Inicio.jsx'
import TablaResultados from './components/TablaResultados.jsx'
import { armarIndice, ESTADOS, resumen } from './datos/cruce.js'
import {
  aplicarFiltros,
  cambiarFiltro,
  ESTADO_INICIAL,
  opcionesDisponibles,
  resultadosEnOtraVersion,
} from './datos/filtros.js'
import { escribirUrl, irAConsulta, irAInicio, leerUrl } from './estadoUrl.js'
import { exportarExcel } from './utils/exportar.js'
import { codigoFila, disposiciones, fechaLarga, formatoNumero, nombreFila, nombreLegible } from './utils/formato.js'

const inicial = leerUrl()

const PESTANAS = [
  { valor: 'todas', texto: 'Todas', incluye: () => true },
  { valor: 'con', texto: 'Con expedientes', incluye: (f) => f.estado === ESTADOS.CON },
  { valor: 'sin', texto: 'Sin expedientes', incluye: (f) => f.estado === ESTADOS.SIN || f.estado === ESTADOS.SIN_PERIODO },
  { valor: 'fuera', texto: 'Fuera de la TRD', incluye: (f) => f.estado === ESTADOS.FUERA },
]
const ORDEN_SIGLAS = ['CT', 'S', 'E', 'MT', 'M', 'D']

export default function App() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)
  const [estado, setEstado] = useState(inicial.estado)
  const [llaveFicha, setLlaveFicha] = useState(inicial.ficha)
  const [pestana, setPestana] = useState('todas')
  const [exportando, setExportando] = useState(false)
  // 'inicio' (sin resultados a la vista) o 'consulta'. Una dirección con filtros o ficha abre la consulta.
  const [vista, setVista] = useState(inicial.vista)
  // Al cambiar de vista por una acción, el foco pasa al título de la vista nueva.
  const enfocarVista = useRef(false)

  useEffect(() => {
    obtenerDatos()
      .then(setDatos)
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (vista === 'consulta') escribirUrl(estado, llaveFicha)
  }, [vista, estado, llaveFicha])

  // "Atrás" y "adelante" del navegador: la vista y los filtros siguen a la dirección.
  useEffect(() => {
    const alNavegar = () => {
      const leido = leerUrl()
      // Al volver al inicio se conserva la versión de la TRD elegida.
      setEstado((actual) => (leido.vista === 'inicio' ? { ...leido.estado, trd: actual.trd } : leido.estado))
      setLlaveFicha(leido.ficha)
      setPestana('todas')
      setVista(leido.vista)
      enfocarVista.current = true
    }
    window.addEventListener('popstate', alNavegar)
    return () => window.removeEventListener('popstate', alNavegar)
  }, [])

  useEffect(() => {
    if (!enfocarVista.current) return
    enfocarVista.current = false
    document.getElementById(vista === 'inicio' ? 'inicio-titulo' : 'resultados')?.focus()
  }, [vista])

  const abrirConsulta = (nuevo) => {
    irAConsulta(nuevo)
    setEstado(nuevo)
    setLlaveFicha(null)
    setPestana('todas')
    setVista('consulta')
    enfocarVista.current = true
    window.scrollTo(0, 0)
  }

  const volverAlInicio = (e) => {
    e.preventDefault()
    if (vista === 'inicio') return
    irAInicio()
    setEstado((actual) => ({ ...ESTADO_INICIAL, trd: actual.trd }))
    setLlaveFicha(null)
    setVista('inicio')
    enfocarVista.current = true
    window.scrollTo(0, 0)
  }

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
  const pestanaActual = PESTANAS.find((p) => p.valor === pestana)
  const visibles = filas.filter(pestanaActual.incluye)
  const siglas = new Set(visibles.flatMap((f) => f.trd?.disposicion ?? []))
  const leyendaDisposicion = disposiciones(ORDEN_SIGLAS.filter((s) => siglas.has(s)))
    .map((d) => `${d.sigla} ${d.nombre.toLowerCase()}`)
    .join(', ')

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
      <div className="superior">
        <header className="encabezado contenedor">
          <div>
            <a
              className="encabezado__inicio"
              href={window.location.pathname + window.location.search}
              onClick={volverAlInicio}
              title="Ir al inicio"
            >
              <span className="encabezado__marca">TRDCode</span>
              <h1>Consulta de series y subseries documentales</h1>
            </a>
            <p className="encabezado__sub">SENA, Regional Tolima · Centros de Formación</p>
          </div>
          <div className="encabezado__lado">
            {/* En el inicio, la fecha de los datos va abajo. */}
            {datos?.carga && vista === 'consulta' && (
              <span className="sello">
                <IconoCalendario />
                Datos al {fechaLarga(datos.carga.fecha_reporte)}
              </span>
            )}
            <Acceso />
          </div>
        </header>

        {datos && vista === 'consulta' && (
          <div className="contenedor">
            <BarraConsulta
              estado={estado}
              opciones={opciones}
              onCambiar={cambiar}
              onLimpiar={() => setEstado({ ...ESTADO_INICIAL, trd: estado.trd })}
              nombreCentro={nombres.nombreCentro}
              nombrePlantilla={nombres.nombrePlantilla}
            />
          </div>
        )}
      </div>

      {vista === 'inicio' ? (
        <Inicio
          trd={estado.trd}
          onCambiarTrd={(v) => cambiar('trd', v)}
          centros={datos?.centros}
          carga={datos?.carga}
          error={error}
          onIr={abrirConsulta}
        />
      ) : (
        <main className="contenedor resultados" id="resultados" tabIndex={-1} aria-label="Resultados de la consulta">
          {error && (
            <p className="aviso-error" role="alert">
              No se pudieron cargar los datos: {error} Revise que Apache y MySQL estén encendidos.
            </p>
          )}
          {!datos && !error && (
            <p className="vacio" role="status">
              Cargando datos…
            </p>
          )}

          {datos && (
            <>
              {!datos.carga && <p className="aviso-ambar">Todavía no hay expedientes cargados: se muestra solo la TRD.</p>}

              <div className="total">
                <p className="total__texto">
                  <span className="total__numero">{formatoNumero(totales.expedientes)}</span> expedientes en{' '}
                  <strong>
                    {formatoNumero(filas.length)} {filas.length === 1 ? 'serie o subserie' : 'series y subseries'}
                  </strong>
                </p>
                <button
                  type="button"
                  className="boton boton--primario"
                  onClick={() => exportar(visibles)}
                  disabled={exportando || visibles.length === 0}
                >
                  <IconoDescarga />
                  {exportando ? 'Generando…' : 'Exportar a Excel'}
                </button>
              </div>

              <div className="pestanas" role="tablist" aria-label="Ver series y subseries">
                {PESTANAS.map((p) => (
                  <button
                    key={p.valor}
                    type="button"
                    role="tab"
                    aria-selected={pestana === p.valor}
                    aria-controls="tabla-resultados"
                    className="pestana"
                    onClick={() => setPestana(p.valor)}
                  >
                    {p.texto}
                    <span className="contador">{formatoNumero(filas.filter(p.incluye).length)}</span>
                  </button>
                ))}
              </div>

              {fueraDeTrd.length > 0 && (
                <div className="aviso-ambar aviso-fuera" role="note">
                  <IconoAlerta tamano={20} className="aviso-fuera__icono" />
                  <div className="aviso-fuera__texto">
                    <p className="aviso-fuera__titulo">
                      {fueraDeTrd.length === 1
                        ? `1 ${fueraDeTrd[0].codigo_subserie ? 'subserie' : 'serie'} con expedientes no está en la TRD ${estado.trd}`
                        : `${fueraDeTrd.length} series o subseries con expedientes no están en la TRD ${estado.trd}`}
                    </p>
                    {fueraDeTrd.map((f) => (
                      <p key={f.llave} className="aviso-fuera__linea">
                        <span>
                          <strong>{codigoFila(f)}</strong> {nombreLegible(nombreFila(f))}: los expedientes existen en OnBase,
                          pero la {f.codigo_subserie ? 'subserie' : 'serie'} no aparece en esta versión de la TRD.
                        </span>
                        <strong className="aviso-fuera__cantidad">{formatoNumero(f.cantidad)} expedientes</strong>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {otraVersion?.cantidad > 0 && (
                <div className="aviso-ambar aviso-version">
                  <p>
                    No hay resultados en la TRD {estado.trd}, pero hay {otraVersion.cantidad}{' '}
                    {otraVersion.cantidad === 1 ? 'resultado' : 'resultados'} en la TRD {otraVersion.version}.
                  </p>
                  <button type="button" className="boton boton--contorno" onClick={() => cambiar('trd', otraVersion.version)}>
                    Ver en la TRD {otraVersion.version}
                  </button>
                </div>
              )}

              <div id="tabla-resultados" role="tabpanel" aria-label={pestanaActual.texto}>
                <TablaResultados
                  filas={visibles}
                  nombrePlantilla={nombres.nombrePlantilla}
                  onAbrir={setLlaveFicha}
                  fichaAbierta={llaveFicha}
                />
              </div>

              <p className="leyenda">
                Retención: años en archivo de gestión + años en archivo central.
                {leyendaDisposicion && ` Disposición: ${leyendaDisposicion}.`}
              </p>
            </>
          )}
        </main>
      )}

      {ficha && vista === 'consulta' && (
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
