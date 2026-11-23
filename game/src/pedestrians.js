// Pedestrians: they walk the sidewalks, cross at corners, and run when
// scared — a gunshot, a crash or a car mounting the pavement near them.
import { PEDS, PED_COLORS } from './config.js';
import { clamp, dist2 } from './random.js';

export function createPedestrians(city, random) {
  const peds = [];
  function spawn(x, y, exact) {
    const p = exact ? { x, y, vertical: true } : city.randomRoadNear(x, y, 900, random);
    // Step off the road onto the sidewalk (exact spawns stay put).
    const ox = exact ? 0 : (p.vertical ? 52 : 0);
    const oy = exact ? 0 : (p.vertical ? 0 : 52);
    const ped = {
      x: p.x + (random.chance(0.5) ? ox : -ox),
      y: p.y + (random.chance(0.5) ? oy : -oy),
      angle: random.range(0, Math.PI * 2),
      speed: random.range(PEDS.speedMin, PEDS.speedMax),
      color: random.pick(PED_COLORS),
      shirt: random.pick(['#d94f3d', '#3d7ad9', '#e8b73a', '#4caf6d', '#8e44ad', '#e8e8e8']),
      state: 'walk', panic: 0, target: null, dead: false,
    };
    peds.push(ped);
    return ped;
  }

  function scare(x, y, radius) {
    for (const ped of peds) {
      if (ped.dead) continue;
      if (dist2(ped.x, ped.y, x, y) < radius * radius) {
        ped.state = 'flee';
        ped.panic = 3 + random.range(0, 2);
        ped.target = { x: ped.x + (ped.x - x), y: ped.y + (ped.y - y) };
      }
    }
  }

  function update(dt, px, py) {
    for (let i = peds.length - 1; i >= 0; i -= 1) {
      const ped = peds[i];
      if (ped.dead) { peds.splice(i, 1); continue; }
      if (ped.state !== 'stand' && dist2(ped.x, ped.y, px, py) > 1000 * 1000) {
        peds.splice(i, 1);
        spawn(px, py);
        continue;
      }
      if (ped.panic > 0) {
        ped.panic -= dt;
        if (ped.panic <= 0) ped.state = 'walk';
      }
      if (ped.state === 'stand') continue; // e.g. Sal the debtor, waiting
      if (ped.state === 'flee' && ped.target) {
        ped.angle = Math.atan2(ped.target.y - ped.y, ped.target.x - ped.x);
        ped.speed = 210;
      } else {
        ped.speed = ped.speed || 45;
        // Wander: pick a new heading now and then, staying near roads.
        if (random.chance(dt * 0.12)) ped.angle = random.range(0, Math.PI * 2);
      }
      const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
      const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
      const fixed = city.collideCircle(nx, ny, 10);
      const c = city.clampToCity(fixed.x, fixed.y, 24);
      ped.x = c.x; ped.y = c.y;
    }
    while (peds.length < PEDS.count) spawn(px, py);
  }

  for (let i = 0; i < PEDS.count; i += 1) spawn(1200, 1200);
  return { peds, update, spawn, scare };
}
