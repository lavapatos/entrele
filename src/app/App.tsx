import { useMemo } from 'react'

import DailyGame from '../features/game/DailyGame'
import ThemeSettings from '../features/theme/ThemeSettings'
import type { RNG } from '../game/training'
import { createSupabasePrivateGameGateway } from '../private-access/supabase-gateway'
import type { PrivateGameGateway } from '../private-access/types'
import { useTheme } from '../theme/useTheme'

type AppProps = Readonly<{
  now?: Date
  privateGateway?: PrivateGameGateway | null
  trainingRng?: RNG
}>

export default function App({ now, privateGateway, trainingRng }: AppProps) {
  const { palette, setPalette, modePreference, setModePreference } = useTheme()
  const resolvedPrivateGateway = useMemo(
    () => (privateGateway === undefined ? createSupabasePrivateGameGateway() : privateGateway),
    [privateGateway],
  )

  return (
    <main className="game-page">
      <div className="game-shell">
        <header className="game-header">
          <h1 className="game-title">ENTRELE</h1>
        </header>

        <DailyGame
          now={now}
          privateGateway={resolvedPrivateGateway}
          trainingRng={trainingRng}
          themeControl={
            <ThemeSettings
              palette={palette}
              onPaletteChange={setPalette}
              mode={modePreference}
              onModeChange={setModePreference}
            />
          }
        />
      </div>
    </main>
  )
}
