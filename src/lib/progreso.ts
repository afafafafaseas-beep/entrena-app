import type { Sesion, Voley } from '../db'
import { inicioSemana } from './sesion'
import { normalizar } from './texto'

export type Campo = 'kg' | 'cm' | 'reps'

const DIA = 24 * 3600 * 1000

/** Qué conviene mirar de un ejercicio: kilos si alguna vez anotó kilos, si no cm, si no reps. */
export function campoPrincipal(sesiones: Sesion[], nombre: string): Campo | undefined {
  const k = normalizar(nombre)
  let hay: Record<Campo, boolean> = { kg: false, cm: false, reps: false }
  for (const s of sesiones)
    for (const e of s.ejercicios)
      if (normalizar(e.nombre) === k)
        for (const x of e.series)
          if (x.ok) hay = { kg: hay.kg || x.kg !== undefined, cm: hay.cm || x.cm !== undefined, reps: hay.reps || x.reps !== undefined }
  return hay.kg ? 'kg' : hay.cm ? 'cm' : hay.reps ? 'reps' : undefined
}

/** Mejor valor tildado de cada sesión para un ejercicio, en orden de fecha. */
export function evolucion(sesiones: Sesion[], nombre: string, campo: Campo): { inicio: number; valor: number }[] {
  const k = normalizar(nombre)
  const out: { inicio: number; valor: number }[] = []
  for (const s of [...sesiones].sort((a, b) => a.inicio - b.inicio)) {
    let mejor: number | undefined
    for (const e of s.ejercicios)
      if (normalizar(e.nombre) === k)
        for (const x of e.series) {
          const v = x[campo]
          if (x.ok && v !== undefined && (mejor === undefined || v > mejor)) mejor = v
        }
    if (mejor !== undefined) out.push({ inicio: s.inicio, valor: mejor })
  }
  return out
}

/** La mejor marca antes de cierto momento (para avisar récords). */
export function mejorMarca(sesiones: Sesion[], nombre: string, campo: Campo, antesDe = Infinity): number | undefined {
  const ev = evolucion(
    sesiones.filter((s) => s.inicio < antesDe),
    nombre,
    campo,
  )
  return ev.length ? Math.max(...ev.map((p) => p.valor)) : undefined
}

/** 1RM estimado (Brzycki). Solo tiene sentido con 10 reps o menos. */
export function unoRM(kg: number, reps: number): number | undefined {
  if (reps < 1 || reps > 10) return undefined
  return Math.round(((kg * 36) / (37 - reps)) * 2) / 2
}

export interface Marca {
  nombre: string
  campo: Campo
  valor: number
  inicio: number
  rm?: number
}

/** Los récords de cada ejercicio (kilos o centímetros). */
export function records(sesiones: Sesion[]): Marca[] {
  const nombres = new Map<string, string>()
  for (const s of sesiones) for (const e of s.ejercicios) nombres.set(normalizar(e.nombre), e.nombre)
  const out: Marca[] = []
  for (const nombre of nombres.values()) {
    const campo = campoPrincipal(sesiones, nombre)
    if (campo !== 'kg' && campo !== 'cm') continue
    let mejor: Marca | undefined
    for (const s of sesiones)
      for (const e of s.ejercicios)
        if (normalizar(e.nombre) === normalizar(nombre))
          for (const x of e.series) {
            const v = x[campo]
            if (x.ok && v !== undefined && (!mejor || v > mejor.valor)) {
              mejor = { nombre, campo, valor: v, inicio: s.inicio, rm: campo === 'kg' && x.reps ? unoRM(v, x.reps) : undefined }
            }
          }
    if (mejor) out.push(mejor)
  }
  return out.sort((a, b) => b.inicio - a.inicio)
}

/** Sesiones de gym y de vóley por semana (de lunes a domingo), las últimas `n`. */
export function porSemana(sesiones: Sesion[], voley: Voley[], n = 8, hoy = new Date()) {
  const fin = inicioSemana(hoy) + 7 * DIA
  return Array.from({ length: n }, (_, i) => {
    const desde = fin - (n - i) * 7 * DIA
    const hasta = desde + 7 * DIA
    const en = (t: number) => t >= desde && t < hasta
    return { desde, gym: sesiones.filter((s) => en(s.inicio)).length, voley: voley.filter((v) => en(v.inicio)).length }
  })
}

/** Ejercicios con datos para graficar, del más reciente al más viejo. */
export function ejerciciosConDatos(sesiones: Sesion[]): { nombre: string; campo: Campo }[] {
  const vistos = new Map<string, string>()
  for (const s of [...sesiones].sort((a, b) => b.inicio - a.inicio))
    for (const e of s.ejercicios)
      if (e.tipo === 'fuerza' && e.series.some((x) => x.ok) && !vistos.has(normalizar(e.nombre))) vistos.set(normalizar(e.nombre), e.nombre)
  return [...vistos.values()]
    .map((nombre) => ({ nombre, campo: campoPrincipal(sesiones, nombre)! }))
    .filter((x) => x.campo)
}
