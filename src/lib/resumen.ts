import type { Diario, Sesion, Voley } from '../db'
import { evolucion, type Campo } from './progreso'
import { diasQueFaltaste, fechaCorta, fechaISO } from './sesion'
import { normalizar } from './texto'

const DIA = 24 * 3600 * 1000
const n1 = (x: number) => (Math.round(x * 10) / 10).toString().replace('.', ',')
const prom = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined)
const diaSemana = (ms: number) => new Date(ms).toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')

type EjSesion = Sesion['ejercicios'][number]

function textoSeries(e: EjSesion): string {
  const ok = e.series.filter((x) => x.ok)
  if (!ok.length) return 'no lo hice'
  return ok
    .map((x) => {
      if (x.cm !== undefined) return `${n1(x.cm)} cm`
      const r = x.reps === undefined ? '' : e.unidad === 'seg' ? `${x.reps}"` : `${x.reps}`
      if (x.kg !== undefined) return r ? `${n1(x.kg)}×${r}` : `${n1(x.kg)} kg`
      return r ? (e.unidad === 'seg' ? r : `${r} reps`) : 'hecha'
    })
    .join(', ')
}

const TIPO_VOLEY = { entrenamiento: 'Entrenamiento', partido: 'Partido', plaza: 'Vóley de plaza' }

export interface DatosResumen {
  dias: number // 7, 14 o 28
  rutinaNombre?: string
  sesiones: Sesion[]
  voley: Voley[]
  diario: Diario[]
  diasGym?: number[] // para contar los días que no fue
  hoy?: Date
}

/** El texto para copiar y pegarle al PF (formato de la sección 7 del CLAUDE.md, más rodilla a la mañana y vóley). */
export function resumenPF({ dias, rutinaNombre, sesiones, voley, diario, diasGym, hoy = new Date() }: DatosResumen): string {
  const fin = new Date(hoy)
  fin.setHours(23, 59, 59, 999)
  const hasta = fin.getTime() + 1
  const desde = hasta - dias * DIA
  const antes = desde - dias * DIA
  const en = (t: number, a: number, b: number) => t >= a && t < b

  const ses = sesiones.filter((s) => en(s.inicio, desde, hasta)).sort((a, b) => a.inicio - b.inicio)
  const sesAntes = sesiones.filter((s) => en(s.inicio, antes, desde))
  const vol = voley.filter((v) => en(v.inicio, desde, hasta)).sort((a, b) => a.inicio - b.inicio)
  const diaEn = (a: number, b: number) =>
    diario.filter((d) => {
      const t = new Date(d.fecha + 'T12:00').getTime()
      return en(t, a, b)
    })
  const dia = diaEn(desde, hasta).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const diaAntes = diaEn(antes, desde)

  const l: string[] = []
  l.push(`RESUMEN PARA MI PF · del ${fechaCorta(desde)} al ${fechaCorta(hasta - 1)}`)
  if (rutinaNombre) l.push(`Rutina: ${rutinaNombre}`)

  l.push('', `GYM (${ses.length === 1 ? '1 sesión' : `${ses.length} sesiones`})`)
  if (!ses.length) l.push('- No fui al gym en este período.')
  if (diasGym?.length) {
    const desdeISO = fechaISO(desde)
    const faltas = diasQueFaltaste(sesiones, diasGym, hoy).filter((f) => f >= desdeISO)
    if (faltas.length)
      l.push(`- Días de gym que no fui: ${faltas.map((f) => `${diaSemana(new Date(f + 'T12:00').getTime())} ${fechaCorta(new Date(f + 'T12:00').getTime())}`).join(', ')}`)
  }
  for (const s of ses) {
    const cab = [`${diaSemana(s.inicio)} ${fechaCorta(s.inicio)}`, s.diaNombre, `${s.minutos} min`]
    if (s.rpeSesion !== undefined) cab.push(`RPE ${s.rpeSesion}`)
    if (s.rodilla !== undefined) cab.push(`rodilla al terminar ${s.rodilla}`)
    l.push(`- ${cab.join(' · ')}`)
    const movilidad = new Map<string, { hechos: number; total: number }>()
    for (const e of s.ejercicios) {
      if (e.tipo === 'movilidad') {
        const m = movilidad.get(e.bloque) ?? { hechos: 0, total: 0 }
        m.total++
        if (e.hecho) m.hechos++
        movilidad.set(e.bloque, m)
      } else {
        l.push(`  · ${e.nombre}: ${textoSeries(e)}${e.rpe !== undefined ? ` (RPE ${e.rpe})` : ''}`)
      }
    }
    for (const [b, m] of movilidad) l.push(`  · ${b}: ${m.hechos} de ${m.total} ejercicios`)
    if (s.notas) l.push(`  Notas: ${s.notas}`)
  }

  if (vol.length) {
    l.push('', `VÓLEY (${vol.length})`)
    for (const v of vol) {
      const p = [`${diaSemana(v.inicio)} ${fechaCorta(v.inicio)}`, TIPO_VOLEY[v.tipo], `${v.minutos} min`]
      if (v.rpe !== undefined) p.push(`RPE ${v.rpe}`)
      if (v.rodilla !== undefined) p.push(`rodilla al terminar ${v.rodilla}`)
      l.push(`- ${p.join(' · ')}${v.notas ? ` · ${v.notas}` : ''}`)
    }
  }

  const conRodilla = dia.filter((d) => d.rodilla !== undefined)
  const conTest = dia.filter((d) => d.test !== undefined)
  if (conRodilla.length || conTest.length) {
    l.push('', 'RODILLA A LA MAÑANA (0 = nada, 10 = mucho dolor)')
    if (conRodilla.length) {
      const peor = conRodilla.reduce((a, b) => (b.rodilla! > a.rodilla! ? b : a))
      l.push(
        `- Al levantarme: promedio ${n1(prom(conRodilla.map((d) => d.rodilla!))!)} en ${conRodilla.length} días · peor ${peor.rodilla} (${fechaCorta(new Date(peor.fecha + 'T12:00').getTime())})`,
      )
    }
    if (conTest.length)
      l.push(`- Test de 5 sentadillas a 1 pierna: promedio ${n1(prom(conTest.map((d) => d.test!))!)} en ${conTest.length} días`)
  }

  const listo = (k: 'sueno' | 'energia' | 'dolorMuscular') => prom(dia.filter((d) => d[k] !== undefined).map((d) => d[k]!))
  const [su, en2, dm] = [listo('sueno'), listo('energia'), listo('dolorMuscular')]
  if (su !== undefined || en2 !== undefined || dm !== undefined) {
    const p: string[] = []
    if (su !== undefined) p.push(`sueño ${n1(su)}`)
    if (en2 !== undefined) p.push(`energía ${n1(en2)}`)
    if (dm !== undefined) p.push(`dolor muscular ${n1(dm)}`)
    l.push('', `CÓMO LLEGUÉ (promedio de 1 a 5): ${p.join(' · ')}`)
  }

  // Comparación con el período anterior
  const comp: string[] = []
  const vistos = new Set<string>()
  for (const s of ses)
    for (const e of s.ejercicios) {
      const k = normalizar(e.nombre)
      if (e.tipo !== 'fuerza' || vistos.has(k)) continue
      vistos.add(k)
      const campo: Campo | undefined = e.series.some((x) => x.ok && x.kg !== undefined)
        ? 'kg'
        : e.series.some((x) => x.ok && x.cm !== undefined)
          ? 'cm'
          : undefined
      if (!campo) continue
      const ahora = evolucion(ses, e.nombre, campo)
      const prev = evolucion(sesAntes, e.nombre, campo)
      if (!ahora.length) continue
      const max = Math.max(...ahora.map((p) => p.valor))
      const u = campo === 'kg' ? 'kg' : 'cm'
      const titulo = campo === 'kg' ? 'peso máximo' : 'mejor marca'
      comp.push(
        `- ${e.nombre}: ${titulo} ${n1(max)} ${u}${prev.length ? ` (antes ${n1(Math.max(...prev.map((p) => p.valor)))})` : ' (primera vez)'}`,
      )
    }
  const rodTerm = prom(ses.filter((s) => s.rodilla !== undefined).map((s) => s.rodilla!))
  const rodTermAntes = prom(sesAntes.filter((s) => s.rodilla !== undefined).map((s) => s.rodilla!))
  if (rodTerm !== undefined)
    comp.push(`- Rodilla al terminar (promedio): ${n1(rodTerm)}${rodTermAntes !== undefined ? ` (antes ${n1(rodTermAntes)})` : ''}`)
  const rodMan = prom(conRodilla.map((d) => d.rodilla!))
  const rodManAntes = prom(diaAntes.filter((d) => d.rodilla !== undefined).map((d) => d.rodilla!))
  if (rodMan !== undefined)
    comp.push(`- Rodilla a la mañana (promedio): ${n1(rodMan)}${rodManAntes !== undefined ? ` (antes ${n1(rodManAntes)})` : ''}`)
  if (comp.length) l.push('', 'COMPARADO CON EL PERÍODO ANTERIOR', ...comp)

  return l.join('\n')
}

export const hoyISO = () => fechaISO(Date.now())
