import fotosJson from '../data/fotos.json'

/** Fecha y hora en que se publicó esta versión (la pone Vite al armar la app). */
export const VERSION: string = typeof __VERSION__ === 'string' ? __VERSION__ : 'desarrollo'

export function textoVersion(): string {
  const d = new Date(VERSION)
  if (Number.isNaN(d.getTime())) return VERSION
  return d.toLocaleString('es-AR', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/**
 * El iPhone solo busca versiones nuevas al abrir la app. Esto además lo hace
 * cada vez que la app vuelve a primer plano y cada 30 minutos.
 */
export function buscarSeguido(reg: ServiceWorkerRegistration | undefined) {
  if (!reg) return
  const buscar = () => {
    if (navigator.onLine) void reg.update().catch(() => {})
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') buscar()
  })
  window.setInterval(buscar, 30 * 60 * 1000)
}

export type Resultado = 'nueva' | 'al-dia' | 'sin-internet' | 'no-se-puede'

/** Busca una versión nueva ya. Si hay, se instala y la app se recarga sola. */
export async function buscarActualizacion(): Promise<Resultado> {
  if (!('serviceWorker' in navigator)) return 'no-se-puede'
  if (!navigator.onLine) return 'sin-internet'
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return 'no-se-puede'
  try {
    await reg.update()
  } catch {
    return 'sin-internet'
  }
  return reg.installing || reg.waiting ? 'nueva' : 'al-dia'
}

/**
 * Último recurso: borra la copia guardada de la app (no tus datos) y la vuelve a bajar.
 * Los entrenamientos, la rutina y las fotos tuyas están en otra parte y no se tocan.
 */
export async function forzarActualizacion() {
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.unregister()))
  }
  if ('caches' in window) {
    const nombres = await caches.keys()
    await Promise.all(nombres.map((n) => caches.delete(n)))
  }
  window.location.reload()
}

/**
 * Las fotos de los ejercicios ya no se bajan junto con la app (eso hacía lenta la actualización).
 * Se bajan de a una, en segundo plano, y quedan guardadas para usarlas sin internet.
 */
export function guardarFotosDeFondo() {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller || !navigator.onLine) return
  const ids = [...new Set(Object.values(fotosJson.fotos as Record<string, string>))]
  const urls = ids.flatMap((id) => [0, 1].map((n) => `${import.meta.env.BASE_URL}ejercicios/${id}-${n}.jpg`))
  let i = 0
  const siguiente = () => {
    if (i >= urls.length || !navigator.onLine) return
    const url = urls[i++]
    fetch(url)
      .catch(() => {})
      .finally(() => window.setTimeout(siguiente, 50))
  }
  window.setTimeout(siguiente, 4000)
}
