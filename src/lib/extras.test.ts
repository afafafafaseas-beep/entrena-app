import { describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import type { Diario, Sesion, Voley } from '../db'
import { discosPorLado, entradaEnCalor } from './discos'
import { campoPrincipal, ejerciciosConDatos, evolucion, mejorMarca, porSemana, records, unoRM } from './progreso'
import { resumenPF } from './resumen'
import { fotosDe } from './fotos'
import { CATALOGO } from './ejercicios'

const T = (d: number, h = 18) => new Date(2026, 10, d, h, 0).getTime()

function ses(id: string, dia: number, ejercicios: Sesion['ejercicios'], extra: Partial<Sesion> = {}): Sesion {
  return {
    id,
    fecha: `2026-11-${String(dia).padStart(2, '0')}`,
    inicio: T(dia),
    fin: T(dia, 19),
    minutos: 60,
    diaId: 'd1',
    diaNombre: 'Día 1',
    rutinaNombre: 'Semana 1',
    ejercicios,
    ...extra,
  }
}

const banca = (series: Sesion['ejercicios'][number]['series']) => ({
  nombre: 'Press banca',
  bloque: 'Bloque 2',
  tipo: 'fuerza' as const,
  hecho: true,
  series,
})

const s1 = ses('a', 10, [banca([{ kg: 40, reps: 6, ok: true }, { kg: 42.5, reps: 6, ok: true }])], { rodilla: 3 })
const s2 = ses('b', 17, [
  banca([{ kg: 45, reps: 5, ok: true }, { kg: 50, reps: 3, ok: false }]),
  { nombre: 'CMJ', bloque: 'Tests', tipo: 'fuerza', hecho: true, unidad: 'cm', series: [{ cm: 41, ok: true }, { cm: 43.5, ok: true }] },
  { nombre: 'Soleo + rodilla isométrico', bloque: 'Rodilla', tipo: 'fuerza', hecho: true, unidad: 'seg', series: [{ reps: 45, ok: true }] },
  { nombre: 'Gato-camello', bloque: 'Calentamiento', tipo: 'movilidad', hecho: true, series: [] },
  { nombre: 'Spiderman', bloque: 'Calentamiento', tipo: 'movilidad', hecho: false, series: [] },
], { rodilla: 2, rpeSesion: 7, notas: 'Bien' })

describe('progreso y récords', () => {
  it('evolución: el mejor de cada sesión, solo series tildadas', () => {
    expect(evolucion([s2, s1], 'press banca', 'kg').map((p) => p.valor)).toEqual([42.5, 45])
    expect(campoPrincipal([s1, s2], 'CMJ')).toBe('cm')
    expect(campoPrincipal([s1, s2], 'Soleo + rodilla isométrico')).toBe('reps')
  })
  it('mejor marca anterior, para avisar récords', () => {
    expect(mejorMarca([s1, s2], 'Press banca', 'kg', T(17))).toBe(42.5)
    expect(mejorMarca([s1, s2], 'Press banca', 'kg')).toBe(45)
  })
  it('récords con 1RM estimado', () => {
    const r = records([s1, s2])
    expect(r.find((x) => x.nombre === 'Press banca')).toMatchObject({ valor: 45, campo: 'kg', rm: 50.5 })
    expect(r.find((x) => x.nombre === 'CMJ')).toMatchObject({ valor: 43.5, campo: 'cm' })
    expect(unoRM(100, 12)).toBeUndefined()
  })
  it('ejercicios con datos para graficar', () => {
    expect(ejerciciosConDatos([s1, s2]).map((e) => e.nombre)).toEqual(['Press banca', 'CMJ', 'Soleo + rodilla isométrico'])
  })
  it('sesiones por semana', () => {
    const v: Voley = { id: 'v', fecha: '2026-11-18', inicio: T(18), tipo: 'partido', minutos: 90 }
    const sem = porSemana([s1, s2], [v], 2, new Date(2026, 10, 19))
    expect(sem.map((s) => [s.gym, s.voley])).toEqual([
      [1, 0],
      [1, 1],
    ])
  })
})

describe('discos y entrada en calor', () => {
  it('discos de cada lado', () => {
    expect(discosPorLado(42.5)).toEqual({ porLado: [10, 1.25], sobra: 0 })
    expect(discosPorLado(100)).toEqual({ porLado: [25, 15], sobra: 0 })
    expect(discosPorLado(20)).toEqual({ porLado: [], sobra: 0 })
    expect(discosPorLado(21)).toEqual({ porLado: [], sobra: 1 })
    expect(discosPorLado(15)).toBeUndefined()
    expect(discosPorLado(30, 15)).toEqual({ porLado: [5, 2.5], sobra: 0 })
  })
  it('entrada en calor solo para cargas pesadas', () => {
    expect(entradaEnCalor(50)).toBe('barra × 8 · 25 kg × 5 · 35 kg × 3')
    expect(entradaEnCalor(30)).toBeUndefined()
  })
})

describe('resumen para el PF', () => {
  const voley: Voley[] = [{ id: 'v', fecha: '2026-11-18', inicio: T(18, 20), tipo: 'partido', minutos: 90, rpe: 8, rodilla: 3 }]
  const diario: Diario[] = [
    { fecha: '2026-11-08', rodilla: 3 },
    { fecha: '2026-11-17', rodilla: 1, test: 2, sueno: 4, energia: 4, dolorMuscular: 2 },
    { fecha: '2026-11-18', rodilla: 2, test: 3, sueno: 3, energia: 5, dolorMuscular: 3 },
  ]
  const texto = resumenPF({ dias: 7, rutinaNombre: 'Semana 1 · Re-entrada', sesiones: [s1, s2], voley, diario, hoy: new Date(2026, 10, 19) })

  it('tiene el formato del CLAUDE.md', () => {
    expect(texto).toContain('RESUMEN PARA MI PF · del 13/11 al 19/11')
    expect(texto).toContain('Rutina: Semana 1 · Re-entrada')
    expect(texto).toContain('GYM (1 sesión)')
    expect(texto).toMatch(/- mar 17\/11 · Día 1 · 60 min · RPE 7 · rodilla al terminar 2/)
    expect(texto).toContain('  · Press banca: 45×5')
    expect(texto).toContain('  · CMJ: 41 cm, 43,5 cm')
    expect(texto).toContain('  · Soleo + rodilla isométrico: 45"')
    expect(texto).toContain('  · Calentamiento: 1 de 2 ejercicios')
    expect(texto).toContain('  Notas: Bien')
  })
  it('suma vóley, rodilla a la mañana y cómo llegó', () => {
    expect(texto).toContain('VÓLEY (1)')
    expect(texto).toMatch(/- mié 18\/11 · Partido · 90 min · RPE 8 · rodilla al terminar 3/)
    expect(texto).toContain('- Al levantarme: promedio 1,5 en 2 días · peor 2 (18/11)')
    expect(texto).toContain('- Test de 5 sentadillas a 1 pierna: promedio 2,5 en 2 días')
    expect(texto).toContain('CÓMO LLEGUÉ (promedio de 1 a 5): sueño 3,5 · energía 4,5 · dolor muscular 2,5')
  })
  it('compara con el período anterior', () => {
    expect(texto).toContain('- Press banca: peso máximo 45 kg (antes 42,5)')
    expect(texto).toContain('- CMJ: mejor marca 43,5 cm (primera vez)')
    expect(texto).toContain('- Rodilla al terminar (promedio): 2 (antes 3)')
    expect(texto).toContain('- Rodilla a la mañana (promedio): 1,5 (antes 3)')
  })
})

describe('fotos', () => {
  it('las fotos apuntan a ejercicios que existen', () => {
    expect(fotosDe('Press banca')?.[0]).toMatch(/ejercicios\/Barbell_Bench_Press_-_Medium_Grip-0\.jpg$/)
    expect(fotosDe('press BANCA')).toBeDefined()
    expect(fotosDe('Spanish squat')).toBeUndefined()
    expect(CATALOGO.filter((f) => fotosDe(f.nombre)).length).toBeGreaterThan(55)
  })
})

describe('base de datos', () => {
  it('pasar de la versión 1 a la 2 no pierde nada', async () => {
    const nombre = 'migracion-prueba'
    const v1 = new Dexie(nombre)
    v1.version(1).stores({ rutinas: '++id, cargada', estado: 'clave', extras: 'clave', sesiones: 'id, fecha, inicio, diaId', fotos: 'ejercicio' })
    await v1.table('sesiones').put(s1)
    await v1.table('estado').put({ clave: 'rutinaActiva', valor: 1 })
    v1.close()

    const v2 = new Dexie(nombre)
    v2.version(1).stores({ rutinas: '++id, cargada', estado: 'clave', extras: 'clave', sesiones: 'id, fecha, inicio, diaId', fotos: 'ejercicio' })
    v2.version(2).stores({ diario: 'fecha', voley: 'id, fecha, inicio' })
    await v2.open()
    expect(await v2.table('sesiones').get('a')).toMatchObject({ diaNombre: 'Día 1' })
    expect(await v2.table('estado').get('rutinaActiva')).toMatchObject({ valor: 1 })
    await v2.table('diario').put({ fecha: '2026-11-19', rodilla: 1 })
    expect(await v2.table('diario').count()).toBe(1)
    v2.close()
    await Dexie.delete(nombre)
  })
})
