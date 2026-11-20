const PATHS = {
  hoy: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  entrenar: <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />,
  ejercicios: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  progreso: (
    <>
      <path d="M4 16l5-5 4 3 7-8" />
      <path d="M15 6h5v5" />
    </>
  ),
  mas: (
    <>
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
    </>
  ),
  play: <path d="M8 5.5v13l10-6.5z" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  importar: (
    <>
      <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" />
      <path d="M5 19h14" />
    </>
  ),
  resumen: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="3" />
      <path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h3" />
    </>
  ),
  backup: (
    <>
      <path d="M7 18a4.5 4.5 0 01-.6-8.96A6 6 0 0118 9.5 4 4 0 0117.5 18" />
      <path d="M12 12v8M9 15l3-3 3 3" />
    </>
  ),
  inicio: (
    <>
      <rect x="6" y="2.5" width="12" height="19" rx="3" />
      <path d="M12 8.5v6M9 11.5h6" />
    </>
  ),
  rutina: <path d="M4 6h16M4 12h16M4 18h10" />,
  buscar: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  cerrar: <path d="M6 6l12 12M18 6L6 18" />,
  alerta: (
    <>
      <path d="M12 3.5l9.5 16.5h-19z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  video: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="3.5" />
      <path d="M10.5 9.5v5l4.5-2.5z" />
    </>
  ),
  camara: (
    <>
      <path d="M4 8.5h3l1.5-2.5h7L17 8.5h3v10.5H4z" />
      <circle cx="12" cy="13.5" r="3.2" />
    </>
  ),
  pegar: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2.5" />
      <path d="M9.5 4V2.8h5V4M9.5 11h5M9.5 15h5" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5M9.5 2.5h5" />
    </>
  ),
  trofeo: (
    <>
      <path d="M8 4h8v5a4 4 0 01-8 0z" />
      <path d="M8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8.5 20h7M10 17h4v3h-4z" />
    </>
  ),
  voley: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5c-1 4 0 8 3.5 10.5M5 7.5c3.5 1.5 6 4.5 7 9M20 9c-4-.5-7.5 1-10 4.5" />
    </>
  ),
  sol: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  basura: <path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13" />,
  copiar: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V5.5A1.5 1.5 0 0014.5 4h-9A1.5 1.5 0 004 5.5v9A1.5 1.5 0 005.5 16H8" />
    </>
  ),
  editar: <path d="M5 19l1-4L15.5 5.5a2.1 2.1 0 013 3L9 18zM14 7l3 3" />,
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 24, filled = false }: { name: IconName; size?: number; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
