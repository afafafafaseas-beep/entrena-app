import { fechaCorta } from '../lib/sesion'

export interface Serie {
  nombre: string
  color: string
  puntos: { x: number; y: number }[]
}

const A = 340
const H = 170
const M = { izq: 34, der: 10, arr: 12, aba: 24 }

const n1 = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',')

/** Gráfico de líneas simple en SVG. `x` es una fecha (ms). */
export function GraficoLineas({
  series,
  yMin,
  yMax,
  zonas,
  etiqueta,
}: {
  series: Serie[]
  yMin?: number
  yMax?: number
  zonas?: { desde: number; hasta: number; color: string }[]
  etiqueta?: string
}) {
  const todos = series.flatMap((s) => s.puntos)
  if (!todos.length) return <p className="nada">Todavía no hay datos.</p>
  const xs = todos.map((p) => p.x)
  const ys = todos.map((p) => p.y)
  let x0 = Math.min(...xs)
  let x1 = Math.max(...xs)
  if (x0 === x1) {
    x0 -= 86400000
    x1 += 86400000
  }
  let y0 = yMin ?? Math.min(...ys)
  let y1 = yMax ?? Math.max(...ys)
  if (y0 === y1) {
    y0 -= 1
    y1 += 1
  }
  if (yMin === undefined) y0 = Math.max(0, y0 - (y1 - y0) * 0.15)
  if (yMax === undefined) y1 = y1 + (y1 - y0) * 0.15
  const px = (x: number) => M.izq + ((x - x0) / (x1 - x0)) * (A - M.izq - M.der)
  const py = (y: number) => M.arr + (1 - (y - y0) / (y1 - y0)) * (H - M.arr - M.aba)

  return (
    <figure className="grafico">
      <svg viewBox={`0 0 ${A} ${H}`} role="img" aria-label={etiqueta}>
        {zonas?.map((z, i) => (
          <rect key={i} x={M.izq} width={A - M.izq - M.der} y={py(z.hasta)} height={py(z.desde) - py(z.hasta)} fill={z.color} />
        ))}
        {[y0, (y0 + y1) / 2, y1].map((y, i) => (
          <g key={i}>
            <line x1={M.izq} x2={A - M.der} y1={py(y)} y2={py(y)} className="grafico__linea-guia" />
            <text x={M.izq - 6} y={py(y) + 4} className="grafico__eje" textAnchor="end">
              {n1(y)}
            </text>
          </g>
        ))}
        <text x={M.izq} y={H - 6} className="grafico__eje">
          {fechaCorta(x0)}
        </text>
        <text x={A - M.der} y={H - 6} className="grafico__eje" textAnchor="end">
          {fechaCorta(x1)}
        </text>
        {series.map((s) => (
          <g key={s.nombre}>
            {s.puntos.length > 1 && (
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={s.puntos.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')}
              />
            )}
            {s.puntos.map((p, i) => (
              <circle key={i} cx={px(p.x)} cy={py(p.y)} r="4" fill={s.color} />
            ))}
          </g>
        ))}
      </svg>
      {series.length > 1 && (
        <figcaption className="grafico__leyenda">
          {series.map((s) => (
            <span key={s.nombre}>
              <i style={{ background: s.color }} />
              {s.nombre}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  )
}

/** Barras por semana (gym y vóley apilados). */
export function GraficoSemanas({ semanas }: { semanas: { desde: number; gym: number; voley: number }[] }) {
  const max = Math.max(3, ...semanas.map((s) => s.gym + s.voley))
  const ancho = (A - M.izq - M.der) / semanas.length
  const py = (y: number) => M.arr + (1 - y / max) * (H - M.arr - M.aba)
  return (
    <figure className="grafico">
      <svg viewBox={`0 0 ${A} ${H}`} role="img" aria-label="Sesiones por semana">
        <line x1={M.izq} x2={A - M.der} y1={py(3)} y2={py(3)} className="grafico__meta" />
        <text x={M.izq - 6} y={py(3) + 4} className="grafico__eje" textAnchor="end">
          3
        </text>
        {semanas.map((s, i) => {
          const x = M.izq + i * ancho + ancho * 0.18
          const w = ancho * 0.64
          return (
            <g key={i}>
              {s.gym > 0 && <rect x={x} width={w} y={py(s.gym)} height={py(0) - py(s.gym)} rx="4" fill="var(--accent)" />}
              {s.voley > 0 && (
                <rect x={x} width={w} y={py(s.gym + s.voley)} height={py(s.gym) - py(s.gym + s.voley)} rx="4" fill="#3e8bff" />
              )}
              <text x={x + w / 2} y={H - 6} className="grafico__eje" textAnchor="middle">
                {fechaCorta(s.desde)}
              </text>
            </g>
          )
        })}
      </svg>
      <figcaption className="grafico__leyenda">
        <span>
          <i style={{ background: 'var(--accent)' }} />
          Gym
        </span>
        <span>
          <i style={{ background: '#3e8bff' }} />
          Vóley
        </span>
      </figcaption>
    </figure>
  )
}
