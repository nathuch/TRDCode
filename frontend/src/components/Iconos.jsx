/** Íconos en SVG dentro del código: no dependen de internet ni de una fuente de íconos. */

function Icono({ children, tamano = 16, ...props }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export const IconoLupa = (p) => (
  <Icono {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icono>
)

export const IconoCalendario = (p) => (
  <Icono {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 10h18" />
  </Icono>
)

export const IconoFiltros = (p) => (
  <Icono {...p}>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </Icono>
)

export const IconoFlecha = ({ direccion = 'abajo', ...p }) => {
  const giro = { abajo: 0, arriba: 180, derecha: -90, izquierda: 90 }[direccion]
  return (
    <Icono {...p} style={{ transform: `rotate(${giro}deg)` }}>
      <path d="m6 9 6 6 6-6" />
    </Icono>
  )
}

export const IconoDescarga = (p) => (
  <Icono {...p}>
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </Icono>
)

export const IconoAlerta = (p) => (
  <Icono {...p}>
    <path d="M12 3 2 20h20L12 3Z" />
    <path d="M12 10v4M12 17.5v.5" />
  </Icono>
)

export const IconoCandado = (p) => (
  <Icono {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icono>
)

export const IconoCerrar = (p) => (
  <Icono {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icono>
)
