import { useCallback, useEffect, useState } from 'react'
import { enviarLote, finalizarImportacion, iniciarImportacion, obtenerCargas, restaurarCarga } from '../api/cliente.js'
import { leerExcel, revisarArchivo } from '../datos/leerExcel.js'
import { fechaDelNombre, fueraDeTrd, MOTIVOS, normalizar, porCentro } from '../datos/normalizar.js'
import { fechaHora, fechaLarga, formatoNumero, nombreLegible } from '../utils/formato.js'
import Dialogo from './Dialogo.jsx'
import { IconoAlerta, IconoDescarga } from './Iconos.jsx'

const LOTE = 500
const PROBLEMAS_VISIBLES = 100
const ORDEN_CENTROS = ['73.9226', '73.9310', '73.9123']

/**
 * Actualizar los datos con un reporte nuevo de OnBase (Fase 4), solo con sesión iniciada.
 * 1. Elegir el archivo y la fecha del reporte. 2. Vista previa (nada se carga todavía). 3. Carga en
 * lotes de 500 con barra de progreso. 4. Resultado. Debajo, el historial de cargas con "Volver a esta
 * carga". Los títulos de los expedientes nunca se muestran aquí: traen nombres de personas.
 */
export default function ActualizarDatos({ nombre, datos, onDatosActualizados, onSesionVencida, onVerConsulta }) {
  const [paso, setPaso] = useState('elegir')
  const [archivo, setArchivo] = useState(null)
  const [fecha, setFecha] = useState('')
  const [error, setError] = useState(null)
  const [leyendo, setLeyendo] = useState(false)
  const [revision, setRevision] = useState(null)
  const [progreso, setProgreso] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [cargas, setCargas] = useState(null)
  const [errorHistorial, setErrorHistorial] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [confirmar, setConfirmar] = useState(null)
  const [restaurando, setRestaurando] = useState(false)

  // Un 401 quiere decir que la sesión terminó: App vuelve a mostrar "Ingresar".
  const revisarSesion = useCallback(
    (e) => {
      if (e.estado === 401) onSesionVencida()
    },
    [onSesionVencida],
  )

  const cargarHistorial = useCallback(() => {
    obtenerCargas()
      .then((lista) => {
        setCargas(lista)
        setErrorHistorial(null)
      })
      .catch((e) => {
        revisarSesion(e)
        setErrorHistorial(e.message)
      })
  }, [revisarSesion])

  useEffect(() => {
    if (nombre) cargarHistorial()
  }, [nombre, cargarHistorial])

  if (!nombre) {
    return (
      <main className="contenedor actualizar">
        <h2 id="actualizar-titulo" className="actualizar__titulo" tabIndex={-1}>
          Actualizar datos
        </h2>
        <p className="aviso-ambar">Para actualizar los datos, ingrese con la cuenta de la encargada (enlace "Ingresar", arriba).</p>
      </main>
    )
  }

  const nombreCentro = (codigo) => datos?.centros.find((c) => c.codigo === codigo)?.nombre ?? codigo
  const nombrePlantilla = (p) => datos?.dependencias.find((d) => d.plantilla === p)?.nombre ?? p

  const elegirArchivo = (e) => {
    const elegido = e.target.files?.[0] ?? null
    setArchivo(elegido)
    setError(null)
    // Si el nombre trae una fecha, se propone (la persona la puede cambiar).
    const propuesta = elegido ? fechaDelNombre(elegido.name) : ''
    if (propuesta) setFecha(propuesta)
  }

  const revisar = async (e) => {
    e.preventDefault()
    const problema = revisarArchivo(archivo) ?? (fecha ? null : 'Escriba la fecha del reporte.')
    if (problema) {
      setError(problema)
      return
    }
    setLeyendo(true)
    setError(null)
    try {
      const { filas, primera } = await leerExcel(archivo)
      const normalizado = normalizar(filas, primera)
      setRevision({
        archivo: archivo.name,
        fecha,
        ...normalizado,
        porCentro: porCentro(normalizado.validos),
        fuera: datos ? fueraDeTrd(normalizado.validos, datos.trd, datos.dependencias) : [],
      })
      setPaso('revisar')
    } catch (err) {
      setError(err.message)
    } finally {
      setLeyendo(false)
    }
  }

  const cargar = async () => {
    const { validos } = revision
    const lotes = Math.ceil(validos.length / LOTE)
    setError(null)
    setPaso('cargando')
    setProgreso({ enviados: 0, total: validos.length, lote: 0, lotes })
    try {
      const { carga_id: cargaId } = await iniciarImportacion(revision.fecha, revision.archivo, validos.length)
      for (let i = 0; i < lotes; i++) {
        const parte = validos.slice(i * LOTE, (i + 1) * LOTE)
        await enviarLote(cargaId, parte)
        setProgreso({ enviados: i * LOTE + parte.length, total: validos.length, lote: i + 1, lotes })
      }
      const final = await finalizarImportacion(cargaId)
      setResultado(final)
      setPaso('listo')
      onDatosActualizados()
      cargarHistorial()
    } catch (err) {
      revisarSesion(err)
      const senalados = err.errores?.length
        ? ` ${err.errores
            .slice(0, 5)
            .map((x) => `Fila ${x.fila ?? '?'} (${x.codigo || 'sin código'}): ${x.motivo}.`)
            .join(' ')}`
        : ''
      setError(`No se completó la carga: ${err.message}${senalados} La consulta sigue con los datos anteriores.`)
      setPaso('revisar')
    } finally {
      setProgreso(null)
    }
  }

  const empezarOtra = () => {
    setPaso('elegir')
    setArchivo(null)
    setFecha('')
    setRevision(null)
    setResultado(null)
    setError(null)
  }

  const restaurar = async () => {
    setRestaurando(true)
    try {
      const r = await restaurarCarga(confirmar.id)
      setAviso(`La consulta volvió a la carga del ${fechaLarga(r.fecha_reporte)} (${formatoNumero(r.total_expedientes)} expedientes).`)
      setConfirmar(null)
      onDatosActualizados()
      cargarHistorial()
    } catch (err) {
      revisarSesion(err)
      setAviso(null)
      setErrorHistorial(`No se pudo volver a esa carga: ${err.message}`)
      setConfirmar(null)
    } finally {
      setRestaurando(false)
    }
  }

  const descartadas = revision ? Object.values(revision.descartados).reduce((a, b) => a + b, 0) : 0
  const centrosOrdenados = revision
    ? Object.keys(revision.porCentro).sort((a, b) => ORDEN_CENTROS.indexOf(a) - ORDEN_CENTROS.indexOf(b))
    : []
  const repetidos = revision ? revision.problemas.filter((p) => p.motivo.startsWith(MOTIVOS.REPETIDO)).length : 0

  return (
    <main className="contenedor actualizar">
      <div className="actualizar__cabeza">
        <h2 id="actualizar-titulo" className="actualizar__titulo" tabIndex={-1}>
          Actualizar datos
        </h2>
        <p className="texto-suave">
          Cargue el reporte de expedientes de OnBase. La consulta sigue mostrando los datos actuales hasta que la carga
          termine.
        </p>
      </div>

      <ol className="pasos" aria-label="Pasos">
        {[
          ['elegir', 'Archivo'],
          ['revisar', 'Revisión'],
          ['cargando', 'Carga'],
          ['listo', 'Resultado'],
        ].map(([valor, texto], i) => (
          <li key={valor} className={paso === valor ? 'pasos__paso activo' : 'pasos__paso'} aria-current={paso === valor ? 'step' : undefined}>
            <span className="pasos__numero">{i + 1}</span> {texto}
          </li>
        ))}
      </ol>

      {error && (
        <p className="aviso-error aviso-error--chico" role="alert">
          {error}
        </p>
      )}

      {paso === 'elegir' && (
        <form className="panel actualizar__formulario" onSubmit={revisar} noValidate>
          <label className="campo">
            <span className="campo__etiqueta">Reporte de OnBase (.xlsx, hasta 15 MB)</span>
            <input
              className="campo__archivo"
              type="file"
              name="reporte"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={elegirArchivo}
            />
          </label>
          <label className="campo actualizar__fecha">
            <span className="campo__etiqueta">Fecha del reporte</span>
            <input className="campo__entrada" type="date" name="fecha" value={fecha} required onChange={(e) => setFecha(e.target.value)} />
            <span className="ayuda">Es la fecha que se mostrará como "Datos al…". Si el nombre del archivo trae una fecha, se propone.</span>
          </label>
          <div className="formulario__acciones formulario__acciones--izquierda">
            <button type="submit" className="boton boton--primario" disabled={leyendo}>
              {leyendo ? 'Leyendo el archivo…' : 'Revisar el archivo'}
            </button>
          </div>
        </form>
      )}

      {paso === 'revisar' && revision && (
        <section className="panel" aria-labelledby="revision-titulo">
          <h3 id="revision-titulo" className="panel__titulo">
            Revise antes de cargar
          </h3>
          <p className="texto-suave">
            {revision.archivo} · Datos al {fechaLarga(revision.fecha)}. Todavía no se ha cargado nada.
          </p>

          <div className="revision__tarjetas">
            <div className="tarjeta-dato">
              <span className="tarjeta-dato__titulo">Filas del archivo</span>
              <span className="tarjeta-dato__valor">{formatoNumero(revision.filas)}</span>
            </div>
            <div className="tarjeta-dato tarjeta-dato--destacada">
              <span className="tarjeta-dato__titulo">Expedientes para cargar</span>
              <span className="tarjeta-dato__valor">{formatoNumero(revision.validos.length)}</span>
              <span className="tarjeta-dato__detalle">
                {centrosOrdenados.map((c) => `${nombreCentro(c)}: ${formatoNumero(revision.porCentro[c])}`).join(' · ')}
              </span>
            </div>
            <div className="tarjeta-dato">
              <span className="tarjeta-dato__titulo">Descartadas por ser de otros centros</span>
              <span className="tarjeta-dato__valor">{formatoNumero(descartadas)}</span>
            </div>
            <div className="tarjeta-dato">
              <span className="tarjeta-dato__titulo">Filas con problemas</span>
              <span className="tarjeta-dato__valor">{formatoNumero(revision.problemas.length)}</span>
              {repetidos > 0 && <span className="tarjeta-dato__detalle">{formatoNumero(repetidos)} con el código repetido</span>}
            </div>
          </div>

          {revision.fuera.length > 0 && (
            <div className="aviso-ambar aviso-fuera" role="note">
              <IconoAlerta tamano={20} className="aviso-fuera__icono" />
              <div className="aviso-fuera__texto">
                <p className="aviso-fuera__titulo">
                  Aviso: {revision.fuera.length === 1 ? 'una serie o subserie no está' : `${revision.fuera.length} series o subseries no están`} en
                  la TRD. Sus expedientes se cargan igual y se verán como "Fuera de la TRD".
                </p>
                {revision.fuera.map((f) => (
                  <p key={`${f.version}|${f.plantilla}|${f.codigo_serie}|${f.codigo_subserie}`} className="aviso-fuera__linea">
                    <span>
                      TRD {f.version} · {nombrePlantilla(f.plantilla)} · <strong>{f.codigo_subserie || f.codigo_serie}</strong>{' '}
                      {nombreLegible(f.nombre)}
                    </span>
                    <strong className="aviso-fuera__cantidad">{formatoNumero(f.cantidad)} expedientes</strong>
                  </p>
                ))}
              </div>
            </div>
          )}

          {revision.problemas.length > 0 && (
            <div className="revision__problemas">
              <h4 className="panel__subtitulo">Filas con problemas (no se cargan)</h4>
              <div className="tabla-caja">
                <table className="tabla tabla--compacta">
                  <thead>
                    <tr>
                      <th scope="col">Fila</th>
                      <th scope="col">Código</th>
                      <th scope="col">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revision.problemas.slice(0, PROBLEMAS_VISIBLES).map((p) => (
                      <tr key={`${p.fila}-${p.motivo}`} className={p.motivo.startsWith(MOTIVOS.REPETIDO) ? 'fila-repetida' : undefined}>
                        <td>{p.fila}</td>
                        <td className="celda-codigo">{p.codigo || '—'}</td>
                        <td>{p.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {revision.problemas.length > PROBLEMAS_VISIBLES && (
                <p className="ayuda">
                  Se muestran las primeras {PROBLEMAS_VISIBLES} de {formatoNumero(revision.problemas.length)}.
                </p>
              )}
            </div>
          )}

          <div className="formulario__acciones formulario__acciones--izquierda">
            <button type="button" className="boton boton--primario" onClick={cargar} disabled={revision.validos.length === 0}>
              <IconoDescarga />
              Cargar {formatoNumero(revision.validos.length)} expedientes
            </button>
            <button type="button" className="boton boton--contorno-gris" onClick={empezarOtra}>
              Elegir otro archivo
            </button>
          </div>
        </section>
      )}

      {paso === 'cargando' && progreso && (
        <section className="panel" aria-labelledby="carga-titulo">
          <h3 id="carga-titulo" className="panel__titulo">
            Cargando…
          </h3>
          <div
            className="progreso"
            role="progressbar"
            aria-label="Avance de la carga"
            aria-valuemin={0}
            aria-valuemax={progreso.total}
            aria-valuenow={progreso.enviados}
            aria-valuetext={`${formatoNumero(progreso.enviados)} de ${formatoNumero(progreso.total)} expedientes`}
          >
            <span className="progreso__barra" style={{ width: `${(progreso.enviados / progreso.total) * 100}%` }} />
          </div>
          <p className="texto-suave" aria-live="polite">
            Lote {Math.min(progreso.lote + 1, progreso.lotes)} de {progreso.lotes} · {formatoNumero(progreso.enviados)} de{' '}
            {formatoNumero(progreso.total)} expedientes. No cierre esta página.
          </p>
        </section>
      )}

      {paso === 'listo' && resultado && (
        <section className="panel" aria-labelledby="listo-titulo">
          <h3 id="listo-titulo" className="panel__titulo">
            Carga terminada
          </h3>
          <p className="aviso-exito" role="status">
            Se cargaron <strong>{formatoNumero(resultado.total_expedientes)} expedientes</strong>. La consulta ya muestra los
            datos al {fechaLarga(resultado.fecha_reporte)}.
          </p>
          <div className="formulario__acciones formulario__acciones--izquierda">
            <button type="button" className="boton boton--primario" onClick={onVerConsulta}>
              Ver la consulta
            </button>
            <button type="button" className="boton boton--contorno-gris" onClick={empezarOtra}>
              Cargar otro reporte
            </button>
          </div>
        </section>
      )}

      <section className="panel" aria-labelledby="historial-titulo">
        <h3 id="historial-titulo" className="panel__titulo">
          Cargas guardadas
        </h3>
        <p className="texto-suave">Se guardan la carga actual y las 2 anteriores. Puede volver a una anterior si la nueva tiene errores.</p>
        {aviso && (
          <p className="aviso-exito" role="status">
            {aviso}
          </p>
        )}
        {errorHistorial && (
          <p className="aviso-error aviso-error--chico" role="alert">
            {errorHistorial}
          </p>
        )}
        {cargas === null && !errorHistorial && <p className="texto-suave">Cargando el historial…</p>}
        {cargas && (
          <div className="tabla-caja">
            <table className="tabla tabla--compacta">
              <thead>
                <tr>
                  <th scope="col">Datos al</th>
                  <th scope="col">Cargada el</th>
                  <th scope="col">Por</th>
                  <th scope="col" className="col-numero">
                    Expedientes
                  </th>
                  <th scope="col">
                    <span className="solo-lector">Estado y acción</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cargas.map((c) => (
                  <tr key={c.id}>
                    <td>{fechaLarga(c.fecha_reporte)}</td>
                    <td>{fechaHora(c.fecha_carga)}</td>
                    <td>{c.usuario}</td>
                    <td className="col-numero">{formatoNumero(c.total_expedientes)}</td>
                    <td className="celda-accion">
                      {c.estado === 'activa' ? (
                        <span className="insignia">En uso</span>
                      ) : (
                        <button type="button" className="boton boton--contorno boton--chico" onClick={() => setConfirmar(c)}>
                          Volver a esta carga
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {confirmar && (
        <Dialogo
          id="restaurar"
          titulo="¿Volver a esta carga?"
          descripcion={`La consulta mostrará los ${formatoNumero(confirmar.total_expedientes)} expedientes con datos al ${fechaLarga(confirmar.fecha_reporte)}. La carga actual queda guardada como anterior.`}
          onCerrar={() => setConfirmar(null)}
        >
          <div className="formulario__acciones">
            <button type="button" className="boton boton--contorno-gris" onClick={() => setConfirmar(null)}>
              Cancelar
            </button>
            <button type="button" className="boton boton--primario" onClick={restaurar} disabled={restaurando}>
              {restaurando ? 'Volviendo…' : 'Volver a esta carga'}
            </button>
          </div>
        </Dialogo>
      )}
    </main>
  )
}
