// What a piece of land is used for. Shared by the plot forms, the plot list and the map.

export const landUses = [
  { id: 'farm', label: 'Farmland', local: 'खेत', localLatin: 'khet', color: '#4f8a33', fill: '#78b94b' },
  { id: 'fallow', label: 'Empty or fallow', local: 'परती', localLatin: 'parti, khali', color: '#8a6a3e', fill: '#c8a878', dashed: true },
  { id: 'pond', label: 'Pond', local: 'पोखर', localLatin: 'pokhar, talab', color: '#1f6f9f', fill: '#4aa3d6' },
  { id: 'orchard', label: 'Orchard', local: 'बगीचा', localLatin: 'bagicha', color: '#1E4630', fill: '#3f7a46' },
  { id: 'bamboo', label: 'Bamboo', local: 'बँसवारी', localLatin: 'bansbari', color: '#5f7a22', fill: '#a3b85a' },
  { id: 'homestead', label: 'House and yard', local: 'घर-आँगन', localLatin: 'ghar', color: '#8C1D18', fill: '#d9826a' },
  { id: 'other', label: 'Other', local: 'अन्य', localLatin: 'anya', color: '#5a5a5a', fill: '#b5b5b5' },
]

const unsetLandUse = { id: '', label: 'Not set yet', local: '', localLatin: '', color: '#6b6b6b', fill: '#cfcfcf', dashed: true }

export const pondWater = [
  { id: 'year-round', label: 'Water all year' },
  { id: 'seasonal', label: 'Dries in summer' },
  { id: 'dry', label: 'Mostly dry now' },
]

export const pondUses = [
  { id: 'fish', label: 'Fish (machhli)' },
  { id: 'makhana', label: 'Makhana' },
  { id: 'singhara', label: 'Singhara' },
  { id: 'irrigation', label: 'Irrigation' },
  { id: 'cattle', label: 'Cattle and washing' },
]

export function landUseOf(plot) {
  return landUses.find((use) => use.id === plot?.landUse) || unsetLandUse
}

export function describeLandUse(plot) {
  const use = landUseOf(plot)
  if (use.id !== 'pond' || !plot.pond) return use.label
  const water = pondWater.find((entry) => entry.id === plot.pond.water)?.label
  const uses = (plot.pond.uses || []).map((id) => pondUses.find((entry) => entry.id === id)?.label.replace(/ \(.*\)/, '')).filter(Boolean)
  return [use.label, water && water.toLowerCase(), uses.length && `used for ${uses.join(', ').toLowerCase()}`].filter(Boolean).join(', ')
}
