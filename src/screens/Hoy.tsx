import { useMemo, useState } from 'react'
import { FotoEjercicio } from '../components/Foto'
import { Icon } from '../components/Icon'
import { Back, Head } from '../components/ui'
import { db, type Diario, type Voley } from '../db'
import { useDiario, useDiasGym, useEnCurso, useFichas, useSesiones, useVoley } from '../hooks'
import { buscarFicha } from '../lib/ejercicios'
import { fotosDe } from '../lib/fotos'
import {
  colorRodilla,
  diasQueFaltaste,
  fechaCorta,
  fechaISO,
  inicioSemana,
  NOMBRES_DIA,
  proximaFechaGym,
  proximoDia,
  sesionesDeLaSemana,
} from '../lib/sesion'
import { entrar, useNube } from '../components/Nube'
import { nubeActiva } from '../db'
import { navegar, rutaA, volver } from '../tabs'
import { empezarSesion } from './acciones'
import { EscalaRodilla } from './Entrenar'

const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Lunes a domingo de la semana actual. */
export function semanaActual(hoy = new Date()) {
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))
  return DIAS.map((letra, i) => {
    const d = new Date(lunes)
    d.setDate(lunes.getDate() + i)
    return { letra, num: d.getDate(), esHoy: d.toDateString() === hoy.toDateString(), iso: fechaISO(d.getTime()) }
  })
}

const NOMBRE_COLOR = { verde: 'Bien', amarillo: 'Atento', rojo: 'Molesta' }

export function Hoy({ sub = [] }: { sub?: string[] }) {
  if (sub[0] === 'voley') return <AnotarVoley />
  return <Inicio />
}

function Inicio() {
  const { fichas, rutina: activa } = useFichas()
  const sesiones = useSesiones()
  const enCurso = useEnCurso()
  const voley = useVoley()
  const diario = useDiario()
  const fecha = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  const lista = sesiones ?? []
  const proximo = activa ? proximoDia(activa.rutina, lista) : undefined
  const semana = sesionesDeLaSemana(lista)
  const voleySemana = (voley ?? []).filter((v) => v.inicio >= inicioSemana())
  const diasConGym = new Set(lista.map((s) => s.fecha))
  const diasConVoley = new Set((voley ?? []).map((v) => v.fecha))
  const ultimaRodilla = [...lista].reverse().find((s) => s.rodilla !== undefined)?.rodilla
  const diasGym = useDiasGym()
  const { usuario } = useNube()
  const hoyISO = fechaISO(Date.now())
  const entrenoHoy = diasConGym.has(hoyISO)
  const tocaHoy = diasGym.includes(new Date().getDay())
  const faltas = new Set(diasQueFaltaste(lista, diasGym))
  const proxFecha = proximaFechaGym(diasGym, entrenoHoy)
  const cuando = proxFecha
    ? proxFecha.toDateString() === new Date().toDateString()
      ? 'hoy'
      : `el ${NOMBRES_DIA[proxFecha.getDay()]}`
    : ''

  /** Tocar un día que ya pasó y no tiene entreno: cargarlo. */
  const cargarDia = (iso: string, nombre: string) => {
    if (!activa || !proximo || enCurso) return
    if (!window.confirm(`¿Entrenaste el ${nombre} y no lo anotaste? Cargá ahora lo que hiciste (${proximo.nombre}).`)) return
    void empezarSesion(activa.rutina, proximo, iso)
  }

  // Fotos de los ejercicios principales del día (los que tienen foto)
  const fotosDia = useMemo(() => {
    if (!proximo) return []
    const out: { nombre: string; video: string }[] = []
    for (const b of proximo.bloques)
      for (const e of b.ejercicios) {
        const f = buscarFicha(fichas, e.nombre)
        if (f && fotosDe(f.nombre) && !out.some((o) => o.nombre === f.nombre)) out.push({ nombre: f.nombre, video: f.video })
      }
    return out.slice(-4)
  }, [proximo, fichas])

  return (
    <>
      <Head eyebrow={fecha} title="Hoy" />

      {nubeActiva && usuario && !usuario.isLoggedIn && (
        <button type="button" className="aviso aviso--nube" onClick={entrar}>
          <span className="aviso__icon">
            <Icon name="backup" size={20} />
          </span>
          <span className="aviso__text">
            <strong>Guardá todo online</strong>
            <br />
            Entrá con tu mail una sola vez y no perdés nada nunca más.
          </span>
          <Icon name="chevron" size={18} />
        </button>
      )}

      <div className="week" aria-label="Esta semana">
        {semanaActual().map((d, i) => {
          const gym = diasConGym.has(d.iso)
          const falta = faltas.has(d.iso)
          const pasado = d.iso < hoyISO
          const plan = diasGym.includes((i + 1) % 7)
          const clase = `week__day${d.esHoy ? ' week__day--hoy' : ''}${gym ? ' week__day--gym' : ''}${falta ? ' week__day--falta' : ''}${plan && !gym && !pasado ? ' week__day--plan' : ''}`
          const nombre = `${NOMBRES_DIA[(i + 1) % 7]} ${d.num}`
          const contenido = (
            <>
              <span>{d.letra}</span>
              <span className="week__num">{d.num}</span>
              <span className="week__dot" aria-hidden="true">
                {falta ? '✕' : diasConVoley.has(d.iso) ? '•' : ''}
              </span>
            </>
          )
          return pasado && !gym ? (
            <button
              key={i}
              type="button"
              className={clase}
              onClick={() => cargarDia(d.iso, nombre)}
              aria-label={`${nombre}: ${falta ? 'no fuiste' : 'sin entreno'}. Tocá para cargarlo`}
            >
              {contenido}
            </button>
          ) : (
            <div key={i} className={clase} aria-label={`${nombre}${gym ? ': entrenaste' : plan ? ': día de gym' : ''}`}>
              {contenido}
            </div>
          )
        })}
      </div>
      {faltas.size > 0 && [...faltas].some((f) => f >= fechaISO(inicioSemana())) && (
        <p className="week__nota">✕ = día de gym que no fuiste. ¿Fuiste y no lo anotaste? Tocá ese día.</p>
      )}

      {activa?.base && (
        <button type="button" className="aviso" onClick={() => navegar(rutaA('mas', 'cargar'))}>
          <span className="aviso__icon">
            <Icon name="alerta" size={20} />
          </span>
          <span className="aviso__text">
            <strong>Cargá la rutina nueva del PF en Más</strong>
            <br />
            La que tenés es la de antes de parar, con cargas viejas.
          </span>
          <Icon name="chevron" size={18} />
        </button>
      )}

      {diario && <Chequeo diario={diario} />}

      {enCurso ? (
        <section className="hero">
          <p className="hero__label">Sesión sin terminar</p>
          <p className="hero__title">{enCurso.sesion.diaNombre}</p>
          <p className="hero__text">
            La empezaste a las{' '}
            {new Date(enCurso.sesion.inicio).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}.
          </p>
          <button type="button" className="btn btn--primary" onClick={() => navegar(rutaA('entrenar'))}>
            <Icon name="play" size={20} filled />
            Seguir sesión
          </button>
        </section>
      ) : (
        <section className="hero">
          <p className="hero__label">
            {entrenoHoy ? 'Hoy ya entrenaste ✓ · Lo próximo' : tocaHoy ? 'Hoy te toca' : `Hoy descansás · Te toca ${cuando}`}
          </p>
          <p className="hero__title">{proximo ? proximo.nombre : 'Tu rutina'}</p>
          <p className="hero__text">
            {proximo?.foco ?? 'Cargando…'}
            {entrenoHoy && cuando ? ` · ${cuando[0].toUpperCase()}${cuando.slice(1)}` : ''}
          </p>
          {fotosDia.length > 0 && (
            <div className="hero__fotos" aria-hidden="true">
              {fotosDia.map((f) => (
                <FotoEjercicio key={f.nombre} ficha={f.nombre} video={f.video} tam="chica" />
              ))}
            </div>
          )}
          {proximo && (
            <div className="hero__bloques" aria-label="Bloques del día">
              {proximo.bloques.map((b, i) => (
                <span key={i}>{b.nombre}</span>
              ))}
            </div>
          )}
          <button
            type="button"
            className="btn btn--primary"
            disabled={!activa || !proximo || enCurso === undefined}
            onClick={() => activa && proximo && empezarSesion(activa.rutina, proximo)}
          >
            <Icon name="play" size={20} filled />
            {tocaHoy && !entrenoHoy ? 'Empezar' : 'Entrenar igual hoy'}
          </button>
        </section>
      )}

      <div className="stats stats--3">
        <div className="stat">
          <p className="stat__label">Gym</p>
          <p className="stat__value">
            {semana.length}
            <small>de {diasGym.length}</small>
          </p>
        </div>
        <div className="stat">
          <p className="stat__label">Vóley</p>
          <p className="stat__value">
            {voleySemana.length}
            <small>sem.</small>
          </p>
        </div>
        <div className="stat">
          <p className="stat__label">Rodilla</p>
          {ultimaRodilla === undefined ? (
            <p className="stat__value">–</p>
          ) : (
            <p className={`stat__value rod-txt--${colorRodilla(ultimaRodilla)}`}>
              {ultimaRodilla}
              <small>{NOMBRE_COLOR[colorRodilla(ultimaRodilla)]}</small>
            </p>
          )}
        </div>
      </div>

      <button type="button" className="btn btn--soft mt" onClick={() => navegar(rutaA('hoy', 'voley'))}>
        <Icon name="voley" size={20} />
        Anotar vóley
      </button>
    </>
  )
}

const ESCALA_5: Record<'sueno' | 'energia' | 'dolorMuscular', { titulo: string; bajo: string; alto: string }> = {
  sueno: { titulo: '¿Cómo dormiste?', bajo: 'mal', alto: 'bárbaro' },
  energia: { titulo: '¿Cuánta energía tenés?', bajo: 'nada', alto: 'a full' },
  dolorMuscular: { titulo: '¿Cuán cargados están los músculos?', bajo: 'nada', alto: 'muy cargados' },
}

/** Chequeo de cada mañana: rodilla al levantarse, test del PF y cómo llega. Se guarda a cada toque. */
function Chequeo({ diario }: { diario: Diario[] }) {
  const fecha = fechaISO(Date.now())
  const hoy = diario.find((d) => d.fecha === fecha) ?? { fecha }
  const [abierto, setAbierto] = useState(false)
  const completo =
    hoy.rodilla !== undefined && hoy.test !== undefined && hoy.testDer !== undefined && hoy.sueno !== undefined && hoy.energia !== undefined && hoy.dolorMuscular !== undefined

  const poner = (k: keyof Omit<Diario, 'fecha'>, v?: number | boolean) => {
    void db.diario.put({ ...hoy, [k]: v })
  }

  // Regla de las 24 h: la rodilla a la mañana tiene que volver a como suele estar.
  const anteriores = diario.filter((d) => d.fecha < fecha && d.rodilla !== undefined).slice(-7)
  const base = anteriores.length >= 3 ? anteriores.reduce((a, d) => a + d.rodilla!, 0) / anteriores.length : undefined
  let alerta: string | undefined
  if (hoy.rodilla !== undefined && hoy.rodilla >= 6)
    alerta = 'La rodilla amaneció alta. Consultá con el PF antes de entrenar y no fuerces.'
  else if (hoy.rodilla !== undefined && base !== undefined && hoy.rodilla >= base + 2)
    alerta = `La rodilla amaneció peor que otros días (${hoy.rodilla} contra ${Math.round(base * 10) / 10} de promedio). Avisale al PF y bajá un poco hoy.`

  if (completo && !abierto) {
    return (
      <section className="chequeo chequeo--listo">
        <div className="chequeo__head">
          <span className="chequeo__icon">
            <Icon name="check" size={18} />
          </span>
          <p className="chequeo__title">Chequeo de hoy</p>
          <button type="button" className="link-chico" onClick={() => setAbierto(true)}>
            Cambiar
          </button>
        </div>
        <div className="chequeo__resumen">
          <span className={`rod-txt--${colorRodilla(hoy.rodilla!)}`}>Rodilla {hoy.rodilla}</span>
          <span className={`rod-txt--${colorRodilla(hoy.test!)}`}>Test izq {hoy.test}</span>
          <span className={`rod-txt--${colorRodilla(hoy.testDer!)}`}>Der {hoy.testDer}</span>
          <span>Sueño {hoy.sueno}/5</span>
          <span>Energía {hoy.energia}/5</span>
          <span>Músculos {hoy.dolorMuscular}/5</span>
        </div>
        {alerta && <p className="chequeo__alerta">{alerta}</p>}
      </section>
    )
  }

  return (
    <section className="chequeo">
      <div className="chequeo__head">
        <span className="chequeo__icon">
          <Icon name="sol" size={18} />
        </span>
        <div>
          <p className="chequeo__title">Chequeo de la mañana</p>
          <p className="row__sub">Medio minuto. Va al resumen del PF.</p>
        </div>
        {completo && (
          <button type="button" className="link-chico" onClick={() => setAbierto(false)}>
            Listo
          </button>
        )}
      </div>

      <p className="terminar__label">¿Cómo amaneció la rodilla?</p>
      <EscalaRodilla valor={hoy.rodilla} onElegir={(n) => poner('rodilla', n)} label="Rodilla al levantarte" />

      <p className="terminar__label">Test del PF: 5 sentadillas a 1 pierna</p>
      <p className="terminar__hint">Sin silla y sin agarrarte. Bajá solo hasta donde controles (un cuarto de sentadilla). ¿Cuánto dolió? 0 = nada · 10 = mucho</p>
      <p className="terminar__hint">Pierna izquierda</p>
      <EscalaRodilla valor={hoy.test} onElegir={(n) => poner('test', n)} label="Dolor en el test con la izquierda" />
      <p className="terminar__hint">Pierna derecha</p>
      <EscalaRodilla valor={hoy.testDer} onElegir={(n) => poner('testDer', n)} label="Dolor en el test con la derecha" />
      <p className="terminar__label">¿La izquierda bajó menos que la derecha?</p>
      <div className="escala5" role="group" aria-label="¿La izquierda bajó menos que la derecha?">
        {([true, false] as const).map((v) => (
          <button
            key={String(v)}
            type="button"
            className={hoy.izqMenos === v ? 'rpe__btn rpe__btn--on' : 'rpe__btn'}
            aria-pressed={hoy.izqMenos === v}
            onClick={() => poner('izqMenos', hoy.izqMenos === v ? undefined : v)}
          >
            {v ? 'Sí' : 'No'}
          </button>
        ))}
      </div>

      {(Object.keys(ESCALA_5) as (keyof typeof ESCALA_5)[]).map((k) => (
        <div key={k}>
          <p className="terminar__label">{ESCALA_5[k].titulo}</p>
          <div className="escala5" role="group" aria-label={ESCALA_5[k].titulo}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={hoy[k] === n ? 'rpe__btn rpe__btn--on' : 'rpe__btn'}
                aria-pressed={hoy[k] === n}
                onClick={() => poner(k, hoy[k] === n ? undefined : n)}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="escala5__pie">
            <span>1 = {ESCALA_5[k].bajo}</span>
            <span>5 = {ESCALA_5[k].alto}</span>
          </p>
        </div>
      ))}
      {alerta && <p className="chequeo__alerta">{alerta}</p>}
    </section>
  )
}

const TIPOS: { id: Voley['tipo']; label: string }[] = [
  { id: 'entrenamiento', label: 'Entrenamiento' },
  { id: 'partido', label: 'Partido' },
  { id: 'plaza', label: 'Vóley de plaza' },
]

function AnotarVoley() {
  const [tipo, setTipo] = useState<Voley['tipo']>('entrenamiento')
  const [cuando, setCuando] = useState<0 | 1>(0)
  const [minutos, setMinutos] = useState(90)
  const [otro, setOtro] = useState('')
  const [rpe, setRpe] = useState<number>()
  const [rodilla, setRodilla] = useState<number>()
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const recientes = useVoley()

  const mins = otro ? Number(otro) : minutos

  const guardar = async () => {
    if (rodilla === undefined && !window.confirm('No anotaste cómo terminó la rodilla. ¿Guardar igual?')) return
    setGuardando(true)
    const d = new Date()
    if (cuando === 1) d.setDate(d.getDate() - 1)
    const inicio = d.getTime()
    await db.voley.put({
      id: `voley-${inicio}-${Math.random().toString(36).slice(2, 7)}`,
      fecha: fechaISO(inicio),
      inicio,
      tipo,
      minutos: mins || 0,
      rpe,
      rodilla,
      notas: notas.trim() || undefined,
    })
    volver(rutaA('hoy'))
  }

  return (
    <>
      <Back label="Hoy" siNo={rutaA('hoy')} />
      <Head title="Anotar vóley" />
      <p className="lead">Lo que hacés en la cancha también carga la rodilla. Así el PF ve toda tu semana.</p>

      <p className="terminar__label">¿Qué fue?</p>
      <div className="chips chips--fijos" role="group" aria-label="Tipo">
        {TIPOS.map((t) => (
          <button key={t.id} type="button" className={tipo === t.id ? 'chip chip--on' : 'chip'} aria-pressed={tipo === t.id} onClick={() => setTipo(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tipo === 'plaza' && <p className="chequeo__alerta">Ojo: el PF dijo nada de vóley de plaza por ahora.</p>}

      <p className="terminar__label">¿Cuándo?</p>
      <div className="chips chips--fijos" role="group" aria-label="Cuándo">
        {(['Hoy', 'Ayer'] as const).map((t, i) => (
          <button key={t} type="button" className={cuando === i ? 'chip chip--on' : 'chip'} aria-pressed={cuando === i} onClick={() => setCuando(i as 0 | 1)}>
            {t}
          </button>
        ))}
      </div>

      <p className="terminar__label">¿Cuánto duró?</p>
      <div className="chips chips--fijos" role="group" aria-label="Minutos">
        {[60, 90, 120].map((m) => (
          <button
            key={m}
            type="button"
            className={!otro && minutos === m ? 'chip chip--on' : 'chip'}
            aria-pressed={!otro && minutos === m}
            onClick={() => {
              setMinutos(m)
              setOtro('')
            }}
          >
            {m} min
          </button>
        ))}
        <input
          className="chip chip--input"
          inputMode="numeric"
          placeholder="Otro"
          aria-label="Otros minutos"
          value={otro}
          onChange={(e) => setOtro(e.target.value.replace(/\D/g, ''))}
        />
      </div>

      <p className="terminar__label">¿Qué tan duro fue?</p>
      <p className="terminar__hint">5 = tranqui · 10 = no daba más</p>
      <div className="rpe rpe--sesion" role="group" aria-label="Qué tan duro fue">
        {[5, 6, 7, 8, 9, 10].map((n) => (
          <button key={n} type="button" className={rpe === n ? 'rpe__btn rpe__btn--on' : 'rpe__btn'} aria-pressed={rpe === n} onClick={() => setRpe(rpe === n ? undefined : n)}>
            {n}
          </button>
        ))}
      </div>

      <p className="terminar__label">¿Cómo terminó la rodilla?</p>
      <EscalaRodilla valor={rodilla} onElegir={setRodilla} />

      <label className="field mt">
        <span className="terminar__label">Notas</span>
        <textarea rows={2} value={notas} placeholder="Cuántos saltos, si jugaste todo el partido…" onChange={(e) => setNotas(e.target.value)} />
      </label>

      <button type="button" className="btn btn--primary" disabled={guardando || !mins} onClick={guardar}>
        <Icon name="check" size={20} />
        Guardar
      </button>

      {recientes && recientes.length > 0 && (
        <>
          <p className="section-title">Últimos</p>
          <div className="list">
            {[...recientes]
              .reverse()
              .slice(0, 5)
              .map((v) => (
                <div key={v.id} className="row row--off">
                  <span className="row__icon">
                    <Icon name="voley" size={20} />
                  </span>
                  <span className="row__text">
                    <span className="row__title">{TIPOS.find((t) => t.id === v.tipo)?.label}</span>
                    <br />
                    <span className="row__sub">
                      {fechaCorta(v.inicio)} · {v.minutos} min{v.rodilla !== undefined ? ` · rodilla ${v.rodilla}` : ''}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="search__clear"
                    aria-label="Borrar"
                    onClick={() => window.confirm('¿Borrar este registro de vóley?') && void db.voley.delete(v.id)}
                  >
                    <Icon name="basura" size={18} />
                  </button>
                </div>
              ))}
          </div>
        </>
      )}
    </>
  )
}
