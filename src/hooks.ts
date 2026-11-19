import { useLiveQuery } from 'dexie-react-hooks'
import { db, leerEnCurso, rutinaActiva } from './db'
import { armarLista } from './lib/ejercicios'

/** La rutina activa. `undefined` mientras carga. */
export function useRutina() {
  return useLiveQuery(rutinaActiva)
}

/** Sesiones guardadas, de la más vieja a la más nueva. `undefined` mientras carga. */
export function useSesiones() {
  return useLiveQuery(() => db.sesiones.orderBy('inicio').toArray())
}

/** La sesión en curso (null si no hay). `undefined` mientras carga. */
export function useEnCurso() {
  return useLiveQuery(async () => (await leerEnCurso()) ?? null)
}

/** Todas las fichas: lista + agregadas + las de la rutina sin ficha. */
export function useFichas() {
  const rutina = useRutina()
  const extras = useLiveQuery(() => db.extras.toArray())
  return { fichas: armarLista(extras ?? [], rutina?.rutina), rutina, cargando: rutina === undefined || extras === undefined }
}
