import DailyGame from '../features/game/DailyGame'
import type { RNG } from '../game/training'
import ThemeSettings from '../features/theme/ThemeSettings'
import { useTheme } from '../theme/useTheme'

type AppProps = Readonly<{
  now?: Date
  trainingRng?: RNG
}>

export default function App({ now, trainingRng }: AppProps) {
  const { palette, setPalette, modePreference, setModePreference } = useTheme()

  return (
    <main className="game-page">
      <div className="game-shell">
        <header className="game-header">
          <h1 className="game-title">ENTRELE</h1>
        </header>

        <DailyGame
          now={now}
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
