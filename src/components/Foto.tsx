import { useEffect, useState } from 'react'
import { db } from '../db'
import { fotosDe } from '../lib/fotos'
import { normalizar, urlVideo } from '../lib/texto'
import { Icon } from './Icon'

/** Foto que sacó él (si hay), como URL. */
export function useFotoPropia(nombreFicha?: string): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!nombreFicha) return
    let vivo = true
    let creada: string | undefined
    const cargar = () =>
      db.fotos.get(normalizar(nombreFicha)).then((f) => {
        if (!vivo) return
        if (creada) URL.revokeObjectURL(creada)
        creada = f ? URL.createObjectURL(f.blob) : undefined
        setUrl(creada)
      })
    void cargar()
    const on = () => void cargar()
    window.addEventListener('entrena:fotos', on)
    return () => {
      vivo = false
      window.removeEventListener('entrena:fotos', on)
      if (creada) URL.revokeObjectURL(creada)
    }
  }, [nombreFicha])
  return url
}

/**
 * Imagen del ejercicio: su foto si la sacó; si no, la de referencia animada (inicio ↔ final);
 * si no hay ninguna, un botón para ver el video.
 */
export function FotoEjercicio({
  ficha,
  video,
  tam = 'chica',
  onClick,
  estatico,
}: {
  ficha?: string // nombre de la ficha
  video: string // búsqueda de YouTube
  tam?: 'chica' | 'mini' | 'grande'
  onClick?: () => void
  estatico?: boolean // va adentro de otro botón: sin link propio
}) {
  const propia = useFotoPropia(ficha)
  const ref = ficha ? fotosDe(ficha) : undefined
  const clase = `foto foto--${tam}`

  if (propia || ref) {
    const contenido = propia ? (
      <img src={propia} alt="" className="foto__img" />
    ) : (
      <>
        <img src={ref![0]} alt="" className="foto__img" loading="lazy" />
        <img src={ref![1]} alt="" className="foto__img foto__img--b" loading="lazy" />
      </>
    )
    return onClick ? (
      <button type="button" className={clase} onClick={onClick} aria-label={`Ver ficha de ${ficha}`}>
        {contenido}
      </button>
    ) : (
      <div className={clase}>{contenido}</div>
    )
  }

  if (estatico)
    return (
      <span className={`${clase} foto--video`} aria-hidden="true">
        <Icon name="play" size={tam === 'grande' ? 34 : 20} filled />
      </span>
    )

  // Sin foto: botón de video directo
  return (
    <a
      className={`${clase} foto--video`}
      href={urlVideo(video)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Ver video de ${ficha ?? video}`}
      onClick={(e) => e.stopPropagation()}
    >
      <Icon name="play" size={tam === 'grande' ? 34 : 20} filled />
      {tam === 'grande' && <span>Ver video</span>}
    </a>
  )
}
