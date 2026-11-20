import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { FotoEjercicio } from '../components/Foto'
import { Icon } from '../components/Icon'
import { Back, Head } from '../components/ui'
import { db, type RutinaGuardada } from '../db'
import { useDiario, useFichas, useRutina, useSesiones, useVoley } from '../hooks'
import { buscarFicha } from '../lib/ejercicios'
import { resumenPF } from '../lib/resumen'
import { extraerJson, RutinaSchema, seriesDe, type Rutina } from '../lib/rutina'
import { fechaCorta, fechaISO, textoDosis } from '../lib/sesion'
import { navegar, rutaA } from '../tabs'

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}

// ---------------- Resumen para el PF ----------------

export function ResumenPF() {
  const [dias, setDias] = useState(7)
  const [copiado, setCopiado] = useState<'si' | 'no' | null>(null)
  const sesiones = useSesiones()
  const voley = useVoley()
  const diario = useDiario()
  const activa = useRutina()

  if (!sesiones || !voley || !diario) return <Back label="Más" siNo={rutaA('mas')} />
  const texto = resumenPF({ dias, rutinaNombre: activa?.rutina.nombre, sesiones, voley, diario })

  const compartir = async () => {
    try {
      await navigator.share({ text: texto })
    } catch {
      // canceló o no se puede: no pasa nada
    }
  }

  return (
    <>
      <Back label="Más" siNo={rutaA('mas')} />
      <Head title="Resumen para el PF" />
      <p className="lead">Copialo y pegalo en el chat del PF. Incluye gym, vóley, rodilla a la mañana y cómo llegaste.</p>

      <div className="chips chips--fijos" role="group" aria-label="Período">
        {[7, 14, 28].map((d) => (
          <button
            key={d}
            type="button"
            className={dias === d ? 'chip chip--on' : 'chip'}
            aria-pressed={dias === d}
            onClick={() => {
              setDias(d)
              setCopiado(null)
            }}
          >
            Últimos {d} días
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn btn--primary"
        onClick={async () => setCopiado((await copiar(texto)) ? 'si' : 'no')}
      >
        <Icon name="copiar" size={20} />
        {copiado === 'si' ? '¡Copiado!' : 'Copiar resumen'}
      </button>
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button type="button" className="btn btn--soft mt" onClick={compartir}>
          Compartir…
        </button>
      )}
      {copiado === 'no' && <p className="chequeo__alerta">No pude copiar. Mantené apretado el texto de abajo y copialo a mano.</p>}

      <pre className="resumen" aria-label="Resumen">
        {texto}
      </pre>
    </>
  )
}

// ---------------- Rutina actual (con edición) ----------------

type Ubic = { d: number; b: number; e: number }

export function RutinaActual() {
  const activa = useRutina()
  const { fichas } = useFichas()
  const [editando, setEditando] = useState<Ubic | null>(null)
  if (!activa) return <Back label="Más" siNo={rutaA('mas')} />
  const r = activa.rutina
  const fecha = new Date(activa.cargada).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })

  return (
    <>
      <Back label="Más" siNo={rutaA('mas')} />
      <Head eyebrow={activa.base ? 'Viene con la app' : `Cargada el ${fecha}`} title={r.nombre} />
      <p className="lead">Tocá un ejercicio para cambiar series, reps, peso o nota.</p>

      {r.notas && (
        <div className={activa.base ? 'aviso aviso--static' : 'nota-pf'}>
          {activa.base ? (
            <span className="aviso__icon">
              <Icon name="alerta" size={20} />
            </span>
          ) : (
            <span className="nota-pf__label">Nota del PF</span>
          )}
          <span>{r.notas}</span>
        </div>
      )}

      {r.dias.map((d, di) => (
        <section key={d.id}>
          <p className="dia-title">
            {d.nombre}
            {d.foco && <span> · {d.foco}</span>}
          </p>
          {d.bloques.map((b, bi) => (
            <div key={bi} className="bloque">
              <div className="bloque__head">
                <span className="bloque__name">{b.nombre}</span>
                <span className="bloque__meta">
                  {b.tipo === 'movilidad' ? 'Movilidad' : b.vueltas === 1 ? '1 vuelta' : `${b.vueltas} vueltas`}
                </span>
              </div>
              {b.ejercicios.map((e, ei) => {
                const f = buscarFicha(fichas, e.nombre)
                return (
                  <button key={ei} type="button" className="ej" onClick={() => setEditando({ d: di, b: bi, e: ei })}>
                    <FotoEjercicio ficha={f?.nombre} video={f?.video ?? e.nombre} tam="mini" estatico />
                    <span className="ej__name">
                      {e.nombre}
                      {e.nota && <span className="ej__nota">{e.nota}</span>}
                    </span>
                    <span className="ej__dose">
                      {b.tipo === 'fuerza' ? textoDosis(seriesDe(e, b), e.reps) : e.series ? textoDosis(e.series, e.reps) : e.reps}
                      {e.carga && <span className="ej__carga">{e.carga}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </section>
      ))}

      {editando && <EditarEjercicio guardada={activa} u={editando} onCerrar={() => setEditando(null)} />}
    </>
  )
}

function EditarEjercicio({ guardada, u, onCerrar }: { guardada: RutinaGuardada; u: Ubic; onCerrar: () => void }) {
  const bloque = guardada.rutina.dias[u.d].bloques[u.b]
  const ej = bloque.ejercicios[u.e]
  const [series, setSeries] = useState(String(ej.series ?? (bloque.tipo === 'fuerza' ? bloque.vueltas : '')))
  const [reps, setReps] = useState(ej.reps)
  const [carga, setCarga] = useState(ej.carga ?? '')
  const [nota, setNota] = useState(ej.nota ?? '')
  const [error, setError] = useState('')

  const guardar = async () => {
    const r: Rutina = structuredClone(guardada.rutina)
    const e = r.dias[u.d].bloques[u.b].ejercicios[u.e]
    const n = Number(series)
    if (series.trim() && (!Number.isInteger(n) || n < 1)) return setError('Las series tienen que ser un número entero.')
    if (!reps.trim()) return setError('Poné las reps (por ejemplo 6, 10/lado o 30 seg).')
    e.series = series.trim() && n !== r.dias[u.d].bloques[u.b].vueltas ? n : undefined
    e.reps = reps.trim()
    e.carga = carga.trim() || undefined
    e.nota = nota.trim() || undefined
    const ok = RutinaSchema.safeParse(r)
    if (!ok.success) return setError('Algo quedó mal escrito. Revisá los campos.')
    await db.rutinas.update(guardada.id!, { rutina: ok.data })
    onCerrar()
  }

  return (
    <div className="sheet-fondo" onClick={onCerrar}>
      <div className="sheet" role="dialog" aria-label={`Editar ${ej.nombre}`} onClick={(ev) => ev.stopPropagation()}>
        <div className="sheet__head">
          <p className="sheet__title">{ej.nombre}</p>
          <button type="button" className="timer__cerrar" onClick={onCerrar} aria-label="Cerrar">
            <Icon name="cerrar" size={20} />
          </button>
        </div>
        {bloque.tipo === 'fuerza' && (
          <label className="field">
            <span className="field__label">Series (si lo dejás igual, son las vueltas del bloque: {bloque.vueltas})</span>
            <input className="campo" inputMode="numeric" value={series} onChange={(e) => setSeries(e.target.value.replace(/\D/g, ''))} />
          </label>
        )}
        <label className="field">
          <span className="field__label">Reps o tiempo</span>
          <input className="campo" value={reps} onChange={(e) => setReps(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Carga (ej: 50 kg, banda gruesa)</span>
          <input className="campo" value={carga} onChange={(e) => setCarga(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Nota</span>
          <input className="campo" value={nota} onChange={(e) => setNota(e.target.value)} />
        </label>
        {error && <p className="chequeo__alerta">{error}</p>}
        <button type="button" className="btn btn--primary" onClick={guardar}>
          <Icon name="check" size={20} />
          Guardar cambio
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => navegar(rutaA('ejercicios', ej.nombre))}>
          Ver la ficha del ejercicio
        </button>
      </div>
    </div>
  )
}

// ---------------- Rutinas anteriores ----------------

export function Rutinas() {
  const todas = useLiveQuery(() => db.rutinas.orderBy('cargada').reverse().toArray())
  const activa = useRutina()
  if (!todas || !activa) return <Back label="Más" siNo={rutaA('mas')} />

  const usar = async (r: RutinaGuardada) => {
    if (!window.confirm(`¿Volver a "${r.rutina.nombre}"? Tus sesiones guardadas no se tocan.`)) return
    await db.estado.put({ clave: 'rutinaActiva', valor: r.id })
  }

  return (
    <>
      <Back label="Más" siNo={rutaA('mas')} />
      <Head title="Tus rutinas" />
      <p className="lead">Todas las que cargaste. Podés volver a una anterior cuando quieras.</p>
      <div className="list">
        {todas.map((r) => {
          const esActiva = r.id === activa.id
          return (
            <div key={r.id} className="row row--off">
              <span className={esActiva ? 'row__icon row__icon--accent' : 'row__icon'}>
                <Icon name="rutina" size={20} />
              </span>
              <span className="row__text">
                <span className="row__title">{r.rutina.nombre}</span>
                <br />
                <span className="row__sub">
                  {r.base ? 'Viene con la app' : `Cargada el ${fechaCorta(r.cargada)}`} · {r.rutina.dias.length} días
                </span>
              </span>
              {esActiva ? (
                <span className="row__soon">En uso</span>
              ) : (
                <button type="button" className="link-chico" onClick={() => usar(r)}>
                  Usar
                </button>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

// ---------------- Backup ----------------

const TABLAS = ['rutinas', 'estado', 'extras', 'sesiones', 'diario', 'voley'] as const

async function armarBackup() {
  const datos: Record<string, unknown[]> = {}
  for (const t of TABLAS) datos[t] = await db.table(t).toArray()
  return JSON.stringify({ app: 'entrena', version: 2, fecha: new Date().toISOString(), ...datos })
}

function leerArchivo(archivo: File): Promise<string> {
  return new Promise((ok, mal) => {
    const r = new FileReader()
    r.onload = () => ok(String(r.result ?? ''))
    r.onerror = () => mal(r.error)
    r.readAsText(archivo)
  })
}

export function Backup() {
  const [estado, setEstado] = useState<string | null>(null)
  const [pegado, setPegado] = useState('')

  const copiarTodo = async () => {
    const texto = await armarBackup()
    setEstado((await copiar(texto)) ? 'Copiado. Pegalo en un chat con vos mismo o en Notas para guardarlo.' : 'No pude copiar. Probá con "Guardar archivo".')
  }

  const guardarArchivo = async () => {
    const texto = await armarBackup()
    const nombre = `entrena-backup-${fechaISO(Date.now())}.json`
    const archivo = new File([texto], nombre, { type: 'application/json' })
    try {
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: nombre })
        setEstado('Listo. Elegí "Guardar en Archivos" para tenerlo a mano.')
        return
      }
    } catch {
      return
    }
    const url = URL.createObjectURL(archivo)
    const a = document.createElement('a')
    a.href = url
    a.download = nombre
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    setEstado('Archivo descargado.')
  }

  const restaurar = async (texto: string) => {
    let datos: Record<string, unknown>
    try {
      datos = JSON.parse(extraerJson(texto) ?? '')
    } catch {
      return setEstado('Eso no parece un backup de la app. Revisá que esté completo.')
    }
    if (datos.app !== 'entrena') return setEstado('Eso no parece un backup de la app.')
    const n = Array.isArray(datos.sesiones) ? datos.sesiones.length : 0
    if (!window.confirm(`Esto reemplaza todos tus datos por los del backup (${n} sesiones). Tus fotos no se tocan. ¿Seguir?`)) return
    await db.transaction('rw', TABLAS.map((t) => db.table(t)), async () => {
      for (const t of TABLAS) {
        await db.table(t).clear()
        const filas = datos[t]
        if (Array.isArray(filas) && filas.length) await db.table(t).bulkPut(filas)
      }
    })
    setPegado('')
    setEstado(`Listo: restauré ${n} sesiones y tus rutinas.`)
  }

  return (
    <>
      <Back label="Más" siNo={rutaA('mas')} />
      <Head title="Backup" />
      <p className="lead">
        Tus datos viven solo en este celular. Hacé un backup cada tanto, y también sirve para pasarlos a otro aparato. Las fotos
        que sacaste no entran en el backup.
      </p>

      <p className="section-title">Guardar</p>
      <button type="button" className="btn btn--primary" onClick={guardarArchivo}>
        <Icon name="backup" size={20} />
        Guardar archivo de backup
      </button>
      <button type="button" className="btn btn--soft mt" onClick={copiarTodo}>
        <Icon name="copiar" size={20} />
        Copiar todos mis datos
      </button>

      <p className="section-title">Restaurar</p>
      <label className="btn btn--soft">
        <Icon name="importar" size={20} />
        Elegir archivo de backup
        <input
          type="file"
          className="oculto"
          accept=".json,.txt,application/json,text/plain"
          aria-label="Elegir archivo de backup"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) await restaurar(await leerArchivo(f))
          }}
        />
      </label>
      <label className="field">
        <span className="field__label">O pegá el backup acá</span>
        <textarea rows={4} value={pegado} onChange={(e) => setPegado(e.target.value)} spellCheck={false} />
      </label>
      <button type="button" className="btn btn--soft" disabled={!pegado.trim()} onClick={() => restaurar(pegado)}>
        Restaurar lo que pegué
      </button>

      {estado && <p className="chequeo__alerta mt">{estado}</p>}
    </>
  )
}
