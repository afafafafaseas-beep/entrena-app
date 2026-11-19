import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Descanso } from '../components/Descanso'
import { Icon } from '../components/Icon'
import { Empty, Head } from '../components/ui'
import { descartarEnCurso, guardarEnCurso, guardarSesion, type Sesion } from '../db'
import { useEnCurso, useRutina, useSesiones } from '../hooks'
import { seriesDe, type Bloque, type Prescripto } from '../lib/rutina'
import {
  colorRodilla,
  proximoDia,
  reloj,
  sugerencia,
  terminarSesion,
  textoUltimaVez,
  ultimaVez,
  type EnCurso,
  type UltimaVez,
} from '../lib/sesion'
import { navegar, rutaA } from '../tabs'
import { empezarSesion } from './acciones'

type EjSesion = Sesion['ejercicios'][number]

// Para volver al mismo lugar después de mirar una ficha.
const memoria = { scroll: 0, sesionId: '' }

export function Entrenar() {
  const enCurso = useEnCurso()
  const activa = useRutina()
  const sesiones = useSesiones()

  if (enCurso === undefined || sesiones === undefined) return null

  if (!enCurso) {
    const dia = activa ? proximoDia(activa.rutina, sesiones) : undefined
    return (
      <>
        <Head title="Entrenar" />
        <Empty icon="entrenar" title="Nada en curso" text={dia ? `Te toca el ${dia.nombre}${dia.foco ? `: ${dia.foco}` : ''}.` : ''} />
        {activa && dia && (
          <button type="button" className="btn btn--primary mt" onClick={() => empezarSesion(activa.rutina, dia)}>
            <Icon name="play" size={20} filled />
            Empezar {dia.nombre}
          </button>
        )}
      </>
    )
  }

  return <SesionEnCurso key={enCurso.sesion.id} inicial={enCurso} sesiones={sesiones} />
}

function SesionEnCurso({ inicial, sesiones }: { inicial: EnCurso; sesiones: Sesion[] }) {
  const [c, setC] = useState(inicial)
  const ref = useRef(inicial)
  const [ahora, setAhora] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useLayoutEffect(() => {
    if (memoria.sesionId === inicial.sesion.id) window.scrollTo(0, memoria.scroll)
    memoria.sesionId = inicial.sesion.id
  }, [inicial.sesion.id])

  /** Cambia algo y lo guarda en el celular al instante. */
  const actualizar = (fn: (c: EnCurso) => void) => {
    const n = structuredClone(ref.current)
    fn(n)
    ref.current = n
    setC(n)
    void guardarEnCurso(n)
  }

  const abrirFicha = (nombre: string) => {
    memoria.scroll = window.scrollY
    navegar(rutaA('ejercicios', nombre))
  }

  const s = c.sesion
  const fuerza = s.ejercicios.filter((e) => e.tipo === 'fuerza')
  const totalSeries = fuerza.reduce((n, e) => n + e.series.length, 0)
  const hechas = fuerza.reduce((n, e) => n + e.series.filter((x) => x.ok).length, 0)

  const ultimas = useMemo(
    () => new Map(s.ejercicios.map((e) => [e.nombre, ultimaVez(sesiones, e.nombre, s.inicio)])),
    [sesiones, s.ejercicios, s.inicio],
  )

  let idx = 0
  return (
    <>
      <header className="head">
        <p className="eyebrow">{s.rutinaNombre}</p>
        <h1>{s.diaNombre}</h1>
        <div className="sesion-meta">
          <span className="sesion-meta__item">
            <Icon name="reloj" size={18} />
            {reloj(ahora - s.inicio)}
          </span>
          {totalSeries > 0 && (
            <span className="sesion-meta__item">
              <Icon name="check" size={18} />
              {hechas} de {totalSeries} series
            </span>
          )}
        </div>
      </header>

      {c.dia.bloques.map((b, bi) => (
        <section key={bi} className="bloque">
          <div className="bloque__head">
            <span className="bloque__name">{b.nombre}</span>
            <span className="bloque__meta">
              {b.tipo === 'movilidad' ? 'Movilidad' : b.vueltas === 1 ? '1 vuelta' : `${b.vueltas} vueltas`}
            </span>
          </div>
          {b.ejercicios.map((p) => {
            const i = idx++
            const e = s.ejercicios[i]
            if (!e) return null
            return b.tipo === 'movilidad' ? (
              <EjMovilidad
                key={i}
                p={p}
                e={e}
                onFicha={() => abrirFicha(p.nombre)}
                onToggle={() => actualizar((n) => void (n.sesion.ejercicios[i].hecho = !n.sesion.ejercicios[i].hecho))}
              />
            ) : (
              <EjFuerza
                key={i}
                p={p}
                b={b}
                e={e}
                ultima={ultimas.get(e.nombre)}
                onFicha={() => abrirFicha(p.nombre)}
                onCambio={(fn) => actualizar((n) => fn(n.sesion.ejercicios[i]))}
              />
            )
          })}
        </section>
      ))}

      <p className="rpe-explica">
        <strong>RPE</strong> = qué tan duro fue. 10: no podías hacer ni una más · 9: te quedaba 1 · 8: te quedaban 2 · 7: te
        quedaban 3 · 6: fácil.
      </p>

      <Terminar c={c} actualizar={actualizar} />

      <Descanso />
    </>
  )
}

function EjMovilidad({ p, e, onFicha, onToggle }: { p: Prescripto; e: EjSesion; onFicha: () => void; onToggle: () => void }) {
  return (
    <div className={e.hecho ? 'mov mov--ok' : 'mov'}>
      <button
        type="button"
        className="tick"
        onClick={onToggle}
        aria-pressed={e.hecho}
        aria-label={`${e.hecho ? 'Destildar' : 'Tildar'} ${p.nombre}`}
      >
        <Icon name="check" size={20} />
      </button>
      <button type="button" className="mov__name" onClick={onFicha}>
        {p.nombre}
      </button>
      <span className="mov__reps">{p.reps}</span>
    </div>
  )
}

const fmt = (n?: number) => (n === undefined ? '' : String(n).replace('.', ','))
const leerNum = (t: string): number | undefined => {
  const v = Number(t.replace(',', '.'))
  return t.trim() === '' || isNaN(v) ? undefined : v
}

function EjFuerza({
  p,
  b,
  e,
  ultima,
  onFicha,
  onCambio,
}: {
  p: Prescripto
  b: Bloque
  e: EjSesion
  ultima?: UltimaVez
  onFicha: () => void
  onCambio: (fn: (e: EjSesion) => void) => void
}) {
  const pres = [`${seriesDe(p, b)} × ${p.reps}`, p.carga, p.rpe && `RPE ${p.rpe}`, p.descanso && `descanso ${p.descanso}`]
    .filter(Boolean)
    .join(' · ')
  const completo = e.series.length > 0 && e.series.every((x) => x.ok)

  return (
    <div className="ejf">
      <div className="ejf__head">
        <button type="button" className="ejf__name" onClick={onFicha}>
          {p.nombre}
        </button>
        {completo && (
          <span className="ejf__ok" aria-label="Completo">
            <Icon name="check" size={18} />
          </span>
        )}
      </div>
      <p className="ejf__pres">{pres}</p>
      {p.nota && <p className="ejf__nota">{p.nota}</p>}

      <div className="series">
        <div className="serie serie--head" aria-hidden="true">
          <span>Serie</span>
          <span>Kg</span>
          <span>{/seg/i.test(p.reps) ? 'Seg' : 'Reps'}</span>
          <span />
        </div>
        {e.series.map((x, i) => {
          const sug = sugerencia(i, ultima, p)
          return (
            <SerieFila
              key={i}
              n={i + 1}
              nombre={p.nombre}
              kg={x.kg}
              reps={x.reps}
              ok={x.ok}
              sugKg={sug.kg}
              sugReps={sug.reps}
              onKg={(v) => onCambio((ej) => void (ej.series[i].kg = v))}
              onReps={(v) => onCambio((ej) => void (ej.series[i].reps = v))}
              onOk={() =>
                onCambio((ej) => {
                  const se = ej.series[i]
                  if (!se.ok) {
                    // Si toca ✓ con los campos vacíos, se copian los valores de fondo.
                    se.kg ??= sug.kg
                    se.reps ??= sug.reps
                  }
                  se.ok = !se.ok
                })
              }
            />
          )
        })}
      </div>

      <p className="ultima">{ultima ? textoUltimaVez(ultima) : 'Primera vez que lo anotás'}</p>

      <div className="rpe" role="group" aria-label={`RPE de ${p.nombre}`}>
        <span className="rpe__label">RPE</span>
        {[6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            type="button"
            className={e.rpe === n ? 'rpe__btn rpe__btn--on' : 'rpe__btn'}
            aria-pressed={e.rpe === n}
            onClick={() => onCambio((ej) => void (ej.rpe = ej.rpe === n ? undefined : n))}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

function SerieFila(props: {
  n: number
  nombre: string
  kg?: number
  reps?: number
  ok: boolean
  sugKg?: number
  sugReps?: number
  onKg: (v?: number) => void
  onReps: (v?: number) => void
  onOk: () => void
}) {
  const { n, nombre, kg, reps, ok, sugKg, sugReps } = props
  // Texto tal cual lo escribe (así puede poner "7," antes del 5).
  const [kgTxt, setKgTxt] = useState(fmt(kg))
  const [repsTxt, setRepsTxt] = useState(fmt(reps))
  // Si el valor cambia desde afuera (✓ copió la sugerencia), se actualiza el texto.
  useEffect(() => {
    if (leerNum(kgTxt) !== kg) setKgTxt(fmt(kg))
  }, [kg])
  useEffect(() => {
    if (leerNum(repsTxt) !== reps) setRepsTxt(fmt(reps))
  }, [reps])

  return (
    <div className={ok ? 'serie serie--ok' : 'serie'}>
      <span className="serie__n">{n}</span>
      <input
        className="serie__in"
        inputMode="decimal"
        enterKeyHint="next"
        placeholder={fmt(sugKg) || 'kg'}
        value={kgTxt}
        aria-label={`Kilos serie ${n} de ${nombre}`}
        onChange={(ev) => {
          const t = ev.target.value.replace(/[^\d.,]/g, '')
          setKgTxt(t)
          props.onKg(leerNum(t))
        }}
      />
      <input
        className="serie__in"
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint="done"
        placeholder={fmt(sugReps) || 'reps'}
        value={repsTxt}
        aria-label={`Reps serie ${n} de ${nombre}`}
        onChange={(ev) => {
          const t = ev.target.value.replace(/\D/g, '')
          setRepsTxt(t)
          props.onReps(leerNum(t))
        }}
      />
      <button
        type="button"
        className="tick"
        aria-pressed={ok}
        aria-label={`${ok ? 'Destildar' : 'Tildar'} serie ${n} de ${nombre}`}
        onClick={props.onOk}
      >
        <Icon name="check" size={22} />
      </button>
    </div>
  )
}

function Terminar({ c, actualizar }: { c: EnCurso; actualizar: (fn: (c: EnCurso) => void) => void }) {
  const s = c.sesion
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    if (s.rodilla === undefined && !window.confirm('No anotaste cómo terminó la rodilla. ¿Guardar igual?')) return
    setGuardando(true)
    await guardarSesion(terminarSesion(c))
    navegar(rutaA('hoy'))
  }

  const descartar = async () => {
    if (!window.confirm('¿Descartar esta sesión? Se borra todo lo que anotaste hoy.')) return
    await descartarEnCurso()
    navegar(rutaA('hoy'))
  }

  return (
    <section className="terminar">
      <h2 className="terminar__title">Terminar</h2>

      <p className="terminar__label">¿Cómo terminó la rodilla?</p>
      <p className="terminar__hint">0 = nada de dolor · 10 = mucho dolor</p>
      <div className="rodilla" role="group" aria-label="Rodilla al terminar">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            className={`rod rod--${colorRodilla(n)}${s.rodilla === n ? ' rod--on' : ''}`}
            aria-pressed={s.rodilla === n}
            onClick={() => actualizar((x) => void (x.sesion.rodilla = x.sesion.rodilla === n ? undefined : n))}
          >
            {n}
          </button>
        ))}
      </div>

      <p className="terminar__label">¿Qué tan dura fue la sesión?</p>
      <div className="rpe rpe--sesion" role="group" aria-label="RPE de la sesión">
        {[5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            type="button"
            className={s.rpeSesion === n ? 'rpe__btn rpe__btn--on' : 'rpe__btn'}
            aria-pressed={s.rpeSesion === n}
            onClick={() => actualizar((x) => void (x.sesion.rpeSesion = x.sesion.rpeSesion === n ? undefined : n))}
          >
            {n}
          </button>
        ))}
      </div>

      <label className="field">
        <span className="terminar__label">Notas</span>
        <textarea
          rows={3}
          value={s.notas ?? ''}
          placeholder="Cómo te sentiste, algo que molestó, algo para el PF…"
          onChange={(ev) => {
            const t = ev.target.value
            actualizar((x) => void (x.sesion.notas = t || undefined))
          }}
        />
      </label>

      <button type="button" className="btn btn--primary" disabled={guardando} onClick={guardar}>
        <Icon name="check" size={20} />
        Guardar sesión
      </button>
      <button type="button" className="btn btn--ghost" onClick={descartar}>
        Descartar
      </button>
    </section>
  )
}
