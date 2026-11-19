// Crop catalogue for the 3D field gallery, written for farmers anywhere in India.
// Stage months are typical for the north Indian plains; the south and west often
// run earlier or longer, and every variety and district differs.

export const cropCatalog = [
  {
    id: 'wheat', category: 'cereal', name: 'Wheat', local: 'गेहूँ', localLatin: 'Gehun', group: 'field', season: 'Rabi', window: 'November to April',
    regions: 'Uttar Pradesh, Punjab, Madhya Pradesh, Haryana, Rajasthan, Bihar',
    about: 'India’s main winter grain, often sown right after the paddy harvest. The field turns from green to gold as the grain fills in March.',
    stages: [[0, 'Sowing', 'Nov'], [0.12, 'Tillering', 'Dec'], [0.34, 'Jointing', 'Jan'], [0.5, 'Heading', 'Feb'], [0.66, 'Grain filling', 'Mar'], [0.88, 'Ready to harvest', 'Apr']],
  },
  {
    id: 'rice', category: 'cereal', name: 'Paddy', local: 'धान', localLatin: 'Dhaan', group: 'field', season: 'Kharif', window: 'June–July to November',
    regions: 'West Bengal, Uttar Pradesh, Punjab, Andhra Pradesh, Odisha, Tamil Nadu, Chhattisgarh, Bihar',
    about: 'Transplanted into flooded, puddled fields with the monsoon. Water is drained as the panicles bend and turn gold. Some states also grow a second (rabi or boro) crop.',
    stages: [[0, 'Transplanting', 'Jul'], [0.16, 'Tillering', 'Aug'], [0.42, 'Panicles emerge', 'Sep'], [0.58, 'Flowering', 'Sep'], [0.72, 'Ripening', 'Oct'], [0.9, 'Ready to harvest', 'Nov']],
  },
  {
    id: 'maize', category: 'cereal', name: 'Maize', local: 'मक्का', localLatin: 'Makka', group: 'field', season: 'Kharif and rabi', window: 'About 4 months',
    regions: 'Karnataka, Madhya Pradesh, Maharashtra, Rajasthan, Bihar, Telangana',
    about: 'Grown in kharif across most of India and as a rabi crop in Bihar and the south. Tassels open at the top, silks catch the pollen, and cobs are picked once the husk dries.',
    stages: [[0, 'Sowing', 'Day 0'], [0.16, 'Knee-high', 'Day 30'], [0.48, 'Tasselling', 'Day 55'], [0.58, 'Silking', 'Day 60'], [0.72, 'Grain filling', 'Day 80'], [0.9, 'Dry and ready', 'Day 110']],
  },
  {
    id: 'mustard', category: 'oilseed', name: 'Mustard', local: 'सरसों', localLatin: 'Sarson', group: 'field', season: 'Rabi', window: 'October to March',
    regions: 'Rajasthan, Haryana, Madhya Pradesh, Uttar Pradesh, West Bengal',
    about: 'The winter oilseed of the north and east. Fields flower bright yellow in December and January; thin pods follow and dry to brown before harvest.',
    stages: [[0, 'Sowing', 'Oct'], [0.14, 'Rosette', 'Nov'], [0.32, 'Bolting', 'Nov'], [0.46, 'Flowering', 'Dec'], [0.7, 'Pod filling', 'Jan'], [0.9, 'Ready to harvest', 'Mar']],
  },
  {
    id: 'sugarcane', category: 'cash', name: 'Sugarcane', local: 'गन्ना', localLatin: 'Ganna', group: 'field', season: 'Spring planted', window: '10 to 18 months',
    regions: 'Uttar Pradesh, Maharashtra, Karnataka, Tamil Nadu, Gujarat, Bihar',
    about: 'Planted from cane cuttings. In the north it is a 10 to 12 month crop crushed from November; in Maharashtra and the south it can stand 12 to 18 months.',
    stages: [[0, 'Planting', 'Feb'], [0.14, 'Tillering', 'Apr'], [0.36, 'Grand growth', 'Jul'], [0.72, 'Maturing', 'Oct'], [0.9, 'Ready to crush', 'Dec']],
  },
  {
    id: 'banana', category: 'fruit', name: 'Banana', local: 'केला', localLatin: 'Kela', group: 'orchard', season: 'Planted year-round', window: '11 to 13 months',
    regions: 'Andhra Pradesh, Maharashtra (Jalgaon), Gujarat, Tamil Nadu, Karnataka, Bihar',
    about: 'Grown from suckers or tissue-culture plants. A bunch pushes out of the crown after about eight months and is cut while still green.',
    stages: [[0, 'Planting', 'Month 0'], [0.2, 'Leafy growth', 'Month 3'], [0.58, 'Bunch emerges', 'Month 8'], [0.72, 'Bunch filling', 'Month 9'], [0.92, 'Ready to cut', 'Month 12']],
  },
  {
    id: 'mango', category: 'fruit', name: 'Mango', local: 'आम', localLatin: 'Aam', group: 'orchard', season: 'Summer fruit', window: 'Bloom Jan–Mar, ripe Apr–Jul',
    regions: 'Uttar Pradesh, Andhra Pradesh, Karnataka, Bihar, Gujarat, Maharashtra',
    about: 'Every region has its favourite: Alphonso in Ratnagiri, Kesar in Gujarat, Banganapalli in Andhra, Dasheri and Langra in the north. Trees flower (manjar) in late winter; southern fruit ripens first.',
    stages: [[0, 'Manjar (flowering)', 'Feb'], [0.24, 'Fruit set', 'Mar'], [0.42, 'Fruit growth', 'Apr'], [0.66, 'Maturing', 'May'], [0.84, 'Ripe', 'Jun']],
  },
  {
    id: 'litchi', category: 'fruit', name: 'Litchi', local: 'लीची', localLatin: 'Litchi', group: 'orchard', season: 'Summer fruit', window: 'Bloom Feb–Mar, ripe May–Jun',
    regions: 'Bihar (Muzaffarpur), West Bengal, Jharkhand, Uttarakhand, Punjab',
    about: 'Bihar grows the largest share of India’s litchi, and Shahi litchi carries a GI tag. The fruit turns from green to deep red within a few weeks before picking.',
    stages: [[0, 'Flowering', 'Mar'], [0.24, 'Fruit set', 'Mar'], [0.42, 'Green fruit', 'Apr'], [0.64, 'Colour break', 'May'], [0.82, 'Ripe and red', 'Jun']],
  },
]

export const lightModes = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Noon' },
  { id: 'evening', label: 'Evening' },
  { id: 'night', label: 'Night' },
]

export function stageAt(crop, growth) {
  let current = crop.stages[0]
  for (const stage of crop.stages) if (growth >= stage[0] - 1e-6) current = stage
  return { name: current[1], when: current[2] }
}
