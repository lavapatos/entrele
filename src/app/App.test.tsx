import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App', () => {
  it('muestra el skeleton de la Fase 1', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'ENTRELE' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Estado: prototipo')
  })
})
