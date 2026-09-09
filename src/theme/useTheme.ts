import { useEffect, useState } from 'react'

export type ThemePalette = 'a' | 'b'
export type ThemeModePreference = 'system' | 'light' | 'dark'
export type ResolvedThemeMode = Exclude<ThemeModePreference, 'system'>

const PALETTE_STORAGE_KEY = 'entrele:palette'
const MODE_STORAGE_KEY = 'entrele:mode'

export function useTheme() {
  const [palette, setPalette] = useState<ThemePalette>(() => readPalette())
  const [modePreference, setModePreference] = useState<ThemeModePreference>(() => readMode())
  const [systemMode, setSystemMode] = useState<ResolvedThemeMode>(() => getSystemMode())
  const resolvedMode = modePreference === 'system' ? systemMode : modePreference

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemMode(event.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.palette = palette
    document.documentElement.dataset.mode = resolvedMode
    document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', getThemeColor(palette, resolvedMode))
    writePreference(PALETTE_STORAGE_KEY, palette)
    writePreference(MODE_STORAGE_KEY, modePreference)
  }, [modePreference, palette, resolvedMode])

  return {
    palette,
    setPalette,
    modePreference,
    setModePreference,
    resolvedMode,
  } as const
}

function readPalette(): ThemePalette {
  const stored = readPreference(PALETTE_STORAGE_KEY)
  return stored === 'b' ? 'b' : 'a'
}

function readMode(): ThemeModePreference {
  const stored = readPreference(MODE_STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

function getSystemMode(): ResolvedThemeMode {
  if (typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getThemeColor(palette: ThemePalette, mode: ResolvedThemeMode): string {
  if (mode === 'dark') return palette === 'b' ? '#211d1d' : '#161c1f'
  return palette === 'b' ? '#fbf1f3' : '#fbfaf6'
}

function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writePreference(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // The current choice still works when storage is unavailable.
  }
}
