import { disposiciones } from '../utils/formato.js'

/** Etiquetas de disposición final con sigla y nombre: CT verde, S azul, E naranja; MT, M y D en gris. */
export default function Disposicion({ codigos }) {
  const lista = disposiciones(codigos)
  if (lista.length === 0) return <span className="texto-suave">—</span>
  return (
    <span className="disposiciones">
      {lista.map((d) => (
        <span key={d.sigla} className={`disp disp--${d.sigla.toLowerCase()}`}>
          <strong>{d.sigla}</strong> {d.nombre}
        </span>
      ))}
    </span>
  )
}
