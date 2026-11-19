import { useLayoutEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { Back, Head, Row } from '../components/ui'
import { cargarRutina } from '../db'
import { useRutina } from '../hooks'
import { revisarRutina, seriesDe, type Revision } from '../lib/rutina'
import { navegar, rutaA } from '../tabs'

export function Mas({ sub }: { sub: string[] }) {
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [sub[0]])
  if (sub[0] === 'cargar') return <CargarRutina />
  if (sub[0] === 'rutina') return <RutinaActual />
  return <Menu />
}

function Menu() {
  const [abierto, setAbierto] = useState(false)
  const activa = useRutina()
  return (
    <>
      <Head title="Más" />

      <p className="section-title">Tu rutina</p>
      <div className="list">
        <Row
          icon="importar"
          accent
          title="Cargar rutina del PF"
          sub="Pegá el mensaje que te pasa"
          onClick={() => navegar(rutaA('mas', 'cargar'))}
        />
        <Row
          icon="rutina"
          title="Rutina actual"
          sub={activa ? activa.rutina.nombre : 'Cargando…'}
          onClick={() => navegar(rutaA('mas', 'rutina'))}
        />
      </div>

      <p className="section-title">Tu app</p>
      <div className="list">
        <Row
          icon="inicio"
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

      <p className="section-title">Llega en la etapa 4</p>
      <div className="list">
        <Row icon="resumen" title="Resumen para el PF" sub="Tu semana lista para copiar" />
        <Row icon="editar" title="Editar la rutina" sub="Cambiar series, reps o pesos" />
        <Row icon="backup" title="Backup" sub="Copiar o restaurar tus datos" />
      </div>
    </>
  )
}

// FileReader anda también en iPhones viejos (File.text() no siempre).
function leerTexto(archivo: File): Promise<string> {
  return new Promise((ok, mal) => {
    const lector = new FileReader()
    lector.onload = () => ok(String(lector.result ?? ''))
    lector.onerror = () => mal(lector.error)
    lector.readAsText(archivo)
  })
}

function CargarRutina() {
  const [texto, setTexto] = useState('')
  const [revision, setRevision] = useState<Revision | null>(null)
  const [cargada, setCargada] = useState<string | null>(null)

  const cambiar = (t: string) => {
    setTexto(t)
    setRevision(null)
  }

  const pegar = async () => {
    try {
      const t = await navigator.clipboard.readText()
      if (t) {
        setCargada(null)
        cambiar(t)
      }
    } catch {
      // Si el iPhone no deja, que lo pegue a mano.
    }
  }

  const desdeArchivo = async (archivo: File | undefined) => {
    if (!archivo) return
    try {
      const t = await leerTexto(archivo)
      setCargada(null)
      setTexto(t)
      setRevision(revisarRutina(t)) // lo revisa de una
    } catch {
      setRevision({ ok: false, error: 'No pude abrir ese archivo. Probá de nuevo o copiá el texto y pegalo.' })
    }
  }

  const cargar = async () => {
    if (!revision?.ok) return
    await cargarRutina(revision.rutina)
    setCargada(revision.resumen)
    setTexto('')
    setRevision(null)
  }

  if (cargada) {
    return (
      <>
        <Back label="Más" siNo={rutaA('mas')} />
        <div className="empty">
          <div className="empty__icon">
            <Icon name="check" size={30} />
          </div>
          <p className="empty__title">Rutina cargada</p>
          <p className="empty__text">{cargada}. La anterior quedó guardada.</p>
        </div>
        <button type="button" className="btn btn--primary mt" onClick={() => navegar(rutaA('mas', 'rutina'))}>
          Ver la rutina
        </button>
      </>
    )
  }

  return (
    <>
      <Back label="Más" siNo={rutaA('mas')} />
      <Head title="Cargar rutina" />
      <p className="lead">
        Elegí el archivo que te pasó el PF, o copiá su mensaje y pegalo. Puede ser el mensaje entero: la app busca sola
        la rutina.
      </p>

      <label className="btn btn--soft">
        <Icon name="importar" size={20} />
        Elegir archivo
        <input
          type="file"
          className="oculto"
          accept=".json,.txt,.md,application/json,text/plain,text/markdown"
          aria-label="Elegir archivo"
          onChange={(e) => {
            desdeArchivo(e.target.files?.[0])
            e.target.value = '' // para poder elegir el mismo archivo otra vez
          }}
        />
      </label>

      <button type="button" className="btn btn--soft" onClick={pegar}>
        <Icon name="pegar" size={20} />
        Pegar lo que copiaste
      </button>

      <label className="field">
        <span className="field__label">O pegalo a mano</span>
        <textarea
          rows={7}
          value={texto}
          onChange={(e) => cambiar(e.target.value)}
          placeholder="Mantené apretado acá y tocá Pegar"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
      </label>

      {!revision && (
        <button
          type="button"
          className="btn btn--primary"
          disabled={!texto.trim()}
          onClick={() => setRevision(revisarRutina(texto))}
        >
          Revisar
        </button>
      )}

      {revision && !revision.ok && (
        <div className="result result--error" role="alert">
          <span className="result__icon">
            <Icon name="alerta" size={22} />
          </span>
          <div>
            <p className="result__title">Hay algo para corregir</p>
            <p>{revision.error}</p>
          </div>
        </div>
      )}

      {revision?.ok && (
        <>
          <div className="result" role="status">
            <span className="result__icon">
              <Icon name="check" size={22} />
            </span>
            <div>
              <p className="result__title">{revision.resumen}</p>
              <p>{revision.rutina.nombre}</p>
              <ul className="result__dias">
                {revision.rutina.dias.map((d) => (
                  <li key={d.id}>
                    <strong>{d.nombre}</strong>
                    {d.foco && ` · ${d.foco}`}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button type="button" className="btn btn--primary" onClick={cargar}>
            <Icon name="check" size={20} />
            Cargar esta rutina
          </button>
        </>
      )}
    </>
  )
}

function RutinaActual() {
  const activa = useRutina()
  if (!activa) return <Back label="Más" siNo={rutaA('mas')} />
  const r = activa.rutina
  const fecha = new Date(activa.cargada).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })

  return (
    <>
      <Back label="Más" siNo={rutaA('mas')} />
      <Head eyebrow={activa.base ? 'Viene con la app' : `Cargada el ${fecha}`} title={r.nombre} />

      {r.notas && (
        <div className={activa.base ? 'aviso aviso--static' : 'nota-rutina'}>
          {activa.base && (
            <span className="aviso__icon">
              <Icon name="alerta" size={20} />
            </span>
          )}
          <span>{r.notas}</span>
        </div>
      )}

      {r.dias.map((d) => (
        <section key={d.id}>
          <p className="dia-title">
            {d.nombre}
            {d.foco && <span> · {d.foco}</span>}
          </p>
          {d.bloques.map((b, i) => (
            <div key={i} className="bloque">
              <div className="bloque__head">
                <span className="bloque__name">{b.nombre}</span>
                <span className="bloque__meta">
                  {b.tipo === 'movilidad' ? 'Movilidad' : b.vueltas === 1 ? '1 vuelta' : `${b.vueltas} vueltas`}
                </span>
              </div>
              {b.ejercicios.map((e, j) => (
                <button
                  key={j}
                  type="button"
                  className="ej"
                  onClick={() => navegar(rutaA('ejercicios', e.nombre))}
                >
                  <span className="ej__name">
                    {e.nombre}
                    {e.nota && <span className="ej__nota">{e.nota}</span>}
                  </span>
                  <span className="ej__dose">
                    {b.tipo === 'fuerza' ? `${seriesDe(e, b)} × ${e.reps}` : e.reps}
                    {e.carga && <span className="ej__carga">{e.carga}</span>}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </section>
      ))}
    </>
  )
}
