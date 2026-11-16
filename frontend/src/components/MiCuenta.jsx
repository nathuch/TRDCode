import { useState } from 'react'
import { cambiarClave, cambiarCorreo, guardarMiNombre } from '../api/cliente.js'
import DialogoClave from './DialogoClave.jsx'

/**
 * "Mi cuenta" (RF-17), solo con sesión: el nombre completo, el correo de ingreso (pide la contraseña
 * actual) y la contraseña. revisarError avisa a App si la sesión terminó.
 */
export default function MiCuenta({ nombre, onNombre, revisarError }) {
  const [nuevoNombre, setNuevoNombre] = useState(nombre ?? '')
  const [correo, setCorreo] = useState('')
  const [claveCorreo, setClaveCorreo] = useState('')
  const [enviando, setEnviando] = useState(null)
  const [mensajes, setMensajes] = useState({})
  const [cambiandoClave, setCambiandoClave] = useState(false)

  if (!nombre) {
    return (
      <main className="contenedor actualizar">
        <h2 id="cuenta-titulo" className="actualizar__titulo" tabIndex={-1}>
          Mi cuenta
        </h2>
        <p className="aviso-ambar">Para ver su cuenta, ingrese con su correo (enlace "Ingresar", arriba).</p>
      </main>
    )
  }

  const avisar = (seccion, tipo, texto) => setMensajes((m) => ({ ...m, [seccion]: { tipo, texto } }))

  const guardarNombre = async (e) => {
    e.preventDefault()
    if (!nuevoNombre.trim()) {
      avisar('nombre', 'error', 'Escriba su nombre completo.')
      return
    }
    setEnviando('nombre')
    try {
      const s = await guardarMiNombre(nuevoNombre)
      onNombre(s.nombre)
      setNuevoNombre(s.nombre)
      avisar('nombre', 'exito', 'Nombre guardado.')
    } catch (err) {
      revisarError(err)
      avisar('nombre', 'error', err.message)
    } finally {
      setEnviando(null)
    }
  }

  const guardarCorreo = async (e) => {
    e.preventDefault()
    if (!correo.trim() || !claveCorreo) {
      avisar('correo', 'error', 'Escriba el correo nuevo y su contraseña actual.')
      return
    }
    setEnviando('correo')
    try {
      await cambiarCorreo(correo.trim(), claveCorreo)
      setCorreo('')
      setClaveCorreo('')
      avisar('correo', 'exito', 'Correo cambiado. Úselo la próxima vez que ingrese.')
    } catch (err) {
      revisarError(err)
      setClaveCorreo('')
      avisar('correo', err.estado === 429 ? 'aviso' : 'error', err.message)
    } finally {
      setEnviando(null)
    }
  }

  const aviso = (seccion) => {
    const m = mensajes[seccion]
    if (!m) return null
    const clase = { exito: 'aviso-exito', aviso: 'aviso-ambar', error: 'aviso-error aviso-error--chico' }[m.tipo]
    return (
      <p className={clase} role={m.tipo === 'exito' ? 'status' : 'alert'} id={`cuenta-aviso-${seccion}`}>
        {m.texto}
      </p>
    )
  }

  return (
    <main className="contenedor actualizar">
      <div className="actualizar__cabeza">
        <h2 id="cuenta-titulo" className="actualizar__titulo" tabIndex={-1}>
          Mi cuenta
        </h2>
        <p className="texto-suave">Su nombre, el correo con el que ingresa y su contraseña.</p>
      </div>

      <form className="panel" onSubmit={guardarNombre} noValidate aria-labelledby="cuenta-nombre">
        <h3 id="cuenta-nombre" className="panel__titulo">
          Nombre
        </h3>
        {aviso('nombre')}
        <label className="campo campo--ancho">
          <span className="campo__etiqueta">Nombre completo</span>
          <input
            className="campo__entrada"
            name="nombre"
            autoComplete="name"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
          />
        </label>
        <div className="formulario__acciones formulario__acciones--izquierda">
          <button type="submit" className="boton boton--primario" disabled={enviando === 'nombre'}>
            {enviando === 'nombre' ? 'Guardando…' : 'Guardar el nombre'}
          </button>
        </div>
      </form>

      <form className="panel" onSubmit={guardarCorreo} noValidate aria-labelledby="cuenta-correo">
        <h3 id="cuenta-correo" className="panel__titulo">
          Correo de ingreso
        </h3>
        <p className="texto-suave">Para cambiarlo, confirme su contraseña actual.</p>
        {aviso('correo')}
        <label className="campo campo--ancho">
          <span className="campo__etiqueta">Correo nuevo</span>
          <input
            className="campo__entrada"
            type="email"
            name="correo-nuevo"
            autoComplete="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
        </label>
        <label className="campo campo--ancho">
          <span className="campo__etiqueta">Contraseña actual</span>
          <input
            className="campo__entrada"
            type="password"
            name="clave-actual"
            autoComplete="current-password"
            value={claveCorreo}
            onChange={(e) => setClaveCorreo(e.target.value)}
          />
        </label>
        <div className="formulario__acciones formulario__acciones--izquierda">
          <button type="submit" className="boton boton--primario" disabled={enviando === 'correo'}>
            {enviando === 'correo' ? 'Guardando…' : 'Cambiar el correo'}
          </button>
        </div>
      </form>

      <section className="panel" aria-labelledby="cuenta-clave">
        <h3 id="cuenta-clave" className="panel__titulo">
          Contraseña
        </h3>
        {aviso('clave')}
        <div className="formulario__acciones formulario__acciones--izquierda">
          <button type="button" className="boton boton--contorno" onClick={() => setCambiandoClave(true)}>
            Cambiar la contraseña
          </button>
        </div>
      </section>

      {cambiandoClave && (
        <DialogoClave
          onCambiar={async (actual, nueva) => {
            try {
              await cambiarClave(actual, nueva)
              avisar('clave', 'exito', 'Contraseña cambiada. Se cerraron sus otras sesiones abiertas.')
            } catch (err) {
              revisarError(err)
              throw err
            }
          }}
          onCerrar={() => setCambiandoClave(false)}
        />
      )}
    </main>
  )
}
