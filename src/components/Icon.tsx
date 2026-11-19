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
  rutina: (
    <>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </>
  ),
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
