// One list of every crop, plus filters by region and season.
import { cropCatalog } from './catalog.js'
import { categories, moreCrops } from './allCrops.js'

export { categories }

export const everyCrop = [...cropCatalog.map((crop) => ({ ...crop, group: 'core', days: null })), ...moreCrops]
  .sort((a, b) => categories.findIndex((c) => c.id === a.category) - categories.findIndex((c) => c.id === b.category))

export const findCrop = (id) => everyCrop.find((crop) => crop.id === id)

export const regions = [
  { id: 'north', label: 'North', states: ['Punjab', 'Haryana', 'Uttar Pradesh', 'Delhi', 'Uttarakhand', 'Himachal Pradesh', 'Jammu and Kashmir', 'Ladakh'] },
  { id: 'east', label: 'East', states: ['Bihar', 'West Bengal', 'Odisha', 'Jharkhand'] },
  { id: 'northeast', label: 'North-east', states: ['Assam', 'Meghalaya', 'Manipur', 'Nagaland', 'Mizoram', 'Tripura', 'Arunachal Pradesh', 'Sikkim', 'North-east'] },
  { id: 'west', label: 'West', states: ['Rajasthan', 'Gujarat', 'Maharashtra', 'Goa'] },
  { id: 'central', label: 'Central', states: ['Madhya Pradesh', 'Chhattisgarh'] },
  { id: 'south', label: 'South', states: ['Karnataka', 'Kerala', 'Tamil Nadu', 'Andhra Pradesh', 'Telangana'] },
  { id: 'hills', label: 'Hills', states: ['Himachal Pradesh', 'Uttarakhand', 'Jammu and Kashmir', 'Ladakh', 'Sikkim', 'Darjeeling', 'Arunachal Pradesh'] },
]

export function regionsOf(crop) {
  return regions.filter((region) => region.states.some((state) => crop.regions.includes(state))).map((region) => region.id)
}

export const seasons = [
  { id: 'rabi', label: 'Rabi (winter)', test: (crop) => /rabi|winter|autumn/i.test(crop.season) },
  { id: 'kharif', label: 'Kharif (monsoon)', test: (crop) => /kharif|monsoon/i.test(crop.season) },
  { id: 'zaid', label: 'Summer (zaid)', test: (crop) => /summer|zaid|spring/i.test(crop.season) },
  { id: 'perennial', label: 'Perennial', test: (crop) => crop.days === null || /perennial|year-round|months|crop$/i.test(crop.season) },
]

// Stage list for the timeline: catalogue stages for the original crops, model stages otherwise.
// Annual crops without months get "Day N" from their duration.
export function stagesFor(crop, modelStages) {
  const source = crop.stages || modelStages || [[0, 'Early growth'], [0.5, 'Mid season'], [0.9, 'Harvest']]
  return source.map(([at, name, when]) => [at, name, when || (crop.days ? `Day ${Math.round(at * crop.days)}` : '')])
}

export function stageAtList(stages, growth) {
  let current = stages[0]
  for (const stage of stages) if (growth >= stage[0] - 1e-6) current = stage
  return { name: current[1], when: current[2] }
}
