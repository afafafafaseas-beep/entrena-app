export type TabId = 'hoy' | 'entrenar' | 'ejercicios' | 'progreso' | 'mas'

export const TABS: { id: TabId; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'entrenar', label: 'Entrenar' },
  { id: 'ejercicios', label: 'Ejercicios' },
  { id: 'progreso', label: 'Progreso' },
  { id: 'mas', label: 'Más' },
]

export interface Ruta {
  tab: TabId
  sub: string[] // lo que va después: #/ejercicios/<nombre> → ["<nombre>"]
}

/** Lee la dirección (#/mas/cargar). Si no es válida, vuelve a Hoy. */
export function parseRuta(hash: string): Ruta {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  const tab = TABS.some((t) => t.id === partes[0]) ? (partes[0] as TabId) : 'hoy'
  return { tab, sub: tab === partes[0] ? partes.slice(1) : [] }
}

export const tabFromHash = (hash: string): TabId => parseRuta(hash).tab

export function rutaA(tab: TabId, ...sub: string[]): string {
  return '#/' + [tab, ...sub.map(encodeURIComponent)].join('/')
}

let navegoDentro = false

/** Ir a otra pantalla dentro de la app. */
export function navegar(hash: string) {
  navegoDentro = true
  window.location.hash = hash
}

/** Volver atrás; si entró directo a esta pantalla, va a `siNo`. */
export function volver(siNo: string) {
  if (navegoDentro && window.history.length > 1) window.history.back()
  else window.location.hash = siNo
}
