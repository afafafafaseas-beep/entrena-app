import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { parseRuta, rutaA, tabFromHash } from './tabs'
import { semanaActual } from './screens/Hoy'
import { asegurarRutinaBase, cargarRutina, db, rutinaActiva } from './db'

beforeEach(async () => {
  window.location.hash = ''
  await db.delete()
  await db.open()
})

describe('rutas', () => {
  it('lee la pestaña de la dirección', () => {
    expect(tabFromHash('#/progreso')).toBe('progreso')
    expect(tabFromHash('#mas')).toBe('mas')
  })
  it('si no hay o no existe, vuelve a Hoy', () => {
    expect(tabFromHash('')).toBe('hoy')
    expect(tabFromHash('#/cualquiera')).toBe('hoy')
  })
  it('lee lo que va después de la pestaña, con tildes y espacios', () => {
    expect(parseRuta(rutaA('ejercicios', 'Nórdicos con banda'))).toEqual({
      tab: 'ejercicios',
      sub: ['Nórdicos con banda'],
    })
  })
})

describe('semanaActual', () => {
  it('arranca el lunes y marca hoy', () => {
    const semana = semanaActual(new Date(2026, 10, 19)) // jueves 19/11/2026
    expect(semana.map((d) => d.num)).toEqual([16, 17, 18, 19, 20, 21, 22])
    expect(semana.findIndex((d) => d.esHoy)).toBe(3)
  })
  it('un domingo queda al final de la semana', () => {
    const semana = semanaActual(new Date(2026, 10, 22))
    expect(semana[0].num).toBe(16)
    expect(semana[6].esHoy).toBe(true)
  })
})

describe('datos', () => {
  it('carga la rutina base una sola vez', async () => {
    await Promise.all([asegurarRutinaBase(), asegurarRutinaBase()])
    await asegurarRutinaBase()
    expect(await db.rutinas.count()).toBe(1)
    expect((await rutinaActiva())?.base).toBe(true)
  })

  it('una rutina nueva queda activa y la anterior se guarda', async () => {
    await asegurarRutinaBase()
    const base = (await rutinaActiva())!
    await cargarRutina({ ...base.rutina, nombre: 'Semana 1 · Re-entrada', semana: 1 })
    const activa = (await rutinaActiva())!
    expect(activa.rutina.nombre).toBe('Semana 1 · Re-entrada')
    expect(activa.base).toBe(false)
    expect(await db.rutinas.count()).toBe(2)
  })
})

describe('App', () => {
  it('muestra las 5 pestañas, arranca en Hoy y avisa de la rutina vieja', async () => {
    render(<App />)
    for (const nombre of ['Hoy', 'Entrenar', 'Ejercicios', 'Progreso', 'Más']) {
      expect(screen.getByRole('button', { name: nombre })).toBeInTheDocument()
    }
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hoy')
    expect(await screen.findByText('Cargá la rutina nueva del PF en Más')).toBeInTheDocument()
    expect(await screen.findByText('Día 1')).toBeInTheDocument()
  })

  it('cambia de pantalla al tocar una pestaña', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Más' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Más')
    expect(screen.getByRole('button', { name: 'Más' })).toHaveAttribute('aria-current', 'page')
    expect(window.location.hash).toBe('#/mas')
  })

  it('Más muestra la versión y deja forzar la actualización', () => {
    window.location.hash = '#/mas'
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Buscar actualización/ }))
    expect(screen.getByText(/Versión del/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buscar ahora' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Forzar actualización' })).toBeInTheDocument()
  })

  it('la pestaña Ejercicios lista y filtra', async () => {
    window.location.hash = '#/ejercicios'
    render(<App />)
    expect(await screen.findByText('Sentadilla trasera')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Buscar ejercicio'), { target: { value: 'nordico' } })
    expect(screen.getByText('1 ejercicio')).toBeInTheDocument()
    expect(screen.getByText('Nórdicos con banda')).toBeInTheDocument()
  })

  it('la ficha muestra cómo se hace y el botón de video', async () => {
    window.location.hash = rutaA('ejercicios', 'Press banca')
    render(<App />)
    expect(await screen.findByText(/Omóplatos juntos/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver video en YouTube' })).toHaveAttribute(
      'href',
      'https://www.youtube.com/results?search_query=bench%20press%20exercise',
    )
    expect(await screen.findByText('Día 1')).toBeInTheDocument()
  })

  it('cargar rutina: revisa, muestra el error y después la carga', async () => {
    window.location.hash = '#/mas/cargar'
    render(<App />)
    const caja = screen.getByRole('textbox')
    const mala = { nombre: 'S1', dias: [{ id: 'd1', nombre: 'Día 1', bloques: [{ nombre: 'Potencia 1', tipo: 'fuerza', ejercicios: [{ nombre: 'Saltos', reps: '3' }] }] }] }
    fireEvent.change(caja, { target: { value: JSON.stringify(mala) } })
    fireEvent.click(screen.getByRole('button', { name: 'Revisar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Al bloque Potencia 1 del Día 1 le falta decir cuántas vueltas.')

    const buena = { ...mala, semana: 1, dias: [{ ...mala.dias[0], bloques: [{ ...mala.dias[0].bloques[0], vueltas: 3 }] }] }
    fireEvent.change(caja, { target: { value: 'Acá va: ' + JSON.stringify(buena) } })
    fireEvent.click(screen.getByRole('button', { name: 'Revisar' }))
    expect(screen.getByRole('status')).toHaveTextContent('Semana 1: 1 día, 1 ejercicio')
    fireEvent.click(screen.getByRole('button', { name: /Cargar esta rutina/ }))
    expect(await screen.findByText('Rutina cargada')).toBeInTheDocument()
    expect((await rutinaActiva())?.rutina.nombre).toBe('S1')
  })

  it('entrenar: empieza, ✓ copia lo sugerido, no se pierde al cerrar y se guarda', async () => {
    window.confirm = () => true
    const primera = render(<App />)
    const empezar = await screen.findByRole('button', { name: 'Empezar' })
    await waitFor(() => expect(empezar).toBeEnabled())
    fireEvent.click(empezar)
    expect(await screen.findByRole('heading', { level: 1, name: 'Día 1' })).toBeInTheDocument()

    // ✓ con todo vacío copia lo de la rutina (Sentadilla trasera: 4 reps, 80 kg)
    fireEvent.click(screen.getByRole('button', { name: 'Tildar serie 1 de Sentadilla trasera' }))
    expect(screen.getByLabelText('Kg serie 1 de Sentadilla trasera')).toHaveValue('80')
    expect(screen.getByLabelText('Reps serie 1 de Sentadilla trasera')).toHaveValue('4')
    fireEvent.change(screen.getByLabelText('Kg serie 2 de Sentadilla trasera'), { target: { value: '82,5' } })

    // Se cierra la app y se vuelve a abrir: la sesión sigue ahí
    primera.unmount()
    window.location.hash = '#/hoy'
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Seguir sesión' }))
    expect(await screen.findByLabelText('Kg serie 2 de Sentadilla trasera')).toHaveValue('82,5')
    expect(screen.getByRole('button', { name: 'Destildar serie 1 de Sentadilla trasera' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar sesión' }))
    expect(await screen.findByText('Día 2')).toBeInTheDocument()

    const [s] = await db.sesiones.toArray()
    expect(s.rodilla).toBe(2)
    const sent = s.ejercicios.find((e) => e.nombre === 'Sentadilla trasera')!
    expect(sent.series[0]).toEqual({ kg: 80, reps: 4, ok: true })
    expect(sent.series[1].kg).toBe(82.5)
    expect(await db.local.get('sesionEnCurso')).toBeUndefined()
  })

  it('cargar rutina desde un archivo: la revisa sola', async () => {
    window.location.hash = '#/mas/cargar'
    render(<App />)
    const rutina = {
      nombre: 'Desde archivo',
      semana: 2,
      dias: [{ id: 'd1', nombre: 'Día 1', bloques: [{ nombre: 'B', tipo: 'fuerza', vueltas: 2, ejercicios: [{ nombre: 'Dominadas', reps: '5' }] }] }],
    }
    const archivo = new File([JSON.stringify(rutina)], 'semana-2.json', { type: 'application/json' })
    fireEvent.change(screen.getByLabelText('Elegir archivo'), { target: { files: [archivo] } })
    expect(await screen.findByRole('status')).toHaveTextContent('Semana 2: 1 día, 1 ejercicio')
    fireEvent.click(screen.getByRole('button', { name: /Cargar esta rutina/ }))
    expect(await screen.findByText('Rutina cargada')).toBeInTheDocument()
    expect((await rutinaActiva())?.rutina.nombre).toBe('Desde archivo')
  })
})
