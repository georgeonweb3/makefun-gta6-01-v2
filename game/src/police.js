// The wanted system: heat rises with crime, stars follow the heat, and the
// law comes in cars and on foot. Lose them by breaking line of sight and
// staying quiet; get caught on foot and you are busted.
import { CAR, WANTED, WORLD } from './config.js';
import { angleDiff, clamp, dist2 } from './random.js';
import { driveCar, makeCar } from './vehicles.js';

export function starsForHeat(heat) {
  let stars = 0;
  for (let i = 0; i < WANTED.thresholds.length; i += 1) {
    if (heat >= WANTED.thresholds[i]) stars = i;
  }
  return stars;
}

export function createPolice(city, random) {
  const copCars = [];
  const copPeds = [];
  let bustProgress = 0;

  function spawnCopCar(px, py) {
    const angle = random.range(0, Math.PI * 2);
    const x = clamp(px + Math.cos(angle) * 650, 60, WORLD.size - 60);
    const y = clamp(py + Math.sin(angle) * 650, 60, WORLD.beachY - 40);
    // Spawn on a road, never inside a block.
    const road = city.nearestRoadPoint(x, y);
    const car = makeCar(road.x, road.y, Math.atan2(py - road.y, px - road.x), '#20242c', 'police');
    car.traffic = false;
    car.cruise = 430;
    copCars.push(car);
    return car;
  }

  function spawnCopPed(px, py) {
    const angle = random.range(0, Math.PI * 2);
    const cop = {
      x: clamp(px + Math.cos(angle) * 420, 40, WORLD.size - 40),
      y: clamp(py + Math.sin(angle) * 420, 40, WORLD.beachY + 100),
      angle: 0, speed: 235, color: '#e8c39e', shirt: '#20242c', state: 'chase', panic: 0, target: null, dead: false,
    };
    copPeds.push(cop);
    return cop;
  }

  function update(dt, game) {
    const stars = game.wanted;
    const px = game.player.x; const py = game.player.y;
    const wantCars = WANTED.copCars[stars] || 0;
    const wantPeds = WANTED.copPeds[stars] || 0;

    // Heat decays only once the player has been quiet and unseen for a while.
    const anyCopNear = copCars.some((c) => dist2(c.x, c.y, px, py) < 520 * 520)
      || copPeds.some((c) => dist2(c.x, c.y, px, py) < 420 * 420);
    if (!anyCopNear) {
      game.quietTime += dt;
      if (game.quietTime > WANTED.decayDelay) {
        game.heat = Math.max(0, game.heat - WANTED.decayPerSec * dt);
      }
    } else {
      game.quietTime = 0;
    }
    game.wanted = starsForHeat(game.heat);

    while (copCars.length < wantCars) spawnCopCar(px, py);
    while (copPeds.length < wantPeds) spawnCopPed(px, py);

    // Cop cars: pursuit steering, faster than traffic, ramming the player.
    // They steer around buildings: if a wall is straight ahead, head for
    // the nearest road point to the player (or to themselves) instead.
    for (let i = copCars.length - 1; i >= 0; i -= 1) {
      const car = copCars[i];
      if (car.dead) { copCars.splice(i, 1); continue; }
      const tx = game.playerCar ? game.playerCar.x : px;
      const ty = game.playerCar ? game.playerCar.y : py;
      let want = Math.atan2(ty - car.y, tx - car.x);
      const aheadX = car.x + Math.cos(car.angle) * 70;
      const aheadY = car.y + Math.sin(car.angle) * 70;
      if (city.hitsBuilding(aheadX, aheadY, 18)) {
        const rp = city.nearestRoadPoint(tx, ty);
        want = Math.atan2(rp.y - car.y, rp.x - car.x);
        const ahead2X = car.x + Math.cos(want) * 70;
        const ahead2Y = car.y + Math.sin(want) * 70;
        if (city.hitsBuilding(ahead2X, ahead2Y, 18)) {
          const mine = city.nearestRoadPoint(car.x, car.y);
          want = Math.atan2(mine.y - car.y, mine.x - car.x);
        }
      }
      const turn = clamp(angleDiff(car.angle, want), -1, 1);
      const throttle = car.speed < car.cruise ? 1 : 0.4;
      driveCar(car, { throttle, steer: turn }, dt, city);
      // Ram the player's car.
      if (game.playerCar) {
        const d = dist2(car.x, car.y, game.playerCar.x, game.playerCar.y);
        if (d < 44 * 44) {
          game.playerCar.health -= 4 * dt;
          game.playerCar.speed *= 0.985;
          game.addShake(2);
        }
      }
      if (dist2(car.x, car.y, px, py) > 1400 * 1400) { copCars.splice(i, 1); continue; }
      if (game.wanted === 0) { copCars.splice(i, 1); }
    }

    // Foot cops: run the player down; touching the player on foot busts them.
    for (let i = copPeds.length - 1; i >= 0; i -= 1) {
      const cop = copPeds[i];
      if (cop.dead) { copPeds.splice(i, 1); continue; }
      cop.angle = Math.atan2(py - cop.y, px - cop.x);
      const nx = cop.x + Math.cos(cop.angle) * cop.speed * dt;
      const ny = cop.y + Math.sin(cop.angle) * cop.speed * dt;
      const fixed = city.collideCircle(nx, ny, 10);
      cop.x = fixed.x; cop.y = fixed.y;
      if (game.wanted === 0) { copPeds.splice(i, 1); continue; }
      if (!game.playerCar && dist2(cop.x, cop.y, px, py) < WANTED.bustDist * WANTED.bustDist) {
        bustProgress += dt;
        if (bustProgress >= WANTED.bustTime) {
          game.busted = true;
          bustProgress = 0;
        }
      } else {
        bustProgress = Math.max(0, bustProgress - dt * 2);
      }
    }
    game.bustProgress = bustProgress;
  }

  function clear() {
    copCars.length = 0;
    copPeds.length = 0;
    bustProgress = 0;
  }

  return { copCars, copPeds, update, clear, spawnCopCar, spawnCopPed };
}

/** Heat for a crime: stealing a car, hurting a pedestrian, killing a cop. */
export function crimeHeat(kind) {
  if (kind === 'steal') return 30;
  if (kind === 'assault') return 18;
  if (kind === 'kill') return 45;
  if (kind === 'copkill') return 90;
  return 10;
}
