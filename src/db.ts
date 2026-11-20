import Dexie, { type EntityTable } from 'dexie'
import dexieCloud from 'dexie-cloud-addon'
import { NUBE_URL } from './nube'
import type { Rutina } from './lib/rutina'
import type { EnCurso } from './lib/sesion'
import { RutinaSchema } from './lib/rutina'
import { normalizar } from './lib/texto'
import rutinaBaseJson from './data/rutina-base.json'

// REGLA: nunca cambiar estas tablas sin agregar un db.version(N+1) con su migración.

export interface RutinaGuardada {
  id: string
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
    series: { kg?: number; reps?: number; cm?: number; ok: boolean }[] // reps = segundos si el ejercicio es por tiempo
    rpe?: number
    unidad?: 'seg' | 'cm' // para saber cómo mostrar las reps en el resumen
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

/** Chequeo de cada mañana: cómo amaneció la rodilla y cómo llega a entrenar. */
export interface Diario {
  fecha: string // "2026-11-20"
  rodilla?: number // 0-10 al levantarse
  test?: number // 0-10: dolor en el test del PF con la pierna IZQUIERDA (5 sentadillas a 1 pierna)
  testDer?: number // 0-10: lo mismo con la derecha (desde el 20/11)
  izqMenos?: boolean // la izquierda baja menos que la derecha
  sueno?: number // 1-5
  energia?: number // 1-5
  dolorMuscular?: number // 1-5 (5 = muy cargado)
}

/** Entrenamiento o partido de vóley (carga para la rodilla fuera del gym). */
export interface Voley {
  id: string
  fecha: string
  inicio: number
  tipo: 'entrenamiento' | 'partido' | 'plaza'
  minutos: number
  rpe?: number // 5-10
  rodilla?: number // 0-10 al terminar
  notas?: string
}

// ---- Base de datos ----
// Desde el 20/11 vive en "entrena-nube": se guarda en el celular y, si entraste con tu mail,
// se copia sola a internet (Dexie Cloud). La vieja ("entrena") se copia acá una sola vez y no se borra.

const CON_NUBE = !!NUBE_URL && import.meta.env.MODE !== 'test'

export const db = new Dexie('entrena-nube', { addons: CON_NUBE ? [dexieCloud] : [] }) as Dexie & {
  rutinas: EntityTable<RutinaGuardada, 'id'>
  estado: EntityTable<Estado, 'clave'> // se sincroniza: rutina activa, días de gym
  local: EntityTable<Estado, 'clave'> // solo en este aparato: sesión en curso, descanso
  extras: EntityTable<EjercicioExtra, 'clave'>
  sesiones: EntityTable<Sesion, 'id'>
  fotos: EntityTable<Foto, 'ejercicio'> // solo en este aparato (son pesadas)
  diario: EntityTable<Diario, 'fecha'>
  voley: EntityTable<Voley, 'id'>
}

db.version(1).stores({
  rutinas: 'id, cargada',
  estado: 'clave',
  local: 'clave',
  extras: 'clave',
  sesiones: 'id, fecha, inicio, diaId',
  fotos: 'ejercicio',
  diario: 'fecha',
  voley: 'id, fecha, inicio',
})

if (CON_NUBE) {
  db.cloud.configure({
    databaseUrl: NUBE_URL,
    requireAuth: false, // anda sin entrar; cuando entrás con tu mail se sube todo
    customLoginGui: true, // la pantalla de entrar es nuestra, en castellano
    unsyncedTables: ['local', 'fotos'],
    nameSuffix: false,
  })
}

export const nubeActiva = CON_NUBE

export const RUTINA_BASE: Rutina = RutinaSchema.parse(rutinaBaseJson)
const ID_BASE = 'rut-base'

/** Id nuevo para una rutina. */
export function idRutina(cargada: number) {
  return `rut-${cargada}-${Math.random().toString(36).slice(2, 7)}`
}

/** Copia una sola vez lo que había en la base vieja (antes de la nube). No borra la vieja. */
export async function migrarDeLaVieja() {
  if (await db.local.get('migrado')) return
  if (await Dexie.exists('entrena')) {
    const vieja = new Dexie('entrena')
    vieja.version(1).stores({ rutinas: '++id, cargada', estado: 'clave', extras: 'clave', sesiones: 'id, fecha, inicio, diaId', fotos: 'ejercicio' })
    vieja.version(2).stores({ diario: 'fecha', voley: 'id, fecha, inicio' })
    try {
      await vieja.open()
      const t = (n: string) => vieja.table(n).toArray()
      const [rutinas, estado, extras, sesiones, fotos, diario, voley] = await Promise.all(
        ['rutinas', 'estado', 'extras', 'sesiones', 'fotos', 'diario', 'voley'].map(t),
      )
      const ids = new Map<number, string>()
      const nuevas = rutinas.map((r: { id: number; rutina: Rutina; cargada: number; base: boolean }) => {
        const id = r.base ? ID_BASE : `rut-${r.cargada}`
        ids.set(r.id, id)
        return { id, rutina: r.rutina, cargada: r.base ? 0 : r.cargada, base: r.base }
      })
      const activa = estado.find((e: Estado) => e.clave === 'rutinaActiva')?.valor
      const enCurso = estado.find((e: Estado) => e.clave === 'sesionEnCurso')
      await db.transaction('rw', [db.rutinas, db.estado, db.local, db.extras, db.sesiones, db.fotos, db.diario, db.voley], async () => {
        await db.rutinas.bulkPut(nuevas)
        if (typeof activa === 'number' && ids.has(activa)) await db.estado.put({ clave: 'rutinaActiva', valor: ids.get(activa) })
        if (enCurso) await db.local.put(enCurso)
        await db.extras.bulkPut(extras)
        await db.sesiones.bulkPut(sesiones)
        await db.fotos.bulkPut(fotos)
        await db.diario.bulkPut(diario)
        await db.voley.bulkPut(voley)
      })
    } catch {
      // Si la vieja no se puede abrir, se arranca de cero (la vieja queda intacta).
    } finally {
      vieja.close()
    }
  }
  await db.local.put({ clave: 'migrado', valor: Date.now() })
}

/** Si no hay ninguna rutina, deja la del PF anterior (siempre con el mismo id, así no se duplica entre aparatos). */
export async function asegurarRutinaBase() {
  if (await db.rutinas.get(ID_BASE)) return
  if ((await db.rutinas.count()) > 0) return
  await db.rutinas.put({ id: ID_BASE, rutina: RUTINA_BASE, cargada: 0, base: true })
}

/** Lo que hace la app al abrir. */
export async function iniciarDatos() {
  await migrarDeLaVieja()
  await asegurarRutinaBase()
}

export async function rutinaActiva(): Promise<RutinaGuardada | undefined> {
  const e = await db.estado.get('rutinaActiva')
  const r = typeof e?.valor === 'string' ? await db.rutinas.get(e.valor) : undefined
  return r ?? (await db.rutinas.orderBy('cargada').last())
}

/** Guarda la rutina nueva y la deja activa. Las anteriores quedan guardadas. */
export async function cargarRutina(rutina: Rutina): Promise<string> {
  return db.transaction('rw', db.rutinas, db.estado, async () => {
    const cargada = Date.now()
    const id = idRutina(cargada)
    await db.rutinas.add({ id, rutina, cargada, base: false })
    await db.estado.put({ clave: 'rutinaActiva', valor: id })
    return id
  })
}

export async function guardarExtra(nombre: string, como: string, sirve: string) {
  await db.extras.put({ clave: normalizar(nombre), nombre: nombre.trim(), como: como.trim(), sirve: sirve.trim() })
}

// ---- Sesión en curso: se guarda a cada toque, solo en este aparato ----

export async function leerEnCurso(): Promise<EnCurso | undefined> {
  const e = await db.local.get('sesionEnCurso')
  return (e?.valor as EnCurso | undefined) ?? undefined
}

export async function guardarEnCurso(c: EnCurso) {
  await db.local.put({ clave: 'sesionEnCurso', valor: c })
}

export async function descartarEnCurso() {
  await db.local.bulkDelete(['sesionEnCurso', 'descanso'])
}

/** Guarda la sesión terminada y borra la que estaba en curso, todo junto. */
export async function guardarSesion(s: Sesion) {
  await db.transaction('rw', db.sesiones, db.local, async () => {
    await db.sesiones.put(s)
    await db.local.bulkDelete(['sesionEnCurso', 'descanso'])
  })
}

/** Le pide al iPhone que no borre los datos de la app. */
export async function pedirPersistencia() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist()
  } catch {
    // Si no se puede, sigue igual.
  }
}
