// Area formatting and GPS geometry for plots and walked boundaries.

export const hasLocation = (plot) => Number.isFinite(plot.latitude) && Number.isFinite(plot.longitude)

export function formatLandNote(plot, areaUnit, squareFeetPerKatha) {
  if (!plot.areaValues?.length) return plot.noteText || 'No area note provided.'
  const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })
  if (areaUnit !== 'katha' && !(squareFeetPerKatha > 0)) {
    return ['Set the local katha size in Farm profile to convert.', plot.noteText].filter(Boolean).join(' ')
  }
  const amounts = plot.areaValues.map((value) => {
    if (areaUnit === 'katha') return `${number.format(value)} katha`
    const squareFeet = value * squareFeetPerKatha
    if (areaUnit === 'acre') return `${number.format(squareFeet / 43_560)} acre${squareFeet / 43_560 === 1 ? '' : 's'}`
    if (areaUnit === 'hectare') return `${number.format(squareFeet / 107_639.104)} ha`
    return `${number.format(squareFeet / 9)} gaj`
  })
  const areaText = amounts.length > 1 || !plot.areaTotalConfirmed
    ? `${amounts.join(' + ')}${plot.areaTotalConfirmed ? '' : ' (total not confirmed)'}`
    : `${amounts[0]}${plot.areaTotalConfirmed ? ' total' : ''}`
  return [areaText, plot.noteText].filter(Boolean).join('. ')
}

export function metersBetween(first, second) {
  const radians = (degrees) => degrees * Math.PI / 180
  const latitudeDelta = radians(second.latitude - first.latitude)
  const longitudeDelta = radians(second.longitude - first.longitude)
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude)) * Math.sin(longitudeDelta / 2) ** 2
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function polygonAreaSquareMeters(points) {
  if (points.length < 3) return 0
  const meanLatitude = points.reduce((sum, point) => sum + point.latitude, 0) / points.length * Math.PI / 180
  const projected = points.map((point) => ({
    x: 6_371_000 * point.longitude * Math.PI / 180 * Math.cos(meanLatitude),
    y: 6_371_000 * point.latitude * Math.PI / 180,
  }))
  let twiceArea = 0
  projected.forEach((point, index) => {
    const next = projected[(index + 1) % projected.length]
    twiceArea += point.x * next.y - next.x * point.y
  })
  return Math.abs(twiceArea) / 2
}

export function formatWalkedArea(squareMeters, areaUnit, squareFeetPerKatha) {
  const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })
  if (areaUnit === 'katha') {
    if (!(squareFeetPerKatha > 0)) return `${number.format(squareMeters)} m² (set katha size to convert)`
    return `${number.format(squareMeters * 10.7639104 / squareFeetPerKatha)} katha`
  }
  if (areaUnit === 'acre') return `${number.format(squareMeters / 4046.8564224)} acres`
  if (areaUnit === 'hectare') return `${number.format(squareMeters / 10_000)} ha`
  return `${number.format(squareMeters / 8.3612736)} gaj`
}
