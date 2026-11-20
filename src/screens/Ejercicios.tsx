import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { FotoEjercicio, useFotoPropia } from '../components/Foto'
import { Icon } from '../components/Icon'
import { Back, Head } from '../components/ui'
import { db, guardarExtra } from '../db'
import { useFichas } from '../hooks'
import { buscarFicha, diasPorEjercicio, filtrar, nombresEnRutina, nombreZona, ZONAS, type Ficha } from '../lib/ejercicios'
import { fotosDe } from '../lib/fotos'
import { seriesDe } from '../lib/rutina'
import { textoDosis } from '../lib/sesion'
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
  const dias = useMemo(() => diasPorEjercicio(rutina?.rutina, fichas), [rutina, fichas])
  const diasRutina = rutina?.rutina.dias ?? []

  useEffect(() => {
    memoria.texto = texto
    memoria.filtro = filtro
  }, [texto, filtro])

  useLayoutEffect(() => {
    if (fichas.length) window.scrollTo(0, memoria.scroll)
  }, [fichas.length > 0])

  const diaElegido = filtro?.startsWith('dia:') ? diasRutina.find((d) => `dia:${d.id}` === filtro) : undefined

  const lista = useMemo(() => {
    if (filtro === 'rutina') return filtrar(fichas, texto, null).filter((f) => dias.has(normalizar(f.nombre)))
    if (filtro?.startsWith('dia:')) return []
    return filtrar(fichas, texto, filtro)
  }, [fichas, texto, filtro, dias])

  const abrir = (nombre: string) => {
    memoria.scroll = window.scrollY
    navegar(rutaA('ejercicios', nombre))
  }

  const chips = [
    { id: null, label: 'Todos' },
    ...diasRutina.map((d) => ({ id: `dia:${d.id}`, label: d.nombre })),
    { id: 'rutina', label: 'En mi rutina' },
    ...ZONAS,
  ]

  const q = normalizar(texto)

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

      <div className="chips" role="group" aria-label="Filtrar">
        {chips.map((c) => (
          <button
            key={c.id ?? 'todos'}
            type="button"
            className={`chip${filtro === c.id ? ' chip--on' : ''}${c.id?.startsWith('dia:') ? ' chip--dia' : ''}`}
            aria-pressed={filtro === c.id}
            onClick={() => setFiltro(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {diaElegido ? (
        <>
          <p className="count">{diaElegido.foco ?? diaElegido.nombre}</p>
          {diaElegido.bloques.map((b, bi) => {
            const ejercicios = b.ejercicios.filter((e) => !q || normalizar(e.nombre).includes(q))
            if (!ejercicios.length) return null
            return (
              <section key={bi} className="bloque">
                <div className="bloque__head">
                  <span className="bloque__name">{b.nombre}</span>
                  <span className="bloque__meta">
                    {b.tipo === 'movilidad' ? 'Movilidad' : b.vueltas === 1 ? '1 vuelta' : `${b.vueltas} vueltas`}
                  </span>
                </div>
                {ejercicios.map((e, i) => {
                  const f = buscarFicha(fichas, e.nombre)
                  return (
                    <button key={i} type="button" className="row row--foto" onClick={() => abrir(e.nombre)}>
                      <FotoEjercicio ficha={f?.nombre} video={f?.video ?? e.nombre} tam="chica" estatico />
                      <span className="row__text">
                        <span className="row__title">{e.nombre}</span>
                        <br />
                        <span className="row__sub">
                          {b.tipo === 'fuerza' ? textoDosis(seriesDe(e, b), e.reps) : e.series ? textoDosis(e.series, e.reps) : e.reps}
                          {e.carga ? ` · ${e.carga}` : ''}
                        </span>
                      </span>
                      <span className="row__end">
                        <Icon name="chevron" size={18} />
                      </span>
                    </button>
                  )
                })}
              </section>
            )
          })}
        </>
      ) : (
        <>
          <p className="count">{lista.length === 1 ? '1 ejercicio' : `${lista.length} ejercicios`}</p>
          {lista.length === 0 ? (
            <p className="nada">No encontré ningún ejercicio con eso.</p>
          ) : (
            <div className="list">
              {lista.map((f) => {
                const enDias = dias.get(normalizar(f.nombre))
                return (
                  <button key={f.nombre} type="button" className="row row--foto" onClick={() => abrir(f.nombre)}>
                    <FotoEjercicio ficha={f.nombre} video={f.video} tam="chica" estatico />
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
      )}
    </>
  )
}

function FichaEjercicio({ nombre }: { nombre: string }) {
  const { fichas, rutina, cargando } = useFichas()
  const ficha = buscarFicha(fichas, nombre)
  const dias = ficha ? diasPorEjercicio(rutina?.rutina, fichas).get(normalizar(ficha.nombre)) : undefined
  const otrosNombres = ficha ? nombresEnRutina(rutina?.rutina, ficha, fichas) : []
  const [editando, setEditando] = useState(false)

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [nombre])

  if (cargando) return <Back label="Volver" siNo={rutaA('ejercicios')} />

  if (!ficha) {
    return (
      <>
        <Back label="Volver" siNo={rutaA('ejercicios')} />
        <p className="nada">No encontré ese ejercicio.</p>
      </>
    )
  }

  const sinTexto = !ficha.como
  return (
    <>
      <Back label="Volver" siNo={rutaA('ejercicios')} />

      <FotoEjercicio ficha={ficha.nombre} video={ficha.video} tam="grande" />

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
        Ver video en YouTube
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
      {otrosNombres.length > 0 && (
        <p className="alias">
          En la rutina del PF figura como <strong>{otrosNombres.join(' / ')}</strong>.
        </p>
      )}

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

      <TuFoto ficha={ficha} />

      {fotosDe(ficha.nombre) && (
        <p className="credito">Foto de referencia: free-exercise-db (dominio público).</p>
      )}
    </>
  )
}

/** Achica la foto a 1080 px de ancho como máximo. */
async function achicar(archivo: File): Promise<Blob> {
  const url = URL.createObjectURL(archivo)
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = mal
      i.src = url
    })
    const escala = Math.min(1, 1080 / img.naturalWidth)
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * escala)
    c.height = Math.round(img.naturalHeight * escala)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return await new Promise<Blob>((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error('foto'))), 'image/jpeg', 0.85))
  } finally {
    URL.revokeObjectURL(url)
  }
}

function TuFoto({ ficha }: { ficha: Ficha }) {
  const propia = useFotoPropia(ficha.nombre)
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState(false)

  const guardar = async (f?: File) => {
    if (!f) return
    try {
      const blob = await achicar(f)
      await db.fotos.put({ ejercicio: normalizar(ficha.nombre), blob, fecha: Date.now() })
      setError(false)
      window.dispatchEvent(new Event('entrena:fotos'))
    } catch {
      setError(true)
    }
  }

  const borrar = async () => {
    if (!window.confirm('¿Borrar tu foto de este ejercicio?')) return
    await db.fotos.delete(normalizar(ficha.nombre))
    window.dispatchEvent(new Event('entrena:fotos'))
  }

  return (
    <section className="tu-foto">
      <div>
        <p className="tu-foto__title">Tu foto</p>
        <p className="row__sub">
          {propia ? 'Se muestra en lugar de la de referencia.' : 'Sacale una foto en tu gym para reconocerlo al toque.'}
        </p>
        {error && <p className="row__sub">No pude guardar la foto. Probá de nuevo.</p>}
      </div>
      <div className="tu-foto__btns">
        <button type="button" className="btn btn--soft" onClick={() => input.current?.click()}>
          <Icon name="camara" size={20} />
          {propia ? 'Cambiar foto' : 'Sacar foto'}
        </button>
        {propia && (
          <button type="button" className="btn btn--ghost" onClick={borrar}>
            Borrar mi foto
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="oculto"
        aria-label="Sacar foto"
        onChange={(e) => {
          void guardar(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </section>
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
