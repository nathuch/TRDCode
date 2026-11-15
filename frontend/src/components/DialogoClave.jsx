import { useState } from 'react'
import Dialogo from './Dialogo.jsx'

const MINIMO = 10

/** Formulario para cambiar la contraseña: la actual, la nueva (mínimo 10 caracteres) y su confirmación. */
export default function DialogoClave({ onCambiar, onCerrar }) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [listo, setListo] = useState(false)

  const validar = () => {
    if (!actual || !nueva || !repetida) return 'Complete los tres campos.'
    if (nueva.length < MINIMO) return `La nueva contraseña debe tener al menos ${MINIMO} caracteres.`
    if (nueva !== repetida) return 'La nueva contraseña y su confirmación no coinciden.'
    if (nueva === actual) return 'La nueva contraseña debe ser distinta de la actual.'
    return null
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (enviando) return
    const problema = validar()
    if (problema) {
      setError(problema)
      return
    }
    setEnviando(true)
    setError(null)
    try {
      await onCambiar(actual, nueva)
      setListo(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  if (listo) {
    return (
      // key: se monta de nuevo para que el foco pase a esta vista
      <Dialogo key="listo" id="clave" titulo="Cambiar contraseña" onCerrar={onCerrar}>
        <p className="aviso-exito" role="status">
          La contraseña se cambió. Úsela la próxima vez que ingrese.
        </p>
        <div className="formulario__acciones">
          <button type="button" className="boton boton--primario" onClick={onCerrar}>
            Listo
          </button>
        </div>
      </Dialogo>
    )
  }

  const campo = (etiqueta, valor, cambiar, autoComplete, ayuda) => (
    <label className="campo">
      <span className="campo__etiqueta">{etiqueta}</span>
      <input
        className="campo__entrada"
        type="password"
        autoComplete={autoComplete}
        value={valor}
        onChange={(e) => cambiar(e.target.value)}
        aria-describedby={error ? 'clave-aviso' : undefined}
      />
      {ayuda && <span className="ayuda">{ayuda}</span>}
    </label>
  )

  return (
    <Dialogo id="clave" titulo="Cambiar contraseña" onCerrar={onCerrar}>
      <form className="formulario" onSubmit={enviar} noValidate>
        {error && (
          <p className="aviso-error aviso-error--chico" role="alert" id="clave-aviso">
            {error}
          </p>
        )}
        {campo('Contraseña actual', actual, setActual, 'current-password')}
        {campo('Nueva contraseña', nueva, setNueva, 'new-password', `Mínimo ${MINIMO} caracteres.`)}
        {campo('Repita la nueva contraseña', repetida, setRepetida, 'new-password')}
        <div className="formulario__acciones">
          <button type="button" className="boton boton--contorno-gris" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="boton boton--primario" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </div>
      </form>
    </Dialogo>
  )
}
