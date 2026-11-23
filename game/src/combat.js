// Combat: fists and a pistol, pickups (health, ammo, cash, hidden packages),
// and the shots the player fires — short-lived tracers with a hit test.
import { WEAPONS } from './config.js';
import { dist2 } from './random.js';

export function createCombat(random) {
  const shots = []; // {x, y, angle, life, fromPlayer}
  const pickups = []; // {x, y, kind, amount, taken}

  function fire(fromX, fromY, angle, fromPlayer) {
    shots.push({ x: fromX, y: fromY, angle, life: 0.22, fromPlayer });
  }

  function spawnPickup(x, y, kind, amount) {
    pickups.push({ x, y, kind, amount: amount || 0, taken: false });
  }

  /** Resolve one player attack against peds, cops and traffic. Returns events. */
  function playerAttack(game, weapon) {
    const events = { hitPed: null, hitCop: null, hitCar: null };
    const p = game.player;
    const range = weapon.range;
    const reach = weapon.name === 'Fists' ? 40 : range;
    const targets = [];
    for (const ped of game.peds.peds) if (!ped.dead) targets.push({ obj: ped, kind: 'ped' });
    for (const cop of game.police.copPeds) if (!cop.dead) targets.push({ obj: cop, kind: 'cop' });
    for (const car of game.traffic.cars) if (!car.dead) targets.push({ obj: car, kind: 'car' });
    for (const car of game.police.copCars) if (!car.dead) targets.push({ obj: car, kind: 'copcar' });
    let best = null; let bestD = reach * reach;
    for (const t of targets) {
      const d = dist2(p.x, p.y, t.obj.x, t.obj.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    if (!best) return events;
    if (best.kind === 'ped') {
      best.obj.dead = true;
      game.stats.kills += 1;
      game.heat += 45;
      game.peds.scare(p.x, p.y, 320);
      events.hitPed = best.obj;
    } else if (best.kind === 'cop') {
      best.obj.dead = true;
      game.stats.kills += 1;
      game.heat += 90;
      events.hitCop = best.obj;
    } else {
      best.obj.health -= weapon.damage;
      if (best.obj.health <= 0) best.obj.dead = true;
      game.heat += best.kind === 'copcar' ? 40 : 8;
      events.hitCar = best.obj;
    }
    return events;
  }

  function update(dt, game) {
    for (let i = shots.length - 1; i >= 0; i -= 1) {
      shots[i].life -= dt;
      if (shots[i].life <= 0) shots.splice(i, 1);
    }
    // Pickups: walk over one to take it.
    const p = game.player;
    for (const pk of pickups) {
      if (pk.taken) continue;
      if (dist2(p.x, p.y, pk.x, pk.y) < 30 * 30) {
        pk.taken = true;
        if (pk.kind === 'health') p.health = Math.min(100, p.health + 40);
        if (pk.kind === 'ammo') p.ammo = (p.ammo || 0) + 24;
        if (pk.kind === 'cash') { p.money += pk.amount; game.stats.cashEarned += pk.amount; }
        if (pk.kind === 'package') {
          p.money += 200;
          game.stats.packages += 1;
          game.stats.cashEarned += 200;
          game.message = 'Hidden package found! +$200';
          game.messageTime = 3;
        }
      }
    }
  }

  return { shots, pickups, fire, spawnPickup, playerAttack, update };
}

export function weaponFor(player) {
  return player.weapon === 'pistol' ? WEAPONS.pistol : WEAPONS.fists;
}
