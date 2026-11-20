import type { Sesion } from '../db'
import type { Dia, Prescripto, Rutina } from './rutina'
import { seriesDe } from './rutina'
import { normalizar } from './texto'

/** Sesión en curso: lo que se va anotando + una copia del día (por si cambia la rutina en el medio). */
export interface EnCurso {
  sesion: Omit<Sesion, 'fin' | 'minutos'>
  dia: Dia
  notas?: string // notas de la rutina del PF
}

export type Serie = Sesion['ejercicios'][number]['series'][number]

const id = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

/** Fecha local como "2026-11-19". */
export function fechaISO(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** "20/11" */
export function fechaCorta(ms: number): string {
  const d = new Date(ms)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export function nuevaSesion(rutina: Rutina, dia: Dia, ahora = Date.now()): EnCurso {
  return {
    dia,
    notas: rutina.notas || undefined,
    sesion: {
      id: id(),
      fecha: fechaISO(ahora),
      inicio: ahora,
      diaId: dia.id,
      diaNombre: dia.nombre,
      rutinaNombre: rutina.nombre,
      ejercicios: dia.bloques.flatMap((b) =>
        b.ejercicios.map((e) => ({
          nombre: e.nombre,
          bloque: b.nombre,
          tipo: b.tipo,
          hecho: false,
          series: b.tipo === 'fuerza' ? Array.from({ length: seriesDe(e, b) }, () => ({ ok: false })) : [],
          ...(b.tipo === 'fuerza' && medidaDe(e).segunda === 'seg' ? { unidad: 'seg' as const } : {}),
          ...(b.tipo === 'fuerza' && medidaDe(e).segunda === 'cm' ? { unidad: 'cm' as const } : {}),
        })),
      ),
    },
  }
}

export function terminarSesion(c: EnCurso, ahora = Date.now()): Sesion {
  return {
    ...c.sesion,
    fin: ahora,
    minutos: Math.max(1, Math.round((ahora - c.sesion.inicio) / 60000)),
    ejercicios: c.sesion.ejercicios.map((e) => (e.tipo === 'fuerza' ? { ...e, hecho: e.series.some((s) => s.ok) } : e)),
  }
}

/** El día que sigue al último que hizo (1 → 2 → 3 → 1). Sin sesiones, el primero. */
export function proximoDia(rutina: Rutina, sesiones: Sesion[]): Dia {
  const ultima = [...sesiones].sort((a, b) => b.inicio - a.inicio)[0]
  if (!ultima) return rutina.dias[0]
  let i = rutina.dias.findIndex((d) => d.id === ultima.diaId)
  if (i === -1) i = rutina.dias.findIndex((d) => normalizar(d.nombre) === normalizar(ultima.diaNombre))
  return i === -1 ? rutina.dias[0] : rutina.dias[(i + 1) % rutina.dias.length]
}

export type Valores = { kg?: number; reps?: number; cm?: number }

export interface UltimaVez {
  inicio: number
  series: Valores[]
  rpe?: number
}

/** Lo que hizo la última vez en ese ejercicio (solo series tildadas con algún número). */
export function ultimaVez(sesiones: Sesion[], nombre: string, antesDe = Infinity): UltimaVez | undefined {
  const k = normalizar(nombre)
  const orden = [...sesiones].filter((s) => s.inicio < antesDe).sort((a, b) => b.inicio - a.inicio)
  for (const s of orden) {
    const e = s.ejercicios.find((x) => normalizar(x.nombre) === k)
    const ok = e?.series.filter((x) => x.ok && (x.kg !== undefined || x.reps !== undefined || x.cm !== undefined)) ?? []
    if (e && ok.length) return { inicio: s.inicio, series: ok.map(({ kg, reps, cm }) => ({ kg, reps, cm })), rpe: e.rpe }
  }
  return undefined
}

const num = (n: number) => String(n).replace('.', ',')

/** Qué se anota en cada serie de un ejercicio de fuerza. */
export interface Medida {
  kg: boolean
  segunda: 'reps' | 'seg' | 'cm' | null // null = solo tildar (ej: intervalos de bici)
}

export function medidaDe(p: Prescripto, ultima?: UltimaVez): Medida {
  const reps = p.reps ?? ''
  const carga = p.carga ?? ''
  if (/anot\w*\b.*\bcm\b/i.test(p.nota ?? '') || /\bcm\b/i.test(reps)) return { kg: false, segunda: 'cm' }
  if (/\d+\s*seg.*\/.*\d+\s*seg/i.test(reps)) return { kg: false, segunda: null } // "8 seg fuerte / 40 seg suave"
  const segunda = /\bseg\b|\bs\b|"/i.test(reps) ? 'seg' : 'reps'
  const kg = kgDeCarga(carga) !== undefined || /\bkg\b/i.test(carga) || !!ultima?.series.some((s) => s.kg !== undefined)
  return { kg, segunda }
}

export function textoSerie(s: Valores, m?: Medida): string {
  if (s.cm !== undefined) return `${num(s.cm)} cm`
  const unidad = m?.segunda === 'seg' ? '"' : ''
  if (s.kg !== undefined && s.reps !== undefined) return `${num(s.kg)}×${s.reps}${unidad}`
  if (s.kg !== undefined) return `${num(s.kg)} kg`
  return m?.segunda === 'seg' ? `${s.reps}"` : `${s.reps} reps`
}

/** "Última vez (20/11): 50×4 · 55×4 · 55×4" */
export function textoUltimaVez(u: UltimaVez, m?: Medida): string {
  return `Última vez (${fechaCorta(u.inicio)}): ${u.series.map((s) => textoSerie(s, m)).join(' · ')}`
}

/** "3 × 6" · "2 series de 2 × 20 seg" · "1 × 8 seg fuerte / 40 seg suave" */
export function textoDosis(series: number, reps: string): string {
  return /\d\s*[×x]\s*\d/i.test(reps) ? `${series} series de ${reps}` : `${series} × ${reps}`
}

/** Descanso de la rutina en segundos: "2 min" → 120, "1 min 30" → 90, "90 seg" → 90. */
export function segundosDescanso(t?: string): number | undefined {
  if (!t) return undefined
  const m = t.match(/(\d+)\s*min(?:utos?)?\s*(\d+)?/i)
  if (m) return Number(m[1]) * 60 + (m[2] ? Number(m[2]) : 0)
  const s = t.match(/(\d+)\s*(?:seg|s\b|")/i)
  return s ? Number(s[1]) : undefined
}

/** Kilos de la rutina: "80 kg" → 80, "40-50 kg" → 40. Si es raro ("2 × 7,5 kg", "KB pesada"), nada. */
export function kgDeCarga(carga?: string): number | undefined {
  if (!carga || /[×x*]/i.test(carga)) return undefined
  const m = carga.match(/^\s*(\d+(?:[.,]\d+)?)\s*(?:-\s*\d+(?:[.,]\d+)?\s*)?kg\b/i)
  return m ? Number(m[1].replace(',', '.')) : undefined
}

/** Reps de la rutina: "4" → 4, "10 por lado" → 10. Si es raro ("2 × 20 seg"), nada. */
export function repsDeTexto(reps: string): number | undefined {
  if (/[×x*]/i.test(reps)) return undefined
  const m = reps.match(/^\s*(\d+)/)
  return m ? Number(m[1]) : undefined
}

/** Lo que se muestra de fondo en una serie: lo de la vez anterior, o si no, lo de la rutina. */
export function sugerencia(i: number, ultima: UltimaVez | undefined, p: Prescripto): Valores {
  if (ultima?.series.length) return ultima.series[Math.min(i, ultima.series.length - 1)]
  if (medidaDe(p).segunda === 'cm') return {}
  return { kg: kgDeCarga(p.carga), reps: repsDeTexto(p.reps) }
}

/** Lunes 00:00 de la semana de `hoy`. */
export function inicioSemana(hoy = new Date()): number {
  const d = new Date(hoy)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

export function sesionesDeLaSemana(sesiones: Sesion[], hoy = new Date()): Sesion[] {
  const desde = inicioSemana(hoy)
  const hasta = desde + 7 * 24 * 3600 * 1000
  return sesiones.filter((s) => s.inicio >= desde && s.inicio < hasta)
}

export function colorRodilla(n: number): 'verde' | 'amarillo' | 'rojo' {
  return n <= 3 ? 'verde' : n <= 5 ? 'amarillo' : 'rojo'
}

/** "1:05:09" o "23:41" */
export function reloj(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`
}
