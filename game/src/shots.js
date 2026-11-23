// The screenshot scenes behind ?shot=start|drive|chase|mission. Each one plays
// the real rules forward from a fresh game for a fixed number of steps, with a
// scripted driver that follows the road grid (never through buildings), so
// the frame is what a short game really looks like and the same seed always
// gives the same frame.
import { STEP } from './config.js';
import { angleDiff, clamp } from './random.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const CENTERS = [150, 450, 750, 1050, 1350, 1650, 1950, 2250];
const nearLine = (v) => CENTERS.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

/** Road-grid route from the car to near (tx, ty): axis-aligned, on roads. */
function gridRoute(car, tx, ty) {
  const fx = car.x; const fy = car.y;
  const nx = nearLine(fx); const ny = nearLine(fy);
  const pts = [];
  // First get to an intersection on the road we are closest to.
  if (Math.abs(fy - ny) <= Math.abs(fx - nx)) pts.push({ x: nearLine(tx), y: ny });
  else pts.push({ x: nx, y: nearLine(ty) });
  // Never start with a U-turn: if the first point is behind the car, go to
  // the next intersection ahead on this road instead.
  const hx = Math.cos(car.angle); const hy = Math.sin(car.angle);
  const dx0 = pts[0].x - fx; const dy0 = pts[0].y - fy;
  if (dx0 * hx + dy0 * hy < 0 && Math.hypot(dx0, dy0) > 30) {
    if (Math.abs(fy - ny) <= Math.abs(fx - nx)) {
      const ahead = hx >= 0
        ? CENTERS.find((c) => c > fx + 40) ?? CENTERS[CENTERS.length - 1]
        : [...CENTERS].reverse().find((c) => c < fx - 40) ?? CENTERS[0];
      pts[0] = { x: ahead, y: ny };
    } else {
      const ahead = hy >= 0
        ? CENTERS.find((c) => c > fy + 40) ?? CENTERS[CENTERS.length - 1]
        : [...CENTERS].reverse().find((c) => c < fy - 40) ?? CENTERS[0];
      pts[0] = { x: nx, y: ahead };
    }
  }
  let cx = pts[0].x; let cy = pts[0].y;
  const gx = nearLine(tx); const gy = nearLine(ty);
  while (cx !== gx) { cx += Math.sign(gx - cx) * 300; pts.push({ x: cx, y: cy }); }
  while (cy !== gy) { cy += Math.sign(gy - cy) * 300; pts.push({ x: cx, y: cy }); }
  // Final stop: the nearest point on a road to the target (never inside a block).
  if (Math.abs(tx - gx) <= Math.abs(ty - gy)) pts.push({ x: gx, y: ty });
  else pts.push({ x: tx, y: gy });
  return pts;
}

/** Drive the player's car along the road grid toward (tx, ty). Stops soon
 *  after the route is done, so the frame is taken mid-action, not after the
 *  car has flailed around the destination. */
function autopilotDrive(game, tx, ty, seconds) {
  const car = game.playerCar;
  if (!car) return;
  const route = gridRoute(car, tx, ty);
  let leg = 0;
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const c = game.playerCar;
    if (!c) break;
    while (leg < route.length - 1) {
      const dx = route[leg].x - c.x; const dy = route[leg].y - c.y;
      // Switch legs early (130px out) so the car brakes into the turn
      // instead of overshooting the intersection into the block.
      if (dx * dx + dy * dy < 130 * 130) leg += 1;
      else break;
    }
    const target = route[leg];
    const last = leg === route.length - 1;
    const dx = target.x - c.x; const dy = target.y - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (last && dist < 90) {
      game.drivePlayer({ throttle: c.speed > 40 ? -1 : 0, steer: 0 }, STEP);
      if (Math.abs(c.speed) < 40) break;
    } else {
      const want = Math.atan2(dy, dx);
      const turn = angleDiff(c.angle, want);
      const steer = clamp(turn * 1.8, -1, 1);
      // Slow for corners: brake into a sharp turn, cruise on the straights.
      let throttle = 1;
      if (Math.abs(turn) > 1.2 && Math.abs(c.speed) > 200) throttle = -1;
      else if (Math.abs(turn) > 0.5) throttle = 0.25;
      game.drivePlayer({ throttle, steer }, STEP);
    }
    game.stepWorld(STEP);
  }
}

function autopilotWalk(game, tx, ty, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const p = game.player;
    const want = Math.atan2(ty - p.y, tx - p.x);
    game.walkPlayer(Math.cos(want), Math.sin(want), STEP);
    game.stepWorld(STEP);
  }
}

/**
 * Set `game` to the named scene and return the screen to draw over it.
 * start: title over a live city. drive: cruising the Strip. chase: a
 * three-star pursuit on the Strip. mission: mid-race, checkpoints ahead.
 */
export function stageShot(name, game) {
  game.reset();
  if (name === 'drive') {
    game.startMission(0);
    game.enterNearestCar();
    autopilotDrive(game, 1650, 1350, 14);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    game.startMission(3);
    game.enterNearestCar();
    game.heat = 130;
    game.wanted = 3;
    autopilotDrive(game, 2250, 1950, 12);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    game.startMission(5);
    game.enterNearestCar();
    autopilotDrive(game, 1050, 1050, 6);
    // Fast-forward the race a little so rivals show on the objective line.
    for (let i = 0; i < 6 * 60; i += 1) game.stepWorld(STEP);
    return { screen: SCREEN_PLAY };
  }
  // start (default): a few seconds of city life behind the title.
  autopilotWalk(game, 1200, 1200, 4);
  return { screen: SCREEN_TITLE };
}
