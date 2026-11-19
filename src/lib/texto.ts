/** Para comparar nombres sin importar mayúsculas, tildes ni espacios de más. */
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Link de YouTube con la búsqueda del ejercicio. */
export function urlVideo(busqueda: string): string {
  return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(`${busqueda} exercise`)
}
