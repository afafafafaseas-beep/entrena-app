import { useEffect, useState } from 'react'
import { TabBar } from './components/TabBar'
import { asegurarRutinaBase, pedirPersistencia } from './db'
import { Ejercicios } from './screens/Ejercicios'
import { Hoy } from './screens/Hoy'
import { Mas } from './screens/Mas'
import { Entrenar } from './screens/Entrenar'
import { Progreso } from './screens/Progreso'
import { useEnCurso } from './hooks'
import { pantallaPrendida } from './lib/avisos'
import { parseRuta, rutaA, type Ruta, type TabId } from './tabs'

export default function App() {
  const [ruta, setRuta] = useState<Ruta>(() => parseRuta(window.location.hash))

  useEffect(() => {
    asegurarRutinaBase()
    pedirPersistencia()
    const onHash = () => setRuta(parseRuta(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Mientras hay un entreno abierto, la pantalla no se apaga sola.
  const entrenando = !!useEnCurso()
  useEffect(() => {
    pantallaPrendida(entrenando)
  }, [entrenando])

  const cambiarTab = (id: TabId) => {
    // Tocar la pestaña en la que ya estás vuelve al principio de esa pestaña.
    const nueva = rutaA(id)
    history.replaceState(null, '', nueva)
    setRuta(parseRuta(nueva))
    window.scrollTo(0, 0)
  }

  const { tab, sub } = ruta
  return (
    <div className="app">
      <main className="screen" key={tab + sub.join('/')}>
        {tab === 'hoy' && <Hoy sub={sub} />}
        {tab === 'entrenar' && <Entrenar />}
        {tab === 'ejercicios' && <Ejercicios sub={sub} />}
        {tab === 'progreso' && <Progreso sub={sub} />}
        {tab === 'mas' && <Mas sub={sub} />}
      </main>
      <TabBar active={tab} onChange={cambiarTab} />
    </div>
  )
}
