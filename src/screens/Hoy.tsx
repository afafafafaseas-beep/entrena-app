import { Icon } from '../components/Icon'
import { Head } from '../components/ui'
import { useRutina } from '../hooks'
import { navegar, rutaA } from '../tabs'

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
  const activa = useRutina()
  const fecha = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  // Etapa 3: el próximo día sale de la última sesión. Por ahora no hay sesiones, así que es el primero.
  const proximo = activa?.rutina.dias[0]

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

      <section className="hero">
        <p className="hero__label">Te toca</p>
        <p className="hero__title">{proximo ? proximo.nombre : 'Tu rutina'}</p>
        <p className="hero__text">{proximo?.foco ?? 'Cargando…'}</p>
        <button type="button" className="btn btn--primary" disabled>
          <Icon name="play" size={20} filled />
          Empezar · llega en la etapa 3
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
