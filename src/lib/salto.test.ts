import { describe, expect, it } from 'vitest'
import { alturaCm, calcular, cuadroEn, duracionCuadro, seMideConVideo, tiempoDeCuadro } from './salto'
import { cuadroDeMp4 } from './mp4'

describe('salto por tiempo de vuelo', () => {
  it('usa h = g·t²/8 (medio segundo en el aire ≈ 30,7 cm)', () => {
    expect(alturaCm(0.5)).toBeCloseTo(30.66, 1)
    expect(alturaCm(0.6)).toBeCloseTo(44.15, 1)
  })

  it('cuenta los cuadros con los cuadros por segundo de la grabación', () => {
    // 120 cuadros a 240 cps = 0,5 s
    expect(calcular(100, 220, 240)).toEqual({ ok: true, cm: 30.7, vueloMs: 500, cuadros: 120, raro: false })
    // lo mismo grabado a 120 cps son 60 cuadros
    expect(calcular(10, 70, 120)).toMatchObject({ ok: true, cm: 30.7 })
    expect(calcular(50, 50, 240)).toMatchObject({ ok: false })
    expect(calcular(undefined, 50, 240)).toBeUndefined()
    // si da cualquier cosa, avisa
    expect(calcular(0, 600, 240)).toMatchObject({ raro: true })
  })

  it('saca la duración del cuadro aunque el navegador se saltee alguno', () => {
    const d = 1 / 240
    expect(duracionCuadro([0, d, 3 * d, 4 * d, 8 * d])).toBeCloseTo(d, 6)
    expect(duracionCuadro([1])).toBeUndefined()
  })

  it('ida y vuelta entre cuadro y tiempo', () => {
    const d = 1 / 30
    for (const n of [0, 1, 29, 30, 451]) expect(cuadroEn(tiempoDeCuadro(n, d), d)).toBe(n)
  })

  it('solo ofrece el video para saltos verticales', () => {
    expect(seMideConVideo('CMJ')).toBe(true)
    expect(seMideConVideo('Squat jump (SJ)')).toBe(true)
    expect(seMideConVideo('Salto horizontal')).toBe(false)
    expect(seMideConVideo('Alcance de bloqueo')).toBe(false)
  })
})

describe('cuadros del archivo (MP4/MOV del iPhone)', () => {
  // node:fs no está tipado en el proyecto: se importa como texto. Vitest corre desde la raíz.
  const fsModulo = 'node:fs/promises'
  const leerArchivo = async (nombre: string): Promise<Uint8Array> => {
    const { readFile } = await import(/* @vite-ignore */ fsModulo)
    return readFile(`src/lib/videos-prueba/${nombre}`)
  }
  it.each([
    ['240.mp4', 240],
    ['30.mov', 30],
    ['120-hevc.mov', 120],
  ])('%s → %i cuadros por segundo', async (nombre, fps) => {
    const buf = await leerArchivo(nombre)
    const d = await cuadroDeMp4(async (o, n) => new Uint8Array(buf.subarray(o, o + n)).buffer, buf.length)
    expect(1 / d!).toBeCloseTo(fps, 3)
  })
  it('si no es un MP4, no inventa', async () => {
    const basura = new TextEncoder().encode('esto no es un video para nada')
    expect(await cuadroDeMp4(async (o, n) => basura.slice(o, o + n).buffer, basura.length)).toBeUndefined()
  })
})
