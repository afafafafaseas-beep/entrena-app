import { z } from 'zod'

// Lo que dice la sección 6 del CLAUDE.md. Acepta números donde va texto (reps: 8) para no frenar al PF por pavadas.
const texto = z.union([z.string(), z.number()]).transform(String)
// "3" se toma como 3, pero si no está sigue faltando (así el error dice "le falta").
const aNumero = (v: unknown) => (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)) ? Number(v) : v)
const entero = z.preprocess(aNumero, z.number().int().positive())

const PrescriptoSchema = z.object({
  nombre: z.string().trim().min(1),
  series: entero.optional(),
  reps: texto,
  carga: texto.optional(),
  rpe: texto.optional(),
  descanso: texto.optional(),
  nota: z.string().optional(),
})

const BloqueSchema = z.object({
  nombre: z.string().trim().min(1),
  tipo: z.enum(['movilidad', 'fuerza']),
  vueltas: entero,
  ejercicios: z.array(PrescriptoSchema).min(1),
})

const DiaSchema = z.object({
  id: texto.pipe(z.string().trim().min(1)),
  nombre: z.string().trim().min(1),
  foco: z.string().optional(),
  bloques: z.array(BloqueSchema).min(1),
})

export const RutinaSchema = z.object({
  nombre: z.string().trim().min(1),
  semana: z.preprocess(aNumero, z.number().optional()),
  notas: z.string().optional(),
  dias: z.array(DiaSchema).min(1),
})

export type Rutina = z.infer<typeof RutinaSchema>
export type Dia = Rutina['dias'][number]
export type Bloque = Dia['bloques'][number]
export type Prescripto = Bloque['ejercicios'][number]

export type Revision = { ok: true; rutina: Rutina; resumen: string } | { ok: false; error: string }

/** Busca la rutina dentro de lo que pegó (puede ser el mensaje entero del PF). */
export function extraerJson(pegado: string): string | null {
  const a = pegado.indexOf('{')
  const b = pegado.lastIndexOf('}')
  return a === -1 || b <= a ? null : pegado.slice(a, b + 1)
}

export function contarEjercicios(r: Rutina): number {
  return r.dias.reduce((n, d) => n + d.bloques.reduce((m, b) => m + b.ejercicios.length, 0), 0)
}

export function resumenRutina(r: Rutina): string {
  const titulo = r.semana !== undefined ? `Semana ${r.semana}` : r.nombre
  const dias = r.dias.length === 1 ? '1 día' : `${r.dias.length} días`
  const n = contarEjercicios(r)
  return `${titulo}: ${dias}, ${n === 1 ? '1 ejercicio' : `${n} ejercicios`}`
}

/** Series de un ejercicio: las suyas, o si no las vueltas del bloque. */
export function seriesDe(e: Prescripto, b: Bloque): number {
  return e.series ?? b.vueltas
}

export function revisarRutina(pegado: string): Revision {
  const json = extraerJson(pegado)
  if (!json) {
    return { ok: false, error: 'No encontré la rutina en lo que pegaste. Tiene que tener un bloque que empiece con { y termine con }.' }
  }
  let datos: unknown
  try {
    datos = JSON.parse(json)
  } catch {
    return {
      ok: false,
      error: 'No pude leer la rutina: parece que está cortada o tiene algo mal escrito. Pedile al PF que te la pase de nuevo entera.',
    }
  }
  const r = RutinaSchema.safeParse(datos)
  if (!r.success) return { ok: false, error: explicarError(r.error.issues[0], datos) }

  const ids = r.data.dias.map((d) => d.id)
  const repetido = ids.find((id, i) => ids.indexOf(id) !== i)
  if (repetido) return { ok: false, error: `Hay dos días con el mismo id ("${repetido}"). Cada día tiene que tener uno distinto.` }

  return { ok: true, rutina: r.data, resumen: resumenRutina(r.data) }
}

// ---- Errores en criollo ----

const CAMPOS: Record<string, string> = {
  nombre: 'el nombre',
  semana: 'la semana',
  dias: 'los días',
  id: 'el id',
  foco: 'el foco',
  bloques: 'los bloques',
  tipo: 'el tipo',
  vueltas: 'cuántas vueltas',
  ejercicios: 'los ejercicios',
  series: 'cuántas series',
  reps: 'las repeticiones',
  carga: 'la carga',
  rpe: 'el RPE',
  descanso: 'el descanso',
  nota: 'la nota',
  notas: 'las notas',
}

type Obj = Record<string, unknown>
const get = (o: unknown, k: string | number): unknown => (o && typeof o === 'object' ? (o as Obj)[k as string] : undefined)
const nombreDe = (o: unknown, alt: string) => {
  const n = get(o, 'nombre')
  return typeof n === 'string' && n.trim() ? n.trim() : alt
}

/** "el bloque Potencia 1 del Día 2", según en qué parte de la rutina está el error. */
function dondeEsta(path: (string | number)[], datos: unknown): string {
  let lugar = 'la rutina'
  let dia: unknown
  let bloque: unknown
  let diaTxt = ''
  let bloqueTxt = ''
  for (let i = 0; i < path.length; i++) {
    const k = path[i]
    const sig = path[i + 1]
    if (k === 'dias' && typeof sig === 'number') {
      dia = get(get(datos, 'dias'), sig)
      diaTxt = nombreDe(dia, `día ${sig + 1}`)
      lugar = `el ${diaTxt}`
      i++
    } else if (k === 'bloques' && typeof sig === 'number') {
      bloque = get(get(dia, 'bloques'), sig)
      bloqueTxt = nombreDe(bloque, `número ${sig + 1}`)
      lugar = `el bloque ${bloqueTxt} del ${diaTxt}`
      i++
    } else if (k === 'ejercicios' && typeof sig === 'number') {
      const ej = get(get(bloque, 'ejercicios'), sig)
      lugar = `el ejercicio ${nombreDe(ej, `número ${sig + 1}`)} del bloque ${bloqueTxt} (${diaTxt})`
      i++
    }
  }
  return lugar
}

const conA = (lugar: string) => (lugar.startsWith('el ') ? 'Al ' + lugar.slice(3) : 'A ' + lugar)
const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function explicarError(issue: z.ZodIssue, datos: unknown): string {
  const path = issue.path
  const ultimo = path[path.length - 1]
  const campoKey = typeof ultimo === 'string' ? ultimo : String(path[path.length - 2] ?? '')
  const campo = CAMPOS[campoKey] ?? `"${campoKey}"`
  // El lugar es el objeto que contiene el campo con problema.
  const lugar = dondeEsta(typeof ultimo === 'string' ? path.slice(0, -1) : path.slice(0, -2), datos)

  const valor = path.reduce<unknown>((o, k) => get(o, k), datos)
  if (valor === undefined || (issue.code === 'invalid_type' && issue.received === 'undefined')) {
    return `${conA(lugar)} le falta decir ${campo}.`
  }
  if (issue.code === 'invalid_enum_value' && campoKey === 'tipo') {
    return `En ${lugar}, el tipo tiene que ser "movilidad" o "fuerza".`
  }
  if (issue.code === 'too_small' && issue.type === 'array') {
    return `${mayus(lugar)} no tiene ${campo}.`
  }
  if (issue.code === 'too_small' && issue.type === 'string') {
    return `${conA(lugar)} le falta decir ${campo} (está vacío).`
  }
  if (issue.code === 'invalid_type' || issue.code === 'too_small' || issue.code === 'not_finite') {
    const esperado =
      issue.code === 'invalid_type' && issue.expected === 'array'
        ? 'una lista'
        : issue.code === 'invalid_type' && issue.expected === 'string'
          ? 'un texto'
          : 'un número mayor que cero'
    return `En ${lugar}, ${campo} está mal: tiene que ser ${esperado}.`
  }
  return `En ${lugar}, ${campo} está mal escrito.`
}
