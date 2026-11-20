import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Descanso, pedirDescanso } from '../components/Descanso'
import { FotoEjercicio } from '../components/Foto'
import { Icon } from '../components/Icon'
import { Empty, Head } from '../components/ui'
import { descartarEnCurso, guardarEnCurso, guardarSesion, type Sesion } from '../db'
import { useEnCurso, useFichas, useRutina, useSesiones } from '../hooks'
import { discosPorLado, entradaEnCalor } from '../lib/discos'
import { buscarFicha, type Ficha } from '../lib/ejercicios'
import { mejorMarca } from '../lib/progreso'
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

const n1 = (n: number) => String(n).replace('.', ',')

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

/** Orden real de un circuito: A1, B1, C1, A2, B2, C2… (índice de ejercicio, índice de serie). */
function ordenCircuito(c: EnCurso): [number, number][] {
  const orden: [number, number][] = []
  let idx = 0
  for (const b of c.dia.bloques) {
    const ids = b.ejercicios.map(() => idx++)
    if (b.tipo !== 'fuerza') continue
    const max = Math.max(0, ...ids.map((i) => c.sesion.ejercicios[i]?.series.length ?? 0))
    for (let r = 0; r < max; r++) for (const i of ids) if ((c.sesion.ejercicios[i]?.series.length ?? 0) > r) orden.push([i, r])
  }
  return orden
}

function SesionEnCurso({ inicial, sesiones }: { inicial: EnCurso; sesiones: Sesion[] }) {
  const [c, setC] = useState(inicial)
  const ref = useRef(inicial)
  const [ahora, setAhora] = useState(Date.now())
  const [aviso, setAviso] = useState<string | null>(null)
  const [discos, setDiscos] = useState<number | null>(null)
  const { fichas } = useFichas()

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 3500)
    return () => clearTimeout(t)
  }, [aviso])

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

  /** Después de tildar una serie: descanso del PF, récord y llevarlo a la próxima serie del circuito. */
  const despuesDeTildar = (i: number, serie: number, p: Prescripto) => {
    const actual = ref.current
    const e = actual.sesion.ejercicios[i]
    const x = e.series[serie]

    const seg = segundosDescanso(p.descanso)
    if (seg) pedirDescanso(seg)

    for (const campo of ['kg', 'cm'] as const) {
      const v = x[campo]
      if (v === undefined) continue
      const antes = mejorMarca(sesiones, e.nombre, campo, actual.sesion.inicio)
      const hoy = Math.max(-Infinity, ...e.series.filter((o, j) => j !== serie && o.ok && o[campo] !== undefined).map((o) => o[campo]!))
      if (antes !== undefined && v > antes && v > hoy) {
        setAviso(`¡Récord! ${e.nombre}: ${n1(v)} ${campo} (antes ${n1(antes)})`)
      }
      break
    }

    const orden = ordenCircuito(actual)
    const pos = orden.findIndex(([a, b]) => a === i && b === serie)
    const siguiente = [...orden.slice(pos + 1), ...orden.slice(0, pos)].find(([a, b]) => !actual.sesion.ejercicios[a].series[b].ok)
    if (siguiente) {
      setTimeout(() => {
        const el = document.getElementById(`serie-${siguiente[0]}-${siguiente[1]}`)
        if (!el) return
        el.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
        el.classList.remove('serie--sigue')
        void el.offsetWidth
        el.classList.add('serie--sigue')
      }, 350)
    }
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
            const ficha = buscarFicha(fichas, p.nombre)
            return b.tipo === 'movilidad' ? (
              <EjMovilidad
                key={i}
                p={p}
                e={e}
                ficha={ficha}
                onFicha={() => abrirFicha(p.nombre)}
                onToggle={() => actualizar((n) => void (n.sesion.ejercicios[i].hecho = !n.sesion.ejercicios[i].hecho))}
              />
            ) : (
              <EjFuerza
                key={i}
                i={i}
                p={p}
                b={b}
                e={e}
                ficha={ficha}
                ultima={ultimas.get(e.nombre)}
                onFicha={() => abrirFicha(p.nombre)}
                onCambio={(fn) => actualizar((n) => fn(n.sesion.ejercicios[i]))}
                onTildada={(serie) => despuesDeTildar(i, serie, p)}
                onDiscos={(kg) => setDiscos(kg)}
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

      {aviso && (
        <div className="toast" role="status" onClick={() => setAviso(null)}>
          <Icon name="trofeo" size={22} />
          {aviso}
        </div>
      )}

      {discos !== null && <Discos inicial={discos} onCerrar={() => setDiscos(null)} />}
    </>
  )
}

function EjMovilidad({
  p,
  e,
  ficha,
  onFicha,
  onToggle,
}: {
  p: Prescripto
  e: EjSesion
  ficha?: Ficha
  onFicha: () => void
  onToggle: () => void
}) {
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
      <FotoEjercicio ficha={ficha?.nombre} video={ficha?.video ?? p.nombre} tam="mini" onClick={onFicha} />
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
  i,
  p,
  b,
  e,
  ficha,
  ultima,
  onFicha,
  onCambio,
  onTildada,
  onDiscos,
}: {
  i: number
  p: Prescripto
  b: Bloque
  e: EjSesion
  ficha?: Ficha
  ultima?: UltimaVez
  onFicha: () => void
  onCambio: (fn: (e: EjSesion) => void) => void
  onTildada: (serie: number) => void
  onDiscos: (kg: number) => void
}) {
  const medida = medidaDe(p, ultima)
  const campos = camposDe(medida)
  const etiqueta = (c: Campo) => (c === 'reps' && medida.segunda === 'seg' ? 'Seg' : ETIQUETA[c])
  const descanso = segundosDescanso(p.descanso)
  const detalles = [p.carga, p.rpe && `RPE ${p.rpe}`].filter(Boolean)
  const completo = e.series.length > 0 && e.series.every((x) => x.ok)
  const columnas = `34px ${campos.map(() => '1fr').join(' ') || '1fr'} 52px`
  const sug0 = sugerencia(0, ultima, p)
  const calor = medida.kg ? entradaEnCalor(sug0.kg) : undefined
  const kgParaDiscos = e.series.find((x) => !x.ok)?.kg ?? sug0.kg

  return (
    <div className="ejf">
      <div className="ejf__head">
        <FotoEjercicio ficha={ficha?.nombre} video={ficha?.video ?? p.nombre} tam="chica" onClick={onFicha} />
        <div className="ejf__titulo">
          <button type="button" className="ejf__name" onClick={onFicha}>
            {p.nombre}
          </button>
          <p className="ejf__pres">
            <span className="ejf__dosis">{textoDosis(seriesDe(p, b), p.reps)}</span>
            {detalles.map((d, k) => (
              <span key={k}> · {d}</span>
            ))}
          </p>
        </div>
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
      {p.nota && <p className="ejf__nota">{p.nota}</p>}
      {calor && !e.series.some((x) => x.ok) && (
        <p className="ejf__calor">
          <strong>Entrada en calor:</strong> {calor}
        </p>
      )}

      <div className="series">
        <div className="serie serie--head" style={{ gridTemplateColumns: columnas }} aria-hidden="true">
          <span>Serie</span>
          {campos.length ? campos.map((c) => <span key={c}>{etiqueta(c)}</span>) : <span />}
          <span />
        </div>
        {e.series.map((x, s) => {
          const sug = sugerencia(s, ultima, p)
          return (
            <div
              key={s}
              id={`serie-${i}-${s}`}
              className={x.ok ? 'serie serie--ok' : 'serie'}
              style={{ gridTemplateColumns: columnas }}
            >
              <span className="serie__n">{s + 1}</span>
              {campos.length ? (
                campos.map((c) => (
                  <NumInput
                    key={c}
                    valor={x[c]}
                    sugerido={sug[c]}
                    decimal={c !== 'reps'}
                    placeholder={etiqueta(c).toLowerCase()}
                    label={`${etiqueta(c)} serie ${s + 1} de ${p.nombre}`}
                    onCambio={(v) => onCambio((ej) => void (ej.series[s][c] = v))}
                  />
                ))
              ) : (
                <span className="serie__txt">{p.reps}</span>
              )}
              <button
                type="button"
                className="tick"
                aria-pressed={x.ok}
                aria-label={`${x.ok ? 'Destildar' : 'Tildar'} serie ${s + 1} de ${p.nombre}`}
                onClick={() => {
                  const tildando = !x.ok
                  onCambio((ej) => {
                    const se = ej.series[s]
                    if (!se.ok) {
                      // Si toca ✓ con los campos vacíos, se copian los valores de fondo.
                      for (const c of campos) se[c] ??= sug[c]
                    }
                    se.ok = !se.ok
                  })
                  if (tildando) onTildada(s)
                }}
              >
                <Icon name="check" size={22} />
              </button>
            </div>
          )
        })}
      </div>

      <div className="ejf__pie">
        <p className="ultima">{ultima ? textoUltimaVez(ultima, medida) : 'Primera vez que lo anotás'}</p>
        {medida.kg && kgParaDiscos !== undefined && kgParaDiscos > 20 && (
          <button type="button" className="link-chico" onClick={() => onDiscos(kgParaDiscos)}>
            Discos
          </button>
        )}
      </div>

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

const COLOR_DISCO: Record<string, string> = {
  '25': '#e5484d',
  '20': '#3e8bff',
  '15': '#f5c518',
  '10': '#30c46b',
  '5': '#f6f6f3',
  '2.5': '#9a9aa0',
  '1.25': '#6c6c71',
}

/** Calculadora de discos: qué poner de cada lado de la barra. */
function Discos({ inicial, onCerrar }: { inicial: number; onCerrar: () => void }) {
  const [kg, setKg] = useState(fmt(inicial))
  const [barra, setBarra] = useState(20)
  const total = leerNum(kg)
  const r = total !== undefined ? discosPorLado(total, barra) : undefined

  return (
    <div className="sheet-fondo" onClick={onCerrar}>
      <div className="sheet" role="dialog" aria-label="Calculadora de discos" onClick={(ev) => ev.stopPropagation()}>
        <div className="sheet__head">
          <p className="sheet__title">Discos de cada lado</p>
          <button type="button" className="timer__cerrar" onClick={onCerrar} aria-label="Cerrar">
            <Icon name="cerrar" size={20} />
          </button>
        </div>
        <label className="field">
          <span className="field__label">Peso total (kg)</span>
          <input
            className="serie__in serie__in--grande"
            inputMode="decimal"
            value={kg}
            onChange={(ev) => setKg(ev.target.value.replace(/[^\d.,]/g, ''))}
          />
        </label>
        <div className="chips chips--fijos" role="group" aria-label="Barra">
          {[20, 15, 10].map((n) => (
            <button
              key={n}
              type="button"
              className={barra === n ? 'chip chip--on' : 'chip'}
              aria-pressed={barra === n}
              onClick={() => setBarra(n)}
            >
              Barra {n} kg
            </button>
          ))}
        </div>
        <div className="discos">
          {!r ? (
            <p className="row__sub">Poné un peso mayor que la barra.</p>
          ) : r.porLado.length === 0 ? (
            <p className="row__sub">Solo la barra.</p>
          ) : (
            <>
              <div className="discos__barra">
                {r.porLado.map((d, k) => (
                  <span
                    key={k}
                    className="disco"
                    style={{ background: COLOR_DISCO[String(d)], height: `${36 + d * 2.4}px` }}
                  >
                    {n1(d)}
                  </span>
                ))}
              </div>
              <p className="discos__txt">{r.porLado.map(n1).join(' + ')} kg de cada lado</p>
              {r.sobra > 0 && <p className="row__sub">No sale exacto: te faltan {n1(r.sobra)} kg en total.</p>}
            </>
          )}
        </div>
      </div>
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
      <EscalaRodilla valor={s.rodilla} onElegir={(n) => actualizar((x) => void (x.sesion.rodilla = n))} />

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

/** Botones del 0 al 10 con los colores de la rodilla. Tocar el mismo número lo saca. */
export function EscalaRodilla({
  valor,
  onElegir,
  label = 'Rodilla al terminar',
}: {
  valor?: number
  onElegir: (n?: number) => void
  label?: string
}) {
  return (
    <div className="rodilla" role="group" aria-label={label}>
      {Array.from({ length: 11 }, (_, n) => (
        <button
          key={n}
          type="button"
          className={`rod rod--${colorRodilla(n)}${valor === n ? ' rod--on' : ''}`}
          aria-pressed={valor === n}
          onClick={() => onElegir(valor === n ? undefined : n)}
        >
          {n}
        </button>
      ))}
    </div>
  )
}
