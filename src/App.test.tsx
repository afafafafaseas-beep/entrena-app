import { describe, expect, it, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import App from './App'
import { tabFromHash } from './tabs'

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
