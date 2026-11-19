import { useEffect, useState } from 'react'
import { TabBar } from './components/TabBar'
import { Ejercicios, Entrenar, Hoy, Mas, Progreso } from './screens/Screens'
import { tabFromHash, type TabId } from './tabs'

const SCREENS: Record<TabId, () => React.ReactNode> = {
  hoy: Hoy,
  entrenar: Entrenar,
  ejercicios: Ejercicios,
  progreso: Progreso,
  mas: Mas,
}

export default function App() {
  const [tab, setTab] = useState<TabId>(() => tabFromHash(window.location.hash))

  useEffect(() => {
    const onHash = () => setTab(tabFromHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const change = (id: TabId) => {
    setTab(id)
    history.replaceState(null, '', `#/${id}`)
    window.scrollTo(0, 0)
  }

  const Screen = SCREENS[tab]
  return (
    <div className="app">
      <main className="screen">
        <Screen />
      </main>
      <TabBar active={tab} onChange={change} />
    </div>
  )
}
