import { MagicWand } from '@phosphor-icons/react'
import { useState } from 'react'

import AppDialog from '../../components/AppDialog'
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
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className="tool-button"
        type="button"
        aria-label="Cambiar tema"
        onClick={() => setOpen(true)}
      >
        <MagicWand size={22} weight="regular" aria-hidden="true" />
      </button>

      <AppDialog open={open} title="Tema" onClose={() => setOpen(false)}>
        <div className="theme-controls">
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
      </AppDialog>
    </>
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
