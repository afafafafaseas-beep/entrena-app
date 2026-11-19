import Dexie, { type EntityTable } from 'dexie'
import type { Rutina } from './lib/rutina'
import { RutinaSchema } from './lib/rutina'
import { normalizar } from './lib/texto'
import rutinaBaseJson from './data/rutina-base.json'

// Todo se guarda en el celular (IndexedDB).
// REGLA: nunca cambiar estas tablas sin agregar un db.version(N+1) con su migración.

export interface RutinaGuardada {
  id?: number
  rutina: Rutina
  cargada: number // cuándo se cargó (ms)
  base: boolean // true = la rutina vieja que viene con la app
}

export interface Estado {
  clave: string
  valor: unknown
}

export interface EjercicioExtra {
  clave: string // nombre normalizado
  nombre: string
  como: string
  sirve: string
}

// Etapas 3 y 4 (ya quedan creadas para no tener que migrar después)
export interface Sesion {
  id: string
  fecha: string
  inicio: number
  fin: number
  minutos: number
  diaId: string
  diaNombre: string
  rutinaNombre: string
  ejercicios: {
    nombre: string
    bloque: string
    tipo: 'movilidad' | 'fuerza'
    hecho: boolean
    series: { kg?: number; reps?: number; ok: boolean }[]
    rpe?: number
  }[]
  rodilla?: number
  rpeSesion?: number
  notas?: string
}

export interface Foto {
  ejercicio: string // nombre normalizado
  blob: Blob
  fecha: number
}

export const db = new Dexie('entrena') as Dexie & {
  rutinas: EntityTable<RutinaGuardada, 'id'>
  estado: EntityTable<Estado, 'clave'>
  extras: EntityTable<EjercicioExtra, 'clave'>
  sesiones: EntityTable<Sesion, 'id'>
  fotos: EntityTable<Foto, 'ejercicio'>
}

db.version(1).stores({
  rutinas: '++id, cargada',
  estado: 'clave',
  extras: 'clave',
  sesiones: 'id, fecha, inicio, diaId',
  fotos: 'ejercicio',
})

export const RUTINA_BASE: Rutina = RutinaSchema.parse(rutinaBaseJson)

/** Si no hay ninguna rutina, carga la del PF anterior. */
export async function asegurarRutinaBase() {
  await db.transaction('rw', db.rutinas, db.estado, async () => {
    if ((await db.rutinas.count()) > 0) return
    const id = await db.rutinas.add({ rutina: RUTINA_BASE, cargada: Date.now(), base: true })
    await db.estado.put({ clave: 'rutinaActiva', valor: id })
  })
}

export async function rutinaActiva(): Promise<RutinaGuardada | undefined> {
  const e = await db.estado.get('rutinaActiva')
  const r = typeof e?.valor === 'number' ? await db.rutinas.get(e.valor) : undefined
  return r ?? (await db.rutinas.orderBy('cargada').last())
}

/** Guarda la rutina nueva y la deja activa. Las anteriores quedan guardadas. */
export async function cargarRutina(rutina: Rutina): Promise<number> {
  return db.transaction('rw', db.rutinas, db.estado, async () => {
    const id = (await db.rutinas.add({ rutina, cargada: Date.now(), base: false })) as number
    await db.estado.put({ clave: 'rutinaActiva', valor: id })
    return id
  })
}

export async function guardarExtra(nombre: string, como: string, sirve: string) {
  await db.extras.put({ clave: normalizar(nombre), nombre: nombre.trim(), como: como.trim(), sirve: sirve.trim() })
}

/** Le pide al iPhone que no borre los datos de la app. */
export async function pedirPersistencia() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist()
  } catch {
    // Si no se puede, sigue igual.
  }
}
