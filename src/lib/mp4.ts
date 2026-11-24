// Lee cuánto dura cada cuadro en un video MP4/MOV (los del iPhone), sin reproducirlo:
// busca la pista de video y su tabla de tiempos (stts).

export type Leer = (desde: number, cuanto: number) => Promise<ArrayBuffer>

const tipo = (dv: DataView, o: number) =>
  String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3))

/** Cajas hijas entre [desde, hasta) de un buffer. */
function* cajas(dv: DataView, desde: number, hasta: number) {
  let o = desde
  while (o + 8 <= hasta) {
    let tam = dv.getUint32(o)
    const t = tipo(dv, o + 4)
    let cab = 8
    if (tam === 1) {
      tam = dv.getUint32(o + 8) * 2 ** 32 + dv.getUint32(o + 12)
      cab = 16
    } else if (tam === 0) tam = hasta - o
    if (tam < cab || o + tam > hasta) return
    yield { t, ini: o + cab, fin: o + tam }
    o += tam
  }
}

const hija = (dv: DataView, padre: { ini: number; fin: number }, t: string) => {
  for (const c of cajas(dv, padre.ini, padre.fin)) if (c.t === t) return c
}

/** Duración de un cuadro (segundos) dentro de una caja moov ya leída. */
export function cuadroDeMoov(dv: DataView): number | undefined {
  for (const trak of cajas(dv, 0, dv.byteLength)) {
    if (trak.t !== 'trak') continue
    const mdia = hija(dv, trak, 'mdia')
    const hdlr = mdia && hija(dv, mdia, 'hdlr')
    if (!mdia || !hdlr || tipo(dv, hdlr.ini + 8) !== 'vide') continue
    const mdhd = hija(dv, mdia, 'mdhd')
    const stbl = (() => {
      const minf = hija(dv, mdia, 'minf')
      return minf && hija(dv, minf, 'stbl')
    })()
    const stts = stbl && hija(dv, stbl, 'stts')
    if (!mdhd || !stts) continue
    const escala = dv.getUint32(mdhd.ini + (dv.getUint8(mdhd.ini) === 1 ? 20 : 12))
    // El salto entre cuadros que más se repite.
    const n = dv.getUint32(stts.ini + 4)
    const veces = new Map<number, number>()
    for (let k = 0; k < n; k++) {
      const o = stts.ini + 8 + k * 8
      if (o + 8 > stts.fin) break
      const cant = dv.getUint32(o)
      const delta = dv.getUint32(o + 4)
      if (delta > 0) veces.set(delta, (veces.get(delta) ?? 0) + cant)
    }
    let mejor: number | undefined
    for (const [d, c] of veces) if (mejor === undefined || c > (veces.get(mejor) ?? 0)) mejor = d
    if (mejor && escala) return mejor / escala
  }
}

/** Recorre el archivo de a cajas (sin cargarlo entero) hasta encontrar moov. */
export async function cuadroDeMp4(leer: Leer, tamano: number): Promise<number | undefined> {
  let o = 0
  while (o + 8 <= tamano) {
    const cab = new DataView(await leer(o, 16))
    if (cab.byteLength < 8) return
    let tam = cab.getUint32(0)
    const t = tipo(cab, 4)
    let largo = 8
    if (tam === 1) {
      if (cab.byteLength < 16) return
      tam = cab.getUint32(8) * 2 ** 32 + cab.getUint32(12)
      largo = 16
    } else if (tam === 0) tam = tamano - o
    if (tam < largo) return
    if (t === 'moov') {
      if (tam > 64 * 1024 * 1024) return
      return cuadroDeMoov(new DataView(await leer(o + largo, tam - largo)))
    }
    o += tam
  }
}

/** Lo mismo, para un archivo elegido en el celu. Si no es MP4/MOV o no se entiende, devuelve undefined. */
export async function cuadroDelArchivo(f: Blob): Promise<number | undefined> {
  try {
    return await cuadroDeMp4((desde, cuanto) => f.slice(desde, desde + cuanto).arrayBuffer(), f.size)
  } catch {
    return undefined
  }
}
