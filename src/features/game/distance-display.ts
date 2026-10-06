const TRACK_TOP_PERCENT = 14
const TRACK_BOTTOM_PERCENT = 86

export function getDistanceMarkerPosition(answerPositionPercent: number): number {
  const boundedPosition = Math.max(0, Math.min(100, answerPositionPercent))
  const trackLength = TRACK_BOTTOM_PERCENT - TRACK_TOP_PERCENT

  return TRACK_TOP_PERCENT + (boundedPosition / 100) * trackLength
}

export function formatDistancePercentage(percentage: number): string {
  const boundedPercentage = Math.max(0, Math.min(100, percentage))

  if (boundedPercentage > 0 && boundedPercentage < 1) {
    const rounded = Number(boundedPercentage.toFixed(2))
    return rounded === 0 ? '<0.01%' : `${formatDecimal(rounded, 2)}%`
  }

  if (boundedPercentage < 5) {
    return `${formatDecimal(boundedPercentage, 1)}%`
  }

  return `${Math.round(boundedPercentage)}%`
}

function formatDecimal(value: number, maximumDecimals: number): string {
  return value.toFixed(maximumDecimals).replace(/\.?0+$/u, '')
}
