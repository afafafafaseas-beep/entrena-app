import { beforeEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { db, iniciarDatos, migrarDeLaVieja, rutinaActiva, RUTINA_BASE, type Sesion } from '../db'
import { diasQueFaltaste, moverAFecha, proximaFechaGym } from './sesion'

const ses = (id: string, fecha: string): Sesion => ({
  id,
  fecha,
  inicio: new Date(fecha + 'T18:00').getTime(),
  fin: new Date(fecha + 'T19:00').getTime(),
  minutos: 60,
  diaId: 'd1',
  diaNombre: 'Día 1',
  rutinaNombre: 'S1',
  ejercicios: [],
})

beforeEach(async () => {
  await db.delete()
  await db.open()
  await Dexie.delete('entrena')
})

describe('pasar a la base nueva (la que se sube a internet)', () => {
  it('copia todo lo de la base vieja una sola vez y deja activa la misma rutina', async () => {
    const vieja = new Dexie('entrena')
    vieja.version(1).stores({ rutinas: '++id, cargada', estado: 'clave', extras: 'clave', sesiones: 'id, fecha, inicio, diaId', fotos: 'ejercicio' })
    vieja.version(2).stores({ diario: 'fecha', voley: 'id, fecha, inicio' })
    await vieja.table('rutinas').add({ rutina: RUTINA_BASE, cargada: 1000, base: true })
    const idPF = await vieja.table('rutinas').add({ rutina: { ...RUTINA_BASE, nombre: 'Rutina del PF' }, cargada: 2000, base: false })
    await vieja.table('estado').bulkPut([
      { clave: 'rutinaActiva', valor: idPF },
      { clave: 'sesionEnCurso', valor: { algo: 1 } },
    ])
    await vieja.table('sesiones').put(ses('a', '2026-11-19'))
    await vieja.table('diario').put({ fecha: '2026-11-19', rodilla: 2 })
    await vieja.table('voley').put({ id: 'v', fecha: '2026-11-18', inicio: 1, tipo: 'partido', minutos: 90 })
    vieja.close()

    await iniciarDatos()
    await migrarDeLaVieja() // la segunda vez no hace nada

    expect(await db.rutinas.count()).toBe(2)
    expect((await rutinaActiva())?.rutina.nombre).toBe('Rutina del PF')
    expect(await db.rutinas.get('rut-base')).toMatchObject({ base: true })
    expect(await db.sesiones.get('a')).toMatchObject({ diaNombre: 'Día 1' })
    expect(await db.diario.get('2026-11-19')).toMatchObject({ rodilla: 2 })
    expect(await db.voley.count()).toBe(1)
    expect(await db.local.get('sesionEnCurso')).toMatchObject({ valor: { algo: 1 } })
    // La vieja queda intacta
    expect(await Dexie.exists('entrena')).toBe(true)
  })

  it('sin base vieja arranca con la rutina base', async () => {
    await iniciarDatos()
    expect((await rutinaActiva())?.base).toBe(true)
    expect(await db.rutinas.count()).toBe(1)
  })
})

describe('días de gym', () => {
  const LMV = [1, 3, 5]

  it('marca los días de gym que pasaron sin entreno, desde el primer entreno', () => {
    // Jue 19/11 primer entreno; viernes 20 no fue; hoy lunes 23
    const hoy = new Date('2026-11-23T10:00')
    expect(diasQueFaltaste([ses('a', '2026-11-19')], LMV, hoy)).toEqual(['2026-11-20'])
    expect(diasQueFaltaste([ses('a', '2026-11-19'), ses('b', '2026-11-20')], LMV, hoy)).toEqual([])
    // Hoy no cuenta como falta todavía
    expect(diasQueFaltaste([ses('a', '2026-11-19')], LMV, new Date('2026-11-20T10:00'))).toEqual([])
    expect(diasQueFaltaste([], LMV, hoy)).toEqual([])
  })

  it('sabe cuándo es el próximo día de gym', () => {
    const vie = new Date('2026-11-20T10:00')
    expect(proximaFechaGym(LMV, false, vie)?.getDay()).toBe(5) // hoy
    expect(proximaFechaGym(LMV, true, vie)?.getDay()).toBe(1) // ya entrenó: el lunes
    expect(proximaFechaGym(LMV, false, new Date('2026-11-21T10:00'))?.getDate()).toBe(23) // sábado → lunes 23
  })

  it('un entreno cargado tarde queda en el día que fue', () => {
    const s = ses('a', '2026-11-20')
    const movida = moverAFecha(s, '2026-11-19', 75)
    expect(movida.fecha).toBe('2026-11-19')
    expect(new Date(movida.inicio).getDate()).toBe(19)
    expect(new Date(movida.inicio).getHours()).toBe(18)
    expect(movida.minutos).toBe(75)
  })
})
