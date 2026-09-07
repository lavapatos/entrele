import { act, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import CowMascot from './CowMascot'

describe('CowMascot', () => {
  it('programa parpadeos irregulares mientras la vaquita neutral está montada', () => {
    vi.useFakeTimers()
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5)

    try {
      const { container, unmount } = render(<CowMascot mood="neutral" />)
      const firstBlink = container.querySelector('.cow-eyes-neutral-motion')

      act(() => vi.advanceTimersByTime(7_000))

      expect(container.querySelector('.cow-eyes-neutral-motion')).not.toBe(firstBlink)

      unmount()
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      random.mockRestore()
      vi.useRealTimers()
    }
  })
})
