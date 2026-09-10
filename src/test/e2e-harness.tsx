import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '../app/App'
import '../styles/globals.css'
import { FakePrivateGameGateway } from './fake-private-game-gateway'

const rootElement = document.getElementById('root')

if (!rootElement) throw new Error('No se encontró el elemento raíz del harness E2E.')

const searchParams = new URLSearchParams(window.location.search)
const gateway = new FakePrivateGameGateway({
  signedIn: searchParams.get('auth') !== 'out',
  answer: 'mango',
  dateKey: '2026-01-01',
})

createRoot(rootElement).render(
  <StrictMode>
    <App
      now={new Date('2026-01-01T15:00:00.000Z')}
      privateGateway={gateway}
      trainingRng={() => 0}
    />
  </StrictMode>,
)
