import { guardarEnCurso } from '../db'
import { prepararSonido } from '../lib/avisos'
import type { Dia, Rutina } from '../lib/rutina'
import { nuevaSesion } from '../lib/sesion'
import { navegar, rutaA } from '../tabs'

/** Empieza un entreno. Con `fechaPasada`, es para cargar uno de otro día que no anotó. */
export async function empezarSesion(rutina: Rutina, dia: Dia, fechaPasada?: string) {
  prepararSonido() // aprovecha el toque para que después pueda sonar el descanso
  const c = nuevaSesion(rutina, dia)
  if (fechaPasada) c.fechaPasada = fechaPasada
  await guardarEnCurso(c)
  navegar(rutaA('entrenar'))
}
