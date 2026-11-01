import { formatoNumero } from '../utils/formato.js'

/** Tarjetas de totales de lo filtrado. */
export default function Resumen({ totales }) {
  const tarjetas = [
    { valor: totales.expedientes, texto: 'Expedientes' },
    { valor: totales.con, texto: 'Series y subseries con expedientes' },
    { valor: totales.sin, texto: 'Aplican, sin expedientes' },
    { valor: totales.fuera, texto: 'Fuera de la TRD', alerta: totales.fuera > 0 },
  ]
  return (
    <div className="resumen">
      {tarjetas.map((t) => (
        <div key={t.texto} className={t.alerta ? 'tarjeta tarjeta--alerta' : 'tarjeta'}>
          <span className="tarjeta__valor">{formatoNumero(t.valor)}</span>
          <span className="tarjeta__texto">{t.texto}</span>
        </div>
      ))}
    </div>
  )
}
