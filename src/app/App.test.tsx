import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    return render(<App now={prototypeDate} />)
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
    vi.useFakeTimers()

    try {
      renderPrototype()

      submit('radio')

      expect(screen.getByLabelText('1 de 10 intentos usados')).toBeInTheDocument()
      const updatedUpperBound = screen.getByLabelText('Límite superior: RADIO')
      expect(updatedUpperBound).toHaveClass('bound-row-updated', 'bound-row-superior')
      expect(updatedUpperBound.querySelectorAll('.bound-letter')).toHaveLength(5)
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
      expect(screen.getByLabelText('Palabra de cinco letras')).toHaveValue('mango')
      expect(document.querySelector('.guess-row')).toHaveClass('guess-row-correct')
      expect(screen.queryByRole('dialog', { name: 'Ganaste' })).not.toBeInTheDocument()

      act(() => vi.advanceTimersByTime(1100))

      expect(screen.getByRole('dialog', { name: 'Ganaste' })).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'Vaquita feliz' })).toBeInTheDocument()
      expect(document.querySelector('.cow-victory-sparkles')).toBeInTheDocument()
      expect(screen.getByText('MANGO')).toBeInTheDocument()
      expect(screen.getByText('2 intentos')).toBeInTheDocument()
      expect(screen.getByLabelText('2 de 10 intentos usados')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Probar' })).toBeDisabled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('registra una victoria diaria una sola vez y la conserva al recargar', () => {
    vi.useFakeTimers()

    try {
      const firstRender = renderPrototype()

      submit('mango')
      act(() => vi.advanceTimersByTime(1100))
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
      fireEvent.click(screen.getByRole('button', { name: 'Estadísticas' }))

      expect(screen.getByRole('dialog', { name: 'Estadísticas' })).toBeInTheDocument()
      expect(screen.getByLabelText('Jugadas: 1')).toBeInTheDocument()
      expect(screen.getByLabelText('Ganadas: 1')).toBeInTheDocument()
      expect(screen.getByLabelText('Acierto: 100%')).toBeInTheDocument()
      expect(screen.getByLabelText('Racha: 1')).toBeInTheDocument()
      expect(screen.getByLabelText('Mejor: 1')).toBeInTheDocument()
      firstRender.unmount()

      renderPrototype()
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
      fireEvent.click(screen.getByRole('button', { name: 'Estadísticas' }))

      expect(screen.getByLabelText('Jugadas: 1')).toBeInTheDocument()
      expect(screen.getByLabelText('Ganadas: 1')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
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
    expect(document.querySelector('.guess-row')).toHaveClass('guess-row-rejected')
    expect(screen.getByRole('status')).toHaveTextContent('Palabra fuera de rango')
    expect(screen.getByLabelText('1 de 10 intentos usados')).toBeInTheDocument()
  })

  it('reanuda la partida y el borrador al recargar el mismo día', () => {
    const firstRender = renderPrototype()

    submit('radio')
    fireEvent.change(screen.getByLabelText('Palabra de cinco letras'), {
      target: { value: 'ma' },
    })
    firstRender.unmount()

    renderPrototype()

    expect(screen.getByLabelText('1 de 10 intentos usados')).toBeInTheDocument()
    expect(screen.getByLabelText('Límite superior: RADIO')).toBeInTheDocument()
    expect(screen.getByLabelText('Palabra de cinco letras')).toHaveValue('ma')
  })

  it('cambia automáticamente a la partida del día siguiente', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-02T02:59:30Z'))

    try {
      render(<App />)
      submit('radio')

      expect(screen.getByLabelText('1 de 10 intentos usados')).toBeInTheDocument()

      act(() => vi.advanceTimersByTime(60_000))

      expect(screen.getByLabelText('0 de 10 intentos usados')).toBeInTheDocument()
      expect(screen.getByLabelText('Límite inferior: AAAAA')).toBeInTheDocument()
      expect(screen.getByLabelText('Límite superior: ZZZZZ')).toBeInTheDocument()
      expect(screen.getByLabelText('Palabra de cinco letras')).toHaveValue('')
    } finally {
      vi.useRealTimers()
    }
  })

  it('permite practicar sin alterar la partida diaria', () => {
    vi.useFakeTimers()

    try {
      render(<App now={prototypeDate} trainingRng={() => 0} />)
      submit('radio')
      fireEvent.change(screen.getByLabelText('Palabra de cinco letras'), {
        target: { value: 'ma' },
      })

      fireEvent.click(screen.getByRole('button', { name: 'Cómo jugar' }))
      fireEvent.click(screen.getByRole('button', { name: 'Practicar' }))

      expect(screen.queryByRole('dialog', { name: 'Cómo jugar' })).not.toBeInTheDocument()
      expect(screen.getByLabelText('Modo práctica')).toBeInTheDocument()
      expect(screen.getByLabelText('0 de 10 intentos usados')).toBeInTheDocument()

      submit('maria')
      act(() => vi.advanceTimersByTime(1100))

      expect(screen.getByRole('dialog', { name: 'Ganaste' })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Otra palabra' }))
      expect(screen.queryByRole('dialog', { name: 'Ganaste' })).not.toBeInTheDocument()
      expect(screen.getByLabelText('0 de 10 intentos usados')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Volver a diaria' }))

      expect(screen.queryByLabelText('Modo práctica')).not.toBeInTheDocument()
      expect(screen.getByLabelText('1 de 10 intentos usados')).toBeInTheDocument()
      expect(screen.getByLabelText('Límite superior: RADIO')).toBeInTheDocument()
      expect(screen.getByLabelText('Palabra de cinco letras')).toHaveValue('ma')

      fireEvent.click(screen.getByRole('button', { name: 'Estadísticas' }))
      expect(screen.getByLabelText('Jugadas: 0')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('muestra una sola vez el personaje de papas tras un intento a menos del uno por ciento', () => {
    vi.useFakeTimers()

    try {
      renderPrototype()

      const answer = GAME_DICTIONARY.entriesByInputKey.mango
      if (!answer) throw new Error('Falta la respuesta necesaria para la prueba.')

      const guessBefore = GAME_DICTIONARY.entries[answer.sortRank - 1]
      const guessAfter = GAME_DICTIONARY.entries[answer.sortRank + 1]
      if (!guessBefore || !guessAfter) {
        throw new Error('Faltan palabras cercanas necesarias para la prueba.')
      }

      submit(guessBefore.inputKey)
      expect(document.querySelector('.fries-cameo')).toBeInTheDocument()

      act(() => vi.advanceTimersByTime(1200))
      expect(document.querySelector('.fries-cameo')).not.toBeInTheDocument()

      submit(guessAfter.inputKey)
      expect(document.querySelector('.fries-cameo')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('muestra el personaje de papas al aceptar PAPAS', () => {
    vi.useFakeTimers()

    try {
      renderPrototype()

      submit('papas')

      expect(document.querySelector('.fries-cameo')).toBeInTheDocument()
      expect(screen.getByLabelText('1 de 10 intentos usados')).toBeInTheDocument()

      act(() => vi.advanceTimersByTime(1200))
      expect(document.querySelector('.fries-cameo')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('muestra la respuesta al terminar sin intentos', () => {
    renderPrototype()

    const answer = GAME_DICTIONARY.entriesByInputKey.mango
    if (!answer) throw new Error('Falta la respuesta necesaria para la prueba.')

    const losingGuesses = GAME_DICTIONARY.entries.slice(answer.sortRank - 10, answer.sortRank)
    losingGuesses.forEach((guess) => submit(guess.inputKey))

    expect(screen.getByRole('dialog', { name: 'La palabra era' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Vaquita frustrada' })).toBeInTheDocument()
    expect(document.querySelector('.cow-victory-sparkles')).not.toBeInTheDocument()
    expect(screen.getByText('MANGO')).toBeInTheDocument()
    expect(screen.getByText('10 intentos')).toBeInTheDocument()
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

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar tema' }))
    expect(screen.getByRole('dialog', { name: 'Tema' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Paleta B' }))
    fireEvent.click(screen.getByRole('button', { name: 'Modo oscuro' }))

    expect(document.documentElement.dataset.palette).toBe('b')
    expect(document.documentElement.dataset.mode).toBe('dark')
    expect(window.localStorage.getItem('entrele:palette')).toBe('b')
    expect(window.localStorage.getItem('entrele:mode')).toBe('dark')
  })

  it('abre la ayuda y muestra estadísticas históricas', () => {
    renderPrototype()

    fireEvent.click(screen.getByRole('button', { name: 'Cómo jugar' }))
    expect(screen.getByRole('dialog', { name: 'Cómo jugar' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Vaquita' })).toBeInTheDocument()
    const helpDemo = document.querySelector('.help-demo')
    expect(helpDemo).toBeInTheDocument()
    expect(helpDemo?.querySelectorAll('.help-demo-word')).toHaveLength(5)
    expect(helpDemo?.querySelectorAll('.help-demo-attempt')).toHaveLength(3)
    expect(helpDemo?.querySelector('.help-demo-word-before')).toHaveTextContent('MARÍA')
    expect(helpDemo?.querySelector('.help-demo-word-after')).toHaveTextContent('PAPAS')
    expect(helpDemo?.querySelector('.help-demo-word-outside')).toHaveTextContent('ZORRO')
    expect(screen.getByText('Escribe una palabra de cinco letras.')).toBeInTheDocument()
    expect(screen.getByText(/según el orden alfabético/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    submit('radio')
    fireEvent.click(screen.getByRole('button', { name: 'Estadísticas' }))

    expect(screen.getByRole('dialog', { name: 'Estadísticas' })).toBeInTheDocument()
    expect(screen.getByLabelText('Jugadas: 0')).toBeInTheDocument()
    expect(screen.getByLabelText('Ganadas: 0')).toBeInTheDocument()
    expect(screen.getByLabelText(/Distribución de victorias por intentos/)).toBeInTheDocument()
  })
})
