// The city of Solmar Bay: a 2400x2400 grid of roads and blocks, a park, a
// beach and the sea along the south edge. Pure data and geometry — no drawing
// and no browser in here — so the same seed always builds the same city.
import { DISTRICTS, WORLD } from './config.js';
import { clamp } from './random.js';

const ROOFS = ['#7a6f66', '#5f6a7a', '#8a7a5f', '#6a7a6f', '#7a5f6a', '#9a8a7a', '#4f5a6a'];
const WALLS = ['#c9b8a3', '#b8c4c9', '#d9c9a8', '#c9a8a8', '#a8b8c9', '#d9d9d9'];

function roadCenters() {
  const lines = [];
  for (let p = 150; p < WORLD.size; p += WORLD.roadGap) lines.push(p);
  return lines;
}

/** Is the point on a road (including the road's width)? */
export function onRoad(x, y) {
  const w = WORLD.roadWidth / 2;
  for (const c of roadCenters()) {
    if (Math.abs(x - c) <= w || Math.abs(y - c) <= w) return true;
  }
  return false;
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d;
  }
  return DISTRICTS[DISTRICTS.length - 1];
}

export function createCity(random) {
  const centers = roadCenters();
  const buildings = [];
  const trees = [];
  const parks = [];
  const labels = [];

  // One block per cell between roads. Most blocks hold 1-4 buildings; one
  // block is the park, one is the plaza by the Strip.
  for (let ix = 0; ix < centers.length; ix += 1) {
    for (let iy = 0; iy < centers.length; iy += 1) {
      const x0 = centers[ix] + WORLD.roadWidth / 2 + 8;
      const y0 = centers[iy] + WORLD.roadWidth / 2 + 8;
      const x1 = (centers[ix + 1] ?? WORLD.size) - WORLD.roadWidth / 2 - 8;
      const y1 = (centers[iy + 1] ?? WORLD.size) - WORLD.roadWidth / 2 - 8;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      if (cy > WORLD.beachY) continue; // beach, no buildings
      if (ix === 3 && iy === 3) {
        parks.push({ x0, y0, x1, y1 });
        for (let t = 0; t < 14; t += 1) {
          trees.push({ x: random.range(x0 + 14, x1 - 14), y: random.range(y0 + 14, y1 - 14), r: random.range(8, 13) });
        }
        continue;
      }
      if (ix === 4 && iy === 5) {
        parks.push({ x0, y0, x1, y1, plaza: true });
        continue;
      }
      const n = random.int(1, 3);
      for (let b = 0; b < n; b += 1) {
        const bw = random.range(56, 120);
        const bh = random.range(56, 120);
        const bx = random.range(x0, Math.max(x0 + 1, x1 - bw));
        const by = random.range(y0, Math.max(y0 + 1, y1 - bh));
        buildings.push({
          x: bx, y: by, w: bw, h: bh,
          roof: random.pick(ROOFS), wall: random.pick(WALLS),
          height: random.int(1, 5),
          windows: random.int(2, 5),
        });
      }
      if (random.chance(0.5)) {
        trees.push({ x: random.range(x0 + 10, x1 - 10), y: random.range(y0 + 10, y1 - 10), r: random.range(7, 11) });
      }
    }
  }

  // A row of palms along the beach road, so the south edge reads as a coast.
  for (let x = 100; x < WORLD.size - 60; x += 130) {
    trees.push({ x: x + random.range(-20, 20), y: WORLD.beachY - 42, r: random.range(9, 13) });
  }

  // Landmark labels for the map.
  labels.push({ x: 1200, y: 1200, text: 'NEON STRIP' });
  labels.push({ x: 450, y: 450, text: 'OLD PORT' });
  labels.push({ x: 1950, y: 450, text: 'THE DOCKS' });
  labels.push({ x: 1200, y: 2050, text: 'SOUTH BEACH' });

  /** Nearest point on a road centre-line to (x, y), for spawning cars. */
  function nearestRoadPoint(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const c of centers) {
      const d1 = Math.abs(x - c);
      if (d1 < bestD) { bestD = d1; best = { x: c, y: clamp(y, 40, WORLD.size - 40), vertical: true }; }
      const d2 = Math.abs(y - c);
      if (d2 < bestD) { bestD = d2; best = { x: clamp(x, 40, WORLD.size - 40), y: c, vertical: false }; }
    }
    return best;
  }

  /** A random point on a road near (x, y) (within `dist`), for spawning traffic. */
  function randomRoadNear(x, y, dist, rng) {
    for (let tries = 0; tries < 12; tries += 1) {
      const px = clamp(x + rng.range(-dist, dist), 60, WORLD.size - 60);
      const py = clamp(y + rng.range(-dist, dist), 60, WORLD.size - 60);
      const p = nearestRoadPoint(px, py);
      if (Math.abs(px - p.x) > 130 || Math.abs(py - p.y) > 130) continue;
      if (py > WORLD.beachY - 40) continue;
      return p;
    }
    return nearestRoadPoint(x + 200, y);
  }

  /** Circle-vs-building collision: returns the push-out for a circle at (x,y,r). */
  function collideCircle(x, y, r) {
    let px = x; let py = y;
    for (const b of buildings) {
      const cx = clamp(px, b.x, b.x + b.w);
      const cy = clamp(py, b.y, b.y + b.h);
      const dx = px - cx; const dy = py - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r * r || d2 === 0) {
        if (d2 === 0) { px = b.x - r; }
        continue;
      }
      const d = Math.sqrt(d2);
      px = cx + (dx / d) * r;
      py = cy + (dy / d) * r;
    }
    return { x: px, y: py };
  }

  function hitsBuilding(x, y, r) {
    for (const b of buildings) {
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
    }
    return false;
  }

  function clampToCity(x, y, margin) {
    return {
      x: clamp(x, margin, WORLD.size - margin),
      y: clamp(y, margin, WORLD.beachY + 130),
    };
  }

  return {
    buildings, trees, parks, labels, centers,
    nearestRoadPoint, randomRoadNear, collideCircle, hitsBuilding, clampToCity,
  };
}
