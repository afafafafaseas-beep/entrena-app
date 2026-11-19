import { TABS, type TabId } from '../tabs'
import { TabIcon } from './Icon'

export function TabBar({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  return (
    <nav className="tabbar" aria-label="Secciones">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={t.id === active ? 'tab tab--active' : 'tab'}
          aria-current={t.id === active ? 'page' : undefined}
          onClick={() => onChange(t.id)}
        >
          <TabIcon id={t.id} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
