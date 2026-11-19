import { describe, expect, it, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import App from './App'
import { tabFromHash } from './tabs'
import { semanaActual } from './screens/Screens'

describe('tabFromHash', () => {
  it('lee la pestaña de la dirección', () => {
    expect(tabFromHash('#/progreso')).toBe('progreso')
    expect(tabFromHash('#mas')).toBe('mas')
  })
  it('si no hay o no existe, vuelve a Hoy', () => {
    expect(tabFromHash('')).toBe('hoy')
    expect(tabFromHash('#/cualquiera')).toBe('hoy')
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

describe('App', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('muestra las 5 pestañas y arranca en Hoy', () => {
    render(<App />)
    for (const nombre of ['Hoy', 'Entrenar', 'Ejercicios', 'Progreso', 'Más']) {
      expect(screen.getByRole('button', { name: nombre })).toBeInTheDocument()
    }
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hoy')
  })

  it('cambia de pantalla al tocar una pestaña', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Más' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Más')
    expect(screen.getByRole('button', { name: 'Más' })).toHaveAttribute('aria-current', 'page')
    expect(window.location.hash).toBe('#/mas')
  })
})
