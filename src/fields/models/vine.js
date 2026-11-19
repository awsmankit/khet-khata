// 3D models for the "vine" group of crops. See MODELS_BRIEF.md.
// Families (helpers in ./vine/): machan gourds, ground creepers, rosettes (strawberry, pineapple),
// flower bushes and spikes, and the orchid shade house.
import { buildMachan } from './vine/machan.js'
import { buildCreeper } from './vine/creeper.js'
import { buildStrawberry, buildPineapple } from './vine/rosette.js'
import { buildBush, buildSpikes } from './vine/flowers.js'
import { buildOrchidHouse } from './vine/shade.js'
import { V } from './vine/kit.js'
import * as parts from './vine/parts.js'

/* ---------------------------------------------------------------- machan gourds */
const machanStages = [[0, 'Sowing'], [0.12, 'Climbing the poles'], [0.3, 'Covering the machan'], [0.4, 'Flowering'], [0.55, 'Fruiting'], [0.82, 'Harvest']]
const gourdLeafRamp = [[0, '#7aa84a'], [0.35, '#58903a'], [0.6, '#4d8434'], [0.88, '#5a8a36'], [1, '#86903e']]

const bottleGourd = {
  build: (ctx) => buildMachan(ctx, {
    leaf: { size: 0.27, lobes: 5, depth: 0.1, sharp: 0.6, notch: 0.35, basal: 0.12, cup: 0.06, droop: 0.15, wave: 0.05, detail: 30, rings: 2, vein: 0.22 },
    leafStep: 0.72, underShare: 0.3, leafRamp: [[0, '#80ac50'], [0.35, '#619a40'], [0.6, '#56903a'], [0.88, '#5e8e3a'], [1, '#8a9442']], leafRoughness: 0.86,
    flowers: 1.3, flowerSize: 0.11, flowerColor: '#f6f3e8', flowerEmissive: '#1a1a16',
    fruit: parts.bottleGourd, fruitDensity: 1.6, fruitScale: 1.25, fruitRoughness: 0.5, fruitGlow: '#26301c',
    fruitRamp: [[0.44, '#d4eab0'], [0.7, '#cae4a2'], [0.9, '#c2de98'], [1, '#c4d896']],
  }),
  stages: machanStages,
  showcase: 0.72,
}

const bitterGourd = {
  build: (ctx) => buildMachan(ctx, {
    leaf: { size: 0.16, lobes: 5, depth: 0.62, sharp: 0.55, notch: 0.2, basal: 0.1, cup: 0.05, droop: 0.1, wave: 0.08, serrate: 0.1, detail: 30, rings: 2, vein: 0.2 },
    leafStep: 0.75, underShare: 0.25, leafRamp: [[0, '#86b450'], [0.35, '#68a03e'], [0.6, '#5c9838'], [0.88, '#649838'], [1, '#90983e']],
    flowers: 2.2, flowerSize: 0.075, flowerColor: '#f7cd22', flowerEmissive: '#2a2000',
    fruit: parts.bitterGourd, fruitDensity: 5.2, fruitScale: 1.0, fruitRoughness: 0.6, fruitGlow: '#000000',
    fruitRamp: [[0.44, '#7cc04a'], [0.6, '#6bb03a'], [0.75, '#5ca434'], [0.9, '#4f9a2e'], [1, '#5c9a30']],
    ripeShare: 0.15, ripeFruit: (random) => parts.bitterGourd(random, { split: true }),
    ripeRamp: [[0.44, '#7cc04a'], [0.6, '#8cb83a'], [0.68, '#e0b030'], [0.76, '#f0a030'], [1, '#ec8a28']],
  }),
  stages: machanStages,
  showcase: 0.74,
}

const ridgeGourd = {
  build: (ctx) => buildMachan(ctx, {
    leaf: { size: 0.21, lobes: 5, depth: 0.3, sharp: 1.0, notch: 0.3, basal: 0.12, cup: 0.06, droop: 0.14, wave: 0.06, serrate: 0.04, detail: 30, rings: 2, vein: 0.22 },
    leafStep: 0.72, underShare: 0.28, leafRamp: gourdLeafRamp,
    flowers: 1.8, flowerSize: 0.1, flowerColor: '#f8cf1e', flowerEmissive: '#2a2000',
    fruit: parts.ridgeGourd, fruitDensity: 2.2, fruitScale: 1.15, fruitRoughness: 0.6, fruitGlow: '#1c2812',
    fruitRamp: [[0.44, '#a8d47a'], [0.7, '#94c868'], [0.9, '#8cc062'], [1, '#9ab85e']],
  }),
  stages: machanStages,
  showcase: 0.72,
}

/* ---------------------------------------------------------------- ground creepers */
const creeperStages = [[0, 'Sowing'], [0.12, 'Vines running'], [0.33, 'Flowering'], [0.46, 'Fruit set'], [0.66, 'Fruit swelling'], [0.86, 'Harvest']]
const creeperLeafRamp = [[0, '#7aa84a'], [0.3, '#5a923c'], [0.6, '#4f8836'], [0.85, '#5a8a38'], [1, '#8c9442']]

const pointedGourd = {
  build: (ctx) => buildCreeper(ctx, {
    plot: { width: 12, depth: 16 }, rowGap: 1.5, plantGap: 0.9, sand: true, river: true, sandColor: '#e2d2ae',
    leaf: { size: 0.12, lobes: 1, depth: 0.3, sharp: 1, notch: 0.42, basal: 0.05, cup: 0.05, droop: 0.12, wave: 0.04, serrate: 0.05, detail: 18, rings: 2, vein: 0.18, stretch: 1.3 },
    leafRamp: [[0, '#6f9e44'], [0.3, '#4c8434'], [0.6, '#3f762e'], [0.9, '#467a30'], [1, '#6a8436']], leafRoughness: 0.7,
    runners: [5, 7], runLength: [0.8, 1.3], nodeGap: 0.13, petiole: [0.05, 0.14], tipLeaf: 0.55, stem: 0.006,
    flowerChance: 0.28, flowerSize: 0.05, flowerColor: '#f5f3ea',
    fruit: parts.pointedGourd, fruitChance: 0.22, fruitMax: 6, fruitOffset: 0.06, fruitRoughness: 0.45,
    fruitRamp: [[0.46, '#9ccc70'], [0.7, '#7fb35a'], [0.9, '#78ab54'], [1, '#8ca850']],
    camera: { position: V(6.4, 1.75, 10.0), target: V(-0.8, 0.1, 2.6) },
  }),
  stages: [[0, 'Root cuttings planted', 'Oct'], [0.15, 'Vines running', 'Dec'], [0.35, 'Flowering', 'Feb'], [0.5, 'Fruiting', 'Mar'], [0.8, 'Picking', 'May']],
  showcase: 0.68,
}

const ashGourd = {
  build: (ctx) => buildCreeper(ctx, {
    plot: { width: 12.5, depth: 16 }, rowGap: 2.5, plantGap: 1.3,
    leaf: { size: 0.27, lobes: 5, depth: 0.22, sharp: 0.8, notch: 0.35, basal: 0.12, cup: 0.06, droop: 0.16, wave: 0.05, serrate: 0.03, detail: 30, rings: 2, vein: 0.22 },
    leafRamp: [[0, '#75a248'], [0.3, '#548c3a'], [0.6, '#477e33'], [0.85, '#538436'], [1, '#879040']], leafRoughness: 0.88,
    runners: [4, 6], runLength: [1.4, 2.2], nodeGap: 0.26, petiole: [0.1, 0.3], tipLeaf: 0.45,
    flowerChance: 0.22, flowerSize: 0.12,
    fruit: parts.ashGourd, fruitChance: 0.1, fruitMax: 2, fruitOffset: 0.2, fruitRoughness: 0.9, fruitEnv: 0.3, fruitGrow: [0.46, 0.86],
    // #4d6b3a rind with a ~35% #cfd6c8 powdery bloom at maturity
    fruitRamp: [[0.46, '#557a40'], [0.62, '#4d6b3a'], [0.76, '#66805a'], [0.9, '#7a906b'], [1, '#7a906b']],
  }),
  stages: creeperStages,
  showcase: 0.86,
}

const roundGourd = {
  build: (ctx) => buildCreeper(ctx, {
    plot: { width: 12, depth: 16 }, rowGap: 1.5, plantGap: 0.6,
    leaf: { size: 0.16, lobes: 5, depth: 0.3, sharp: 0.8, notch: 0.3, basal: 0.1, cup: 0.06, droop: 0.12, wave: 0.05, serrate: 0.04, detail: 30, rings: 2, vein: 0.2 },
    leafRamp: creeperLeafRamp, leafRoughness: 0.88,
    runners: [3, 5], runLength: [0.7, 1.1], nodeGap: 0.16, petiole: [0.06, 0.18], tipLeaf: 0.5,
    flowerChance: 0.3, flowerSize: 0.07,
    fruit: parts.roundGourd, fruitChance: 0.42, fruitMax: 6, fruitOffset: 0.09, fruitRoughness: 0.75, fruitScale: 1.4, nearFruit: 2,
    fruitRamp: [[0.46, '#b4d68a'], [0.7, '#a2c878'], [0.9, '#9cc070'], [1, '#a8b86e']],
  }),
  stages: creeperStages,
  showcase: 0.72,
}

const cucumber = {
  build: (ctx) => buildCreeper(ctx, {
    plot: { width: 12, depth: 16 }, rowGap: 1.5, plantGap: 0.6,
    leaf: { size: 0.17, lobes: 5, depth: 0.18, sharp: 1.6, notch: 0.3, basal: 0.1, cup: 0.05, droop: 0.14, wave: 0.05, serrate: 0.05, detail: 30, rings: 2, vein: 0.22 },
    leafRamp: creeperLeafRamp, leafRoughness: 0.85,
    runners: [3, 5], runLength: [0.8, 1.2], nodeGap: 0.16, petiole: [0.06, 0.2], tipLeaf: 0.5,
    flowerChance: 0.32, flowerSize: 0.065,
    fruit: parts.cucumber, fruitChance: 0.42, fruitMax: 6, fruitOffset: 0.1, fruitRoughness: 0.5, fruitScale: 1.4, nearFruit: 2,
    fruitRamp: [[0.46, '#8cc05a'], [0.66, '#74b04c'], [0.88, '#6caa46'], [1, '#b0ac4a']],
  }),
  stages: creeperStages,
  showcase: 0.72,
}

const pumpkin = {
  build: (ctx) => buildCreeper(ctx, {
    plot: { width: 12.5, depth: 16 }, rowGap: 2.5, plantGap: 1.3,
    leaf: { size: 0.33, lobes: 5, depth: 0.2, sharp: 0.7, notch: 0.35, basal: 0.14, cup: 0.08, droop: 0.18, wave: 0.07, serrate: 0.04, detail: 30, rings: 3, vein: 0.26 },
    leafRamp: creeperLeafRamp, leafRoughness: 0.86,
    runners: [4, 6], runLength: [1.5, 2.3], nodeGap: 0.28, petiole: [0.12, 0.34], tipLeaf: 0.42, stem: 0.011,
    flowerChance: 0.22, flowerSize: 0.13,
    fruit: parts.pumpkin, fruitChance: 0.1, fruitMax: 2, fruitOffset: 0.25, fruitRoughness: 0.6, fruitGrow: [0.46, 0.84],
    fruitRamp: [[0.46, '#6a9244'], [0.62, '#5e8a3e'], [0.74, '#8a9440'], [0.86, '#cf8e34'], [1, '#d6822c']],
  }),
  stages: creeperStages,
  showcase: 0.84,
}

const melonCamera = { position: V(6.6, 1.8, 10.0), target: V(-0.8, 0.12, 2.6) }

const watermelon = {
  build: (ctx) => buildCreeper(ctx, {
    plot: { width: 12, depth: 16 }, rowGap: 2.0, plantGap: 0.9, sand: true, river: true,
    leaf: { size: 0.17, lobes: 5, depth: 0.66, sharp: 0.5, notch: 0.15, basal: 0.1, cup: 0.04, droop: 0.1, wave: 0.08, serrate: 0.09, detail: 40, rings: 2, vein: 0.18, stretch: 1.15 },
    leafRamp: [[0, '#7aa452'], [0.3, '#5c8a44'], [0.6, '#527f3e'], [0.85, '#5d8440'], [1, '#8f9046']], leafRoughness: 0.82,
    runners: [4, 6], runLength: [1.1, 1.7], nodeGap: 0.17, petiole: [0.06, 0.2], tipLeaf: 0.5,
    flowerChance: 0.25, flowerSize: 0.065,
    fruit: (random, index) => parts.watermelon(random, { round: index === 2 }), fruitChance: 0.12, fruitMax: 2, fruitOffset: 0.2, fruitRoughness: 0.38, fruitGrow: [0.46, 0.84],
    fruitRamp: [[0.46, '#7aa850'], [0.66, '#5a9040'], [0.86, '#4c8236'], [1, '#467a32']],
    camera: melonCamera,
  }),
  stages: creeperStages,
  showcase: 0.86,
}

const muskmelon = {
  build: (ctx) => buildCreeper(ctx, {
    plot: { width: 12, depth: 16 }, rowGap: 1.8, plantGap: 0.8, sand: true, river: true, sandColor: '#ddc8a0',
    leaf: { size: 0.15, lobes: 5, depth: 0.1, sharp: 0.5, notch: 0.42, basal: 0.08, cup: 0.1, droop: 0.1, wave: 0.08, serrate: 0.05, detail: 30, rings: 2, vein: 0.18 },
    leafRamp: creeperLeafRamp, leafRoughness: 0.9,
    runners: [4, 6], runLength: [0.9, 1.4], nodeGap: 0.15, petiole: [0.06, 0.18], tipLeaf: 0.5,
    flowerChance: 0.3, flowerSize: 0.06,
    fruit: parts.muskmelon, fruitMap: parts.netTexture, fruitChance: 0.16, fruitMax: 3, fruitOffset: 0.12, fruitRoughness: 0.85,
    fruitRamp: [[0.46, '#8aac5c'], [0.66, '#94a85c'], [0.8, '#c2b062'], [0.92, '#dcb662'], [1, '#d8a856']],
    camera: melonCamera,
  }),
  stages: creeperStages,
  showcase: 0.9,
}

/* ---------------------------------------------------------------- rosettes */
const strawberry = {
  build: buildStrawberry,
  stages: [[0, 'Runner plants set'], [0.18, 'Leafing out'], [0.38, 'Flowering'], [0.55, 'Green berries'], [0.75, 'Picking']],
  showcase: 0.8,
}

const pineapple = {
  build: buildPineapple,
  stages: [[0, 'Suckers planted', 'Jun'], [0.18, 'Leafy rosettes', 'Oct'], [0.45, 'Red flower head', 'Jul'], [0.6, 'Fruit swelling', 'Sep'], [0.86, 'Ripe and golden', 'Nov']],
  showcase: 0.84,
}

/* ---------------------------------------------------------------- flowers */
const marigold = {
  build: (ctx) => buildBush(ctx, 'marigold'),
  stages: [[0, 'Transplanting'], [0.18, 'Bushy growth'], [0.38, 'Buds forming'], [0.5, 'Full bloom'], [0.85, 'Last pickings']],
  showcase: 0.66,
}

const rose = {
  build: (ctx) => buildBush(ctx, 'rose'),
  stages: [[0, 'Pruned bushes', 'Oct'], [0.18, 'New shoots', 'Nov'], [0.38, 'Buds forming', 'Dec'], [0.52, 'Full bloom', 'Jan'], [0.85, 'Late flush', 'Mar']],
  showcase: 0.62,
}

const jasmine = {
  build: (ctx) => buildBush(ctx, 'jasmine'),
  stages: [[0, 'Pruned bushes', 'Dec'], [0.2, 'New shoots', 'Feb'], [0.4, 'Buds appear', 'Mar'], [0.55, 'Peak flowering', 'May'], [0.85, 'Last flush', 'Sep']],
  showcase: 0.64,
}

const chrysanthemum = {
  build: (ctx) => buildBush(ctx, 'chrysanthemum'),
  stages: [[0, 'Planting'], [0.15, 'Vegetative'], [0.35, 'Pinching and branching'], [0.55, 'Buds forming'], [0.68, 'Full bloom'], [0.9, 'Harvest']],
  showcase: 0.76,
}

const tuberose = {
  build: (ctx) => buildSpikes(ctx, 'tuberose'),
  stages: [[0, 'Bulbs planted', 'Mar'], [0.2, 'Leafy clumps', 'May'], [0.42, 'Spikes rising', 'Jun'], [0.58, 'Flowering', 'Jul'], [0.85, 'Spike harvest', 'Sep']],
  showcase: 0.72,
}

const gladiolus = {
  build: (ctx) => buildSpikes(ctx, 'gladiolus'),
  stages: [[0, 'Corms planted'], [0.18, 'Leaf fans'], [0.45, 'Spikes emerge'], [0.62, 'Florets opening'], [0.82, 'Cut spikes']],
  showcase: 0.74,
}

const orchid = {
  build: buildOrchidHouse,
  stages: [[0, 'New shoots', 'Jun'], [0.25, 'Canes maturing', 'Aug'], [0.45, 'Sprays emerging', 'Oct'], [0.6, 'In bloom', 'Dec'], [0.88, 'Sprays cut', 'Feb']],
  showcase: 0.7,
}

export const models = {
  'bottle-gourd': bottleGourd,
  'bitter-gourd': bitterGourd,
  'ridge-gourd': ridgeGourd,
  'pointed-gourd': pointedGourd,
  'ash-gourd': ashGourd,
  'round-gourd': roundGourd,
  cucumber,
  pumpkin,
  watermelon,
  muskmelon,
  strawberry,
  pineapple,
  marigold,
  rose,
  tuberose,
  jasmine,
  chrysanthemum,
  gladiolus,
  orchid,
}
