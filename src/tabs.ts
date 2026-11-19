export type TabId = 'hoy' | 'entrenar' | 'ejercicios' | 'progreso' | 'mas'

export const TABS: { id: TabId; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'entrenar', label: 'Entrenar' },
  { id: 'ejercicios', label: 'Ejercicios' },
  { id: 'progreso', label: 'Progreso' },
  { id: 'mas', label: 'Más' },
]

/** Lee la pestaña desde la dirección (#/entrenar). Si no es válida, vuelve a Hoy. */
export function tabFromHash(hash: string): TabId {
  const id = hash.replace(/^#\/?/, '')
  return TABS.some((t) => t.id === id) ? (id as TabId) : 'hoy'
}
