// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between title, play, paused,
// wasted, busted and win screens.
//
// ?seed=N fixes the city. ?shot=start|drive|chase|mission (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { CAR, PLAYER, STEP, WORLD } from './config.js';
import { createRandom, clamp, dist2 } from './random.js';
import { createCity, districtAt } from './world.js';
import {
  ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER, ACTION_PUNCH, ACTION_SHOOT,
  ACTION_WEAPON, createInput,
} from './input.js';
import { createAudio } from './audio.js';
import { createTraffic, driveCar, makeCar, nearestCar, collideCars } from './vehicles.js';
import { createPedestrians } from './pedestrians.js';
import { createPolice, crimeHeat, starsForHeat } from './police.js';
import { createCombat, weaponFor } from './combat.js';
import { createMissions, PACKAGE_SPOTS } from './missions.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER, SCREEN_BUSTED, SCREEN_WIN } from './render.js';
import { createHud } from './hud.js';
import { loadProgress, readBest, saveBest, saveProgress } from './save.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;
const HOSPITAL = { x: 1200, y: 900 };
const POLICE_STATION = { x: 1500, y: 900 };

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const random = createRandom(seed);
const city = createCity(random);
const input = createInput(canvas);
const audio = createAudio();
const renderer = createRenderer(canvas);
const hud = createHud();

const game = {
  time: 0,
  city, random, audio,
  camera: { x: 1150, y: 1050 },
  shake: 0,
  player: {
    x: 1150, y: 1050, angle: 0, health: PLAYER.health,
    money: 0, weapon: 'fists', ammo: 0, onFoot: true,
  },
  playerCar: null,
  parked: [],
  particles: [],
  heat: 0,
  wanted: 0,
  quietTime: 0,
  busted: false,
  bustProgress: 0,
  message: '',
  messageTime: 0,
  best: readBest(),
  stats: { kills: 0, carsStolen: 0, missionsDone: 0, packages: 0, cashEarned: 0 },
  lastDamage: -99,
  missionTimer: 0,
  nextMissionIn: -1,
  saved: null,
};

game.traffic = createTraffic(city, random);
game.peds = createPedestrians(city, random);
game.police = createPolice(city, random);
game.combat = createCombat(random);
game.missions = createMissions(city, random);

function addShake(amount) {
  game.shake = Math.min(14, game.shake + amount);
}

function addParticles(x, y, color, n) {
  for (let i = 0; i < n; i += 1) {
    game.particles.push({
      x, y,
      vx: random.range(-120, 120), vy: random.range(-120, 120),
      life: random.range(0.25, 0.6), maxLife: 0.6,
      color, size: random.range(2, 5),
    });
  }
}

function spawnParkedCars() {
  game.parked.length = 0;
  const spots = [
    { x: 1080, y: 1050, angle: 0, color: '#d94f3d' },
    { x: 1260, y: 1050, angle: Math.PI, color: '#3d7ad9' },
    { x: 1350, y: 1120, angle: Math.PI / 2, color: '#e8b73a' },
    { x: 1050, y: 1230, angle: -Math.PI / 2, color: '#4caf6d' },
    { x: 1950, y: 1350, angle: 0, color: '#8a8f98', kind: 'van' },
  ];
  for (const s of spots) {
    const car = makeCar(s.x, s.y, s.angle, s.color, s.kind || 'sedan');
    game.parked.push(car);
  }
}

function placePackages() {
  for (const spot of PACKAGE_SPOTS) {
    game.combat.spawnPickup(spot.x, spot.y, 'package', 200);
  }
  game.combat.spawnPickup(1350, 1350, 'health', 0);
  game.combat.spawnPickup(750, 750, 'ammo', 0);
  game.combat.spawnPickup(1950, 450, 'ammo', 0);
}

function reset() {
  game.time = 0;
  game.player.x = 1150; game.player.y = 1050; game.player.angle = 0;
  game.player.health = PLAYER.health; game.player.money = 0;
  game.player.weapon = 'fists'; game.player.ammo = 0;
  game.playerCar = null;
  game.parked.length = 0;
  game.particles.length = 0;
  game.heat = 0; game.wanted = 0; game.quietTime = 0;
  game.busted = false; game.bustProgress = 0;
  game.message = ''; game.messageTime = 0;
  game.stats = { kills: 0, carsStolen: 0, missionsDone: 0, packages: 0, cashEarned: 0 };
  game.lastDamage = -99;
  game.nextMissionIn = -1;
  game.camera.x = 1150; game.camera.y = 1050;
  game.traffic = createTraffic(city, random);
  game.peds = createPedestrians(city, random);
  game.police = createPolice(city, random);
  game.combat = createCombat(random);
  game.missions = createMissions(city, random);
  spawnParkedCars();
  placePackages();
}

function startMission(index) {
  const m = game.missions.start(index, game);
  if (!m) return;
  game.message = `${m.giver}: ${m.brief}`;
  game.messageTime = 6;
  audio.phone();
  status.textContent = `${m.title}: ${m.brief}`;
}

function allCars() {
  return [...game.traffic.cars, ...game.police.copCars, ...game.parked];
}

function enterNearestCar() {
  const car = nearestCar(allCars(), game.player.x, game.player.y, 85);
  if (!car) return false;
  if (car.traffic) {
    // Jack it: the driver flees on foot, the law notices.
    game.traffic.cars.splice(game.traffic.cars.indexOf(car), 1);
    game.peds.scare(car.x, car.y, 120);
    game.heat += crimeHeat('steal');
    game.stats.carsStolen += 1;
    game.message = 'Car stolen — the law is watching';
    game.messageTime = 2.5;
  } else if (car.kind === 'police') {
    game.police.copCars.splice(game.police.copCars.indexOf(car), 1);
    game.heat += crimeHeat('steal') + 20;
    game.stats.carsStolen += 1;
    game.message = 'You stole a cop car. Bold.';
    game.messageTime = 2.5;
  } else {
    const at = game.parked.indexOf(car);
    if (at >= 0) game.parked.splice(at, 1);
  }
  car.traffic = false;
  game.playerCar = car;
  game.player.x = car.x;
  game.player.y = car.y;
  audio.blip();
  return true;
}

function exitCar() {
  const car = game.playerCar;
  if (!car) return;
  game.playerCar = null;
  game.player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 40;
  game.player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 40;
  const fixed = city.collideCircle(game.player.x, game.player.y, PLAYER.radius);
  game.player.x = fixed.x;
  game.player.y = fixed.y;
  game.parked.push(car);
}

function walkPlayer(dx, dy, dt) {
  const p = game.player;
  const len = Math.hypot(dx, dy) || 1;
  const speed = input.sprint() ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const nx = p.x + (dx / len) * speed * dt;
  const ny = p.y + (dy / len) * speed * dt;
  const fixed = city.collideCircle(nx, ny, PLAYER.radius);
  const c = city.clampToCity(fixed.x, fixed.y, PLAYER.radius + 4);
  p.x = c.x; p.y = c.y;
  if (dx !== 0 || dy !== 0) p.angle = Math.atan2(dy, dx);
}

function drivePlayer(drive, dt) {
  const car = game.playerCar;
  if (!car) return;
  const prevHealth = car.health;
  driveCar(car, drive, dt, city);
  if (car.health < prevHealth) {
    addParticles(car.x, car.y, '#f2c94c', 6);
    audio.crash();
    addShake(3);
  }
  // Car-vs-car bumps.
  for (const other of game.traffic.cars) {
    if (collideCars(car, other)) { addParticles(other.x, other.y, '#f2c94c', 4); audio.crash(); }
  }
  for (const other of game.police.copCars) {
    if (collideCars(car, other)) { addParticles(other.x, other.y, '#f2c94c', 4); audio.crash(); }
  }
  // Running over pedestrians.
  for (const ped of game.peds.peds) {
    if (ped.dead) continue;
    if (dist2(car.x, car.y, ped.x, ped.y) < 26 * 26 && Math.abs(car.speed) > 60) {
      ped.dead = true;
      game.stats.kills += 1;
      game.heat += crimeHeat('kill');
      game.peds.scare(car.x, car.y, 320);
      addParticles(ped.x, ped.y, '#e5534b', 8);
      audio.crash();
    }
  }
  if (car.dead) {
    addParticles(car.x, car.y, '#e5534b', 20);
    game.player.health -= 20;
    game.lastDamage = game.time;
    exitCar();
    game.message = 'Your car is wrecked!';
    game.messageTime = 2.5;
  }
  game.player.x = car.x;
  game.player.y = car.y;
  game.player.angle = car.angle;
}

function punch() {
  const p = game.player;
  const weapon = weaponFor(p);
  const now = game.time;
  if (game.nextPunch && now < game.nextPunch) return;
  game.nextPunch = now + weapon.rate;
  p.angle = p.angle; // punch toward facing
  game.missions.onPunch(game);
  const events = game.combat.playerAttack(game, weapon);
  if (events.hitPed || events.hitCop || events.hitCar) {
    addParticles(p.x + Math.cos(p.angle) * 30, p.y + Math.sin(p.angle) * 30, '#f2c94c', 5);
    audio.punch();
  }
}

function shoot() {
  const p = game.player;
  if (p.weapon !== 'pistol' || p.ammo <= 0) return;
  const now = game.time;
  if (game.nextShot && now < game.nextShot) return;
  game.nextShot = now + weaponFor(p).rate;
  p.ammo -= 1;
  game.combat.fire(p.x, p.y, p.angle, true);
  const events = game.combat.playerAttack(game, weaponFor(p));
  game.peds.scare(p.x, p.y, 420);
  game.heat += 6;
  audio.gunshot();
  addShake(1);
  if (events.hitPed || events.hitCop) {
    addParticles(p.x + Math.cos(p.angle) * 40, p.y + Math.sin(p.angle) * 40, '#e5534b', 6);
  }
}

function stepWorld(dt) {
  game.time += dt;
  const p = game.player;
  // Traffic, peds, police, combat, missions.
  game.traffic.update(dt, p.x, p.y, game.playerCar);
  game.peds.update(dt, p.x, p.y);
  game.police.update(dt, game);
  game.combat.update(dt, game);
  game.missions.update(dt, game);
  // Traffic cars hitting the player on foot.
  if (!game.playerCar) {
    for (const car of game.traffic.cars) {
      if (Math.abs(car.speed) > 40 && dist2(car.x, car.y, p.x, p.y) < 26 * 26) {
        p.health -= 12;
        game.lastDamage = game.time;
        const push = Math.atan2(p.y - car.y, p.x - car.x);
        p.x += Math.cos(push) * 40;
        p.y += Math.sin(push) * 40;
        addShake(4);
        audio.crash();
        break;
      }
    }
  }
  // Slow health regen after 10 quiet seconds.
  if (game.time - game.lastDamage > 10 && p.health > 0 && p.health < PLAYER.health) {
    p.health = Math.min(PLAYER.health, p.health + 1.5 * dt);
  }
  // Particles.
  for (let i = game.particles.length - 1; i >= 0; i -= 1) {
    const pt = game.particles[i];
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    if (pt.life <= 0) game.particles.splice(i, 1);
  }
  // Messages and mission auto-flow.
  if (game.messageTime > 0) game.messageTime -= dt;
  if (game.missions.currentIndex === -1 && !game.missions.done) {
    const next = game.missions.completed;
    if (next < game.missions.list.length) {
      if (game.nextMissionIn < 0) game.nextMissionIn = 4;
      game.nextMissionIn -= dt;
      if (game.nextMissionIn <= 0) {
        game.nextMissionIn = -1;
        startMission(next);
      }
    }
  }
  // Wanted stars follow heat.
  game.wanted = starsForHeat(game.heat);
  // Camera follows the player, smoothed, with shake.
  const tx = p.x; const ty = p.y;
  game.camera.x += (tx - game.camera.x) * Math.min(1, dt * 5);
  game.camera.y += (ty - game.camera.y) * Math.min(1, dt * 5);
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 22);
  // Audio follows speed and wanted level.
  const speed = game.playerCar ? Math.abs(game.playerCar.speed) : 0;
  audio.update(dt, speed, game.wanted);
  // Death and bust.
  if (p.health <= 0) {
    p.money = Math.max(0, p.money - 100);
    p.health = PLAYER.health;
    p.x = HOSPITAL.x; p.y = HOSPITAL.y;
    game.playerCar = null;
    game.police.clear();
    game.heat = 0; game.wanted = 0;
    game.camera.x = p.x; game.camera.y = p.y;
    saveProgress(game);
    return SCREEN_OVER;
  }
  if (game.busted) {
    game.busted = false;
    p.money = Math.max(0, p.money - 150);
    p.x = POLICE_STATION.x; p.y = POLICE_STATION.y;
    game.playerCar = null;
    game.police.clear();
    game.heat = 0; game.wanted = 0;
    game.camera.x = p.x; game.camera.y = p.y;
    saveProgress(game);
    return SCREEN_BUSTED;
  }
  if (game.missions.done && !game.winShown) {
    game.winShown = true;
    game.best = Math.max(game.best, game.score);
    saveBest(game.score);
    saveProgress(game);
    return SCREEN_WIN;
  }
  return null;
}

game.reset = reset;
game.startMission = startMission;
game.enterNearestCar = enterNearestCar;
game.drivePlayer = drivePlayer;
game.walkPlayer = walkPlayer;
game.stepWorld = stepWorld;
game.addShake = addShake;
// Debug handle for playtests and the curious: the whole live game state.
window.__solmar = game;
game.score = 0;

Object.defineProperty(game, 'score', {
  get() {
    return game.stats.cashEarned + game.stats.missionsDone * 500 + game.stats.packages * 200;
  },
  set(v) { /* score is derived; ignore */ },
  configurable: true,
});

// ---- Boot -----------------------------------------------------------------
reset();
const saved = loadProgress();
if (saved) {
  game.player.money = saved.money || 0;
  game.stats.missionsDone = saved.missionsDone || 0;
  game.stats.packages = saved.packages || 0;
  game.stats.cashEarned = saved.cashEarned || 0;
  game.stats.kills = saved.kills || 0;
  game.stats.carsStolen = saved.carsStolen || 0;
  game.missions.restore(saved.missionsDone || 0, !!saved.finished);
}

let screen = SCREEN_TITLE;
if (shot) {
  const staged = stageShot(shot, game);
  screen = staged.screen;
  game.camera.x = game.player.x;
  game.camera.y = game.player.y;
  const shotCtx = canvas.getContext('2d');
  renderer.draw(game, screen);
  if (screen === SCREEN_PLAY) hud.draw(shotCtx, game, SCREEN_PLAY, renderer.width, renderer.height);
  renderer.draw(game, screen);
  if (screen === SCREEN_PLAY) hud.draw(shotCtx, game, SCREEN_PLAY, renderer.width, renderer.height);
  window.__shotReady = true;
  window.__ready = true;
  window.__state = {
    screen, money: game.player.money, wanted: game.wanted,
    health: game.player.health, x: Math.round(game.player.x), y: Math.round(game.player.y),
    inCar: !!game.playerCar, mission: game.missions.objectiveText(),
    missionsDone: game.stats.missionsDone, district: districtAt(game.player.x, game.player.y).name,
  };
} else {
  startMission(0);
  screen = SCREEN_TITLE;
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    if (input.takeMute()) audio.setMuted(!audio.muted);
    const actions = input.takeActions();
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_BUSTED || screen === SCREEN_WIN) {
      if (actions & ACTION_CONFIRM) {
        audio.unlock();
        if (screen === SCREEN_TITLE) {
          screen = SCREEN_PLAY;
        } else if (screen === SCREEN_WIN) {
          screen = SCREEN_PLAY;
        } else {
          screen = SCREEN_PLAY;
        }
      }
      renderer.draw(game, screen);
      hud.draw(canvas.getContext('2d'), game, screen, renderer.width, renderer.height);
      window.__ready = true;
      return;
    }
    if (screen === SCREEN_PAUSED) {
      renderer.draw(game, screen);
      window.__ready = true;
      return;
    }
    // Live play.
    audio.unlock();
    const move = input.move();
    // One-shot actions, once per frame: enter/exit, punch, shoot, weapon.
    if (actions & ACTION_ENTER) {
      if (game.playerCar) exitCar();
      else enterNearestCar();
    }
    if (actions & ACTION_PUNCH) punch();
    if (actions & ACTION_SHOOT) shoot();
    if (actions & ACTION_WEAPON) {
      game.player.weapon = game.player.weapon === 'pistol' ? 'fists' : 'pistol';
      audio.blip();
    }
    let acc = elapsed;
    while (acc > 0) {
      const dt = Math.min(STEP, acc);
      acc -= dt;
      if (game.playerCar) {
        const throttle = move.y < 0 ? 1 : move.y > 0 ? -1 : 0;
        drivePlayer({ throttle, steer: move.x }, dt);
      } else if (move.x !== 0 || move.y !== 0) {
        walkPlayer(move.x, move.y, dt);
      }
      const end = stepWorld(dt);
      if (end !== null) { screen = end; break; }
    }
    // Keep the camera shake visible.
    if (game.shake > 0) {
      game.camera.x += (Math.random() - 0.5) * game.shake;
      game.camera.y += (Math.random() - 0.5) * game.shake;
    }
    renderer.draw(game, screen);
    const ctx = canvas.getContext('2d');
    hud.draw(ctx, game, SCREEN_PLAY, renderer.width, renderer.height);
    window.__ready = true;
    window.__state = {
      screen, money: game.player.money, wanted: game.wanted,
      health: Math.round(game.player.health), x: Math.round(game.player.x), y: Math.round(game.player.y),
      inCar: !!game.playerCar, mission: game.missions.objectiveText(),
      missionsDone: game.stats.missionsDone, district: districtAt(game.player.x, game.player.y).name,
    };
  }
  requestAnimationFrame(frame);
}
