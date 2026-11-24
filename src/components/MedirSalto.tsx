import { useEffect, useRef, useState } from 'react'
import { cuadroDelArchivo } from '../lib/mp4'
import { calcular, duracionCuadro, tiempoDeCuadro } from '../lib/salto'
import { Icon } from './Icon'

const CLAVE_FPS = 'entrena.fpsSalto'
const OPCIONES_FPS = [
  { fps: 240, label: 'Lenta 240' },
  { fps: 120, label: 'Lenta 120' },
  { fps: 60, label: 'Normal 60' },
  { fps: 30, label: 'Normal 30' },
]

function fpsGuardado(): number {
  try {
    const n = Number(localStorage.getItem(CLAVE_FPS))
    return OPCIONES_FPS.some((o) => o.fps === n) ? n : 240
  } catch {
    return 240
  }
}

/**
 * Cuánto dura un cuadro en el archivo. Se reproduce un ratito lento (así el navegador
 * muestra todos los cuadros) y se miran los tiempos de cada uno.
 */
function medirCuadro(v: HTMLVideoElement): Promise<number | undefined> {
  if (typeof v.requestVideoFrameCallback !== 'function') return Promise.resolve(undefined)
  return new Promise((listo) => {
    const tiempos: number[] = []
    let fin = false
    const terminar = () => {
      if (fin) return
      fin = true
      v.pause()
      v.playbackRate = 1
      listo(duracionCuadro(tiempos))
    }
    const cb: VideoFrameRequestCallback = (_ahora, m) => {
      tiempos.push(m.mediaTime)
      if (tiempos.length >= 14) terminar()
      else v.requestVideoFrameCallback(cb)
    }
    v.requestVideoFrameCallback(cb)
    v.playbackRate = 0.2
    v.play().catch(terminar)
    setTimeout(terminar, 5000)
  })
}

/** Medir un salto con un video en cámara lenta: se marca el despegue y el aterrizaje cuadro por cuadro. */
export function MedirSalto({
  titulo,
  onUsar,
  onCerrar,
}: {
  titulo: string
  onUsar: (cm: number) => void
  onCerrar: () => void
}) {
  const [fps, setFps] = useState(fpsGuardado)
  const [url, setUrl] = useState<string | null>(null)
  const [dur, setDur] = useState<number | null>(null) // duración de un cuadro en el archivo
  const [total, setTotal] = useState(0)
  const [cuadro, setCuadro] = useState(0)
  const [despegue, setDespegue] = useState<number>()
  const [aterrizaje, setAterrizaje] = useState<number>()
  const video = useRef<HTMLVideoElement>(null)
  const durArchivo = useRef<number | undefined>(undefined)

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])

  const elegirFps = (n: number) => {
    setFps(n)
    try {
      localStorage.setItem(CLAVE_FPS, String(n))
    } catch {
      /* sin guardar, no pasa nada */
    }
  }

  const elegirVideo = async (f?: File) => {
    if (!f) return
    // Los videos del iPhone dicen en el archivo cuánto dura cada cuadro.
    const d = await cuadroDelArchivo(f)
    durArchivo.current = d
    // Si el archivo ya viene a 240 o 120 cuadros, se sabe solo cómo se grabó.
    if (d && 1 / d >= 100) elegirFps(1 / d >= 180 ? 240 : 120)
    setDur(null)
    setDespegue(undefined)
    setAterrizaje(undefined)
    setCuadro(0)
    setUrl(URL.createObjectURL(f))
  }

  const alCargar = async () => {
    const v = video.current
    if (!v) return
    const d = durArchivo.current ?? (await medirCuadro(v)) ?? 1 / 30
    setDur(d)
    setTotal(Math.max(1, Math.floor(v.duration / d)))
    ir(0, d)
  }

  const ir = (n: number, d = dur) => {
    const v = video.current
    if (!v || !d) return
    const max = Math.max(0, Math.floor(v.duration / d) - 1)
    const k = Math.min(max, Math.max(0, n))
    v.currentTime = tiempoDeCuadro(k, d)
    setCuadro(k)
  }

  const r = calcular(despegue, aterrizaje, fps)

  return (
    <div className="sheet-fondo" onClick={onCerrar}>
      <div className="sheet" role="dialog" aria-label="Medir salto con video" onClick={(ev) => ev.stopPropagation()}>
        <div className="sheet__head">
          <p className="sheet__title">Medir salto</p>
          <button type="button" className="timer__cerrar" onClick={onCerrar} aria-label="Cerrar">
            <Icon name="cerrar" size={20} />
          </button>
        </div>
        <p className="row__sub">{titulo}</p>

        <div className="chips chips--fijos salto__fps" role="group" aria-label="Cómo lo grabaste">
          {OPCIONES_FPS.map((o) => (
            <button
              key={o.fps}
              type="button"
              className={fps === o.fps ? 'chip chip--on' : 'chip'}
              aria-pressed={fps === o.fps}
              onClick={() => elegirFps(o.fps)}
            >
              {o.label}
            </button>
          ))}
        </div>

        {!url ? (
          <>
            <ol className="salto__pasos">
              <li>
                Grabá en <strong>cámara lenta</strong> con el celu quieto (apoyado en el piso o en algo), a 1 o 2 metros, que se
                vean bien los pies.
              </li>
              <li>Saltá y caé con las piernas estiradas: si doblás las rodillas antes de tocar el piso, da de más.</li>
              <li>
                Arriba elegí a cuántos cuadros grabás. En el iPhone lo ves en Ajustes &gt; Cámara &gt; Grabar en cámara lenta.
              </li>
            </ol>
            <label className="btn btn--primary">
              <Icon name="video" size={22} />
              Elegir video
              <input
                type="file"
                accept="video/*"
                className="oculto"
                aria-label="Elegir video del salto"
                onChange={(ev) => void elegirVideo(ev.target.files?.[0])}
              />
            </label>
          </>
        ) : (
          <>
            <video
              ref={video}
              className="salto__video"
              src={url}
              muted
              playsInline
              preload="auto"
              onLoadedMetadata={alCargar}
            />
            {!dur ? (
              <p className="row__sub">Leyendo el video…</p>
            ) : (
              <>
                <input
                  type="range"
                  className="salto__barra"
                  min={0}
                  max={Math.max(0, total - 1)}
                  value={cuadro}
                  aria-label="Mover el video"
                  onChange={(ev) => ir(Number(ev.target.value))}
                />
                <div className="salto__pasitos">
                  {[-10, -1, 1, 10].map((d) => (
                    <button key={d} type="button" className="chip" onClick={() => ir(cuadro + d)} aria-label={`${d > 0 ? 'Adelantar' : 'Atrasar'} ${Math.abs(d)} cuadro${Math.abs(d) > 1 ? 's' : ''}`}>
                      {d > 0 ? `+${d}` : d}
                    </button>
                  ))}
                </div>
                <p className="salto__cuadro">
                  Cuadro {cuadro} · el archivo tiene {Math.round(1 / dur)} cuadros por segundo
                </p>

                <div className="salto__marcas">
                  <button type="button" className={despegue !== undefined ? 'salto__marca salto__marca--on' : 'salto__marca'} onClick={() => setDespegue(cuadro)}>
                    <span>Despegue</span>
                    <small>{despegue !== undefined ? `cuadro ${despegue}` : 'primer cuadro con los 2 pies en el aire'}</small>
                  </button>
                  <button type="button" className={aterrizaje !== undefined ? 'salto__marca salto__marca--on' : 'salto__marca'} onClick={() => setAterrizaje(cuadro)}>
                    <span>Aterrizaje</span>
                    <small>{aterrizaje !== undefined ? `cuadro ${aterrizaje}` : 'primer cuadro con un pie en el piso'}</small>
                  </button>
                </div>

                {r && !r.ok && <p className="salto__error" role="alert">{r.error}</p>}
                {r && r.ok && (
                  <div className="salto__res" role="status">
                    <p className="salto__cm">{String(r.cm).replace('.', ',')} cm</p>
                    <p className="row__sub">
                      {r.vueloMs} ms en el aire · {r.cuadros} cuadros a {fps} por segundo
                    </p>
                    {r.raro && (
                      <p className="salto__error">Da raro: fijate que la grabación de arriba sea la correcta y las marcas.</p>
                    )}
                    <button type="button" className="btn btn--primary" onClick={() => onUsar(r.cm)}>
                      Anotar {String(r.cm).replace('.', ',')} cm
                    </button>
                  </div>
                )}
              </>
            )}
            <label className="btn btn--ghost">
              Elegir otro video
              <input type="file" accept="video/*" className="oculto" onChange={(ev) => void elegirVideo(ev.target.files?.[0])} />
            </label>
          </>
        )}
      </div>
    </div>
  )
}
