import { useEffect, useRef, useState } from 'react'
import { db } from '../db'
import { cancelarPitido, prepararSonido, programarPitido, vibrar } from '../lib/avisos'
import { reloj } from '../lib/sesion'
import { Icon } from './Icon'

const OPCIONES = [60, 90, 120, 180]

/** Botón flotante de descanso. Guarda cuándo termina, así sigue bien aunque se cierre la app. */
export function Descanso() {
  const [fin, setFin] = useState<number | null>(null)
  const [eligiendo, setEligiendo] = useState(false)
  const [ahora, setAhora] = useState(Date.now())
  const avisado = useRef(false)

  // Si había un descanso andando cuando se cerró la app, lo retoma.
  useEffect(() => {
    db.estado.get('descanso').then((e) => {
      const f = (e?.valor as { fin?: number } | undefined)?.fin
      if (typeof f === 'number') {
        avisado.current = f <= Date.now()
        setFin(f)
      }
    })
  }, [])

  useEffect(() => {
    if (fin === null) return
    const t = setInterval(() => setAhora(Date.now()), 250)
    return () => clearInterval(t)
  }, [fin])

  const restante = fin === null ? 0 : fin - ahora
  const termino = fin !== null && restante <= 0

  useEffect(() => {
    if (termino && !avisado.current) {
      avisado.current = true
      vibrar()
    }
  }, [termino])

  const arrancar = (seg: number) => {
    prepararSonido()
    const f = Date.now() + seg * 1000
    avisado.current = false
    setFin(f)
    setAhora(Date.now())
    setEligiendo(false)
    programarPitido(seg)
    void db.estado.put({ clave: 'descanso', valor: { fin: f } })
  }

  const sumar = () => {
    if (fin === null) return
    prepararSonido()
    const f = Math.max(fin, Date.now()) + 30000
    avisado.current = false
    setFin(f)
    programarPitido((f - Date.now()) / 1000)
    void db.estado.put({ clave: 'descanso', valor: { fin: f } })
  }

  const listo = () => {
    cancelarPitido()
    setFin(null)
    void db.estado.delete('descanso')
  }

  if (fin !== null) {
    return (
      <div className={termino ? 'timer timer--fin' : 'timer'} role="timer" aria-live="polite">
        <div className="timer__info">
          <span className="timer__label">{termino ? '¡A la próxima serie!' : 'Descanso'}</span>
          <span className="timer__num">{termino ? '0:00' : reloj(restante + 999)}</span>
        </div>
        {!termino && (
          <button type="button" className="timer__btn" onClick={sumar}>
            +30 seg
          </button>
        )}
        <button type="button" className="timer__btn timer__btn--main" onClick={listo}>
          Listo
        </button>
      </div>
    )
  }

  if (eligiendo) {
    return (
      <div className="timer timer--elegir">
        <span className="timer__label">Descanso</span>
        <div className="timer__opciones">
          {OPCIONES.map((s) => (
            <button key={s} type="button" className="timer__opcion" onClick={() => arrancar(s)}>
              {s < 120 ? `${s}"` : `${s / 60}'`}
            </button>
          ))}
        </div>
        <button type="button" className="timer__cerrar" onClick={() => setEligiendo(false)} aria-label="Cerrar">
          <Icon name="cerrar" size={20} />
        </button>
      </div>
    )
  }

  return (
    <button type="button" className="fab" onClick={() => setEligiendo(true)}>
      <Icon name="reloj" size={22} />
      Descanso
    </button>
  )
}
