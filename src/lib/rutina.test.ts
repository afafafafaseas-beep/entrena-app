import { describe, expect, it } from 'vitest'
import base from '../data/rutina-base.json'
import { extraerJson, revisarRutina, seriesDe } from './rutina'

const json = (o: unknown) => JSON.stringify(o)

const rutinaChica = () => ({
  nombre: 'Re-entrada',
  semana: 1,
  dias: [
    {
      id: 'd1',
      nombre: 'Día 1',
      bloques: [{ nombre: 'Bloque 1', tipo: 'fuerza', vueltas: 3, ejercicios: [{ nombre: 'Sentadilla trasera', reps: '5', carga: '50 kg' }] }],
    },
    {
      id: 'd2',
      nombre: 'Día 2',
      bloques: [
        { nombre: 'Calentamiento', tipo: 'movilidad', vueltas: 1, ejercicios: [{ nombre: 'Gato-camello', reps: '10' }] },
        { nombre: 'Potencia 1', tipo: 'fuerza', vueltas: 3, ejercicios: [{ nombre: 'Hang power clean', reps: '3' }] },
      ],
    },
  ],
})

function error(texto: string) {
  const r = revisarRutina(texto)
  if (r.ok) throw new Error('Esperaba un error')
  return r.error
}

describe('revisarRutina', () => {
  it('la rutina base del CLAUDE.md está bien', () => {
    const r = revisarRutina(json(base))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.resumen).toMatch(/^Semana 0: 3 días, \d+ ejercicios$/)
  })

  it('arma el resumen como pide el CLAUDE.md', () => {
    const r = revisarRutina(json(rutinaChica()))
    expect(r.ok && r.resumen).toBe('Semana 1: 2 días, 3 ejercicios')
  })

  it('encuentra la rutina dentro del mensaje entero del PF', () => {
    const mensaje = `Hola Santi! Acá va la semana 1:\n\n\`\`\`json\n${json(rutinaChica())}\n\`\`\`\n\nCualquier cosa avisame.`
    expect(revisarRutina(mensaje).ok).toBe(true)
  })

  it('explica en criollo cuando falta algo en un bloque', () => {
    const r = rutinaChica() as any
    delete r.dias[1].bloques[1].vueltas
    expect(error(json(r))).toBe('Al bloque Potencia 1 del Día 2 le falta decir cuántas vueltas.')
  })

  it('explica cuando a un ejercicio le faltan las reps', () => {
    const r = rutinaChica() as any
    delete r.dias[0].bloques[0].ejercicios[0].reps
    expect(error(json(r))).toBe('Al ejercicio Sentadilla trasera del bloque Bloque 1 (Día 1) le falta decir las repeticiones.')
  })

  it('explica cuando el tipo está mal', () => {
    const r = rutinaChica() as any
    r.dias[0].bloques[0].tipo = 'potencia'
    expect(error(json(r))).toBe('En el bloque Bloque 1 del Día 1, el tipo tiene que ser "movilidad" o "fuerza".')
  })

  it('explica cuando un día no tiene bloques', () => {
    const r = rutinaChica() as any
    r.dias[0].bloques = []
    expect(error(json(r))).toBe('El Día 1 no tiene los bloques.')
  })

  it('explica cuando falta el nombre de la rutina', () => {
    const r = rutinaChica() as any
    delete r.nombre
    expect(error(json(r))).toBe('A la rutina le falta decir el nombre.')
  })

  it('avisa si no hay rutina o si está cortada', () => {
    expect(error('hola, no hay nada')).toMatch(/No encontré la rutina/)
    expect(error('{"nombre": "x", "dias": [')).toMatch(/No encontré la rutina|No pude leer/)
    expect(error('{"nombre": "x", "dias": [ }')).toMatch(/No pude leer la rutina/)
  })

  it('avisa si dos días tienen el mismo id', () => {
    const r = rutinaChica() as any
    r.dias[1].id = 'd1'
    expect(error(json(r))).toMatch(/dos días con el mismo id/)
  })

  it('no se hace problema si el PF pone números como texto o reps como número', () => {
    const r = rutinaChica() as any
    r.dias[0].bloques[0].vueltas = '3'
    r.dias[0].bloques[0].ejercicios[0].reps = 5
    const res = revisarRutina(json(r))
    expect(res.ok).toBe(true)
    if (res.ok) {
      const b = res.rutina.dias[0].bloques[0]
      expect(b.vueltas).toBe(3)
      expect(b.ejercicios[0].reps).toBe('5')
    }
  })
})

describe('ayudas', () => {
  it('extraerJson va de la primera { a la última }', () => {
    expect(extraerJson('mirá: {"a": {"b": 1}} listo')).toBe('{"a": {"b": 1}}')
    expect(extraerJson('nada')).toBeNull()
  })

  it('las series son las del ejercicio, o si no las vueltas del bloque', () => {
    const b = { nombre: 'B', tipo: 'fuerza' as const, vueltas: 3, ejercicios: [] }
    expect(seriesDe({ nombre: 'x', reps: '5' }, b)).toBe(3)
    expect(seriesDe({ nombre: 'x', reps: '5', series: 4 }, b)).toBe(4)
  })
})
