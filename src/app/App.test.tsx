import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App', () => {
  const prototypeDate = new Date('2026-01-01T12:00:00Z')

  function renderPrototype() {
    render(<App now={prototypeDate} />)
  }

  function submit(word: string) {
    fireEvent.change(screen.getByLabelText('Palabra de cinco letras'), {
      target: { value: word },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Probar' }))
  }

  it('muestra una partida técnica con el rango completo', () => {
    renderPrototype()

    expect(screen.getByRole('heading', { name: 'ENTRELE' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Partida técnica' })).toBeInTheDocument()
    expect(screen.getByText('Intentos: 0 de 10')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Distancia porcentual' })).toBeInTheDocument()
  })

  it('actualiza el intervalo y permite ganar', () => {
    renderPrototype()

    submit('radio')

    expect(screen.getByRole('status')).toHaveTextContent('La respuesta está antes de radio.')
    expect(screen.getByText('Intentos: 1 de 10')).toBeInTheDocument()
    expect(
      screen.getByText('La distancia equivale a 25% del diccionario completo.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('La respuesta está más cerca de radio, el límite superior.'),
    ).toBeInTheDocument()

    submit('mango')

    expect(screen.getByRole('status')).toHaveTextContent('Encontraste mango.')
    expect(screen.getByText('Partida resuelta en 2 intentos.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Probar' })).toBeDisabled()
  })

  it('bloquea palabras fuera del intervalo sin gastar otro intento', () => {
    renderPrototype()

    submit('radio')
    submit('zorro')

    expect(screen.getByRole('status')).toHaveTextContent(
      'Esa palabra ya quedó fuera del intervalo. No perdiste un intento.',
    )
    expect(screen.getByText('Intentos: 1 de 10')).toBeInTheDocument()
  })
})
