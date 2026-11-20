import catalogoJson from '../data/catalogo.json'
import extraJson from '../data/catalogo-extra.json'
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

type Base = Omit<Ficha, 'origen'>

// La lista del CLAUDE.md + los ejercicios nuevos que trajo el PF.
export const CATALOGO: Ficha[] = [...(catalogoJson as Base[]), ...(extraJson.ejercicios as Base[])].map((e) => ({
  ...e,
  origen: 'lista',
}))

/** Otros nombres con que el PF llama a ejercicios de la lista. */
const ALIAS = new Map(Object.entries(extraJson.alias as Record<string, string>).map(([a, n]) => [normalizar(a), n]))

export const ZONAS: { id: string; label: string }[] = [
  { id: 'rodilla', label: 'Rodilla' },
  { id: 'tobillo', label: 'Tobillo' },
  { id: 'cadera', label: 'Cadera' },
  { id: 'piernas', label: 'Piernas' },
  { id: 'posterior', label: 'Isquios y glúteos' },
  { id: 'core', label: 'Core' },
  { id: 'hombro', label: 'Hombro' },
  { id: 'empuje', label: 'Pecho' },
  { id: 'traccion', label: 'Espalda' },
  { id: 'brazos', label: 'Brazos' },
  { id: 'potencia', label: 'Potencia' },
  { id: 'salto', label: 'Salto' },
  { id: 'movilidad', label: 'Movilidad' },
  { id: 'acondicionamiento', label: 'Acondicionamiento' },
]

export const nombreZona = (id: string) => ZONAS.find((z) => z.id === id)?.label ?? id

/**
 * Encuentra la ficha de un ejercicio aunque el PF lo escriba distinto:
 * 1) mismo nombre (sin importar tildes ni mayúsculas), 2) otro nombre conocido,
 * 3) el nombre de la lista más algo al final ("Peso muerto rumano con barra" → "Peso muerto rumano").
 */
export function buscarFicha(lista: Ficha[], nombre: string): Ficha | undefined {
  const k = normalizar(nombre)
  const porNombre = (n: string) => lista.find((f) => normalizar(f.nombre) === normalizar(n))
  const exacta = porNombre(nombre)
  if (exacta) return exacta
  const alias = ALIAS.get(k)
  if (alias) return porNombre(alias)
  let mejor: Ficha | undefined
  for (const f of lista) {
    if (f.origen === 'sinFicha') continue
    const kf = normalizar(f.nombre)
    if (k.startsWith(kf + ' ') && (!mejor || kf.length > normalizar(mejor.nombre).length)) mejor = f
  }
  return mejor
}

/** Dónde aparece cada ejercicio en la rutina: nombre de la ficha (normalizado) → ["Día 1", ...]. */
export function diasPorEjercicio(rutina?: Rutina, lista: Ficha[] = CATALOGO): Map<string, string[]> {
  const m = new Map<string, string[]>()
  for (const d of rutina?.dias ?? []) {
    for (const b of d.bloques) {
      for (const e of b.ejercicios) {
        const k = normalizar(buscarFicha(lista, e.nombre)?.nombre ?? e.nombre)
        const dias = m.get(k) ?? []
        if (!dias.includes(d.nombre)) dias.push(d.nombre)
        m.set(k, dias)
      }
    }
  }
  return m
}

/** Cómo lo llama el PF en la rutina, si es distinto del nombre de la ficha. */
export function nombresEnRutina(rutina: Rutina | undefined, ficha: Ficha, lista: Ficha[]): string[] {
  const nombres = new Set<string>()
  for (const d of rutina?.dias ?? [])
    for (const b of d.bloques)
      for (const e of b.ejercicios)
        if (normalizar(e.nombre) !== normalizar(ficha.nombre) && buscarFicha(lista, e.nombre) === ficha) nombres.add(e.nombre)
  return [...nombres]
}

/** La lista + los que agregó él + los de la rutina que no tienen ficha. */
export function armarLista(extras: { nombre: string; como: string; sirve: string }[], rutina?: Rutina): Ficha[] {
  const lista: Ficha[] = [...CATALOGO]
  for (const x of extras) {
    if (!lista.some((f) => normalizar(f.nombre) === normalizar(x.nombre))) {
      lista.push({ nombre: x.nombre, video: x.nombre, zonas: [], como: x.como, sirve: x.sirve, origen: 'agregado' })
    }
  }
  for (const d of rutina?.dias ?? []) {
    for (const b of d.bloques) {
      for (const e of b.ejercicios) {
        if (!buscarFicha(lista, e.nombre)) lista.push({ nombre: e.nombre, video: e.nombre, zonas: [], origen: 'sinFicha' })
      }
    }
  }
  return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export function filtrar(lista: Ficha[], texto: string, zona: string | null): Ficha[] {
  const q = normalizar(texto)
  return lista.filter((f) => (!zona || f.zonas.includes(zona)) && (!q || normalizar(f.nombre).includes(q)))
}
