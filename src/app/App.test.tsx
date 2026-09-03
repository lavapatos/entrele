import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { formatDistancePercentage } from '../features/game/distance-display'
import { getDistancePercent } from '../game/compare'
import { GAME_DICTIONARY } from '../game/game-data'
import App from './App'

describe('App', () => {
  const prototypeDate = new Date('2026-01-01T12:00:00Z')

  beforeEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.palette
    delete document.documentElement.dataset.mode
  })

  function renderPrototype() {
    render(<App now={prototypeDate} />)
  }

  function submit(word: string) {
    fireEvent.change(screen.getByLabelText('Palabra de cinco letras'), {
      target: { value: word },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Probar' }))
  }

  it('muestra la partida con el rango completo y los intentos disponibles', () => {
    renderPrototype()

    expect(screen.getByRole('heading', { name: 'ENTRELE' })).toBeInTheDocument()
    expect(screen.getByLabelText('0 de 10 intentos usados')).toBeInTheDocument()
    expect(screen.getByLabelText('Límite inferior: AAAAA')).toBeInTheDocument()
    expect(screen.getByLabelText('Límite superior: ZZZZZ')).toBeInTheDocument()
    expect(screen.getByLabelText('Palabra de cinco letras')).toBeEnabled()
  })

  it('actualiza el intervalo y permite ganar', () => {
    renderPrototype()

    submit('radio')

    expect(screen.getByLabelText('1 de 10 intentos usados')).toBeInTheDocument()
    expect(screen.getByLabelText('Límite superior: RADIO')).toBeInTheDocument()
    const mango = GAME_DICTIONARY.entriesByInputKey.mango
    const radio = GAME_DICTIONARY.entriesByInputKey.radio

    if (!mango || !radio) throw new Error('Faltan palabras necesarias para la prueba.')

    const distance = getDistancePercent(
      Math.abs(mango.sortRank - radio.sortRank),
      GAME_DICTIONARY.entries.length,
    )
    expect(screen.getByText(formatDistancePercentage(distance))).toBeInTheDocument()

    submit('mango')

    expect(screen.getByRole('status')).toHaveTextContent('¡Ganaste!')
    expect(screen.getByLabelText('2 de 10 intentos usados')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Probar' })).toBeDisabled()
  })

  it('advierte una palabra fuera del intervalo y no gasta otro intento', () => {
    renderPrototype()

    submit('radio')
    const input = screen.getByLabelText('Palabra de cinco letras')
    fireEvent.change(input, { target: { value: 'zorro' } })

    expect(input).toHaveValue('zorro')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Palabra fuera de rango')

    fireEvent.click(screen.getByRole('button', { name: 'Probar' }))

    expect(input).toHaveValue('zorro')
    expect(screen.getByRole('status')).toHaveTextContent('Palabra fuera de rango')
    expect(screen.getByLabelText('1 de 10 intentos usados')).toBeInTheDocument()
  })

  it('marca las letras que salen del intervalo, pero permite usarlas', () => {
    renderPrototype()
    submit('radio')

    expect(screen.getByRole('button', { name: 'Letra A' })).toBeEnabled()
    const zKey = screen.getByRole('button', { name: 'Letra Z, fuera del rango actual' })
    expect(zKey).toBeEnabled()
    expect(zKey).toHaveClass('key-range-blocked')

    fireEvent.click(screen.getByRole('button', { name: 'Letra R' }))

    const input = screen.getByLabelText('Palabra de cinco letras')
    expect(input).toHaveValue('r')
    expect(screen.getByRole('button', { name: 'Letra A' })).toBeEnabled()
    const bKey = screen.getByRole('button', { name: 'Letra B, fuera del rango actual' })
    expect(bKey).toBeEnabled()

    fireEvent.click(bKey)
    expect(input).toHaveValue('rb')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Palabra fuera de rango')
  })

  it('permite cambiar y conservar la paleta y el modo', () => {
    renderPrototype()

    fireEvent.click(screen.getByRole('button', { name: 'Paleta B' }))
    fireEvent.click(screen.getByRole('button', { name: 'Modo oscuro' }))

    expect(document.documentElement.dataset.palette).toBe('b')
    expect(document.documentElement.dataset.mode).toBe('dark')
    expect(window.localStorage.getItem('entrele:palette')).toBe('b')
    expect(window.localStorage.getItem('entrele:mode')).toBe('dark')
  })
})
