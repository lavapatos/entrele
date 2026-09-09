export type StorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function getBrowserStorage(): StorageAdapter | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}
