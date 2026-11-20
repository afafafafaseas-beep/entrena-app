import fotosJson from '../data/fotos.json'
import { normalizar } from './texto'

// Fotos de referencia (free-exercise-db, dominio público). Dos por ejercicio: posición inicial y final.
const POR_NOMBRE = new Map(Object.entries(fotosJson.fotos as Record<string, string>).map(([n, id]) => [normalizar(n), id]))

export function fotosDe(nombreFicha: string): [string, string] | undefined {
  const id = POR_NOMBRE.get(normalizar(nombreFicha))
  if (!id) return undefined
  const base = `${import.meta.env.BASE_URL}ejercicios/${id}`
  return [`${base}-0.jpg`, `${base}-1.jpg`]
}
