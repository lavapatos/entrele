import type { ThemeModePreference, ThemePalette } from '../../theme/useTheme'

type ThemeSettingsProps = Readonly<{
  palette: ThemePalette
  onPaletteChange: (palette: ThemePalette) => void
  mode: ThemeModePreference
  onModeChange: (mode: ThemeModePreference) => void
}>

export default function ThemeSettings({
  palette,
  onPaletteChange,
  mode,
  onModeChange,
}: ThemeSettingsProps) {
  return (
    <details className="theme-settings">
      <summary className="theme-trigger">Tema</summary>
      <div className="theme-menu">
        <fieldset className="theme-fieldset">
          <legend>Paleta</legend>
          <div className="theme-options">
            <ThemeOption
              active={palette === 'a'}
              label="A"
              accessibleLabel="Paleta A"
              onSelect={() => onPaletteChange('a')}
            />
            <ThemeOption
              active={palette === 'b'}
              label="B"
              accessibleLabel="Paleta B"
              onSelect={() => onPaletteChange('b')}
            />
          </div>
        </fieldset>

        <fieldset className="theme-fieldset">
          <legend>Modo</legend>
          <div className="theme-options theme-options-wide">
            <ThemeOption
              active={mode === 'system'}
              label="Sistema"
              accessibleLabel="Usar modo del sistema"
              onSelect={() => onModeChange('system')}
            />
            <ThemeOption
              active={mode === 'light'}
              label="Claro"
              accessibleLabel="Modo claro"
              onSelect={() => onModeChange('light')}
            />
            <ThemeOption
              active={mode === 'dark'}
              label="Oscuro"
              accessibleLabel="Modo oscuro"
              onSelect={() => onModeChange('dark')}
            />
          </div>
        </fieldset>
      </div>
    </details>
  )
}

function ThemeOption({
  active,
  label,
  accessibleLabel,
  onSelect,
}: Readonly<{
  active: boolean
  label: string
  accessibleLabel: string
  onSelect: () => void
}>) {
  return (
    <button
      type="button"
      className="theme-option"
      aria-label={accessibleLabel}
      aria-pressed={active}
      onClick={onSelect}
    >
      {label}
    </button>
  )
}
