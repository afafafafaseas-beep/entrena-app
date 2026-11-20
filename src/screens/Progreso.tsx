import { useMemo, useState } from 'react'
import { FotoEjercicio } from '../components/Foto'
import { GraficoLineas, GraficoSemanas } from '../components/Grafico'
import { Icon } from '../components/Icon'
import { Back, Empty, Head } from '../components/ui'
import { db, type Sesion } from '../db'
import { useDiario, useFichas, useSesiones, useVoley } from '../hooks'
import { buscarFicha } from '../lib/ejercicios'
import { ejerciciosConDatos, evolucion, porSemana, records } from '../lib/progreso'
import { fechaCorta } from '../lib/sesion'
import { navegar, rutaA } from '../tabs'

const n1 = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',')
const UNIDAD = { kg: 'kg', cm: 'cm', reps: 'reps' }
const ZONAS_RODILLA = [
  { desde: 0, hasta: 3, color: 'rgba(47, 209, 110, 0.10)' },
  { desde: 3, hasta: 5, color: 'rgba(255, 204, 0, 0.10)' },
  { desde: 5, hasta: 10, color: 'rgba(255, 69, 58, 0.10)' },
]

export function Progreso({ sub = [] }: { sub?: string[] }) {
  if (sub[0]) return <DetalleSesion id={sub[0]} />
  return <Resumen />
}

function Resumen() {
  const sesiones = useSesiones()
  const voley = useVoley()
  const diario = useDiario()
  const { fichas } = useFichas()
  const [elegido, setElegido] = useState<string | null>(null)

  const lista = sesiones ?? []
  const conDatos = useMemo(() => ejerciciosConDatos(lista), [lista])
  const marcas = useMemo(() => records(lista), [lista])
  const actual = conDatos.find((e) => e.nombre === elegido) ?? conDatos[0]

  if (!sesiones || !voley || !diario) return null

  if (!sesiones.length && !voley.length && !diario.length) {
    return (
      <>
        <Head title="Progreso" />
        <Empty
          icon="progreso"
          title="Todavía sin datos"
          text="Cuando guardes tu primera sesión, acá vas a ver cómo suben tus kilos, la rodilla y tus récords."
        />
      </>
    )
  }

  const rodillaSesion = sesiones.filter((s) => s.rodilla !== undefined).map((s) => ({ x: s.inicio, y: s.rodilla! }))
  const rodillaVoley = voley.filter((v) => v.rodilla !== undefined).map((v) => ({ x: v.inicio, y: v.rodilla! }))
  const rodillaManana = diario
    .filter((d) => d.rodilla !== undefined)
    .map((d) => ({ x: new Date(d.fecha + 'T08:00').getTime(), y: d.rodilla! }))

  const historial = [
    ...sesiones.map((s) => ({ tipo: 'gym' as const, inicio: s.inicio, s })),
    ...voley.map((v) => ({ tipo: 'voley' as const, inicio: v.inicio, v })),
  ].sort((a, b) => b.inicio - a.inicio)

  return (
    <>
      <Head title="Progreso" />

      {actual && (
        <>
          <p className="section-title">Tus ejercicios</p>
          <div className="chips" role="group" aria-label="Elegir ejercicio">
            {conDatos.map((e) => (
              <button
                key={e.nombre}
                type="button"
                className={actual.nombre === e.nombre ? 'chip chip--on' : 'chip'}
                aria-pressed={actual.nombre === e.nombre}
                onClick={() => setElegido(e.nombre)}
              >
                {e.nombre}
              </button>
            ))}
          </div>
          <section className="tarjeta mt">
            <div className="tarjeta__head">
              <FotoEjercicio
                ficha={buscarFicha(fichas, actual.nombre)?.nombre}
                video={buscarFicha(fichas, actual.nombre)?.video ?? actual.nombre}
                tam="mini"
              />
              <div>
                <p className="tarjeta__title">{actual.nombre}</p>
                <p className="row__sub">
                  {actual.campo === 'kg' ? 'Peso más alto de cada sesión' : actual.campo === 'cm' ? 'Mejor marca de cada sesión' : 'Más reps de cada sesión'} (
                  {UNIDAD[actual.campo]})
                </p>
              </div>
            </div>
            <GraficoLineas
              etiqueta={`Evolución de ${actual.nombre}`}
              series={[{ nombre: actual.nombre, color: 'var(--accent)', puntos: evolucion(lista, actual.nombre, actual.campo).map((p) => ({ x: p.inicio, y: p.valor })) }]}
            />
          </section>
        </>
      )}

      {marcas.length > 0 && (
        <>
          <p className="section-title">Récords</p>
          <div className="list">
            {marcas.slice(0, 8).map((m) => (
              <div key={m.nombre} className="row row--off row--record">
                <span className="row__icon row__icon--accent">
                  <Icon name="trofeo" size={20} />
                </span>
                <span className="row__text">
                  <span className="row__title">{m.nombre}</span>
                  <br />
                  <span className="row__sub">
                    {fechaCorta(m.inicio)}
                    {m.rm ? ` · 1RM estimado ${n1(m.rm)} kg` : ''}
                  </span>
                </span>
                <span className="record__valor">
                  {n1(m.valor)}
                  <small>{UNIDAD[m.campo]}</small>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="section-title">Rodilla</p>
      <section className="tarjeta">
        <GraficoLineas
          etiqueta="Rodilla"
          yMin={0}
          yMax={10}
          zonas={ZONAS_RODILLA}
          series={[
            { nombre: 'Al terminar el gym', color: 'var(--accent)', puntos: rodillaSesion },
            { nombre: 'A la mañana', color: '#f6f6f3', puntos: rodillaManana },
            ...(rodillaVoley.length ? [{ nombre: 'Después del vóley', color: '#3e8bff', puntos: rodillaVoley }] : []),
          ]}
        />
        <p className="row__sub">Verde 0-3 · amarillo 4-5 · rojo 6-10. A la mañana tiene que volver a como suele estar.</p>
      </section>

      <p className="section-title">Por semana (últimas 8)</p>
      <section className="tarjeta">
        <GraficoSemanas semanas={porSemana(sesiones, voley)} />
      </section>

      <p className="section-title">Historial</p>
      <div className="list">
        {historial.length === 0 && <p className="nada">Nada todavía.</p>}
        {historial.map((h) =>
          h.tipo === 'gym' ? (
            <button key={h.s.id} type="button" className="row" onClick={() => navegar(rutaA('progreso', h.s.id))}>
              <span className="row__icon row__icon--accent">
                <Icon name="entrenar" size={20} />
              </span>
              <span className="row__text">
                <span className="row__title">
                  {h.s.diaNombre} · {fechaCorta(h.s.inicio)}
                </span>
                <br />
                <span className="row__sub">
                  {h.s.minutos} min
                  {h.s.rpeSesion !== undefined ? ` · RPE ${h.s.rpeSesion}` : ''}
                  {h.s.rodilla !== undefined ? ` · rodilla ${h.s.rodilla}` : ''}
                </span>
              </span>
              <span className="row__end">
                <Icon name="chevron" size={18} />
              </span>
            </button>
          ) : (
            <div key={h.v.id} className="row row--off">
              <span className="row__icon">
                <Icon name="voley" size={20} />
              </span>
              <span className="row__text">
                <span className="row__title">
                  Vóley · {fechaCorta(h.v.inicio)}
                </span>
                <br />
                <span className="row__sub">
                  {h.v.tipo === 'partido' ? 'Partido' : h.v.tipo === 'plaza' ? 'De plaza' : 'Entrenamiento'} · {h.v.minutos} min
                  {h.v.rodilla !== undefined ? ` · rodilla ${h.v.rodilla}` : ''}
                </span>
              </span>
            </div>
          ),
        )}
      </div>
    </>
  )
}

function textoSerie(e: Sesion['ejercicios'][number], x: Sesion['ejercicios'][number]['series'][number]) {
  if (x.cm !== undefined) return `${n1(x.cm)} cm`
  const r = x.reps === undefined ? '' : e.unidad === 'seg' ? `${x.reps}"` : `${x.reps}`
  if (x.kg !== undefined) return r ? `${n1(x.kg)} × ${r}` : `${n1(x.kg)} kg`
  return r ? (e.unidad === 'seg' ? r : `${r} reps`) : '✓'
}

function DetalleSesion({ id }: { id: string }) {
  const sesiones = useSesiones()
  const s = sesiones?.find((x) => x.id === id)
  if (!sesiones) return null
  if (!s)
    return (
      <>
        <Back label="Progreso" siNo={rutaA('progreso')} />
        <p className="nada">Esa sesión ya no está.</p>
      </>
    )

  const borrar = async () => {
    if (!window.confirm('¿Borrar esta sesión? No se puede deshacer.')) return
    await db.sesiones.delete(s.id)
    navegar(rutaA('progreso'))
  }

  const fecha = new Date(s.inicio).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <>
      <Back label="Progreso" siNo={rutaA('progreso')} />
      <Head eyebrow={fecha} title={s.diaNombre} />
      <div className="sesion-meta">
        <span className="sesion-meta__item">{s.minutos} min</span>
        {s.rpeSesion !== undefined && <span className="sesion-meta__item">RPE {s.rpeSesion}</span>}
        {s.rodilla !== undefined && <span className="sesion-meta__item">Rodilla {s.rodilla}</span>}
      </div>
      {s.notas && <div className="nota-pf mt">{s.notas}</div>}
      <div className="list mt">
        {s.ejercicios.map((e, i) => (
          <div key={i} className="row row--off">
            <span className="row__text">
              <span className="row__title">{e.nombre}</span>
              <br />
              <span className="row__sub">
                {e.tipo === 'movilidad'
                  ? e.hecho
                    ? 'Hecho'
                    : 'No lo hiciste'
                  : e.series.some((x) => x.ok)
                    ? e.series.filter((x) => x.ok).map((x) => textoSerie(e, x)).join(' · ')
                    : 'No lo hiciste'}
                {e.rpe !== undefined ? ` · RPE ${e.rpe}` : ''}
              </span>
            </span>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn--ghost mt" onClick={borrar}>
        <Icon name="basura" size={18} />
        Borrar esta sesión
      </button>
    </>
  )
}
