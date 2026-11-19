import { describe, expect, it } from 'vitest'
import { armarLista, buscarFicha, CATALOGO, diasPorEjercicio, filtrar } from './ejercicios'
import { normalizar, urlVideo } from './texto'
import { RUTINA_BASE } from '../db'
import { RutinaSchema, type Rutina } from './rutina'
import pfSemana1 from '../data/pf-semana1.json'

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
      'Bici fija',
    ])
    expect(filtrar(CATALOGO, 'nordico', null).map((f) => f.nombre)).toEqual(['Nórdicos con banda'])
  })

  it('todos los ejercicios de la rutina real del PF tienen ficha con explicación y video', () => {
    const r = RutinaSchema.parse(pfSemana1)
    const lista = armarLista([], r)
    const sinFicha: string[] = []
    for (const d of r.dias)
      for (const b of d.bloques)
        for (const e of b.ejercicios) {
          const f = buscarFicha(lista, e.nombre)
          if (!f || f.origen !== 'lista' || !f.como || !f.sirve || !f.video) sinFicha.push(e.nombre)
        }
    expect(sinFicha).toEqual([])
  })

  it('reconoce los nombres que usa el PF', () => {
    expect(buscarFicha(CATALOGO, 'Nordic curls con banda')?.nombre).toBe('Nórdicos con banda')
    expect(buscarFicha(CATALOGO, 'Iso hold isquios')?.nombre).toBe('Isométrico de isquios')
    expect(buscarFicha(CATALOGO, 'Peso muerto rumano con barra')?.nombre).toBe('Peso muerto rumano')
    expect(buscarFicha(CATALOGO, 'Peso muerto rumano a 1 pierna con barra')?.nombre).toBe('Peso muerto rumano a 1 pierna con barra')
    expect(buscarFicha(CATALOGO, 'Lanzamiento rotacional de pelota medicinal contra la pared')?.nombre).toBe(
      'Lanzamiento rotacional de pelota medicinal',
    )
    expect(buscarFicha(CATALOGO, 'soleo + rodilla isometrico')?.nombre).toBe('Sóleo + rodilla isométrico')
  })

  it('en la rutina del PF, "En mi rutina" junta los nombres distintos en la misma ficha', () => {
    const m = diasPorEjercicio(RutinaSchema.parse(pfSemana1))
    expect(m.get(normalizar('Nórdicos con banda'))).toEqual(['Día 1', 'Día 2', 'Día 3'])
    expect(m.get(normalizar('Bici fija'))).toEqual(['Día 2', 'Día 3'])
  })

  it('sabe en qué días aparece cada ejercicio', () => {
    const m = diasPorEjercicio(RUTINA_BASE)
    expect(m.get(normalizar('Nórdicos con banda'))).toEqual(['Día 1', 'Día 2', 'Día 3'])
    expect(m.get(normalizar('Press banca'))).toEqual(['Día 1'])
  })
})
