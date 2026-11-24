// Altura del salto por tiempo de vuelo (el método de My Jump):
// el cuerpo sube y baja lo mismo, así que h = g · t² / 8.

const G = 9.81

/** Centímetros de salto para un tiempo en el aire (segundos). */
export function alturaCm(vueloSeg: number): number {
  return ((G * vueloSeg * vueloSeg) / 8) * 100
}

/** Tiempo en el aire: cuadros entre despegue y aterrizaje, dividido los cuadros por segundo con que se grabó. */
export function vueloSeg(cuadros: number, fpsGrabacion: number): number {
  return cuadros / fpsGrabacion
}

/**
 * Cuánto dura un cuadro en el archivo, a partir de los tiempos de cuadros que mostró el video.
 * Se queda con la diferencia más chica: si el navegador se salteó cuadros, las otras dan de más.
 */
export function duracionCuadro(tiempos: number[]): number | undefined {
  let min: number | undefined
  for (let k = 1; k < tiempos.length; k++) {
    const d = tiempos[k] - tiempos[k - 1]
    if (d > 0.0015 && (min === undefined || d < min)) min = d
  }
  return min
}

/** Número de cuadro en el que está el video. */
export function cuadroEn(t: number, dur: number): number {
  return Math.floor(t / dur + 1e-6)
}

/** Tiempo para mostrar un cuadro: el medio del cuadro, así no cae justo en el borde. */
export function tiempoDeCuadro(n: number, dur: number): number {
  return (n + 0.5) * dur
}

/** Tests que se pueden medir con el video (saltos verticales), no los de alcance ni el horizontal. */
export function seMideConVideo(nombre: string): boolean {
  return !/horizontal|alcance|largo/i.test(nombre)
}

export type Resultado =
  | { ok: true; cm: number; vueloMs: number; cuadros: number; raro: boolean }
  | { ok: false; error: string }

export function calcular(despegue: number | undefined, aterrizaje: number | undefined, fps: number): Resultado | undefined {
  if (despegue === undefined || aterrizaje === undefined) return undefined
  const cuadros = aterrizaje - despegue
  if (cuadros <= 0) return { ok: false, error: 'El aterrizaje tiene que estar después del despegue.' }
  const t = vueloSeg(cuadros, fps)
  const cm = Math.round(alturaCm(t) * 10) / 10
  return { ok: true, cm, vueloMs: Math.round(t * 1000), cuadros, raro: cm > 90 || cm < 5 }
}
