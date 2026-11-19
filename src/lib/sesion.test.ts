import { describe, expect, it } from 'vitest'
import type { Sesion } from '../db'
import { RUTINA_BASE } from '../db'
import { RutinaSchema } from './rutina'
import pfSemana1 from '../data/pf-semana1.json'
import {
  colorRodilla,
  kgDeCarga,
  medidaDe,
  nuevaSesion,
  segundosDescanso,
  textoDosis,
  proximoDia,
  repsDeTexto,
  reloj,
  sesionesDeLaSemana,
  sugerencia,
  terminarSesion,
  textoUltimaVez,
  ultimaVez,
} from './sesion'

const R = RUTINA_BASE
const T0 = new Date(2026, 10, 17, 18, 0).getTime() // lunes 17/11

function sesion(diaIdx: number, inicio: number, cambiar?: (s: Sesion) => void): Sesion {
  const c = nuevaSesion(R, R.dias[diaIdx], inicio)
  const s = terminarSesion(c, inicio + 60 * 60000)
  cambiar?.(s)
  return s
}

describe('próximo día', () => {
  it('sin sesiones arranca por el Día 1', () => {
    expect(proximoDia(R, []).nombre).toBe('Día 1')
  })
  it('sigue al último que hizo y vuelve a empezar', () => {
    expect(proximoDia(R, [sesion(0, T0)]).nombre).toBe('Día 2')
    expect(proximoDia(R, [sesion(0, T0), sesion(1, T0 + 1e8)]).nombre).toBe('Día 3')
    expect(proximoDia(R, [sesion(2, T0 + 2e8), sesion(1, T0)]).nombre).toBe('Día 1')
  })
})

describe('nueva sesión', () => {
  it('arma una fila por serie (las vueltas del bloque) y nada en movilidad', () => {
    const c = nuevaSesion(R, R.dias[0], T0)
    const sentadilla = c.sesion.ejercicios.find((e) => e.nombre === 'Sentadilla trasera')!
    expect(sentadilla.series).toHaveLength(3)
    const calent = c.sesion.ejercicios.find((e) => e.bloque === 'Calentamiento')!
    expect(calent.tipo).toBe('movilidad')
    expect(calent.series).toHaveLength(0)
    expect(c.sesion.fecha).toBe('2026-11-17')
  })

  it('al terminar calcula los minutos y marca hechos los ejercicios con series tildadas', () => {
    const c = nuevaSesion(R, R.dias[0], T0)
    c.sesion.ejercicios.find((e) => e.nombre === 'Press banca')!.series[0].ok = true
    const s = terminarSesion(c, T0 + 68 * 60000)
    expect(s.minutos).toBe(68)
    expect(s.ejercicios.find((e) => e.nombre === 'Press banca')!.hecho).toBe(true)
    expect(s.ejercicios.find((e) => e.nombre === 'Sentadilla trasera')!.hecho).toBe(false)
  })
})

describe('última vez y sugerencias', () => {
  const vieja = sesion(0, T0, (s) => {
    const e = s.ejercicios.find((x) => x.nombre === 'Sentadilla trasera')!
    e.series = [
      { kg: 50, reps: 4, ok: true },
      { kg: 55, reps: 4, ok: true },
      { kg: 55, reps: 4, ok: true },
    ]
  })
  const nueva = sesion(0, T0 + 3 * 864e5, (s) => {
    const e = s.ejercicios.find((x) => x.nombre === 'Sentadilla trasera')!
    e.series = [{ kg: 60, reps: 3, ok: true }, { kg: 62.5, reps: 3, ok: true }, { ok: false }]
  })

  it('busca la más reciente, sin importar tildes ni mayúsculas', () => {
    const u = ultimaVez([vieja, nueva], 'sentadilla TRASERA')!
    expect(textoUltimaVez(u)).toBe('Última vez (20/11): 60×3 · 62,5×3')
  })

  it('no cuenta la sesión de hoy', () => {
    const u = ultimaVez([vieja, nueva], 'Sentadilla trasera', T0 + 3 * 864e5)!
    expect(textoUltimaVez(u)).toBe('Última vez (17/11): 50×4 · 55×4 · 55×4')
  })

  it('sugiere lo de la vez anterior, serie por serie', () => {
    const u = ultimaVez([vieja], 'Sentadilla trasera')
    const p = { nombre: 'Sentadilla trasera', reps: '4', carga: '80 kg' }
    expect(sugerencia(0, u, p)).toEqual({ kg: 50, reps: 4 })
    expect(sugerencia(5, u, p)).toEqual({ kg: 55, reps: 4 })
  })

  it('si es la primera vez, sugiere lo de la rutina', () => {
    expect(sugerencia(0, undefined, { nombre: 'x', reps: '10 por lado', carga: '40-50 kg' })).toEqual({ kg: 40, reps: 10 })
  })

  it('lee kilos y reps de la rutina solo cuando está claro', () => {
    expect(kgDeCarga('80 kg')).toBe(80)
    expect(kgDeCarga('7,5 kg')).toBe(7.5)
    expect(kgDeCarga('2 × 7,5 kg')).toBeUndefined()
    expect(kgDeCarga('KB pesada')).toBeUndefined()
    expect(repsDeTexto('30 seg')).toBe(30)
    expect(repsDeTexto('2 × 20 seg')).toBeUndefined()
  })
})

describe('qué se anota en cada ejercicio de la rutina del PF', () => {
  const r = RutinaSchema.parse(pfSemana1)
  const ej = (n: string) => r.dias.flatMap((d) => d.bloques.flatMap((b) => b.ejercicios)).find((e) => e.nombre === n)!

  it('kilos y reps cuando hay carga en kg', () => {
    expect(medidaDe(ej('Press banca'))).toEqual({ kg: true, segunda: 'reps' })
    expect(sugerencia(0, undefined, ej('Press banca'))).toEqual({ kg: 42.5, reps: 6 })
  })
  it('solo segundos en los isométricos sin peso, y kilos + segundos si tienen peso', () => {
    expect(medidaDe(ej('Soleo + rodilla isométrico'))).toEqual({ kg: false, segunda: 'seg' })
    expect(medidaDe(ej('Soleus raises sosteniendo arriba'))).toEqual({ kg: true, segunda: 'seg' })
    expect(medidaDe(ej('Equilibrio a 1 pierna sobre colchoneta'))).toEqual({ kg: false, segunda: 'seg' })
  })
  it('solo reps cuando es con banda, sin peso o sin carga', () => {
    expect(medidaDe(ej('Nordic curls con banda'))).toEqual({ kg: false, segunda: 'reps' })
    expect(medidaDe(ej('Saltos sentado desde banco al cajón'))).toEqual({ kg: false, segunda: 'reps' })
    expect(medidaDe(ej('Pallof press'))).toEqual({ kg: false, segunda: 'reps' })
    expect(sugerencia(0, undefined, ej('Pallof press'))).toEqual({ kg: undefined, reps: 12 })
  })
  it('centímetros en los tests, sin sugerir nada', () => {
    expect(medidaDe(ej('CMJ'))).toEqual({ kg: false, segunda: 'cm' })
    expect(medidaDe(ej('Alcance de bloqueo'))).toEqual({ kg: false, segunda: 'cm' })
    expect(sugerencia(0, undefined, ej('CMJ'))).toEqual({})
    // "Cajón ~30 cm" en la nota no lo convierte en test
    expect(medidaDe(ej('Step up lateral con barra'))).toEqual({ kg: true, segunda: 'reps' })
  })
  it('solo tildar en los intervalos de bici', () => {
    expect(medidaDe(ej('Bici fija'))).toEqual({ kg: false, segunda: null })
  })
  it('dosis y descansos', () => {
    expect(textoDosis(3, '6')).toBe('3 × 6')
    expect(textoDosis(2, '2 × 20 seg')).toBe('2 series de 2 × 20 seg')
    expect(segundosDescanso('2 min')).toBe(120)
    expect(segundosDescanso('1 min 30')).toBe(90)
    expect(segundosDescanso('1 min')).toBe(60)
    expect(segundosDescanso('90 seg')).toBe(90)
    expect(segundosDescanso('')).toBeUndefined()
  })
  it('la última vez muestra las unidades correctas', () => {
    const m = { kg: false, segunda: 'seg' as const }
    expect(textoUltimaVez({ inicio: T0, series: [{ reps: 45 }, { reps: 40 }] }, m)).toBe('Última vez (17/11): 45" · 40"')
    expect(textoUltimaVez({ inicio: T0, series: [{ cm: 312 }] })).toBe('Última vez (17/11): 312 cm')
  })
})

describe('semana, rodilla y reloj', () => {
  it('cuenta de lunes a domingo', () => {
    const domingoAntes = sesion(0, T0 - 864e5)
    const lunes = sesion(0, T0)
    const domingo = sesion(1, new Date(2026, 10, 23, 20, 0).getTime())
    expect(sesionesDeLaSemana([domingoAntes, lunes, domingo], new Date(2026, 10, 19))).toHaveLength(2)
  })
  it('colores de la rodilla', () => {
    expect([0, 3, 4, 5, 6, 10].map(colorRodilla)).toEqual(['verde', 'verde', 'amarillo', 'amarillo', 'rojo', 'rojo'])
  })
  it('reloj', () => {
    expect(reloj(83000)).toBe('1:23')
    expect(reloj(3723000)).toBe('1:02:03')
  })
})
