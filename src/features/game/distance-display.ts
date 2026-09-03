const TRACK_TOP_PERCENT = 14
const TRACK_BOTTOM_PERCENT = 86
const MINIMUM_NONZERO_PROGRESS = 0.2
const CURVE_STRENGTH = 99

export function getDistanceMarkerPosition(percentage: number): number {
  const boundedPercentage = Math.max(0, Math.min(100, percentage))

  if (boundedPercentage === 0) return TRACK_BOTTOM_PERCENT

  const normalizedPercentage = boundedPercentage / 100
  const curvedProgress =
    Math.log1p(CURVE_STRENGTH * normalizedPercentage) / Math.log1p(CURVE_STRENGTH)
  const visibleProgress = MINIMUM_NONZERO_PROGRESS + (1 - MINIMUM_NONZERO_PROGRESS) * curvedProgress

  return TRACK_BOTTOM_PERCENT - visibleProgress * (TRACK_BOTTOM_PERCENT - TRACK_TOP_PERCENT)
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
