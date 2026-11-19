import { Icon, type IconName } from './Icon'
import { volver } from '../tabs'

export function Head({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <header className="head">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
    </header>
  )
}

export function Back({ label, siNo }: { label: string; siNo: string }) {
  return (
    <button type="button" className="back" onClick={() => volver(siNo)}>
      <span className="back__icon">
        <Icon name="chevron" size={20} />
      </span>
      {label}
    </button>
  )
}

export function Empty({ icon, title, text, etapa }: { icon: IconName; title: string; text: string; etapa?: number }) {
  return (
    <div className="empty">
      <div className="empty__icon">
        <Icon name={icon} size={28} />
      </div>
      <p className="empty__title">{title}</p>
      <p className="empty__text">{text}</p>
      {etapa && <span className="pill">Llega en la etapa {etapa}</span>}
    </div>
  )
}

export function Row({
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
    <button type="button" className="row" onClick={onClick} aria-expanded={open}>
      {contenido}
      <span className={open ? 'row__end row__end--open' : 'row__end'}>
        <Icon name="chevron" size={18} />
      </span>
    </button>
  )
}
