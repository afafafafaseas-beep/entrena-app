import { useLiveQuery } from 'dexie-react-hooks'
import { db, rutinaActiva } from './db'
import { armarLista } from './lib/ejercicios'

/** La rutina activa. `undefined` mientras carga. */
export function useRutina() {
  return useLiveQuery(rutinaActiva)
}

/** Todas las fichas: lista + agregadas + las de la rutina sin ficha. */
export function useFichas() {
  const rutina = useRutina()
  const extras = useLiveQuery(() => db.extras.toArray())
  return { fichas: armarLista(extras ?? [], rutina?.rutina), rutina, cargando: rutina === undefined || extras === undefined }
}
