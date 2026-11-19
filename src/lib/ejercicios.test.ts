import { describe, expect, it } from 'vitest'
import { armarLista, buscarFicha, CATALOGO, diasPorEjercicio, filtrar } from './ejercicios'
import { normalizar, urlVideo } from './texto'
import { RUTINA_BASE } from '../db'
import type { Rutina } from './rutina'

describe('texto', () => {
  it('compara sin mayúsculas ni tildes', () => {
    expect(normalizar('  Sóleo + RODILLA   isométrico ')).toBe('soleo + rodilla isometrico')
  })
  it('arma la búsqueda de YouTube con "exercise"', () => {
    expect(urlVideo('back squat')).toBe('https://www.youtube.com/results?search_query=back%20squat%20exercise')
  })
})

describe('lista de ejercicios', () => {
  it('trae los ejercicios del CLAUDE.md con sus textos', () => {
    expect(CATALOGO.length).toBeGreaterThan(100)
    const f = buscarFicha(CATALOGO, 'sentadilla TRASERA')!
    expect(f.video).toBe('back squat')
    expect(f.zonas).toEqual(['piernas'])
    expect(f.como).toMatch(/Barra en la espalda/)
  })

  it('todos los ejercicios de la rutina base tienen ficha', () => {
    const lista = armarLista([], RUTINA_BASE)
    expect(lista.filter((f) => f.origen === 'sinFicha')).toEqual([])
  })

  it('un ejercicio nuevo del PF aparece igual, sin explicación', () => {
    const r: Rutina = {
      nombre: 'x',
      dias: [{ id: 'd1', nombre: 'Día 1', bloques: [{ nombre: 'B', tipo: 'fuerza', vueltas: 2, ejercicios: [{ nombre: 'Sentadilla Zercher', reps: '5' }] }] }],
    }
    const f = buscarFicha(armarLista([], r), 'sentadilla zercher')!
    expect(f.origen).toBe('sinFicha')
    expect(f.video).toBe('Sentadilla Zercher')
  })

  it('si él le escribe la explicación, queda como agregado', () => {
    const lista = armarLista([{ nombre: 'Sentadilla Zercher', como: 'Barra en los codos', sirve: '' }])
    expect(buscarFicha(lista, 'Sentadilla Zercher')).toMatchObject({ origen: 'agregado', como: 'Barra en los codos' })
  })

  it('filtra por zona y por texto', () => {
    expect(filtrar(CATALOGO, '', 'acondicionamiento').map((f) => f.nombre)).toEqual([
      'Intervalos tipo rally',
      'Desplazamientos 9-3-6-9',
    ])
    expect(filtrar(CATALOGO, 'nordico', null).map((f) => f.nombre)).toEqual(['Nórdicos con banda'])
  })

  it('sabe en qué días aparece cada ejercicio', () => {
    const m = diasPorEjercicio(RUTINA_BASE)
    expect(m.get(normalizar('Nórdicos con banda'))).toEqual(['Día 1', 'Día 2', 'Día 3'])
    expect(m.get(normalizar('Press banca'))).toEqual(['Día 1'])
  })
})
