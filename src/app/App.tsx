import DailyGame from '../features/game/DailyGame'
import ThemeSettings from '../features/theme/ThemeSettings'
import { useTheme } from '../theme/useTheme'

type AppProps = Readonly<{
  now?: Date
}>

export default function App({ now }: AppProps) {
  const { palette, setPalette, modePreference, setModePreference } = useTheme()

  return (
    <main className="game-page">
      <div className="game-shell">
        <header className="game-header">
          <h1 className="game-title">ENTRELE</h1>
        </header>

        <DailyGame
          now={now}
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
