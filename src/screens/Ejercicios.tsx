import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { Back, Head } from '../components/ui'
import { guardarExtra } from '../db'
import { useFichas } from '../hooks'
import { buscarFicha, diasPorEjercicio, filtrar, nombreZona, ZONAS, type Ficha } from '../lib/ejercicios'
import { normalizar, urlVideo } from '../lib/texto'
import { navegar, rutaA } from '../tabs'

// Se acuerda de la búsqueda y de dónde estaba al volver de una ficha.
const memoria = { texto: '', filtro: null as string | null, scroll: 0 }

export function Ejercicios({ sub }: { sub: string[] }) {
  return sub[0] ? <FichaEjercicio nombre={sub[0]} /> : <ListaEjercicios />
}

function ListaEjercicios() {
  const { fichas, rutina } = useFichas()
  const [texto, setTexto] = useState(memoria.texto)
  const [filtro, setFiltro] = useState<string | null>(memoria.filtro)
  const dias = useMemo(() => diasPorEjercicio(rutina?.rutina), [rutina])

  useEffect(() => {
    memoria.texto = texto
    memoria.filtro = filtro
  }, [texto, filtro])

  useLayoutEffect(() => {
    if (fichas.length) window.scrollTo(0, memoria.scroll)
  }, [fichas.length > 0])

  const lista = useMemo(() => {
    if (filtro === 'rutina') return filtrar(fichas, texto, null).filter((f) => dias.has(normalizar(f.nombre)))
    return filtrar(fichas, texto, filtro)
  }, [fichas, texto, filtro, dias])

  const abrir = (f: Ficha) => {
    memoria.scroll = window.scrollY
    navegar(rutaA('ejercicios', f.nombre))
  }

  const chips = [{ id: null, label: 'Todos' }, { id: 'rutina', label: 'En mi rutina' }, ...ZONAS]

  return (
    <>
      <Head title="Ejercicios" />

      <label className="search">
        <Icon name="buscar" size={20} />
        <input
          type="search"
          placeholder="Buscar ejercicio"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-label="Buscar ejercicio"
        />
        {texto && (
          <button type="button" className="search__clear" onClick={() => setTexto('')} aria-label="Borrar búsqueda">
            <Icon name="cerrar" size={18} />
          </button>
        )}
      </label>

      <div className="chips" role="group" aria-label="Filtrar por zona">
        {chips.map((c) => (
          <button
            key={c.id ?? 'todos'}
            type="button"
            className={filtro === c.id ? 'chip chip--on' : 'chip'}
            aria-pressed={filtro === c.id}
            onClick={() => setFiltro(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <p className="count">{lista.length === 1 ? '1 ejercicio' : `${lista.length} ejercicios`}</p>

      {lista.length === 0 ? (
        <p className="nada">No encontré ningún ejercicio con eso.</p>
      ) : (
        <div className="list">
          {lista.map((f) => {
            const enDias = dias.get(normalizar(f.nombre))
            return (
              <button key={f.nombre} type="button" className="row" onClick={() => abrir(f)}>
                <span className="row__text">
                  <span className="row__title">{f.nombre}</span>
                  <br />
                  <span className="row__sub">
                    {enDias ? (
                      <span className="tag-rutina">{enDias.join(' · ')}</span>
                    ) : f.zonas.length ? (
                      f.zonas.map(nombreZona).join(' · ')
                    ) : (
                      'Sin explicación todavía'
                    )}
                  </span>
                </span>
                <span className="row__end">
                  <Icon name="chevron" size={18} />
                </span>
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

function FichaEjercicio({ nombre }: { nombre: string }) {
  const { fichas, rutina, cargando } = useFichas()
  const ficha = buscarFicha(fichas, nombre)
  const dias = diasPorEjercicio(rutina?.rutina).get(normalizar(nombre))
  const [editando, setEditando] = useState(false)

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [nombre])

  if (cargando) return <Back label="Ejercicios" siNo={rutaA('ejercicios')} />

  if (!ficha) {
    return (
      <>
        <Back label="Ejercicios" siNo={rutaA('ejercicios')} />
        <p className="nada">No encontré ese ejercicio.</p>
      </>
    )
  }

  const sinTexto = !ficha.como
  return (
    <>
      <Back label="Ejercicios" siNo={rutaA('ejercicios')} />
      <header className="head">
        <h1 className="h1-ficha">{ficha.nombre}</h1>
        {ficha.zonas.length > 0 && (
          <div className="zonas">
            {ficha.zonas.map((z) => (
              <span key={z} className="pill pill--sm">
                {nombreZona(z)}
              </span>
            ))}
          </div>
        )}
      </header>

      <a className="btn btn--primary" href={urlVideo(ficha.video)} target="_blank" rel="noopener noreferrer">
        <Icon name="video" size={22} />
        Ver video
      </a>

      <div className="en-rutina">
        <Icon name="hoy" size={18} />
        {dias ? (
          <span>
            En tu rutina: <strong>{dias.join(' · ')}</strong>
          </span>
        ) : (
          <span>No está en tu rutina actual</span>
        )}
      </div>

      {sinTexto || editando ? (
        <FormExplicacion
          ficha={ficha}
          nuevo={sinTexto}
          onListo={() => setEditando(false)}
          onCancelar={editando ? () => setEditando(false) : undefined}
        />
      ) : (
        <>
          <section className="bloque-texto">
            <h2 className="bloque-texto__title">Cómo se hace</h2>
            <p>{ficha.como}</p>
          </section>
          {ficha.sirve && (
            <section className="bloque-texto">
              <h2 className="bloque-texto__title">Para qué te sirve</h2>
              <p>{ficha.sirve}</p>
            </section>
          )}
          {ficha.origen === 'agregado' && (
            <button type="button" className="link-btn" onClick={() => setEditando(true)}>
              <Icon name="editar" size={18} />
              Cambiar explicación
            </button>
          )}
        </>
      )}

      <div className="foto-pronto">
        <span className="row__icon">
          <Icon name="camara" size={20} />
        </span>
        <span>
          Tu foto del ejercicio
          <br />
          <span className="row__sub">Llega en la etapa 4</span>
        </span>
      </div>
    </>
  )
}

function FormExplicacion({
  ficha,
  nuevo,
  onListo,
  onCancelar,
}: {
  ficha: Ficha
  nuevo: boolean
  onListo: () => void
  onCancelar?: () => void
}) {
  const [como, setComo] = useState(ficha.como ?? '')
  const [sirve, setSirve] = useState(ficha.sirve ?? '')
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    setGuardando(true)
    await guardarExtra(ficha.nombre, como, sirve)
    setGuardando(false)
    onListo()
  }

  return (
    <section className="form">
      {nuevo && (
        <p className="form__intro">
          Este ejercicio vino en la rutina del PF pero no está en la lista. Si querés, escribí cómo se hace y queda
          guardado acá.
        </p>
      )}
      <label className="field">
        <span className="field__label">Cómo se hace</span>
        <textarea rows={4} value={como} onChange={(e) => setComo(e.target.value)} />
      </label>
      <label className="field">
        <span className="field__label">Para qué te sirve (opcional)</span>
        <textarea rows={3} value={sirve} onChange={(e) => setSirve(e.target.value)} />
      </label>
      <button type="button" className="btn btn--primary" disabled={!como.trim() || guardando} onClick={guardar}>
        <Icon name="check" size={20} />
        Guardar
      </button>
      {onCancelar && (
        <button type="button" className="btn btn--ghost" onClick={onCancelar}>
          Cancelar
        </button>
      )}
    </section>
  )
}
