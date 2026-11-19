// Sonido del descanso y pantalla siempre prendida.
// En iPhone las apps web no pueden vibrar; igual lo intentamos por si es otro celular.

type Ctx = AudioContext

let ctx: Ctx | null = null
let programados: OscillatorNode[] = []

/** Hay que llamarlo dentro de un toque (el iPhone solo deja sonar después de que tocaste algo). */
export function prepararSonido() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

/** Programa 3 pitidos para dentro de `segundos`. Así suenan a tiempo aunque el teléfono frene los relojes. */
export function programarPitido(segundos: number) {
  cancelarPitido()
  if (!ctx) return
  const t0 = ctx.currentTime + Math.max(0, segundos)
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator()
    const vol = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = i === 2 ? 1320 : 880
    const t = t0 + i * 0.35
    vol.gain.setValueAtTime(0.0001, t)
    vol.gain.exponentialRampToValueAtTime(0.6, t + 0.02)
    vol.gain.exponentialRampToValueAtTime(0.0001, t + (i === 2 ? 0.5 : 0.25))
    osc.connect(vol).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.55)
    programados.push(osc)
  }
}

export function cancelarPitido() {
  for (const o of programados) {
    try {
      o.stop()
    } catch {
      // ya había terminado
    }
  }
  programados = []
}

export function vibrar() {
  try {
    navigator.vibrate?.([300, 150, 300])
  } catch {
    // iPhone: no se puede
  }
}

// ---- Pantalla prendida ----

let lock: { release: () => Promise<void> } | null = null
let querer = false

async function pedir() {
  try {
    const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } })
      .wakeLock
    if (querer && wl && !lock) {
      lock = await wl.request('screen')
      ;(lock as unknown as EventTarget).addEventListener?.('release', () => (lock = null))
    }
  } catch {
    lock = null
  }
}

if (typeof document !== 'undefined') {
  // Al volver a la app, el iPhone suelta el permiso: lo pedimos de nuevo.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void pedir()
  })
}

export function pantallaPrendida(si: boolean) {
  querer = si
  if (si) void pedir()
  else if (lock) {
    void lock.release().catch(() => {})
    lock = null
  }
}
