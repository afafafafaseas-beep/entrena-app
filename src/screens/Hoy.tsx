import { Icon } from '../components/Icon'
import { Head } from '../components/ui'
import { useEnCurso, useRutina, useSesiones } from '../hooks'
import { colorRodilla, fechaISO, proximoDia, sesionesDeLaSemana } from '../lib/sesion'
import { navegar, rutaA } from '../tabs'
import { empezarSesion } from './acciones'

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

export function Hoy() {
  const activa = useRutina()
  const sesiones = useSesiones()
  const enCurso = useEnCurso()
  const fecha = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  const lista = sesiones ?? []
  const proximo = activa ? proximoDia(activa.rutina, lista) : undefined
  const semana = sesionesDeLaSemana(lista)
  const diasConGym = new Set(lista.map((s) => s.fecha))
  const ultimaRodilla = [...lista].reverse().find((s) => s.rodilla !== undefined)?.rodilla

  return (
    <>
      <Head eyebrow={fecha} title="Hoy" />

      <div className="week" aria-label="Esta semana">
        {semanaActual().map((d, i) => (
          <div
            key={i}
            className={`week__day${d.esHoy ? ' week__day--hoy' : ''}${diasConGym.has(d.iso) ? ' week__day--gym' : ''}`}
          >
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
          <p className="hero__label">Te toca</p>
          <p className="hero__title">{proximo ? proximo.nombre : 'Tu rutina'}</p>
          <p className="hero__text">{proximo?.foco ?? 'Cargando…'}</p>
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
            Empezar
          </button>
        </section>
      )}

      <div className="stats">
        <div className="stat">
          <p className="stat__label">Esta semana</p>
          <p className="stat__value">
            {semana.length}
            <small>de 3</small>
          </p>
        </div>
        <div className="stat">
          <p className="stat__label">Rodilla la última vez</p>
          {ultimaRodilla === undefined ? (
            <p className="stat__value">
              –<small>/ 10</small>
            </p>
          ) : (
            <p className={`stat__value rod-txt--${colorRodilla(ultimaRodilla)}`}>
              {ultimaRodilla}
              <small>{NOMBRE_COLOR[colorRodilla(ultimaRodilla)]}</small>
            </p>
          )}
        </div>
      </div>
    </>
  )
}
