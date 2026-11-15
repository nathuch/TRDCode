import { useEffect, useRef, useState } from 'react'
import { cambiarClave, cerrarSesion, iniciarSesion, obtenerSesion } from '../api/cliente.js'
import DialogoClave from './DialogoClave.jsx'
import DialogoIngreso from './DialogoIngreso.jsx'
import { IconoFlecha } from './Iconos.jsx'

/**
 * Acceso de la persona encargada, en el encabezado. Sin sesión es un enlace discreto "Ingresar";
 * con sesión, su nombre abre un menú con "Cambiar contraseña" y "Salir". La consulta no cambia.
 */
export default function Acceso() {
  const [nombre, setNombre] = useState(null)
  const [dialogo, setDialogo] = useState(null)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const contenedor = useRef(null)
  const botonUsuaria = useRef(null)
  const botonIngresar = useRef(null)
  // Al cerrar un diálogo, entrar o salir, el foco vuelve al botón del encabezado que corresponda
  // (al entrar o salir, el que se usó desaparece).
  const moverFoco = useRef(false)

  useEffect(() => {
    obtenerSesion()
      .then((s) => setNombre(s.sesion ? s.nombre : null))
      .catch(() => setNombre(null))
  }, [])

  useEffect(() => {
    if (!moverFoco.current || dialogo !== null) return
    moverFoco.current = false
    ;(nombre === null ? botonIngresar : botonUsuaria).current?.focus()
  }, [nombre, dialogo])

  // El menú se cierra con Esc o con un clic fuera de él.
  useEffect(() => {
    if (!menuAbierto) return undefined
    const alHacerClic = (e) => !contenedor.current?.contains(e.target) && setMenuAbierto(false)
    const alTeclear = (e) => {
      if (e.key === 'Escape') {
        setMenuAbierto(false)
        botonUsuaria.current?.focus()
      }
    }
    document.addEventListener('mousedown', alHacerClic)
    document.addEventListener('keydown', alTeclear)
    return () => {
      document.removeEventListener('mousedown', alHacerClic)
      document.removeEventListener('keydown', alTeclear)
    }
  }, [menuAbierto])

  const ingresar = async (correo, clave) => {
    const s = await iniciarSesion(correo, clave)
    moverFoco.current = true
    setNombre(s.nombre)
    setDialogo(null)
  }

  const cambiar = async (actual, nueva) => {
    try {
      await cambiarClave(actual, nueva)
    } catch (e) {
      if (e.estado === 401) setNombre(null)
      throw e
    }
  }

  const salir = async () => {
    setSaliendo(true)
    try {
      await cerrarSesion()
      setMenuAbierto(false)
      moverFoco.current = true
      setNombre(null)
    } catch (e) {
      window.alert(`No se pudo cerrar la sesión: ${e.message}`)
    } finally {
      setSaliendo(false)
    }
  }

  const abrirDialogo = (cual) => {
    setMenuAbierto(false)
    setDialogo(cual)
  }

  const cerrarDialogo = () => {
    moverFoco.current = true
    setDialogo(null)
  }

  return (
    <div className="acceso" ref={contenedor}>
      {nombre === null ? (
        <button
          type="button"
          className="acceso__enlace"
          ref={botonIngresar}
          onClick={() => abrirDialogo('ingreso')}
        >
          Ingresar
        </button>
      ) : (
        <>
          <button
            type="button"
            className="acceso__usuaria"
            ref={botonUsuaria}
            aria-expanded={menuAbierto}
            aria-controls="acceso-menu"
            onClick={() => setMenuAbierto((a) => !a)}
          >
            <span className="solo-lector">Sesión iniciada: </span>
            <span className="acceso__nombre">{nombre}</span>
            <IconoFlecha direccion={menuAbierto ? 'arriba' : 'abajo'} />
          </button>
          {menuAbierto && (
            <div className="acceso__menu" id="acceso-menu">
              <button type="button" className="acceso__opcion" onClick={() => abrirDialogo('clave')}>
                Cambiar contraseña
              </button>
              <button type="button" className="acceso__opcion" onClick={salir} disabled={saliendo}>
                {saliendo ? 'Saliendo…' : 'Salir'}
              </button>
            </div>
          )}
        </>
      )}

      {dialogo === 'ingreso' && <DialogoIngreso onIngresar={ingresar} onCerrar={cerrarDialogo} />}
      {dialogo === 'clave' && <DialogoClave onCambiar={cambiar} onCerrar={cerrarDialogo} />}
    </div>
  )
}
