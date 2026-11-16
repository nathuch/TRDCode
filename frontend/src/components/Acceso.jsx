import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { iniciarSesion } from '../api/cliente.js'
import { encajarMenu } from '../utils/menus.js'
import DialogoIngreso from './DialogoIngreso.jsx'
import { IconoFlecha } from './Iconos.jsx'

const OPCIONES = [
  { vista: 'actualizar', texto: 'Actualizar datos' },
  { vista: 'usuarios', texto: 'Usuarios' },
  { vista: 'cuenta', texto: 'Mi cuenta' },
]

/**
 * Acceso de la persona encargada, en el encabezado. Sin sesión es un enlace discreto "Ingresar";
 * con sesión, su nombre abre un menú con "Actualizar datos", "Usuarios", "Mi cuenta" y "Salir".
 * La sesión la guarda App: onSesion recibe { nombre, debeCambiarClave } al entrar, onIr abre una
 * pantalla y onSalir cierra la sesión.
 */
export default function Acceso({ nombre, onSesion, onIr, onSalir }) {
  const [ingresando, setIngresando] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const contenedor = useRef(null)
  const botonUsuaria = useRef(null)
  const botonIngresar = useRef(null)
  const menu = useRef(null)
  // Al cerrar el ingreso, entrar o salir, el foco vuelve al botón del encabezado que corresponda
  // (al entrar o salir, el que se usó desaparece).
  const moverFoco = useRef(false)

  useEffect(() => {
    if (!moverFoco.current || ingresando) return
    moverFoco.current = false
    ;(nombre === null ? botonIngresar : botonUsuaria).current?.focus()
  }, [nombre, ingresando])

  // El menú queda completo en la pantalla (en celular el botón queda a la izquierda), también al girarla.
  useLayoutEffect(() => {
    if (!menuAbierto) return undefined
    const encajar = () => encajarMenu(menu.current)
    encajar()
    window.addEventListener('resize', encajar)
    return () => window.removeEventListener('resize', encajar)
  }, [menuAbierto])

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
    onSesion(s)
    setIngresando(false)
  }

  const salir = async () => {
    setSaliendo(true)
    try {
      moverFoco.current = true
      await onSalir()
      setMenuAbierto(false)
    } catch (e) {
      moverFoco.current = false
      window.alert(`No se pudo cerrar la sesión: ${e.message}`)
    } finally {
      setSaliendo(false)
    }
  }

  return (
    <div className="acceso" ref={contenedor}>
      {nombre === null ? (
        <button
          type="button"
          className="acceso__enlace"
          ref={botonIngresar}
          onClick={() => setIngresando(true)}
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
            <div className="acceso__menu" id="acceso-menu" ref={menu}>
              {OPCIONES.map((o) => (
                <button
                  key={o.vista}
                  type="button"
                  className="acceso__opcion"
                  onClick={() => {
                    setMenuAbierto(false)
                    onIr(o.vista)
                  }}
                >
                  {o.texto}
                </button>
              ))}
              <button type="button" className="acceso__opcion" onClick={salir} disabled={saliendo}>
                {saliendo ? 'Saliendo…' : 'Salir'}
              </button>
            </div>
          )}
        </>
      )}

      {ingresando && (
        <DialogoIngreso
          onIngresar={ingresar}
          onCerrar={() => {
            moverFoco.current = true
            setIngresando(false)
          }}
        />
      )}
    </div>
  )
}
