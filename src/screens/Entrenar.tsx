import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Descanso, pedirDescanso } from '../components/Descanso'
import { Icon } from '../components/Icon'
import { Empty, Head } from '../components/ui'
import { descartarEnCurso, guardarEnCurso, guardarSesion, type Sesion } from '../db'
import { useEnCurso, useRutina, useSesiones } from '../hooks'
import { seriesDe, type Bloque, type Prescripto } from '../lib/rutina'
import {
  colorRodilla,
  medidaDe,
  proximoDia,
  reloj,
  segundosDescanso,
  sugerencia,
  terminarSesion,
  textoDosis,
  textoUltimaVez,
  ultimaVez,
  type EnCurso,
  type Medida,
  type UltimaVez,
  type Valores,
} from '../lib/sesion'
import { navegar, rutaA } from '../tabs'
import { empezarSesion } from './acciones'

type EjSesion = Sesion['ejercicios'][number]
type Campo = keyof Valores

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
        <Empty
          icon="entrenar"
          title="Nada en curso"
          text={dia ? `Te toca el ${dia.nombre}${dia.foco ? `: ${dia.foco}` : ''}.` : ''}
        />
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
        {totalSeries > 0 && (
          <div className="progreso-barra" aria-hidden="true">
            <span style={{ width: `${(hechas / totalSeries) * 100}%` }} />
          </div>
        )}
      </header>

      {c.notas && (
        <div className="nota-pf">
          <span className="nota-pf__label">Nota del PF</span>
          {c.notas}
        </div>
      )}

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
        <strong>RPE</strong> es qué tan duro fue: 10 = no podías hacer ni una más, 9 = te quedaba 1, 8 = te quedaban 2,
        7 = te quedaban 3, 6 = fácil.
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
        {p.nota && <span className="mov__nota">{p.nota}</span>}
      </button>
      <span className="mov__reps">{p.series ? textoDosis(p.series, p.reps) : p.reps}</span>
    </div>
  )
}

const fmt = (n?: number) => (n === undefined ? '' : String(n).replace('.', ','))
const leerNum = (t: string): number | undefined => {
  const v = Number(t.replace(',', '.'))
  return t.trim() === '' || isNaN(v) ? undefined : v
}

const ETIQUETA: Record<Campo, string> = { kg: 'Kg', reps: 'Reps', cm: 'Cm' }

function camposDe(m: Medida): Campo[] {
  const c: Campo[] = []
  if (m.kg) c.push('kg')
  if (m.segunda === 'cm') c.push('cm')
  else if (m.segunda) c.push('reps')
  return c
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
  const medida = medidaDe(p, ultima)
  const campos = camposDe(medida)
  const etiqueta = (c: Campo) => (c === 'reps' && medida.segunda === 'seg' ? 'Seg' : ETIQUETA[c])
  const descanso = segundosDescanso(p.descanso)
  const detalles = [p.carga, p.rpe && `RPE ${p.rpe}`].filter(Boolean)
  const completo = e.series.length > 0 && e.series.every((x) => x.ok)
  const columnas = `34px ${campos.map(() => '1fr').join(' ') || '1fr'} 52px`

  return (
    <div className="ejf">
      <div className="ejf__head">
        <button type="button" className="ejf__name" onClick={onFicha}>
          {p.nombre}
        </button>
        {completo ? (
          <span className="ejf__ok" aria-label="Completo">
            <Icon name="check" size={18} />
          </span>
        ) : (
          descanso && (
            <button
              type="button"
              className="chip-descanso"
              onClick={() => pedirDescanso(descanso)}
              aria-label={`Arrancar descanso de ${reloj(descanso * 1000)}`}
            >
              <Icon name="reloj" size={16} />
              {reloj(descanso * 1000)}
            </button>
          )
        )}
      </div>
      <p className="ejf__pres">
        <span className="ejf__dosis">{textoDosis(seriesDe(p, b), p.reps)}</span>
        {detalles.map((d, i) => (
          <span key={i}> · {d}</span>
        ))}
      </p>
      {p.nota && <p className="ejf__nota">{p.nota}</p>}

      <div className="series">
        <div className="serie serie--head" style={{ gridTemplateColumns: columnas }} aria-hidden="true">
          <span>Serie</span>
          {campos.length ? campos.map((c) => <span key={c}>{etiqueta(c)}</span>) : <span />}
          <span />
        </div>
        {e.series.map((x, i) => {
          const sug = sugerencia(i, ultima, p)
          return (
            <div key={i} className={x.ok ? 'serie serie--ok' : 'serie'} style={{ gridTemplateColumns: columnas }}>
              <span className="serie__n">{i + 1}</span>
              {campos.length ? (
                campos.map((c) => (
                  <NumInput
                    key={c}
                    valor={x[c]}
                    sugerido={sug[c]}
                    decimal={c !== 'reps'}
                    placeholder={etiqueta(c).toLowerCase()}
                    label={`${etiqueta(c)} serie ${i + 1} de ${p.nombre}`}
                    onCambio={(v) => onCambio((ej) => void (ej.series[i][c] = v))}
                  />
                ))
              ) : (
                <span className="serie__txt">{p.reps}</span>
              )}
              <button
                type="button"
                className="tick"
                aria-pressed={x.ok}
                aria-label={`${x.ok ? 'Destildar' : 'Tildar'} serie ${i + 1} de ${p.nombre}`}
                onClick={() =>
                  onCambio((ej) => {
                    const se = ej.series[i]
                    if (!se.ok) {
                      // Si toca ✓ con los campos vacíos, se copian los valores de fondo.
                      for (const c of campos) se[c] ??= sug[c]
                    }
                    se.ok = !se.ok
                  })
                }
              >
                <Icon name="check" size={22} />
              </button>
            </div>
          )
        })}
      </div>

      <p className="ultima">{ultima ? textoUltimaVez(ultima, medida) : 'Primera vez que lo anotás'}</p>

      {medida.segunda !== 'cm' && (
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
      )}
    </div>
  )
}

function NumInput(props: {
  valor?: number
  sugerido?: number
  decimal: boolean
  placeholder: string
  label: string
  onCambio: (v?: number) => void
}) {
  const { valor, sugerido, decimal } = props
  // Texto tal cual lo escribe (así puede poner "7," antes del 5).
  const [txt, setTxt] = useState(fmt(valor))
  // Si el valor cambia desde afuera (✓ copió la sugerencia), se actualiza el texto.
  useEffect(() => {
    if (leerNum(txt) !== valor) setTxt(fmt(valor))
  }, [valor])

  return (
    <input
      className="serie__in"
      inputMode={decimal ? 'decimal' : 'numeric'}
      pattern={decimal ? undefined : '[0-9]*'}
      enterKeyHint="done"
      placeholder={fmt(sugerido) || props.placeholder}
      value={txt}
      aria-label={props.label}
      onChange={(ev) => {
        const t = decimal ? ev.target.value.replace(/[^\d.,]/g, '') : ev.target.value.replace(/\D/g, '')
        setTxt(t)
        props.onCambio(leerNum(t))
      }}
    />
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
      <p className="terminar__hint">5 = tranqui · 10 = no daba más</p>
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
