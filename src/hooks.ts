import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, leerEnCurso, rutinaActiva } from './db'
import { armarLista } from './lib/ejercicios'
import { DIAS_GYM_DEFAULT } from './lib/sesion'

/** La rutina activa. `undefined` mientras carga. */
export function useRutina() {
  return useLiveQuery(rutinaActiva)
}

/** Sesiones guardadas, de la más vieja a la más nueva. `undefined` mientras carga. */
export function useSesiones() {
  return useLiveQuery(() => db.sesiones.orderBy('inicio').toArray())
}

/** Qué días de la semana va al gym (0 = domingo). Por defecto lunes, miércoles y viernes. */
export function useDiasGym(): number[] {
  const e = useLiveQuery(() => db.estado.get('diasGym'))
  return Array.isArray(e?.valor) ? (e.valor as number[]) : DIAS_GYM_DEFAULT
}

/** La sesión en curso (null si no hay). `undefined` mientras carga. */
export function useEnCurso() {
  return useLiveQuery(async () => (await leerEnCurso()) ?? null)
}

/** Chequeos de cada mañana, del más viejo al más nuevo. */
export function useDiario() {
  return useLiveQuery(() => db.diario.orderBy('fecha').toArray())
}

/** Vóley anotado, del más viejo al más nuevo. */
export function useVoley() {
  return useLiveQuery(() => db.voley.orderBy('inicio').toArray())
}

/** Todas las fichas: lista + agregadas + las de la rutina sin ficha. */
export function useFichas() {
  const rutina = useRutina()
  const extras = useLiveQuery(() => db.extras.toArray())
  const fichas = useMemo(() => armarLista(extras ?? [], rutina?.rutina), [extras, rutina])
  return { fichas, rutina, cargando: rutina === undefined || extras === undefined }
}
