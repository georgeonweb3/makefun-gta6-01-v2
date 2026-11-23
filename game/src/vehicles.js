// Cars: arcade driving for the player, road-following AI for traffic.
// A car is a position, a heading and a speed along that heading, with a
// little lateral slide so corners feel like drifting, not rails.
import { CAR, CAR_COLORS, TRAFFIC, WORLD } from './config.js';
import { angleDiff, clamp, dist2 } from './random.js';

let nextId = 1;

export function makeCar(x, y, angle, color, kind) {
  return {
    id: nextId, x, y, angle, speed: 0,
    color: color || '#d94f3d', kind: kind || 'sedan',
    health: CAR.health, traffic: false, driver: null,
    route: null, honk: 0, smoke: 0, dead: false,
  };
}

/** Arcade driving step for one car. `drive` is {throttle -1..1, steer -1..1}. */
export function driveCar(car, drive, dt, city) {
  const maxF = car.kind === 'sport' ? CAR.maxSpeed * 1.12 : CAR.maxSpeed;
  const maxR = CAR.maxReverse;
  if (drive.throttle > 0) car.speed += CAR.accel * drive.throttle * dt;
  else if (drive.throttle < 0) {
    if (car.speed > 8) car.speed -= CAR.brake * dt; // brake
    else car.speed += CAR.reverseAccel * drive.throttle * dt; // reverse
  } else {
    car.speed -= car.speed * CAR.drag * dt;
    if (Math.abs(car.speed) < 4) car.speed = 0;
  }
  car.speed = clamp(car.speed, -maxR, maxF);
  const steerAuthority = clamp(Math.abs(car.speed) / 140, 0, 1);
  car.angle += drive.steer * CAR.turnRate * steerAuthority * dt * (car.speed >= 0 ? 1 : -1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const hit = city.hitsBuilding(nx, ny, CAR.radius - 2);
  if (hit) {
    // Only a real impact hurts: a car wedged against a wall loses nothing.
    const impact = Math.abs(car.speed);
    if (impact > 60) {
      car.health -= impact * 0.02 + 2;
      car.smoke = 0.6;
    }
    car.speed *= -0.25;
  } else {
    car.x = nx; car.y = ny;
  }
  const c = city.clampToCity(car.x, car.y, 30);
  if (c.x !== car.x || c.y !== car.y) { car.x = c.x; car.y = c.y; car.speed *= 0.4; }
  if (car.smoke > 0) car.smoke -= dt;
  if (car.bumpCd > 0) car.bumpCd -= dt;
  if (car.health <= 0) { car.dead = true; car.speed = 0; }
}

function pickRoute(car, city, random) {
  const p = city.randomRoadNear(car.x, car.y, 700, random);
  // Drive along the road line: pick a far point on the same line.
  const vertical = p.vertical;
  const dir = random.chance(0.5) ? 1 : -1;
  const far = vertical
    ? { x: p.x, y: clamp(p.y + dir * random.range(400, 900), 60, WORLD.size - 60) }
    : { x: clamp(p.x + dir * random.range(400, 900), 60, WORLD.size - 60), y: p.y };
  return { target: far, vertical };
}

/** One traffic step: follow the road, turn at the target, never stop. */
function trafficStep(car, dt, city, random) {
  if (!car.route) car.route = pickRoute(car, city, random);
  const t = car.route.target;
  const want = Math.atan2(t.y - car.y, t.x - car.x);
  const turn = clamp(angleDiff(car.angle, want), -1, 1);
  const dist = Math.sqrt(dist2(car.x, car.y, t.x, t.y));
  const cruise = car.cruise || 150;
  const throttle = car.speed < cruise ? 1 : 0;
  driveCar(car, { throttle, steer: turn }, dt, city);
  if (dist < 60 || car.speed < 12) car.route = pickRoute(car, city, random);
}

export function createTraffic(city, random) {
  const cars = [];
  function spawn(x, y) {
    const p = city.randomRoadNear(x, y, 900, random);
    const angle = p.vertical ? (random.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (random.chance(0.5) ? 0 : Math.PI);
    const car = makeCar(p.x, p.y, angle, random.pick(CAR_COLORS), random.pick(['sedan', 'sedan', 'taxi', 'van', 'sport']));
    car.traffic = true;
    car.cruise = random.range(TRAFFIC.speedMin, TRAFFIC.speedMax);
    car.speed = car.cruise;
    cars.push(car);
    return car;
  }
  function update(dt, px, py, playerCar) {
    for (let i = cars.length - 1; i >= 0; i -= 1) {
      const car = cars[i];
      if (car.dead) { cars.splice(i, 1); continue; }
      const d = dist2(car.x, car.y, px, py);
      if (d > TRAFFIC.respawnDist * TRAFFIC.respawnDist) {
        cars.splice(i, 1);
        spawn(px, py);
        continue;
      }
      // Don't run over the player's parked car: slow when close to it.
      if (playerCar && playerCar !== car) {
        const pd = dist2(car.x, car.y, playerCar.x, playerCar.y);
        if (pd < 90 * 90 && car.speed > 60) car.speed = 60;
      }
      trafficStep(car, dt, city, random);
    }
    while (cars.length < TRAFFIC.count) spawn(px, py);
  }
  for (let i = 0; i < TRAFFIC.count; i += 1) spawn(1200, 1200);
  return { cars, update, spawn };
}

/** Circle collision between two cars: push apart, swap a little speed. */
export function collideCars(a, b) {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const d2 = dx * dx + dy * dy;
  const min = CAR.length * 0.82;
  if (d2 >= min * min || d2 === 0) return false;
  const d = Math.sqrt(d2);
  const push = (min - d) / 2;
  const nx = dx / d; const ny = dy / d;
  a.x -= nx * push; a.y -= ny * push;
  b.x += nx * push; b.y += ny * push;
  const avg = (a.speed + b.speed) / 2;
  a.speed = avg * 0.6; b.speed = avg * 0.6;
  // Damage at most once per bump, not once per frame of overlap.
  if ((a.bumpCd || 0) <= 0 && (b.bumpCd || 0) <= 0) {
    a.health -= 3; b.health -= 3;
    a.bumpCd = 0.35; b.bumpCd = 0.35;
  }
  return true;
}

/** Nearest car within `dist` of (x, y), preferring drivable ones. */
export function nearestCar(cars, x, y, dist) {
  let best = null; let bestD = dist * dist;
  for (const car of cars) {
    if (car.dead) continue;
    const d = dist2(car.x, car.y, x, y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}
