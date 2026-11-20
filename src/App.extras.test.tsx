import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from './App'
import { cargarRutina, db, guardarSesion } from './db'
import { RutinaSchema } from './lib/rutina'
import pf from './data/pf-semana1.json'
import { fechaISO, nuevaSesion, terminarSesion } from './lib/sesion'

beforeEach(async () => {
  window.location.hash = ''
  window.confirm = () => true
  await db.delete()
  await db.open()
})

describe('pantallas nuevas', () => {
  it('chequeo de la mañana: se guarda a cada toque y avisa si la rodilla amaneció alta', async () => {
    render(<App />)
    const rodilla = await screen.findByRole('group', { name: 'Rodilla al levantarte' })
    fireEvent.click(within(rodilla).getByRole('button', { name: '7' }))
    await waitFor(async () => expect((await db.diario.get(fechaISO(Date.now())))?.rodilla).toBe(7))
    expect(await screen.findByText(/La rodilla amaneció alta/)).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('group', { name: '¿Cómo dormiste?' })).getByRole('button', { name: '4' }))
    await waitFor(async () => expect((await db.diario.get(fechaISO(Date.now())))?.sueno).toBe(4))
  })

  it('anotar vóley', async () => {
    window.location.hash = '#/hoy/voley'
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Partido' }))
    fireEvent.click(screen.getByRole('button', { name: '120 min' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Rodilla al terminar' })).getByRole('button', { name: '3' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(async () => expect(await db.voley.count()).toBe(1))
    expect((await db.voley.toArray())[0]).toMatchObject({ tipo: 'partido', minutos: 120, rodilla: 3 })
  })

  it('ejercicios: filtro por día muestra los bloques de ese día', async () => {
    await cargarRutina(RutinaSchema.parse(pf))
    window.location.hash = '#/ejercicios'
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Día 3' }, { timeout: 5000 }))
    expect(await screen.findByText('Tests')).toBeInTheDocument()
    expect(screen.getByText('CMJ')).toBeInTheDocument()
    expect(screen.queryByText('Press banca')).not.toBeInTheDocument()
  })

  it('entrenar: avisa cuando hay récord', async () => {
    const r = RutinaSchema.parse(pf)
    await cargarRutina(r)
    // Sesión anterior con press banca a 42,5
    const vieja = nuevaSesion(r, r.dias[0], Date.now() - 3 * 864e5)
    const b = vieja.sesion.ejercicios.find((e) => e.nombre === 'Press banca')!
    b.series[0] = { kg: 42.5, reps: 6, ok: true }
    await guardarSesion(terminarSesion(vieja, Date.now() - 3 * 864e5 + 3600e3))
    // Ahora toca Día 2; empezamos el Día 1 a mano
    await db.local.put({ clave: 'sesionEnCurso', valor: nuevaSesion(r, r.dias[0]) })

    window.location.hash = '#/entrenar'
    render(<App />)
    fireEvent.change(await screen.findByLabelText('Kg serie 1 de Press banca'), { target: { value: '45' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tildar serie 1 de Press banca' }))
    expect(await screen.findByText(/¡Récord! Press banca: 45 kg \(antes 42,5\)/)).toBeInTheDocument()
  })

  it('resumen para el PF se arma con lo guardado', async () => {
    const r = RutinaSchema.parse(pf)
    await cargarRutina(r)
    const s = nuevaSesion(r, r.dias[0], Date.now() - 3600e3)
    s.sesion.rodilla = 2
    await guardarSesion(terminarSesion(s))
    window.location.hash = '#/mas/resumen'
    render(<App />)
    const resumen = await screen.findByLabelText('Resumen')
    expect(resumen.textContent).toContain('RESUMEN PARA MI PF')
    expect(resumen.textContent).toContain('GYM (1 sesión)')
    expect(resumen.textContent).toContain('rodilla al terminar 2')
  })
})
