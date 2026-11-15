const VERSIONES = [
  { valor: '11', texto: 'TRD 11', detalle: 'vigente' },
  { valor: '10', texto: 'TRD 10', detalle: '2020' },
]

/** Selector de la versión de la TRD: TRD 11 · vigente / TRD 10 · 2020. */
export default function SelectorTrd({ valor, onCambiar }) {
  return (
    <fieldset className="segmentado">
      <legend className="solo-lector">Versión de la tabla de retención</legend>
      {VERSIONES.map((v) => (
        <label key={v.valor} className={valor === v.valor ? 'segmentado__opcion activa' : 'segmentado__opcion'}>
          <input
            type="radio"
            name="trd"
            value={v.valor}
            checked={valor === v.valor}
            onChange={() => onCambiar(v.valor)}
          />
          <span>
            <strong>{v.texto}</strong> · <span className="segmentado__detalle">{v.detalle}</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}
