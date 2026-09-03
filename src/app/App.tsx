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
          <span aria-hidden="true" />
          <h1 className="game-title">ENTRELE</h1>
          <ThemeSettings
            palette={palette}
            onPaletteChange={setPalette}
            mode={modePreference}
            onModeChange={setModePreference}
          />
        </header>

        <DailyGame now={now} />
      </div>
    </main>
  )
}
