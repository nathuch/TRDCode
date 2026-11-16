import { useCallback, useEffect, useState } from 'react'
import { cambiarEstadoUsuario, guardarUsuario, obtenerUsuarios, ponerClaveTemporal } from '../api/cliente.js'
import { fechaHora } from '../utils/formato.js'
import Dialogo from './Dialogo.jsx'

const MINIMO = 10

/**
 * "Usuarios" (RF-17), para cualquier cuenta con sesión (todas administran): crear cuentas, editar el
 * nombre y el correo de otra, ponerle una contraseña temporal y activarla o desactivarla. La propia
 * cuenta se edita en "Mi cuenta" y la del sistema no se toca. Las cuentas no se borran: las cargas
 * guardan quién las hizo.
 */
export default function Usuarios({ nombre, revisarError, onIr }) {
  const [cuentas, setCuentas] = useState(null)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [dialogo, setDialogo] = useState(null)

  const cargar = useCallback(() => {
    obtenerUsuarios()
      .then((lista) => {
        setCuentas(lista)
        setError(null)
      })
      .catch((e) => {
        revisarError(e)
        setError(e.message)
      })
  }, [revisarError])

  useEffect(() => {
    if (nombre) cargar()
  }, [nombre, cargar])

  if (!nombre) {
    return (
      <main className="contenedor actualizar">
        <h2 id="usuarios-titulo" className="actualizar__titulo" tabIndex={-1}>
          Usuarios
        </h2>
        <p className="aviso-ambar">Para administrar las cuentas, ingrese con su correo (enlace "Ingresar", arriba).</p>
      </main>
    )
  }

  /** Corre una acción del servidor; si sale bien, muestra el mensaje y recarga la lista. */
  const hacer = async (accion, mensaje) => {
    try {
      await accion()
      setAviso(mensaje)
      setError(null)
      setDialogo(null)
      cargar()
    } catch (e) {
      revisarError(e)
      throw e
    }
  }

  const activar = (c) =>
    hacer(() => cambiarEstadoUsuario(c.id, true), `La cuenta de ${c.nombre} quedó activa.`).catch((e) => setError(e.message))

  return (
    <main className="contenedor actualizar">
      <div className="actualizar__cabeza">
        <h2 id="usuarios-titulo" className="actualizar__titulo" tabIndex={-1}>
          Usuarios
        </h2>
        <p className="texto-suave">
          Las cuentas que pueden actualizar los datos. Todas administran las demás. Las cuentas no se borran, porque
          las cargas guardan quién las hizo: se desactivan.
        </p>
      </div>

      <section className="panel" aria-labelledby="usuarios-lista">
        <div className="panel__cabeza">
          <h3 id="usuarios-lista" className="panel__titulo">
            Cuentas
          </h3>
          <button type="button" className="boton boton--primario boton--chico" onClick={() => setDialogo({ tipo: 'nueva' })}>
            Nueva cuenta
          </button>
        </div>
        {aviso && (
          <p className="aviso-exito" role="status">
            {aviso}
          </p>
        )}
        {error && (
          <p className="aviso-error aviso-error--chico" role="alert">
            {error}
          </p>
        )}
        {cuentas === null && !error && <p className="texto-suave">Cargando las cuentas…</p>}
        {cuentas && (
          <div className="tabla-caja">
            <table className="tabla tabla--compacta tabla--apilable tabla--usuarios">
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Correo</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Último ingreso</th>
                  <th scope="col">
                    <span className="solo-lector">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cuentas.map((c) => (
                  <tr key={c.id} className={c.activo ? undefined : 'cuenta-inactiva'} data-cuenta={c.id}>
                    <td data-etiqueta="Nombre">
                      <span className="cuenta__nombre">
                        {c.nombre}
                        {c.es_yo && <span className="insignia">Usted</span>}
                        {c.es_sistema && <span className="insignia insignia--gris">Sistema</span>}
                      </span>
                    </td>
                    <td data-etiqueta="Correo" className="celda-correo">
                      {c.correo}
                    </td>
                    <td data-etiqueta="Estado">
                      <span className="cuenta__estado">
                        {c.es_sistema ? (
                          <span className="texto-suave">Registra la carga inicial</span>
                        ) : (
                          <span className={c.activo ? 'insignia' : 'insignia insignia--gris'}>{c.activo ? 'Activa' : 'Inactiva'}</span>
                        )}
                        {c.debe_cambiar_clave && <span className="insignia insignia--ambar">Contraseña temporal</span>}
                      </span>
                    </td>
                    <td data-etiqueta="Último ingreso">{c.ultimo_ingreso ? fechaHora(c.ultimo_ingreso) : 'Nunca'}</td>
                    <td className="celda-accion">
                      {c.es_sistema ? (
                        <span className="texto-suave">—</span>
                      ) : c.es_yo ? (
                        <button type="button" className="boton boton--enlace" onClick={() => onIr('cuenta')}>
                          Editar en Mi cuenta
                        </button>
                      ) : (
                        <span className="cuenta__acciones">
                          <button type="button" className="boton boton--contorno-gris boton--chico" onClick={() => setDialogo({ tipo: 'editar', cuenta: c })}>
                            Editar
                          </button>
                          <button type="button" className="boton boton--contorno-gris boton--chico" onClick={() => setDialogo({ tipo: 'clave', cuenta: c })}>
                            Contraseña temporal
                          </button>
                          {c.activo ? (
                            <button type="button" className="boton boton--contorno-gris boton--chico" onClick={() => setDialogo({ tipo: 'desactivar', cuenta: c })}>
                              Desactivar
                            </button>
                          ) : (
                            <button type="button" className="boton boton--contorno boton--chico" onClick={() => activar(c)}>
                              Activar
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(dialogo?.tipo === 'nueva' || dialogo?.tipo === 'editar') && (
        <DialogoCuenta
          cuenta={dialogo.cuenta}
          onCerrar={() => setDialogo(null)}
          onGuardar={(datos) =>
            hacer(
              () => guardarUsuario(datos),
              dialogo.cuenta
                ? `Se guardaron los cambios de ${datos.nombre.trim()}.`
                : `Cuenta creada. Entregue la contraseña temporal a ${datos.nombre.trim()}: al entrar deberá cambiarla.`,
            )
          }
        />
      )}
      {dialogo?.tipo === 'clave' && (
        <DialogoClaveTemporal
          cuenta={dialogo.cuenta}
          onCerrar={() => setDialogo(null)}
          onGuardar={(clave) =>
            hacer(
              () => ponerClaveTemporal(dialogo.cuenta.id, clave),
              `${dialogo.cuenta.nombre} tiene una contraseña temporal: deberá cambiarla al entrar. Sus sesiones abiertas se cerraron.`,
            )
          }
        />
      )}
      {dialogo?.tipo === 'desactivar' && (
        <DialogoDesactivar
          cuenta={dialogo.cuenta}
          onCerrar={() => setDialogo(null)}
          onConfirmar={() =>
            hacer(
              () => cambiarEstadoUsuario(dialogo.cuenta.id, false),
              `La cuenta de ${dialogo.cuenta.nombre} quedó inactiva y sus sesiones abiertas se cerraron.`,
            )
          }
        />
      )}
    </main>
  )
}

/** Campo de texto con etiqueta, para los diálogos de esta pantalla. */
function Campo({ etiqueta, ayuda, ...props }) {
  return (
    <label className="campo">
      <span className="campo__etiqueta">{etiqueta}</span>
      <input className="campo__entrada" {...props} />
      {ayuda && <span className="ayuda">{ayuda}</span>}
    </label>
  )
}

/** Envía un formulario de diálogo: valida, deshabilita el botón mientras tanto y muestra el error. */
function useEnvio(validar, enviar) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const alEnviar = async (e) => {
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
      await enviar()
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }
  const aviso = error && (
    <p className="aviso-error aviso-error--chico" role="alert">
      {error}
    </p>
  )
  return { enviando, alEnviar, aviso }
}

function Acciones({ enviando, texto, onCerrar }) {
  return (
    <div className="formulario__acciones">
      <button type="button" className="boton boton--contorno-gris" onClick={onCerrar}>
        Cancelar
      </button>
      <button type="submit" className="boton boton--primario" disabled={enviando}>
        {enviando ? 'Guardando…' : texto}
      </button>
    </div>
  )
}

/** Crear una cuenta (con contraseña temporal) o editar el nombre y el correo de otra. */
function DialogoCuenta({ cuenta, onGuardar, onCerrar }) {
  const [nombre, setNombre] = useState(cuenta?.nombre ?? '')
  const [correo, setCorreo] = useState(cuenta?.correo ?? '')
  const [clave, setClave] = useState('')
  const [repetida, setRepetida] = useState('')
  const { enviando, alEnviar, aviso } = useEnvio(
    () => {
      if (!nombre.trim() || !correo.trim()) return 'Escriba el nombre completo y el correo.'
      if (cuenta) return null
      if (clave.length < MINIMO) return `La contraseña temporal debe tener al menos ${MINIMO} caracteres.`
      if (clave !== repetida) return 'La contraseña temporal y su confirmación no coinciden.'
      return null
    },
    () => onGuardar(cuenta ? { id: cuenta.id, nombre, correo: correo.trim() } : { nombre, correo: correo.trim(), clave }),
  )
  return (
    <Dialogo
      id="cuenta-dialogo"
      titulo={cuenta ? `Editar la cuenta de ${cuenta.nombre}` : 'Nueva cuenta'}
      descripcion={cuenta ? undefined : 'La persona entra con una contraseña temporal y la cambia al ingresar por primera vez.'}
      onCerrar={onCerrar}
    >
      <form className="formulario" onSubmit={alEnviar} noValidate>
        {aviso}
        <Campo etiqueta="Nombre completo" name="nombre" autoComplete="off" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Campo etiqueta="Correo" name="correo" type="email" autoComplete="off" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        {!cuenta && (
          <>
            <Campo
              etiqueta="Contraseña temporal"
              name="clave"
              type="password"
              autoComplete="new-password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              ayuda={`Mínimo ${MINIMO} caracteres. Entréguesela a la persona por un medio seguro.`}
            />
            <Campo
              etiqueta="Repita la contraseña temporal"
              name="clave-repetida"
              type="password"
              autoComplete="new-password"
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
            />
          </>
        )}
        <Acciones enviando={enviando} texto={cuenta ? 'Guardar los cambios' : 'Crear la cuenta'} onCerrar={onCerrar} />
      </form>
    </Dialogo>
  )
}

/** Poner una contraseña temporal a otra cuenta. */
function DialogoClaveTemporal({ cuenta, onGuardar, onCerrar }) {
  const [clave, setClave] = useState('')
  const [repetida, setRepetida] = useState('')
  const { enviando, alEnviar, aviso } = useEnvio(
    () => {
      if (clave.length < MINIMO) return `La contraseña temporal debe tener al menos ${MINIMO} caracteres.`
      if (clave !== repetida) return 'La contraseña temporal y su confirmación no coinciden.'
      return null
    },
    () => onGuardar(clave),
  )
  return (
    <Dialogo
      id="clave-temporal"
      titulo={`Contraseña temporal para ${cuenta.nombre}`}
      descripcion="Deberá cambiarla al entrar. Sus sesiones abiertas se cerrarán."
      onCerrar={onCerrar}
    >
      <form className="formulario" onSubmit={alEnviar} noValidate>
        {aviso}
        <Campo
          etiqueta="Contraseña temporal"
          name="clave"
          type="password"
          autoComplete="new-password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          ayuda={`Mínimo ${MINIMO} caracteres.`}
        />
        <Campo
          etiqueta="Repita la contraseña temporal"
          name="clave-repetida"
          type="password"
          autoComplete="new-password"
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
        />
        <Acciones enviando={enviando} texto="Poner la contraseña temporal" onCerrar={onCerrar} />
      </form>
    </Dialogo>
  )
}

/** Confirmación para desactivar otra cuenta. */
function DialogoDesactivar({ cuenta, onConfirmar, onCerrar }) {
  const { enviando, alEnviar, aviso } = useEnvio(() => null, onConfirmar)
  return (
    <Dialogo
      id="desactivar"
      titulo={`¿Desactivar la cuenta de ${cuenta.nombre}?`}
      descripcion="No podrá entrar hasta que alguien la active de nuevo, y sus sesiones abiertas se cerrarán. Sus cargas se conservan."
      onCerrar={onCerrar}
    >
      <form className="formulario" onSubmit={alEnviar}>
        {aviso}
        <Acciones enviando={enviando} texto="Desactivar" onCerrar={onCerrar} />
      </form>
    </Dialogo>
  )
}
