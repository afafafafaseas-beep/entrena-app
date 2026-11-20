import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-600.css'
import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/barlow-condensed/latin-700.css'
import '@fontsource/barlow-condensed/latin-800-italic.css'
import './styles.css'
import App from './App'
import { buscarSeguido, guardarFotosDeFondo } from './lib/actualizar'

// Deja la app guardada en el celular para que ande sin internet,
// y se actualiza sola cuando hay una versión nueva (también al volver a abrirla).
registerSW({ immediate: true, onRegisteredSW: (_url, reg) => buscarSeguido(reg) })
guardarFotosDeFondo()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
