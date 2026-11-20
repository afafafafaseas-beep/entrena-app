export const DISCOS = [25, 20, 15, 10, 5, 2.5, 1.25]

/** Qué discos poner de cada lado para llegar a `total` con una barra de `barra` kg. */
export function discosPorLado(total: number, barra = 20): { porLado: number[]; sobra: number } | undefined {
  if (!(total > barra)) return total === barra ? { porLado: [], sobra: 0 } : undefined
  let resto = Math.round(((total - barra) / 2) * 100) / 100
  const porLado: number[] = []
  for (const d of DISCOS) {
    while (resto >= d - 1e-9) {
      porLado.push(d)
      resto = Math.round((resto - d) * 100) / 100
    }
  }
  return { porLado, sobra: Math.round(resto * 2 * 100) / 100 }
}

const redondear = (kg: number) => Math.round(kg / 2.5) * 2.5

/** Entrada en calor para un ejercicio pesado: barra sola, ~50 % y ~70 %. */
export function entradaEnCalor(kg?: number, barra = 20): string | undefined {
  if (!kg || kg < 40) return undefined
  const pasos = [`barra × 8`]
  const a = redondear(kg * 0.5)
  const b = redondear(kg * 0.7)
  if (a > barra) pasos.push(`${String(a).replace('.', ',')} kg × 5`)
  if (b > a) pasos.push(`${String(b).replace('.', ',')} kg × 3`)
  return pasos.join(' · ')
}
