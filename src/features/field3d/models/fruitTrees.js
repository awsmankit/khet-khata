// 3D models for the "trees" group of crops. See MODELS_BRIEF.md.
// Most crops are one parameterised orchard (trees/orchard.js): tree size, crown shape, leaf
// cluster, flowers and fruit. Papaya, the vines on bowers/T-bars/walls and dragon fruit on ring
// posts have their own builders (trees/structures.js). Growth runs through one season of a
// bearing orchard, from flowering (or dormancy) to harvest.
import { lerp, smooth } from '../engine/geometry.js'
import { V } from '../engine/plantKit.js'
import { buildTreeOrchard } from './fruitTrees/orchard.js'
import { buildDragonFruit, buildPapaya, buildVineRoof } from './fruitTrees/structures.js'
import { blossom, blossomSpur, featherCluster, floretCluster, fruitCluster, grapeBunch, latheFruit, lobedCluster, passionFlower, pinnate, podCluster, pomegranateFlower, twigCluster, whorl } from './fruitTrees/parts.js'

// leaves of deciduous trees unfold from bare twigs between `start` and `full`
const deciduous = (start, full) => (g) => smooth(start, full, g)
const atStart = (fade0, fade1) => [-0.2, -0.01, fade0, fade1]

/* ---------------------------------------------------------------- shared pieces */
const citrusLeaves = (size = 1) => (r) => twigCluster(r, { length: 0.2 * size, nodes: 6, terminal: 2, twigColor: '#5a6a3a', leaf: { length: 0.12 * size, width: 0.052 * size, shape: 'lance', rise: [0.25, 0.7], droop: [0.4, 0.8], segments: 2, fold: 0.25 } })
const citrusBlossom = { geometry: (r) => blossomSpur(r, { flowers: 3, radius: 0.016, cup: 0.6, petalWidth: 0.7, centre: '#f0e090', spread: 0.035 }), perTree: 240, heights: [-0.5, 1], outward: 0.05, window: atStart(0.1, 0.2), color: '#fffdf4', roughness: 0.6 }
const temperateLeaves = (leaf, opts = {}) => (r) => twigCluster(r, { length: 0.22, nodes: 5, terminal: 2, leaf: { segments: 2, ...leaf }, ...opts })
const springBlossom = (color, centre, flowers = 4, radius = 0.019, perTree = 750) => ({ geometry: (r) => blossomSpur(r, { flowers, radius: radius * 1.3, cup: 0.45, centre, spread: 0.055 }), perTree, place: 'twig', shellShare: 0.45, along: [0.1, 1], window: [0.03, 0.09, 0.2, 0.3], color, roughness: 0.65 })

const orchard = (spec) => (ctx) => buildTreeOrchard(ctx, spec)

export const models = {
  guava: {
    build: orchard({
      layout: { cols: 4, rows: 4, spacing: 6 },
      tree: { height: 5, width: 5.6, crownDepth: 3.8, crown: 'spreading', trunk: 0.8, trunkRadius: 0.13, limbs: 4, bark: '#7a6c5a', barkOptions: { mottle: '#5f5346', grain: 0.2 }, under: -0.55, minLeafY: 0.45, coreColor: '#25401a' },
      leaves: { cluster: (r) => twigCluster(r, { length: 0.26, nodes: 4, opposite: true, terminal: 2, leaf: { length: 0.15, width: 0.07, shape: 'oval', rise: [0.15, 0.5], droop: [0.4, 0.8], segments: 3, fold: 0.35 } }), cover: 0.65, color: '#4e7a30', roughness: 0.65 },
      flowers: { geometry: (r) => blossomSpur(r, { flowers: 2, radius: 0.02, cup: 0.35, centre: '#f2eed6', centreSize: 0.6, spread: 0.04 }), perTree: 200, heights: [-0.6, 0.9], outward: 0.06, window: atStart(0.12, 0.24), color: '#fbfaf2' },
      fruit: { layers: [{ geometry: (r) => latheFruit(r, { length: 0.085, radius: 0.045, profile: 'round', stalk: 0.025, radial: 9, rings: 7, speckle: 0.1 }), color: [[0.15, '#6e9a3a'], [0.6, '#7ea53e'], [0.78, '#a7be4e'], [0.9, '#d4d064'], [1, '#e0d26a']], roughness: 0.5 }], perTree: 90, heights: [-0.75, 0.5], outward: 0.02, window: [0.14, 0.62] },
    }),
    stages: [[0, 'Flowering', 'Jul'], [0.2, 'Fruit set', 'Aug'], [0.42, 'Fruit growth', 'Sep'], [0.68, 'Maturing', 'Nov'], [0.86, 'Ripe', 'Dec']],
    showcase: 0.86,
  },

  papaya: {
    build: buildPapaya,
    stages: [[0, 'Planting', 'Month 0'], [0.2, 'Young plant', 'Month 2'], [0.36, 'Flowering', 'Month 5'], [0.55, 'Fruit set', 'Month 6'], [0.86, 'Ripening', 'Month 10']],
    showcase: 0.9,
  },

  orange: {
    build: orchard({
      layout: { cols: 4, rows: 4, spacing: 6 },
      tree: { height: 4.6, width: 4.6, crownDepth: 4.0, crown: 'round', trunk: 0.55, trunkRadius: 0.12, limbs: 4, bark: '#6a6250', under: -0.8, minLeafY: 0.3, coreColor: '#142d10' },
      leaves: { cluster: citrusLeaves(), cover: 0.75, color: '#1f4a1c', roughness: 0.32 },
      flowers: citrusBlossom,
      fruit: { layers: [{ geometry: (r) => fruitCluster(r, { count: r() < 0.6 ? 1 : 2, spread: 0.05, hub: 0.02, pedicel: 0.015, fruit: { length: 0.078, radius: 0.045, profile: 'round', radial: 9, rings: 7, speckle: 0.12 } }), color: [[0.12, '#3f6e22'], [0.55, '#3d6b22'], [0.72, '#6f8a2a'], [0.82, '#d08a22'], [0.92, '#e98a1c'], [1, '#ee8418']], roughness: 0.42 }], perTree: 120, heights: [-0.9, 0.75], outward: 0, window: [0.12, 0.6] },
    }),
    stages: [[0, 'Flowering (ambia)', 'Feb'], [0.18, 'Fruit set', 'Mar'], [0.4, 'Fruit growth', 'Jun'], [0.7, 'Colour break', 'Oct'], [0.86, 'Ripe', 'Dec']],
    showcase: 0.9,
  },

  'sweet-lime': {
    build: orchard({
      layout: { cols: 4, rows: 4, spacing: 6 },
      tree: { height: 4.4, width: 4.6, crownDepth: 3.8, crown: 'round', trunk: 0.6, trunkRadius: 0.12, limbs: 4, bark: '#6a6250', under: -0.8, minLeafY: 0.3, coreColor: '#172f12' },
      leaves: { cluster: citrusLeaves(), cover: 0.75, color: '#2a5520', roughness: 0.34 },
      flowers: citrusBlossom,
      fruit: { layers: [{ geometry: (r) => fruitCluster(r, { count: r() < 0.6 ? 1 : 2, spread: 0.05, hub: 0.02, pedicel: 0.015, fruit: { length: 0.085, radius: 0.046, profile: 'oval', radial: 9, rings: 7, speckle: 0.12 } }), color: [[0.12, '#3f6e22'], [0.6, '#467424'], [0.8, '#8fa834'], [0.92, '#b4c03e'], [1, '#c2c646']], roughness: 0.42 }], perTree: 120, heights: [-0.9, 0.75], outward: 0, window: [0.12, 0.6] },
    }),
    stages: [[0, 'Flowering', 'Feb'], [0.18, 'Fruit set', 'Mar'], [0.42, 'Fruit growth', 'Jun'], [0.7, 'Maturing', 'Aug'], [0.86, 'Ready to pick', 'Oct']],
    showcase: 0.88,
  },

  lemon: {
    build: orchard({
      layout: { cols: 5, rows: 5, spacing: 4.5 },
      tree: { height: 3, width: 3.4, crownDepth: 2.8, crown: 'bush', trunk: 0.35, trunkRadius: 0.07, limbs: 4, thorns: 90, bark: '#6e6654', under: -0.8, minLeafY: 0.2, coreColor: '#16301a' },
      leaves: { cluster: citrusLeaves(0.85), cover: 0.75, color: '#2c5a22', roughness: 0.35 },
      flowers: { ...citrusBlossom, perTree: 160 },
      fruit: { layers: [{ geometry: (r) => fruitCluster(r, { count: r() < 0.5 ? 2 : 3, spread: 0.04, hub: 0.02, pedicel: 0.012, fruit: { length: 0.058, radius: 0.028, profile: 'lemon', radial: 8, rings: 7, speckle: 0.12 } }), color: [[0.12, '#4a7a28'], [0.6, '#4f8028'], [0.78, '#a9b234'], [0.88, '#dcc838'], [1, '#e6cc34']], roughness: 0.4 }], perTree: 80, heights: [-0.95, 0.7], outward: 0, window: [0.12, 0.6] },
    }),
    stages: [[0, 'Flowering', 'Jan'], [0.2, 'Fruit set', 'Feb'], [0.45, 'Fruit growth', 'Apr'], [0.7, 'Turning yellow', 'Jun'], [0.86, 'Picking', 'Jul']],
    showcase: 0.9,
  },

  apple: {
    build: orchard({
      budget: { leaves: 1.2e6, flowers: 5.5e5 },
      layout: { cols: 5, rows: 5, spacing: 4.5 },
      tree: { height: 3.8, width: 3.8, crownDepth: 2.8, crown: 'open', trunk: 0.8, trunkRadius: 0.11, branches: 3, twigs: 5, spurs: 8, bark: '#5e4a3e', under: -0.7, minLeafY: 0.7, coreColor: '#2a4a20', core: 0.35 },
      leaves: { cluster: temperateLeaves({ length: 0.11, width: 0.06, shape: 'oval' }), cover: 0.7, color: [[0, '#9cbc58'], [0.3, '#5f8e36'], [1, '#4b7a2e']], grow: deciduous(0.12, 0.34), roughness: 0.6 },
      flowers: springBlossom('#fbe9ee', '#e8d070', 5),
      fruit: { layers: [{ geometry: (r) => latheFruit(r, { length: 0.075, radius: 0.044, profile: 'apple', stalk: 0.025, radial: 9, rings: 7, stripes: 0.25, speckle: 0.06 }), color: [[0.25, '#7fa040'], [0.5, '#8aa443'], [0.66, '#ad7a3a'], [0.8, '#b8262a'], [1, '#a8182a']], roughness: 0.38 }], perTree: 110, heights: [-0.85, 0.55], outward: 0, window: [0.24, 0.72] },
    }),
    stages: [[0, 'Dormant', 'Mar'], [0.1, 'Blossom', 'Apr'], [0.28, 'Fruit set', 'May'], [0.5, 'Fruit growth', 'Jun'], [0.72, 'Colouring', 'Aug'], [0.88, 'Harvest', 'Sep']],
    showcase: 0.9,
  },

  pomegranate: {
    build: orchard({
      layout: { cols: 5, rows: 7, spacing: 4.5, spacingZ: 3, jitter: 0.15 },
      tree: { height: 2.7, width: 2.8, crownDepth: 2.3, crown: 'bush', stems: 4, trunk: 0.3, trunkRadius: 0.05, branches: 3, twigs: 3, bark: '#7a6450', under: -0.8, minLeafY: 0.2, coreColor: '#1c3814', core: 0.9 },
      leaves: { cluster: (r) => twigCluster(r, { length: 0.2, nodes: 6, opposite: true, terminal: 3, leaf: { length: 0.085, width: 0.03, shape: 'lance', segments: 2, rise: [0.3, 0.7] } }), cover: 0.65, color: '#3f6e26', roughness: 0.45 },
      flowers: { geometry: (r) => pomegranateFlower(r, { size: 1.3 }), perTree: 90, heights: [-0.6, 1], outward: 0.05, window: atStart(0.16, 0.3), color: '#e0321e', roughness: 0.55 },
      fruit: { layers: [{ geometry: (r) => latheFruit(r, { length: 0.09, radius: 0.05, profile: 'round', stalk: 0.015, radial: 9, rings: 7, crown: 1, speckle: 0.06 }), color: [[0.15, '#8aa040'], [0.4, '#a49a3c'], [0.6, '#c0703a'], [0.78, '#c22a26'], [1, '#a8161e']], roughness: 0.45 }], perTree: 55, heights: [-0.95, 0.5], outward: 0, window: [0.14, 0.66] },
    }),
    stages: [[0, 'Flowering (mrig bahar)', 'Jun'], [0.2, 'Fruit set', 'Jul'], [0.42, 'Fruit growth', 'Aug'], [0.68, 'Colouring', 'Oct'], [0.86, 'Ready to harvest', 'Nov']],
    showcase: 0.86,
  },

  grapes: {
    build: (ctx) => buildVineRoof(ctx, {
      kind: 'pandal', width: 20, depth: 24, rowGap: 3, plantGap: 1.8, height: 2.0, postGap: 4, postColor: '#a9a59c', budget: { leaves: 1.0e6 },
      leaves: { cluster: (r) => lobedCluster(r, { leaves: 3, stem: 0.12, leaf: { size: 0.19, lobes: 5, spread: 1.2, lobeWidth: 0.55, shape: 'oval', petiole: 0.07, segments: 3, rise: 0.2, droop: 0.6, fold: 0.12 } }), cover: 0.9, color: [[0, '#a8c060'], [0.3, '#5e9036'], [0.8, '#56862f'], [1, '#6e8a34']], grow: (g) => lerp(0.02, 1, smooth(0.04, 0.3, g)), under: 0.4, roughness: 0.65 },
      coreColor: '#2c4c1f',
      fruit: { layers: [{ geometry: (r) => grapeBunch(r, { berries: 28, length: 0.26, width: 0.078, berry: 0.0145, elongate: 1.25, peduncle: 0.05 }), color: [[0.22, '#7a9a40'], [0.45, '#8db04c'], [0.7, '#a2c058'], [0.85, '#bccb66'], [1, '#c8cf72']], roughness: 0.3 }], perPlant: 11, window: [0.22, 0.65] },
      camera: { position: V(7.1, 1.5, 10.6), target: V(5.6, 1.78, 0) },
    }),
    stages: [[0, 'Fruit pruning', 'Oct'], [0.14, 'New shoots', 'Oct'], [0.28, 'Flowering', 'Nov'], [0.45, 'Berry growth', 'Dec'], [0.7, 'Softening', 'Jan'], [0.88, 'Ready to harvest', 'Feb']],
    showcase: 0.84,
  },

  jackfruit: {
    build: orchard({
      layout: { cols: 3, rows: 3, spacing: 11 },
      tree: { height: 12, width: 9, crownDepth: 8.5, crown: 'round', trunk: 2.6, trunkRadius: 0.4, limbs: 5, bark: '#5c4a3a', under: -0.55, minLeafY: 2.4, coreColor: '#13290f' },
      leaves: { cluster: (r) => whorl(r, { leaves: 6, length: 0.22, width: 0.1, shape: 'oval', segments: 3 }), cover: 0.7, color: '#244f1e', roughness: 0.38 },
      fruit: { place: 'trunk', lod: false, layers: [{ geometry: (r) => latheFruit(r, { length: r.range(0.48, 0.6), radius: 0.17, profile: 'oval', radial: 14, rings: 12, stalk: 0.05, stalkRadius: 0.02, offsetX: 0.17, bumps: 0.05, bumpFreq: 9, speckle: 0.35, stalkColor: '#5a5a3a' }), color: [[0.2, '#6b8a2e'], [0.6, '#6e8f30'], [0.85, '#8c9a3a'], [1, '#a3a03e']], roughness: 0.75 }], perTree: 30, window: [0.16, 0.7] },
      camera: { position: V(15.6, 2.1, 18.4), target: V(6.5, 3.3, 6.2) },
    }),
    stages: [[0, 'Flowering', 'Jan'], [0.2, 'Fruit set', 'Feb'], [0.45, 'Fruit growth', 'Apr'], [0.72, 'Maturing', 'Jun'], [0.88, 'Ripe', 'Jul']],
    showcase: 0.84,
  },

  sapota: {
    build: orchard({
      layout: { cols: 3, rows: 3, spacing: 8 },
      tree: { height: 6.5, width: 6, crownDepth: 5, crown: 'dome', trunk: 1.0, trunkRadius: 0.17, limbs: 5, bark: '#4e4038', under: -0.5, minLeafY: 0.8, coreColor: '#13290f' },
      leaves: { cluster: (r) => whorl(r, { leaves: 9, length: 0.15, width: 0.05, shape: 'lance', rise: [0.3, 0.8], segments: 3 }), cover: 0.7, color: '#2b5422', roughness: 0.35 },
      flowers: { geometry: (r) => floretCluster(r, { florets: 5, height: 0.05, radius: 0.04, size: 0.009, color: '#f4eed8' }), perTree: 200, heights: [-0.5, 0.8], outward: 0.04, window: atStart(0.12, 0.25), color: '#ffffff' },
      fruit: { layers: [{ geometry: (r) => fruitCluster(r, { count: 2, spread: 0.045, hub: 0.015, fruit: { length: 0.072, radius: 0.037, profile: 'oval', radial: 8, rings: 6, speckle: 0.25 } }), color: [[0.12, '#7a7a3a'], [0.5, '#86744a'], [0.8, '#8f6a45'], [1, '#8a5f3e']], roughness: 0.8 }], perTree: 110, heights: [-0.7, 0.5], outward: 0.01, window: [0.1, 0.6] },
    }),
    stages: [[0, 'Flowering', 'Jun'], [0.2, 'Fruit set', 'Jul'], [0.45, 'Fruit growth', 'Sep'], [0.7, 'Maturing', 'Nov'], [0.86, 'Ready to pick', 'Jan']],
    showcase: 0.86,
  },

  aonla: {
    build: orchard({
      layout: { cols: 3, rows: 3, spacing: 8 },
      tree: { height: 6.5, width: 6, crownDepth: 4.5, crown: 'spreading', trunk: 1.4, trunkRadius: 0.16, limbs: 4, twigs: 4, bark: '#6e6254', under: -0.5, minLeafY: 1.2, coreColor: '#2a4a1e', core: 0.85 },
      leaves: { cluster: (r) => featherCluster(r, { fronds: 3, length: 0.32, pairs: 15, leafletLength: 0.042, leafletWidth: 0.015, forward: 0.15, taper: 0.2, segments: 4, rise: [0.0, 0.4], droop: [0.6, 1.1] }), cover: 0.5, color: '#5a8a38', roughness: 0.6 },
      flowers: { geometry: (r) => floretCluster(r, { florets: 8, height: 0.04, radius: 0.03, size: 0.006, color: '#e0e0a0' }), place: 'twig', perTree: 260, window: atStart(0.1, 0.22), color: '#e8e8b0' },
      fruit: { heights: [-0.9, 0.6], outward: 0.02, layers: [{ geometry: (r) => fruitCluster(r, { count: 4, spread: 0.045, drop: 0.04, hub: 0.01, pedicel: 0.008, fruit: { length: 0.05, radius: 0.027, profile: 'round', radial: 8, rings: 6, speckle: 0.05, stripes: 0.12, stripeCount: 6 } }), color: [[0.2, '#a6c058'], [0.6, '#b6cc68'], [0.85, '#c4d27a'], [1, '#cfd585']], roughness: 0.35 }], perTree: 160, window: [0.18, 0.66] },
    }),
    stages: [[0, 'Flowering', 'Apr'], [0.2, 'Fruit set', 'Jul'], [0.45, 'Fruit growth', 'Sep'], [0.7, 'Maturing', 'Nov'], [0.86, 'Harvest', 'Dec']],
    showcase: 0.86,
  },

  ber: {
    build: orchard({
      layout: { cols: 4, rows: 4, spacing: 6 },
      tree: { height: 4.8, width: 5.6, crownDepth: 3.4, crown: 'spreading', trunk: 1.0, trunkRadius: 0.14, limbs: 4, twigs: 4, thorns: 160, droop: 0.6, bark: '#4e3e32', under: -0.6, minLeafY: 0.5, coreColor: '#1e3816', core: 0.85 },
      leaves: { cluster: (r) => twigCluster(r, { length: 0.3, nodes: 7, zigzag: 0.012, terminal: 1, leaf: { length: 0.065, width: 0.045, shape: 'oval', segments: 2, rise: [0.1, 0.4], droop: [0.3, 0.6] } }), cover: 0.55, color: '#3f6a2a', roughness: 0.4 },
      flowers: { geometry: (r) => floretCluster(r, { florets: 6, height: 0.03, radius: 0.025, size: 0.006, color: '#e4e098' }), place: 'twig', perTree: 260, window: atStart(0.1, 0.22), color: '#e8e4a0' },
      fruit: { place: 'twig', along: [0.2, 1], layers: [{ geometry: (r) => fruitCluster(r, { count: 2, spread: 0.03, hub: 0.008, pedicel: 0.01, fruit: { length: 0.045, radius: 0.022, profile: 'oval', radial: 8, rings: 6, speckle: 0.08 } }), color: [[0.2, '#9ab84a'], [0.55, '#a9c255'], [0.72, '#c4b85a'], [0.85, '#b0663a'], [1, '#8a3e28']], roughness: 0.35 }], perTree: 200, window: [0.15, 0.62] },
    }),
    stages: [[0, 'Flowering', 'Sep'], [0.2, 'Fruit set', 'Oct'], [0.45, 'Fruit growth', 'Dec'], [0.7, 'Colouring', 'Jan'], [0.86, 'Ripe', 'Feb']],
    showcase: 0.86,
  },

  jamun: {
    build: orchard({
      layout: { cols: 3, rows: 3, spacing: 10 },
      tree: { height: 11, width: 7.5, crownDepth: 7.5, crown: 'round', trunk: 2.4, trunkRadius: 0.32, limbs: 5, bark: '#61564a', barkOptions: { grain: 0.28 }, under: -0.55, minLeafY: 2.5, coreColor: '#13290f' },
      leaves: { cluster: (r) => whorl(r, { leaves: 6, length: 0.18, width: 0.065, shape: 'lance', segments: 3 }), cover: 0.7, color: '#2a5520', roughness: 0.32, flushColor: '#5e6a30', flushShare: 0.03 },
      flowers: { geometry: (r) => floretCluster(r, { florets: 10, height: 0.06, radius: 0.05, size: 0.008, color: '#f0eed8' }), perTree: 220, heights: [-0.6, 0.7], outward: 0.04, window: atStart(0.12, 0.24), color: '#ffffff' },
      fruit: { layers: [{ geometry: (r) => fruitCluster(r, { count: 7, spread: 0.04, drop: 0.05, hub: 0.03, pedicel: 0.015, fruit: { length: 0.04, radius: 0.017, profile: 'oval', radial: 7, rings: 6, speckle: 0.06 } }), color: [[0.2, '#7fa04a'], [0.45, '#8a9a4a'], [0.6, '#9a5a6a'], [0.72, '#5a2a52'], [0.85, '#2e1630'], [1, '#26122a']], roughness: 0.3 }], perTree: 120, heights: [-0.75, 0.45], outward: 0.02, window: [0.16, 0.6] },
    }),
    stages: [[0, 'Flowering', 'Mar'], [0.22, 'Fruit set', 'Apr'], [0.45, 'Green fruit', 'May'], [0.68, 'Colouring', 'Jun'], [0.84, 'Ripe', 'Jul']],
    showcase: 0.86,
  },

  'custard-apple': {
    build: orchard({
      layout: { cols: 5, rows: 5, spacing: 5 },
      tree: { height: 4, width: 4.4, crownDepth: 3, crown: 'spreading', trunk: 0.6, trunkRadius: 0.1, limbs: 4, droop: 0.3, bark: '#6a5c4c', under: -0.6, minLeafY: 0.4, coreColor: '#22401a', core: 0.9 },
      leaves: { cluster: temperateLeaves({ length: 0.12, width: 0.045, shape: 'oval', rise: [0.1, 0.45] }), cover: 0.55, color: '#4f7d34', roughness: 0.6 },
      flowers: { geometry: (r) => floretCluster(r, { florets: 3, height: 0.02, radius: 0.015, size: 0.012, color: '#d0d098' }), perTree: 80, heights: [-0.6, 0.6], outward: 0.03, window: atStart(0.12, 0.24), color: '#d8d8a0' },
      fruit: { layers: [{ geometry: (r) => latheFruit(r, { length: 0.09, radius: 0.05, profile: 'heart', stalk: 0.02, radial: 12, rings: 9, bumps: 0.09, bumpFreq: 5, speckle: 0.04, shadeFn: (c, t, a) => c.multiplyScalar(0.85 + 0.3 * (1 - Math.abs(Math.sin(a * 5) * Math.sin(t * Math.PI * 4)))) }), color: [[0.15, '#7aa048'], [0.6, '#86a650'], [0.85, '#a3b46a'], [1, '#b6bc7a']], roughness: 0.7 }], perTree: 45, heights: [-0.8, 0.4], outward: 0.02, window: [0.14, 0.64] },
    }),
    stages: [[0, 'Flowering', 'May'], [0.2, 'Fruit set', 'Jun'], [0.45, 'Fruit growth', 'Aug'], [0.7, 'Maturing', 'Sep'], [0.86, 'Ready to pick', 'Oct']],
    showcase: 0.86,
  },

  pear: {
    build: orchard({
      budget: { leaves: 1.2e6, flowers: 5.5e5 },
      layout: { cols: 4, rows: 4, spacing: 5.5 },
      tree: { height: 5.2, width: 3.8, crownDepth: 4, crown: 'round', trunk: 1.0, trunkRadius: 0.13, branches: 3, twigs: 5, spurs: 8, bark: '#4e4440', under: -0.65, minLeafY: 0.9, coreColor: '#284a1e', core: 0.35 },
      leaves: { cluster: temperateLeaves({ length: 0.09, width: 0.05, shape: 'oval' }), cover: 0.55, color: [[0, '#9cbc58'], [0.3, '#4e8030'], [1, '#447428']], grow: deciduous(0.12, 0.34), roughness: 0.4 },
      flowers: springBlossom('#fdfbf6', '#7a2a3a', 5, 0.018),
      fruit: { layers: [{ geometry: (r) => latheFruit(r, { length: 0.1, radius: 0.04, profile: 'pear', stalk: 0.03, radial: 9, rings: 8, speckle: 0.25 }), color: [[0.3, '#7a9a3a'], [0.7, '#8aa040'], [0.86, '#b0ac48'], [1, '#bca64c']], roughness: 0.55 }], perTree: 90, heights: [-0.85, 0.5], outward: 0, window: [0.26, 0.74] },
    }),
    stages: [[0, 'Dormant', 'Feb'], [0.1, 'Blossom', 'Mar'], [0.3, 'Fruit set', 'Apr'], [0.52, 'Fruit growth', 'May'], [0.75, 'Maturing', 'Jul'], [0.88, 'Harvest', 'Aug']],
    showcase: 0.9,
  },

  peach: {
    build: orchard({
      budget: { leaves: 1.2e6, flowers: 5.5e5 },
      layout: { cols: 5, rows: 5, spacing: 4.5 },
      tree: { height: 3.5, width: 4.2, crownDepth: 2.6, crown: 'open', trunk: 0.6, trunkRadius: 0.1, branches: 3, twigs: 5, spurs: 8, bark: '#5a3e36', under: -0.7, minLeafY: 0.6, coreColor: '#2a4a20', core: 0.35 },
      leaves: { cluster: temperateLeaves({ length: 0.13, width: 0.03, shape: 'lance', droop: [0.7, 1.1] }), cover: 0.5, color: [[0, '#9cbc58'], [0.3, '#4f8030'], [1, '#4a7a2e']], grow: deciduous(0.14, 0.36), roughness: 0.55 },
      flowers: springBlossom('#f08aa8', '#c04060', 3, 0.02),
      fruit: { layers: [{ geometry: (r) => latheFruit(r, { length: 0.075, radius: 0.042, profile: 'round', stalk: 0.008, radial: 9, rings: 7, blush: '#ff6a50', blushAmount: 0.5, speckle: 0.04 }), color: [[0.3, '#8aa048'], [0.55, '#a8a850'], [0.72, '#e0a050'], [0.86, '#e8804a'], [1, '#e2703e']], roughness: 0.85 }], perTree: 100, heights: [-0.85, 0.55], outward: 0, window: [0.26, 0.72] },
    }),
    stages: [[0, 'Dormant', 'Jan'], [0.1, 'Pink blossom', 'Feb'], [0.3, 'Fruit set', 'Mar'], [0.52, 'Fruit growth', 'Apr'], [0.75, 'Colouring', 'May'], [0.88, 'Ripe', 'Jun']],
    showcase: 0.9,
  },

  plum: {
    build: orchard({
      budget: { leaves: 1.1e6, flowers: 5e5 },
      layout: { cols: 5, rows: 5, spacing: 4.5 },
      tree: { height: 4, width: 4, crownDepth: 3, crown: 'round', trunk: 0.7, trunkRadius: 0.1, branches: 3, twigs: 5, spurs: 8, bark: '#4a3a36', under: -0.7, minLeafY: 0.6, coreColor: '#284a1e', core: 0.35 },
      leaves: { cluster: temperateLeaves({ length: 0.08, width: 0.042, shape: 'oval' }), cover: 0.55, color: [[0, '#9cbc58'], [0.3, '#4e7e30'], [1, '#46742a']], grow: deciduous(0.14, 0.36), roughness: 0.55 },
      flowers: springBlossom('#fdfcf6', '#e8d070', 4, 0.016, 850),
      fruit: { layers: [{ geometry: (r) => fruitCluster(r, { count: 2, spread: 0.035, hub: 0.01, pedicel: 0.02, fruit: { length: 0.055, radius: 0.03, profile: 'round', radial: 8, rings: 7, speckle: 0.04 } }), color: [[0.3, '#8aa040'], [0.55, '#9aa448'], [0.7, '#a0503a'], [0.85, '#6e1e2e'], [1, '#5a1428']], roughness: 0.4 }], perTree: 110, heights: [-0.85, 0.55], outward: 0, window: [0.26, 0.7] },
    }),
    stages: [[0, 'Dormant', 'Jan'], [0.1, 'Blossom', 'Feb'], [0.3, 'Fruit set', 'Mar'], [0.52, 'Fruit growth', 'Apr'], [0.75, 'Colouring', 'Jun'], [0.88, 'Ripe', 'Jul']],
    showcase: 0.9,
  },

  apricot: {
    build: orchard({
      budget: { leaves: 1.2e6, flowers: 5.5e5 },
      layout: { cols: 4, rows: 4, spacing: 6 },
      tree: { height: 5, width: 5.2, crownDepth: 3.6, crown: 'spreading', trunk: 0.9, trunkRadius: 0.15, branches: 3, twigs: 5, spurs: 8, bark: '#4e3c34', under: -0.6, minLeafY: 0.8, coreColor: '#284a1e', core: 0.35 },
      leaves: { cluster: temperateLeaves({ length: 0.08, width: 0.065, shape: 'oval' }), cover: 0.55, color: [[0, '#9cbc58'], [0.3, '#4e8030'], [1, '#4a7a2c']], grow: deciduous(0.14, 0.36), roughness: 0.5 },
      flowers: springBlossom('#fbe0e4', '#e8c060', 4, 0.018, 850),
      fruit: { layers: [{ geometry: (r) => latheFruit(r, { length: 0.05, radius: 0.03, profile: 'round', stalk: 0.008, radial: 8, rings: 7, blush: '#ff6040', blushAmount: 0.45, speckle: 0.05 }), color: [[0.3, '#90a440'], [0.6, '#b4b048'], [0.75, '#e8a838'], [0.88, '#f0902a'], [1, '#ee8a26']], roughness: 0.7 }], perTree: 170, heights: [-0.85, 0.55], outward: 0, window: [0.26, 0.7] },
    }),
    stages: [[0, 'Dormant', 'Feb'], [0.1, 'Blossom', 'Mar'], [0.3, 'Fruit set', 'Apr'], [0.52, 'Fruit growth', 'May'], [0.75, 'Colouring', 'Jun'], [0.88, 'Ripe', 'Jul']],
    showcase: 0.9,
  },

  walnut: {
    build: orchard({
      layout: { cols: 3, rows: 3, spacing: 12 },
      tree: { height: 12, width: 11, crownDepth: 8, crown: 'spreading', trunk: 2.6, trunkRadius: 0.4, limbs: 5, bark: '#6c6458', barkOptions: { grain: 0.3 }, under: -0.55, minLeafY: 2.6, coreColor: '#1a3414' },
      leaves: { cluster: (r) => pinnate(r, { fronds: 2, rachis: 0.4, pairs: 3, leafletLength: 0.17, leafletWidth: 0.07, terminal: true }), cover: 0.55, color: [[0, '#8aa848'], [0.25, '#4e7a30'], [1, '#466e2c']], grow: (g) => lerp(0.35, 1, smooth(-0.05, 0.22, g)), roughness: 0.6 },
      flowers: { geometry: (r) => podCluster(r, { count: 2, length: 0.1, radius: 0.007, curl: 0.3, lumps: 0.15, seeds: 12, hub: 0.005, radial: 5, tubular: 5, spread: 0.3 }), perTree: 300, hang: true, heights: [-0.6, 0.6], outward: 0.04, window: atStart(0.14, 0.26), color: '#a8a860', roughness: 0.8 },
      fruit: { layers: [{ geometry: (r) => fruitCluster(r, { count: 2, spread: 0.04, hub: 0.015, pedicel: 0.01, fruit: { length: 0.06, radius: 0.033, profile: 'round', radial: 8, rings: 7, speckle: 0.2 } }), color: [[0.25, '#6e9a3a'], [0.7, '#6a9638'], [0.85, '#7a8a3a'], [1, '#6a6034']], roughness: 0.6 }], perTree: 160, heights: [-0.8, 0.5], outward: 0.01, window: [0.2, 0.62] },
      camera: { position: V(21.5, 4.6, 26.5), target: V(7.8, 5.2, 9) },
    }),
    stages: [[0, 'Leaf out', 'Apr'], [0.18, 'Catkins and flowers', 'Apr'], [0.4, 'Nut growth', 'Jun'], [0.7, 'Hardening', 'Aug'], [0.88, 'Husks split', 'Sep']],
    showcase: 0.8,
  },

  almond: {
    build: orchard({
      budget: { leaves: 0.9e6, flowers: 9e5, fruit: 3e5 },
      layout: { cols: 4, rows: 4, spacing: 5.5 },
      tree: { height: 5, width: 4.8, crownDepth: 3.6, crown: 'open', trunk: 0.8, trunkRadius: 0.13, branches: 3, twigs: 5, spurs: 8, bark: '#6e5e52', under: -0.65, minLeafY: 0.8, coreColor: '#2c4c22', core: 0.35 },
      leaves: { cluster: temperateLeaves({ length: 0.1, width: 0.025, shape: 'lance' }), cover: 0.5, color: [[0, '#9cbc58'], [0.35, '#5a8a36'], [1, '#52803a']], grow: deciduous(0.16, 0.38), roughness: 0.55 },
      flowers: { ...springBlossom('#f6d9df', '#c8406a', 3, 0.033, 1700), shellShare: 0.4, allBranches: true },
      fruit: { place: 'twig', along: [0.15, 0.95], layers: [{ geometry: (r) => latheFruit(r, { length: 0.05, radius: 0.02, profile: 'oval', stalk: 0.006, radial: 8, rings: 6, flatten: 0.75, speckle: 0.05 }), color: [[0.3, '#88a854'], [0.7, '#8eaa5a'], [0.85, '#a8a060'], [1, '#9a8a5a']], roughness: 0.85 }], perTree: 220, window: [0.24, 0.6] },
    }),
    stages: [[0, 'Dormant', 'Feb'], [0.1, 'Blossom', 'Mar'], [0.3, 'Fruit set', 'Apr'], [0.55, 'Green fruit', 'May'], [0.78, 'Hulls split', 'Jul'], [0.9, 'Harvest', 'Aug']],
    showcase: 0.1,
  },

  cashew: {
    build: (ctx) => {
      const appleScale = (g) => lerp(0.22, 1, smooth(0.42, 0.75, g)) * smooth(0.12, 0.22, g)
      return buildTreeOrchard(ctx, {
        layout: { cols: 3, rows: 3, spacing: 8 },
        tree: { height: 5.5, width: 7.5, crownDepth: 4, crown: 'spreading', trunk: 0.6, trunkRadius: 0.22, limbs: 5, droop: 0.5, bark: '#6a5a4c', under: -0.75, minLeafY: 0.3, coreColor: '#1c3815' },
        leaves: { cluster: (r) => whorl(r, { leaves: 6, length: 0.17, width: 0.09, shape: 'oval', segments: 3 }), cover: 0.65, color: '#3a6a28', flushColor: '#8a5a3a', flushShare: 0.12, roughness: 0.4 },
        flowers: { geometry: (r) => floretCluster(r, { florets: 14, height: 0.12, radius: 0.07, size: 0.008, color: '#ecc0b0' }), perTree: 220, heights: [-0.3, 1], outward: 0.04, window: atStart(0.14, 0.26), color: '#f4d0c4' },
        fruit: {
          scale: appleScale, perTree: 120, heights: [-0.8, 0.5], outward: 0.02,
          layers: [
            { geometry: (r) => latheFruit(r, { length: 0.07, radius: 0.03, profile: 'bell', stalk: 0.03, radial: 9, rings: 7, speckle: 0.05 }), color: [[0.3, '#8aa048'], [0.5, '#a0a848'], [0.68, '#d8b03a'], [0.82, '#e0662e'], [1, '#d83a2a']], roughness: 0.35 },
            {
              geometry: (r) => podCluster(r, { count: 1, length: 0.034, radius: 0.012, curl: 2.2, spread: 0, hub: 0.1, stem: false, radial: 7, tubular: 6, flatten: 0.8 }),
              pivot: V(0, -0.1, 0),
              scale: (g) => smooth(0.15, 0.42, g) / Math.max(0.05, appleScale(g)),
              color: [[0.15, '#7a9a48'], [0.5, '#8a9a50'], [0.8, '#8a8a60'], [1, '#7a7058']], roughness: 0.6,
            },
          ],
        },
      })
    },
    stages: [[0, 'Flowering', 'Dec'], [0.2, 'Nut set', 'Jan'], [0.4, 'Nut growth', 'Feb'], [0.62, 'Apple swelling', 'Mar'], [0.84, 'Ripe, nuts fall', 'Apr']],
    showcase: 0.88,
  },

  kiwi: {
    build: (ctx) => buildVineRoof(ctx, {
      kind: 'tbar', width: 22, depth: 24, rowGap: 4.5, plantGap: 5, height: 1.85, postGap: 5, tbarWidth: 1.8, postColor: '#a8a296', barkColor: '#5e4a38',
      leaves: { cluster: (r) => lobedCluster(r, { leaves: 3, stem: 0.1, leaf: { size: 0.2, lobes: 1, lobeWidth: 0.95, shape: 'oval', petiole: 0.08, segments: 4, rise: 0.25, droop: 0.7, fold: 0.1 } }), cover: 0.85, color: [[0, '#9ab850'], [0.25, '#5e8a34'], [1, '#4a7a2c']], grow: deciduous(0, 0.25), under: 0.25, roughness: 0.7 },
      coreColor: '#2c4c1f',
      flowers: { geometry: (r) => blossom(r, { petals: 6, radius: 0.026, cup: 0.3, centre: '#e8c040', centreSize: 0.45 }), perPlant: 45, window: [0.14, 0.2, 0.3, 0.36], color: '#f8f0d4', roughness: 0.6 },
      fruit: { layers: [{ geometry: (r) => fruitCluster(r, { count: 3, spread: 0.05, hub: 0.03, pedicel: 0.03, drop: 0.03, fruit: { length: 0.08, radius: 0.033, profile: 'oval', radial: 8, rings: 6, speckle: 0.2 } }), color: [[0.3, '#8a9a5a'], [0.6, '#8a7a50'], [0.8, '#7a6040'], [1, '#74583c']], roughness: 0.95 }], perPlant: 70, window: [0.3, 0.75] },
      camera: { position: V(5.3, 1.35, 11.2), target: V(4.5, 1.62, 0) },
    }),
    stages: [[0, 'Bud break', 'Mar'], [0.16, 'Flowering', 'Apr'], [0.34, 'Fruit set', 'May'], [0.55, 'Fruit growth', 'Jul'], [0.78, 'Maturing', 'Sep'], [0.9, 'Harvest', 'Oct']],
    showcase: 0.88,
  },

  'dragon-fruit': {
    build: buildDragonFruit,
    stages: [[0, 'Vegetative', 'Apr'], [0.16, 'Flower buds', 'May'], [0.3, 'Night flowering', 'Jun'], [0.48, 'Fruit growth', 'Jul'], [0.72, 'Colouring', 'Aug'], [0.88, 'Ready to harvest', 'Sep']],
    showcase: 0.88,
  },

  avocado: {
    build: orchard({
      layout: { cols: 3, rows: 3, spacing: 9 },
      tree: { height: 9, width: 7, crownDepth: 7, crown: 'round', trunk: 1.5, trunkRadius: 0.26, limbs: 5, bark: '#5a4e42', under: -0.6, minLeafY: 1.2, coreColor: '#142c10' },
      leaves: { cluster: (r) => whorl(r, { leaves: 6, length: 0.2, width: 0.085, shape: 'lance', segments: 3 }), cover: 0.7, color: '#2f5a24', roughness: 0.4 },
      flowers: { geometry: (r) => floretCluster(r, { florets: 14, height: 0.1, radius: 0.06, size: 0.007, color: '#e0e0a0' }), perTree: 300, heights: [-0.3, 1], outward: 0.04, window: atStart(0.12, 0.24), color: '#e8e8b0' },
      fruit: { layers: [{ geometry: (r) => latheFruit(r, { length: 0.13, radius: 0.045, profile: 'avocado', stalk: 0.07, radial: 9, rings: 8, speckle: 0.15 }), color: [[0.2, '#6e9a3a'], [0.7, '#4e7a2c'], [1, '#3f6a27']], roughness: 0.5 }], perTree: 90, heights: [-0.8, 0.4], outward: 0.02, window: [0.16, 0.66] },
    }),
    stages: [[0, 'Flowering', 'Feb'], [0.2, 'Fruit set', 'Mar'], [0.45, 'Fruit growth', 'May'], [0.72, 'Maturing', 'Jul'], [0.88, 'Ready to pick', 'Aug']],
    showcase: 0.86,
  },

  fig: {
    build: orchard({
      layout: { cols: 5, rows: 5, spacing: 4.5 },
      tree: { height: 3.5, width: 4.4, crownDepth: 2.8, crown: 'spreading', stems: 3, trunk: 0.3, trunkRadius: 0.08, branches: 3, twigs: 3, bark: '#61564a', barkOptions: { grain: 0.18 }, under: -0.6, minLeafY: 0.4, coreColor: '#1e3a17', core: 0.85 },
      leaves: { cluster: (r) => lobedCluster(r, { leaves: 3, stem: 0.1, leaf: { size: 0.16, lobes: 5, spread: 1.0, lobeWidth: 0.4, shape: 'oval', petiole: 0.06, segments: 3, rise: 0.25, droop: 0.55 } }), cover: 0.6, color: '#3f6e2c', roughness: 0.75 },
      fruit: { layers: [{ geometry: (r) => latheFruit(r, { length: 0.06, radius: 0.03, profile: 'teardrop', stalk: 0.012, radial: 8, rings: 7, speckle: 0.1 }), color: [[0.2, '#7a9a40'], [0.6, '#86a048'], [0.75, '#8a7048'], [0.88, '#6a3a4a'], [1, '#5a2e44']], roughness: 0.6 }], perTree: 70, heights: [-0.6, 0.7], outward: 0.02, window: [0.12, 0.6] },
    }),
    stages: [[0, 'Pruning and new leaves', 'Oct'], [0.2, 'Fruit set', 'Nov'], [0.45, 'Fruit growth', 'Jan'], [0.7, 'Colouring', 'Feb'], [0.86, 'Ripe', 'Mar']],
    showcase: 0.86,
  },

  bael: {
    build: orchard({
      layout: { cols: 3, rows: 3, spacing: 8 },
      tree: { height: 7.5, width: 6.5, crownDepth: 5, crown: 'round', trunk: 1.6, trunkRadius: 0.22, limbs: 5, thorns: 120, bark: '#665a4e', under: -0.6, minLeafY: 1.4, coreColor: '#1c3616', core: 0.9 },
      leaves: { cluster: (r) => pinnate(r, { fronds: 4, rachis: 0.07, pairs: 1, leafletLength: 0.11, leafletWidth: 0.05, terminal: true, angle: 1.3, segments: 2 }), cover: 0.55, color: [[0, '#4a7a30'], [0.78, '#4a7a30'], [0.92, '#9a9a3a'], [1, '#a8984a']], grow: (g) => 1 - 0.6 * smooth(0.82, 0.98, g), roughness: 0.55 },
      flowers: { geometry: (r) => blossomSpur(r, { flowers: 3, radius: 0.014, cup: 0.5, centre: '#e0d890', spread: 0.03 }), perTree: 150, heights: [-0.5, 1], outward: 0.05, window: atStart(0.12, 0.24), color: '#eef0d8' },
      fruit: { layers: [{ geometry: (r) => latheFruit(r, { length: 0.15, radius: 0.078, profile: 'round', stalk: 0.04, stalkRadius: 0.005, radial: 12, rings: 9, speckle: 0.12 }), color: [[0.2, '#6a8a3a'], [0.6, '#6e8e3c'], [0.8, '#9a9a48'], [1, '#c4b054']], roughness: 0.6 }], perTree: 35, heights: [-0.85, 0.5], outward: 0.03, window: [0.14, 0.62] },
    }),
    stages: [[0, 'Flowering', 'May'], [0.2, 'Fruit set', 'Jun'], [0.45, 'Fruit growth', 'Sep'], [0.72, 'Hardening', 'Jan'], [0.88, 'Ripe, leaves fall', 'Apr']],
    showcase: 0.8,
  },

  tamarind: {
    build: orchard({
      layout: { cols: 2, rows: 2, spacing: 13 },
      tree: { height: 13, width: 12.5, crownDepth: 9, crown: 'round', trunk: 2.6, trunkRadius: 0.55, limbs: 6, bark: '#4a3e34', barkOptions: { grain: 0.45 }, under: -0.55, minLeafY: 2.8, coreColor: '#24431a' },
      leaves: { cluster: (r) => featherCluster(r, { fronds: 4, length: 0.3, pairs: 10, leafletLength: 0.065, leafletWidth: 0.024, forward: 0.2, taper: 0.15, segments: 4 }), cover: 0.55, color: '#3d6a2a', roughness: 0.6 },
      flowers: { geometry: (r) => floretCluster(r, { florets: 8, height: 0.06, radius: 0.04, size: 0.008, color: '#f0d880' }), perTree: 200, heights: [-0.5, 0.8], outward: 0.04, window: atStart(0.12, 0.24), color: '#f4dc8a' },
      fruit: { layers: [{ geometry: (r) => podCluster(r, { count: 4, length: 0.15, radius: 0.012, curl: 0.9, lumps: 0.18, seeds: 7, flatten: 0.55, hub: 0.02 }), color: [[0.2, '#7a9a48'], [0.5, '#8a9450'], [0.7, '#8a7650'], [0.85, '#7a5a3c'], [1, '#6e4e34']], roughness: 0.8 }], perTree: 220, heights: [-0.95, 0.3], outward: 0.02, window: [0.16, 0.6] },
      camera: { position: V(17.5, 4.0, 21.5), target: V(5.5, 5.6, 6.8) },
    }),
    stages: [[0, 'Flowering', 'Jun'], [0.2, 'Pod set', 'Jul'], [0.45, 'Green pods', 'Sep'], [0.72, 'Pods browning', 'Jan'], [0.88, 'Ripe pods', 'Mar']],
    showcase: 0.88,
  },

  kokum: {
    build: orchard({
      layout: { cols: 4, rows: 4, spacing: 7 },
      tree: { height: 8, width: 5.2, crownDepth: 6.4, crown: 'oval', trunk: 1.0, trunkRadius: 0.18, limbs: 5, bark: '#4a3e36', under: -0.7, minLeafY: 0.6, coreColor: '#183a14' },
      leaves: { cluster: (r) => whorl(r, { leaves: 7, length: 0.13, width: 0.045, shape: 'lance', segments: 3 }), cover: 0.75, color: '#336628', flushColor: '#6e4a32', flushShare: 0.03, roughness: 0.3 },
      flowers: { geometry: (r) => floretCluster(r, { florets: 4, height: 0.03, radius: 0.025, size: 0.01, color: '#f0d0c8' }), perTree: 150, heights: [-0.8, 0.8], outward: 0.03, window: atStart(0.12, 0.24), color: '#f4d8d0' },
      fruit: { layers: [{ geometry: (r) => latheFruit(r, { length: 0.06, radius: 0.033, profile: 'round', stalk: 0.02, radial: 9, rings: 7, speckle: 0.06 }), color: [[0.2, '#7aa040'], [0.55, '#88a048'], [0.7, '#a05a4a'], [0.85, '#7a2248'], [1, '#6a1a40']], roughness: 0.35 }], perTree: 110, heights: [-0.95, 0.7], outward: 0.01, window: [0.14, 0.6] },
    }),
    stages: [[0, 'Flowering', 'Jan'], [0.2, 'Fruit set', 'Feb'], [0.45, 'Green fruit', 'Mar'], [0.7, 'Turning purple', 'Apr'], [0.86, 'Ripe', 'May']],
    showcase: 0.88,
  },

  'passion-fruit': {
    build: (ctx) => buildVineRoof(ctx, {
      kind: 'wall', width: 18, depth: 22, rowGap: 2.5, plantGap: 3, height: 2.0, postGap: 4, postColor: '#a8a296', barkColor: '#6a6448',
      leaves: { cluster: (r) => lobedCluster(r, { leaves: 3, stem: 0.1, leaf: { size: 0.16, lobes: 3, spread: 0.7, lobeWidth: 0.42, shape: 'oval', petiole: 0.06, segments: 3, rise: 0.2, droop: 0.6 } }), cover: 1.0, under: 0.3, color: '#2f6224', roughness: 0.4 },
      coreColor: '#284a1e',
      flowers: { geometry: (r) => passionFlower(r, { radius: 0.045 }), perPlant: 20, window: atStart(0.14, 0.26), color: '#ffffff', roughness: 0.6 },
      fruit: { layers: [{ geometry: (r) => latheFruit(r, { length: 0.07, radius: 0.036, profile: 'round', stalk: 0.05, radial: 9, rings: 7, speckle: 0.15 }), color: [[0.15, '#6a9a3a'], [0.55, '#6e9a3c'], [0.7, '#6a4a5a'], [0.85, '#4a2a48'], [1, '#3e2240']], roughness: 0.4 }], perPlant: 30, window: [0.12, 0.6] },
      camera: { position: V(11.5, 1.9, 15.8), target: V(2.5, 1.35, 4.5) },
    }),
    stages: [[0, 'Flowering', 'Apr'], [0.2, 'Fruit set', 'May'], [0.42, 'Fruit growth', 'Jun'], [0.66, 'Colouring', 'Jul'], [0.85, 'Ready to harvest', 'Aug']],
    showcase: 0.86,
  },

  drumstick: {
    build: orchard({
      layout: { cols: 4, rows: 4, spacing: 5 },
      tree: { height: 7, width: 5, crownDepth: 4.2, crown: 'clumps', trunk: 1.3, trunkRadius: 0.14, limbs: 4, branches: 3, twigs: 3, droop: 0.3, bark: '#6c6458', barkOptions: { grain: 0.25 }, under: -0.6, minLeafY: 1.6, core: 0 },
      leaves: { cluster: (r) => featherCluster(r, { fronds: 2, length: 0.4, pairs: 4, sub: { length: 0.12, pairs: 3, leafletLength: 0.024, leafletWidth: 0.016, terminal: true, forward: 0.3, taper: 0.1, segments: 3 }, rise: [0.2, 0.6], droop: [0.6, 1.0] }), cover: 0.3, color: '#5a8a3a', roughness: 0.65 },
      flowers: { geometry: (r) => floretCluster(r, { florets: 14, height: 0.14, radius: 0.08, size: 0.011, color: '#f6f2dc', droop: 0.04 }), place: 'twig', perTree: 130, window: atStart(0.14, 0.28), color: '#fbf8e8' },
      fruit: {
        place: 'twig', along: [0.3, 1], perTree: 70,
        scale: (g) => { const k = smooth(0.15, 0.7, g); return [Math.pow(k, 0.4), k, Math.pow(k, 0.4)] },
        layers: [{ geometry: (r) => podCluster(r, { count: 2, length: 0.45, radius: 0.013, curl: 0.25, ridges: 0.18, spread: 0.2, radial: 6, tubular: 8, hub: 0.01 }), color: [[0.15, '#7aa048'], [0.6, '#6a9a3e'], [1, '#6c983c']], roughness: 0.5 }],
      },
    }),
    stages: [[0, 'Flowering', 'Jan'], [0.2, 'Pod set', 'Feb'], [0.45, 'Pods lengthen', 'Mar'], [0.72, 'Tender pods', 'Apr'], [0.88, 'Harvest', 'May']],
    showcase: 0.86,
  },
}
