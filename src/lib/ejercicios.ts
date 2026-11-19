import catalogoJson from '../data/catalogo.json'
import type { Rutina } from './rutina'
import { normalizar } from './texto'

export interface Ficha {
  nombre: string
  video: string // texto para buscar en YouTube
  zonas: string[]
  como?: string
  sirve?: string
  origen: 'lista' | 'agregado' | 'sinFicha'
}

export const CATALOGO: Ficha[] = (catalogoJson as Omit<Ficha, 'origen'>[]).map((e) => ({ ...e, origen: 'lista' }))

export const ZONAS: { id: string; label: string }[] = [
  { id: 'rodilla', label: 'Rodilla' },
  { id: 'tobillo', label: 'Tobillo' },
  { id: 'cadera', label: 'Cadera' },
  { id: 'piernas', label: 'Piernas' },
  { id: 'posterior', label: 'Isquios y glúteos' },
  { id: 'core', label: 'Core' },
  { id: 'hombro', label: 'Hombro' },
  { id: 'empuje', label: 'Empuje' },
  { id: 'traccion', label: 'Espalda' },
  { id: 'potencia', label: 'Potencia' },
  { id: 'salto', label: 'Salto' },
  { id: 'movilidad', label: 'Movilidad' },
  { id: 'acondicionamiento', label: 'Acondicionamiento' },
]

export const nombreZona = (id: string) => ZONAS.find((z) => z.id === id)?.label ?? id

/** Dónde aparece cada ejercicio en la rutina: clave normalizada → ["Día 1", ...]. */
export function diasPorEjercicio(rutina?: Rutina): Map<string, string[]> {
  const m = new Map<string, string[]>()
  for (const d of rutina?.dias ?? []) {
    for (const b of d.bloques) {
      for (const e of b.ejercicios) {
        const k = normalizar(e.nombre)
        const lista = m.get(k) ?? []
        if (!lista.includes(d.nombre)) lista.push(d.nombre)
        m.set(k, lista)
      }
    }
  }
  return m
}

/** La lista + los que agregó él + los de la rutina que no están en ninguna. */
export function armarLista(
  extras: { nombre: string; como: string; sirve: string }[],
  rutina?: Rutina,
): Ficha[] {
  const porClave = new Map<string, Ficha>()
  for (const f of CATALOGO) porClave.set(normalizar(f.nombre), f)
  for (const x of extras) {
    const k = normalizar(x.nombre)
    if (!porClave.has(k)) {
      porClave.set(k, { nombre: x.nombre, video: x.nombre, zonas: [], como: x.como, sirve: x.sirve, origen: 'agregado' })
    }
  }
  for (const d of rutina?.dias ?? []) {
    for (const b of d.bloques) {
      for (const e of b.ejercicios) {
        const k = normalizar(e.nombre)
        if (!porClave.has(k)) porClave.set(k, { nombre: e.nombre, video: e.nombre, zonas: [], origen: 'sinFicha' })
      }
    }
  }
  return [...porClave.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export function buscarFicha(lista: Ficha[], nombre: string): Ficha | undefined {
  const k = normalizar(nombre)
  return lista.find((f) => normalizar(f.nombre) === k)
}

export function filtrar(lista: Ficha[], texto: string, zona: string | null): Ficha[] {
  const q = normalizar(texto)
  return lista.filter((f) => (!zona || f.zonas.includes(zona)) && (!q || normalizar(f.nombre).includes(q)))
}
