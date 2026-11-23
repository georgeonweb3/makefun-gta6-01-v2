// Solmar Bay — every tuning number, colour and name in one place.
// The city is a fixed 2400x2400 world; the renderer scales the view to the
// window, so no rule below depends on the screen size.
export const STEP = 1 / 60;

export const WORLD = { size: 2400, roadGap: 300, roadWidth: 72, beachY: 2220 };

export const PLAYER = {
  radius: 14,
  walkSpeed: 170,
  runSpeed: 265,
  health: 100,
  punchDamage: 12,
  punchRange: 34,
  punchRate: 0.38,
};

export const CAR = {
  length: 46,
  width: 24,
  radius: 20,
  accel: 300,
  brake: 620,
  reverseAccel: 200,
  maxSpeed: 460,
  maxReverse: 170,
  turnRate: 2.9,
  drag: 0.55,
  grip: 6.5,
  health: 100,
};

export const TRAFFIC = { count: 24, speedMin: 110, speedMax: 185, respawnDist: 900 };
export const PEDS = { count: 36, speedMin: 28, speedMax: 62 };

export const WANTED = {
  // heat points that each star needs; heat decays when the law loses sight of you
  thresholds: [0, 25, 60, 120, 200, 320],
  copCars: [0, 1, 2, 3, 4, 5],
  copPeds: [0, 0, 1, 2, 3, 4],
  decayPerSec: 3.5,
  decayDelay: 4,
  bustDist: 30,
  bustTime: 1.6,
};

export const WEAPONS = {
  fists: { name: 'Fists', damage: 12, rate: 0.38, range: 36, ammo: Infinity },
  pistol: { name: 'Pistol', damage: 26, rate: 0.28, range: 340, ammo: 60 },
};

export const MISSION_REWARDS = [150, 250, 400, 600, 500, 800, 1200, 2500];

export const DISTRICTS = [
  { name: 'Old Port', x0: 0, y0: 0, x1: 800, y1: 800, tint: '#7a6a55' },
  { name: 'Downtown', x0: 800, y0: 0, x1: 1600, y1: 800, tint: '#5a6a7a' },
  { name: 'The Docks', x0: 1600, y0: 0, x1: 2400, y1: 800, tint: '#6a5a4a' },
  { name: 'Palm Court', x0: 0, y0: 800, x1: 800, y1: 1600, tint: '#7a7a5a' },
  { name: 'Neon Strip', x0: 800, y0: 800, x1: 1600, y1: 1600, tint: '#8a5a7a' },
  { name: 'Little Bay', x0: 1600, y0: 800, x1: 2400, y1: 1600, tint: '#5a7a6a' },
  { name: 'South Beach', x0: 0, y0: 1600, x1: 2400, y1: 2400, tint: '#a08a5a' },
];

export const CAR_COLORS = [
  '#d94f3d', '#3d7ad9', '#e8b73a', '#4caf6d', '#8e44ad', '#e8e8e8',
  '#222831', '#d97b3d', '#3dd9c2', '#c23d7a', '#7a9e3d', '#b03a3a',
];

export const PED_COLORS = ['#e8c39e', '#c98d5f', '#8a5a3b', '#5a3a28', '#e8b88a', '#a06a45'];

export const PALETTE = {
  grass: '#3f7a44',
  park: '#2f6a34',
  road: '#2b2f36',
  roadLine: '#d8c95a',
  sidewalk: '#8a8f98',
  sand: '#d9c27a',
  water: '#2a6a9e',
  waterDeep: '#1f4e78',
  buildingRoof: '#6a6f7a',
  text: '#f2f4f6',
  muted: '#aab2bd',
  gold: '#f2c94c',
  red: '#e5534b',
  blue: '#4fc3f7',
  panel: 'rgba(12, 16, 24, 0.78)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where progress is kept between visits (this browser only). */
export const SAVE_KEY = 'solmar-bay.save.v1';
export const BEST_KEY = 'solmar-bay.best.v1';
