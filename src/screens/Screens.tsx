import { useState } from 'react'
import { Icon, type IconName } from '../components/Icon'

// Pantallas de la Etapa 1: la estructura y el diseño ya están; el contenido llega en cada etapa.

function Head({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <header className="head">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
    </header>
  )
}

function Empty({ icon, title, text, etapa }: { icon: IconName; title: string; text: string; etapa: number }) {
  return (
    <div className="empty">
      <div className="empty__icon">
        <Icon name={icon} size={28} />
      </div>
      <p className="empty__title">{title}</p>
      <p className="empty__text">{text}</p>
      <span className="pill">Llega en la etapa {etapa}</span>
    </div>
  )
}

const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Lunes a domingo de la semana actual. */
export function semanaActual(hoy = new Date()) {
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))
  return DIAS.map((letra, i) => {
    const d = new Date(lunes)
    d.setDate(lunes.getDate() + i)
    return { letra, num: d.getDate(), esHoy: d.toDateString() === hoy.toDateString() }
  })
}

export function Hoy() {
  const fecha = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <>
      <Head eyebrow={fecha} title="Hoy" />

      <div className="week" aria-label="Esta semana">
        {semanaActual().map((d, i) => (
          <div key={i} className={d.esHoy ? 'week__day week__day--hoy' : 'week__day'}>
            <span>{d.letra}</span>
            <span className="week__num">{d.num}</span>
          </div>
        ))}
      </div>

      <section className="hero">
        <p className="hero__label">Próximo entreno</p>
        <p className="hero__title">Tu rutina llega pronto</p>
        <p className="hero__text">Cuando cargues la rutina del PF, acá vas a ver qué día te toca.</p>
        <button type="button" className="btn btn--primary" disabled>
          <Icon name="play" size={20} filled />
          Empezar
        </button>
      </section>

      <div className="stats">
        <div className="stat">
          <p className="stat__label">Esta semana</p>
          <p className="stat__value">
            0<small>de 3</small>
          </p>
        </div>
        <div className="stat">
          <p className="stat__label">Rodilla</p>
          <p className="stat__value">
            –<small>/ 10</small>
          </p>
        </div>
      </div>
    </>
  )
}

export function Entrenar() {
  return (
    <>
      <Head title="Entrenar" />
      <Empty
        icon="entrenar"
        title="Nada en curso"
        text="Cuando empieces un entreno desde Hoy, lo seguís acá serie por serie."
        etapa={3}
      />
    </>
  )
}

export function Ejercicios() {
  return (
    <>
      <Head title="Ejercicios" />
      <Empty
        icon="ejercicios"
        title="Tus fichas"
        text="Cómo se hace cada ejercicio, para qué te sirve, su video y tu foto."
        etapa={2}
      />
    </>
  )
}

export function Progreso() {
  return (
    <>
      <Head title="Progreso" />
      <Empty
        icon="progreso"
        title="Todavía sin datos"
        text="Acá vas a ver cómo suben tus kilos, cómo va la rodilla y todas tus sesiones."
        etapa={4}
      />
    </>
  )
}

function Row({
  icon,
  title,
  sub,
  accent,
  open,
  onClick,
}: {
  icon: IconName
  title: string
  sub: string
  accent?: boolean
  open?: boolean
  onClick?: () => void
}) {
  const contenido = (
    <>
      <span className={accent ? 'row__icon row__icon--accent' : 'row__icon'}>
        <Icon name={icon} size={20} />
      </span>
      <span className="row__text">
        <span className="row__title">{title}</span>
        <br />
        <span className="row__sub">{sub}</span>
      </span>
    </>
  )
  if (!onClick) {
    return (
      <div className="row row--off">
        {contenido}
        <span className="row__soon">Pronto</span>
      </div>
    )
  }
  return (
    <button type="button" className="row" onClick={onClick} aria-expanded={!!open}>
      {contenido}
      <span className={open ? 'row__end row__end--open' : 'row__end'}>
        <Icon name="chevron" size={18} />
      </span>
    </button>
  )
}

export function Mas() {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <Head title="Más" />

      <p className="section-title">Tu app</p>
      <div className="list">
        <Row
          icon="inicio"
          accent
          title="Agregala a la pantalla de inicio"
          sub="Así no se borran tus datos"
          open={abierto}
          onClick={() => setAbierto(!abierto)}
        />
        {abierto && (
          <div className="row-body">
            <ol className="steps">
              <li>
                Abrí este link en <strong>Safari</strong>.
              </li>
              <li>
                Tocá <strong>Compartir</strong> (el cuadrado con la flecha para arriba).
              </li>
              <li>
                Bajá y tocá <strong>Agregar a inicio</strong>.
              </li>
              <li>
                Tocá <strong>Agregar</strong> y abrila siempre desde ese ícono.
              </li>
            </ol>
            <p className="note">
              Si la usás solo desde Safari y pasás 7 días sin abrirla, el iPhone puede borrar tus datos. Desde el ícono
              de inicio eso no pasa.
            </p>
          </div>
        )}
      </div>

      <p className="section-title">Con tu PF · llega en las etapas 2 y 4</p>
      <div className="list">
        <Row icon="importar" title="Cargar rutina del PF" sub="Pegá el bloque que te pasa" />
        <Row icon="rutina" title="Rutina actual" sub="Ver y ajustar series y pesos" />
        <Row icon="resumen" title="Resumen para el PF" sub="Tu semana lista para copiar" />
        <Row icon="backup" title="Backup" sub="Copiar o restaurar tus datos" />
      </div>
    </>
  )
}
