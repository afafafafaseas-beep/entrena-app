import { guardarEnCurso } from '../db'
import { prepararSonido } from '../lib/avisos'
import type { Dia, Rutina } from '../lib/rutina'
import { nuevaSesion } from '../lib/sesion'
import { navegar, rutaA } from '../tabs'

export async function empezarSesion(rutina: Rutina, dia: Dia) {
  prepararSonido() // aprovecha el toque para que después pueda sonar el descanso
  await guardarEnCurso(nuevaSesion(rutina, dia))
  navegar(rutaA('entrenar'))
}
