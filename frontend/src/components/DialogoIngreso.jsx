import { useEffect, useState } from 'react'
import Dialogo from './Dialogo.jsx'

/**
 * Formulario de inicio de sesión de la persona encargada. Enter envía. Mientras envía, el botón
 * queda deshabilitado; si hay bloqueo, avisa cuánto falta y no deja enviar hasta que pase.
 */
export default function DialogoIngreso({ onIngresar, onCerrar }) {
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [bloqueo, setBloqueo] = useState(null)

  // Al terminar el bloqueo se vuelve a habilitar el botón.
  useEffect(() => {
    if (!bloqueo) return undefined
    const espera = setTimeout(() => setBloqueo(null), bloqueo.segundos * 1000)
    return () => clearTimeout(espera)
  }, [bloqueo])

  const enviar = async (e) => {
    e.preventDefault()
    if (enviando || bloqueo) return
    if (!correo.trim() || !clave) {
      setError('Escriba el correo y la contraseña.')
      return
    }
    setEnviando(true)
    setError(null)
    try {
      await onIngresar(correo.trim(), clave)
    } catch (err) {
      setClave('')
      setEnviando(false)
      if (err.estado === 429) setBloqueo({ mensaje: err.message, segundos: err.esperaSegundos ?? 60 })
      else setError(err.message)
    }
  }

  const aviso = bloqueo?.mensaje ?? error
  return (
    <Dialogo
      id="ingreso"
      titulo="Ingresar"
      descripcion="Solo para la persona encargada de Gestión Documental. La consulta no necesita usuario."
      onCerrar={onCerrar}
    >
      <form className="formulario" onSubmit={enviar} noValidate>
        {aviso && (
          <p className={bloqueo ? 'aviso-ambar' : 'aviso-error aviso-error--chico'} role="alert" id="ingreso-aviso">
            {aviso}
          </p>
        )}
        <label className="campo">
          <span className="campo__etiqueta">Correo</span>
          <input
            className="campo__entrada"
            type="email"
            name="correo"
            autoComplete="username"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={aviso ? 'ingreso-aviso' : undefined}
          />
        </label>
        <label className="campo">
          <span className="campo__etiqueta">Contraseña</span>
          <input
            className="campo__entrada"
            type="password"
            name="clave"
            autoComplete="current-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={aviso ? 'ingreso-aviso' : undefined}
          />
        </label>
        <div className="formulario__acciones">
          <button type="button" className="boton boton--contorno-gris" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="boton boton--primario" disabled={enviando || Boolean(bloqueo)}>
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </div>
      </form>
    </Dialogo>
  )
}
