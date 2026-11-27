import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cambiarClave, cerrarSesion, obtenerDatos, obtenerSesion } from './api/cliente.js'
import Acceso from './components/Acceso.jsx'
import ActualizarDatos from './components/ActualizarDatos.jsx'
import BarraConsulta from './components/BarraConsulta.jsx'
import BotonesExportar from './components/BotonesExportar.jsx'
import DialogoClave from './components/DialogoClave.jsx'
import Ficha from './components/Ficha.jsx'
import { IconoAlerta, IconoCalendario } from './components/Iconos.jsx'
import Inicio from './components/Inicio.jsx'
import MiCuenta from './components/MiCuenta.jsx'
import TablaResultados from './components/TablaResultados.jsx'
import Usuarios from './components/Usuarios.jsx'
import { armarIndice, ESTADOS, resumen } from './datos/cruce.js'
import {
  aplicarFiltros,
  cambiarFiltro,
  ESTADO_INICIAL,
  opcionesDisponibles,
  resultadosEnOtraVersion,
} from './datos/filtros.js'
import { escribirUrl, irAConsulta, irAInicio, irAVista, leerUrl, VISTAS_CON_SESION } from './estadoUrl.js'
import { exportarExcel, lineaFiltros, textoDatosAl } from './utils/exportar.js'
import { AVISO_SERVIDOR_MS, EVENTOS_ACTIVIDAD, inactiva, registrarActividad, ultimaActividad } from './utils/inactividad.js'
import { exportarPdf } from './utils/pdf.js'
import { codigoFila, disposiciones, fechaLarga, formatoNumero, nombreFila, nombreLegible, ocultarNombres } from './utils/formato.js'

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
  // Formato que se está generando ('excel' o 'pdf'), o null.
  const [generando, setGenerando] = useState(null)
  // 'inicio' (sin resultados a la vista), 'consulta' o 'actualizar' (solo con sesión).
  // Una dirección con filtros o ficha abre la consulta.
  const [vista, setVista] = useState(inicial.vista)
  // Al cambiar de vista por una acción, el foco pasa al título de la vista nueva.
  const enfocarVista = useRef(false)
  // Nombre de la encargada con sesión iniciada, o null. sesionLista: ya se preguntó al servidor.
  const [nombre, setNombre] = useState(null)
  const [sesionLista, setSesionLista] = useState(false)
  // Con una contraseña temporal, una ventana obliga a cambiarla antes de hacer cualquier otra cosa.
  const [debeCambiarClave, setDebeCambiarClave] = useState(false)
  // La sesión se cerró por inactividad: se muestra un aviso hasta que se cierra o se vuelve a ingresar.
  const [cerradaPorInactividad, setCerradaPorInactividad] = useState(false)

  /** Guarda la sesión que entrega la API ({ sesion, nombre, debeCambiarClave }). */
  const recibirSesion = useCallback((s) => {
    setNombre(s.sesion ? s.nombre : null)
    setDebeCambiarClave(Boolean(s.sesion && s.debeCambiarClave))
    if (s.sesion) setCerradaPorInactividad(false)
  }, [])

  // Solo se aplica la respuesta del último pedido de datos: una que llegue tarde, pedida con la sesión
  // abierta, no debe dejar nombres reservados en pantalla después de salir.
  const ultimoPedido = useRef(0)
  const recargarDatos = useCallback(() => {
    const pedido = ++ultimoPedido.current
    obtenerDatos()
      .then((d) => pedido === ultimoPedido.current && setDatos(d))
      .catch((e) => pedido === ultimoPedido.current && setError(e.message))
  }, [])

  useEffect(() => {
    obtenerSesion()
      .then(recibirSesion)
      .catch(() => setNombre(null))
      .finally(() => setSesionLista(true))
  }, [recibirSesion])

  // Con sesión (y sin contraseña temporal pendiente), la API envía los nombres reales de los
  // expedientes IPC e IPR; sin sesión, ocultos (#82). Los datos se piden cuando ya se sabe si hay
  // sesión y otra vez al ingresar, al salir o al vencer la sesión. Al quedar sin sesión, los nombres
  // se ocultan de inmediato en el navegador mientras llegan los datos nuevos.
  const conSesion = nombre !== null && !debeCambiarClave
  useEffect(() => {
    if (!sesionLista) return
    if (!conSesion) setDatos(ocultarNombres)
    recargarDatos()
  }, [sesionLista, conSesion, recargarDatos])

  // Cierre por inactividad (utils/inactividad.js): a los 29 minutos sin actividad en ninguna pestaña,
  // se ocultan los nombres y se cierra la sesión, con un aviso. Mientras hay actividad, se avisa al
  // servidor a lo sumo una vez por minuto para que no cierre la sesión de quien la está usando.
  useEffect(() => {
    if (!conSesion) return undefined
    registrarActividad()
    let ultimoAviso = Date.now()
    let ultimaEscritura = 0
    const alActuar = () => {
      const ahora = Date.now()
      if (ahora - ultimaEscritura > 5000) {
        ultimaEscritura = ahora
        registrarActividad(ahora)
      }
      if (ahora - ultimoAviso > AVISO_SERVIDOR_MS) {
        ultimoAviso = ahora
        obtenerSesion()
          .then((s) => !s.sesion && recibirSesion(s))
          .catch(() => {})
      }
    }
    const revisar = () => {
      if (!inactiva(Date.now(), ultimaActividad())) return
      setDatos(ocultarNombres)
      setNombre(null)
      setDebeCambiarClave(false)
      setCerradaPorInactividad(true)
      cerrarSesion().catch(() => {})
    }
    for (const evento of EVENTOS_ACTIVIDAD) window.addEventListener(evento, alActuar, { capture: true, passive: true })
    document.addEventListener('visibilitychange', revisar)
    const reloj = window.setInterval(revisar, 15000)
    return () => {
      for (const evento of EVENTOS_ACTIVIDAD) window.removeEventListener(evento, alActuar, { capture: true })
      document.removeEventListener('visibilitychange', revisar)
      window.clearInterval(reloj)
    }
  }, [conSesion, recibirSesion])

  const sesionVencida = useCallback(() => setNombre(null), [])

  /** Para los errores de la API en las pantallas con sesión: sesión terminada o contraseña temporal. */
  const revisarError = useCallback((e) => {
    if (e.estado === 401) setNombre(null)
    if (e.debeCambiarClave) setDebeCambiarClave(true)
  }, [])

  const salir = async () => {
    await cerrarSesion()
    setNombre(null)
    setDebeCambiarClave(false)
  }

  useEffect(() => {
    if (vista === 'consulta') escribirUrl(estado, llaveFicha)
  }, [vista, estado, llaveFicha])

  // "Atrás" y "adelante" del navegador: la vista y los filtros siguen a la dirección.
  useEffect(() => {
    const alNavegar = () => {
      const leido = leerUrl()
      // Fuera de la consulta se conserva la versión de la TRD elegida.
      setEstado((actual) => (leido.vista !== 'consulta' ? { ...leido.estado, trd: actual.trd } : leido.estado))
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
    const titulos = { inicio: 'inicio-titulo', consulta: 'resultados', actualizar: 'actualizar-titulo', usuarios: 'usuarios-titulo', cuenta: 'cuenta-titulo' }
    document.getElementById(titulos[vista])?.focus()
  }, [vista])

  // Al cerrar la ficha, el foco vuelve a la fila que la abrió (o a los resultados si esa fila ya no se ve).
  const fichaPrevia = useRef(llaveFicha)
  useEffect(() => {
    const previa = fichaPrevia.current
    fichaPrevia.current = llaveFicha
    if (llaveFicha !== null || previa === null || vista !== 'consulta') return
    const fila = [...document.querySelectorAll('tr[data-llave]')].find((tr) => tr.dataset.llave === previa)
    ;(fila?.querySelector('.fila__boton') ?? document.getElementById('resultados'))?.focus()
  }, [llaveFicha, vista])

  /** Abre una pantalla con sesión: 'actualizar', 'usuarios' o 'cuenta'. */
  const abrirVista = (nueva) => {
    if (vista !== nueva) irAVista(nueva)
    setLlaveFicha(null)
    setVista(nueva)
    enfocarVista.current = true
    window.scrollTo(0, 0)
  }

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

  // Pestañas con el teclado (patrón de pestañas de ARIA): flechas, Inicio y Fin mueven y activan.
  const moverPestana = (e, i) => {
    const pasos = { ArrowRight: 1, ArrowLeft: -1 }
    let j
    if (e.key in pasos) j = (i + pasos[e.key] + PESTANAS.length) % PESTANAS.length
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = PESTANAS.length - 1
    else return
    e.preventDefault()
    setPestana(PESTANAS[j].valor)
    document.getElementById(`pestana-${PESTANAS[j].valor}`)?.focus()
  }

  // Excel, PDF e impresión parten de lo mismo que se ve: la pestaña elegida o la ficha abierta.
  const contexto = { ...nombres, carga: datos?.carga, pestana: pestanaActual.texto }
  const lineaImpresion = `${textoDatosAl(datos?.carga)} · Filtros: ${lineaFiltros(estado, contexto)}`
  const exportar = async (formato, filasAExportar, desdeFicha = null) => {
    setGenerando(formato)
    try {
      const generar = formato === 'pdf' ? exportarPdf : exportarExcel
      await generar(filasAExportar, estado, contexto, { ficha: desdeFicha })
    } catch (e) {
      window.alert(`No se pudo generar el ${formato === 'pdf' ? 'PDF' : 'Excel'}: ${e.message}`)
    } finally {
      setGenerando(null)
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
            {datos?.carga && vista !== 'inicio' && (
              <span className="sello">
                <IconoCalendario />
                Datos al {fechaLarga(datos.carga.fecha_reporte)}
              </span>
            )}
            <Acceso nombre={nombre} onSesion={recibirSesion} onIr={abrirVista} onSalir={salir} />
          </div>
        </header>

        {cerradaPorInactividad && nombre === null && (
          <div className="contenedor">
            <div className="aviso-ambar aviso-inactividad" role="status">
              <p>
                Su sesión se cerró por inactividad y los nombres de los expedientes clasificados y reservados se
                ocultaron. Para verlos de nuevo, use <strong>Ingresar</strong>.
              </p>
              <button type="button" className="boton boton--chico boton--contorno-gris" onClick={() => setCerradaPorInactividad(false)}>
                Entendido
              </button>
            </div>
          </div>
        )}

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
      ) : VISTAS_CON_SESION.includes(vista) ? (
        !sesionLista ? (
          <main className="contenedor actualizar">
            <p className="vacio" role="status">
              Cargando…
            </p>
          </main>
        ) : vista === 'usuarios' ? (
          <Usuarios nombre={nombre} revisarError={revisarError} onIr={abrirVista} />
        ) : vista === 'cuenta' ? (
          // key: el formulario se reinicia al entrar o salir, no al cambiar el nombre.
          <MiCuenta key={nombre === null ? 'sin-sesion' : 'con-sesion'} nombre={nombre} onNombre={setNombre} revisarError={revisarError} />
        ) : (
          <ActualizarDatos
            nombre={nombre}
            datos={datos}
            onDatosActualizados={recargarDatos}
            onSesionVencida={sesionVencida}
            onVerConsulta={() => abrirConsulta({ ...ESTADO_INICIAL, trd: estado.trd })}
          />
        )
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
              <h2 className="solo-lector">Resultados de la consulta</h2>
              {/* Solo al imprimir: en lugar del encabezado y los filtros, una línea con lo aplicado. */}
              <div className="solo-impresion impresion-cabecera">
                <p className="impresion-cabecera__marca">TRDCode · SENA Regional Tolima</p>
                <p className="impresion-cabecera__titulo">Consulta de series y subseries documentales</p>
                <p className="impresion-cabecera__linea">{lineaImpresion}</p>
              </div>
              {!datos.carga && <p className="aviso-ambar">Todavía no hay expedientes cargados: se muestra solo la TRD.</p>}

              <div className="total">
                {/* Se anuncia a los lectores de pantalla cada vez que cambia con los filtros. */}
                <p className="total__texto" aria-live="polite" aria-atomic="true">
                  <span className="total__numero">{formatoNumero(totales.expedientes)}</span> expedientes en{' '}
                  <strong>
                    {formatoNumero(filas.length)} {filas.length === 1 ? 'serie o subserie' : 'series y subseries'}
                  </strong>
                </p>
                <BotonesExportar
                  id="exportar-consulta"
                  onExportar={(formato) => exportar(formato, visibles)}
                  generando={generando}
                  deshabilitado={visibles.length === 0}
                />
              </div>

              <div className="pestanas" role="tablist" aria-label="Ver series y subseries">
                {PESTANAS.map((p, i) => (
                  <button
                    key={p.valor}
                    id={`pestana-${p.valor}`}
                    type="button"
                    role="tab"
                    aria-selected={pestana === p.valor}
                    aria-controls="tabla-resultados"
                    tabIndex={pestana === p.valor ? 0 : -1}
                    className="pestana"
                    onClick={() => setPestana(p.valor)}
                    onKeyDown={(e) => moverPestana(e, i)}
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

              <div id="tabla-resultados" role="tabpanel" aria-labelledby={`pestana-${pestana}`}>
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
          onExportar={(formato) => exportar(formato, [ficha], ficha)}
          generando={generando}
          lineaImpresion={`${textoDatosAl(datos?.carga)} · Filtros: ${lineaFiltros(estado, { ...contexto, pestana: null })}`}
        />
      )}

      {/* Contraseña temporal: no se puede cerrar; solo cambiarla o salir. El servidor tampoco deja hacer nada más. */}
      {nombre && debeCambiarClave && (
        <DialogoClave
          obligatorio
          onCambiar={async (actual, nueva) => {
            try {
              await cambiarClave(actual, nueva)
            } catch (e) {
              revisarError(e)
              throw e
            }
          }}
          onCerrar={() => setDebeCambiarClave(false)}
          onSalir={() => salir().catch((e) => window.alert(`No se pudo cerrar la sesión: ${e.message}`))}
        />
      )}
    </div>
  )
}
