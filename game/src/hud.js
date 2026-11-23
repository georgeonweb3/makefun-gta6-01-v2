// The HUD: health, money, wanted stars, the mission line, the minimap and
// the messages. Drawn on the same canvas after the world, in screen space.
import { DISTRICTS, PALETTE, WORLD } from './config.js';
import { districtAt } from './world.js';

const MAP_SIZE = 184;

export function createHud() {
  function drawStars(ctx, x, y, stars) {
    ctx.font = '26px system-ui, sans-serif';
    ctx.textAlign = 'left';
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = i < stars ? '#f2c94c' : 'rgba(242,244,246,0.25)';
      ctx.fillText('★', x + i * 28, y);
    }
  }

  function drawMinimap(ctx, game, width, height) {
    const mx = width - MAP_SIZE - 16;
    const my = height - MAP_SIZE - 16;
    const scale = MAP_SIZE / WORLD.size;
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.roundRect(mx - 6, my - 6, MAP_SIZE + 12, MAP_SIZE + 12, 8);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.rect(mx, my, MAP_SIZE, MAP_SIZE);
    ctx.clip();
    ctx.fillStyle = '#274b2e';
    ctx.fillRect(mx, my, MAP_SIZE, MAP_SIZE);
    // Sea.
    ctx.fillStyle = '#2a6a9e';
    ctx.fillRect(mx, my + (WORLD.beachY / WORLD.size) * MAP_SIZE, MAP_SIZE, MAP_SIZE);
    // Roads.
    ctx.strokeStyle = 'rgba(200,205,215,0.7)';
    ctx.lineWidth = 2;
    for (const c of game.city.centers) {
      const p = c * scale;
      ctx.beginPath(); ctx.moveTo(mx + p, my); ctx.lineTo(mx + p, my + MAP_SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx, my + p); ctx.lineTo(mx + MAP_SIZE, my + p); ctx.stroke();
    }
    // Waypoint.
    const wp = game.missions.waypoint();
    if (wp) {
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath();
      ctx.arc(mx + wp.x * scale, my + wp.y * scale, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Cop cars.
    ctx.fillStyle = '#ff3b30';
    for (const car of game.police.copCars) {
      ctx.beginPath();
      ctx.arc(mx + car.x * scale, my + car.y * scale, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Player.
    const px = mx + game.player.x * scale;
    const py = my + game.player.y * scale;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f2c94c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // North marker.
    ctx.fillStyle = '#aab2bd';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', mx + MAP_SIZE / 2, my - 10 + 6);
  }

  function draw(ctx, game, screen, width, height) {
    if (screen !== 1) return; // only over live play
    const p = game.player;
    // Top-left panel: money, health, weapon.
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.roundRect(14, 14, 250, 92, 10);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f2c94c';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(`$${p.money.toLocaleString()}`, 28, 46);
    ctx.fillStyle = '#f2f4f6';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(districtAt(p.x, p.y).name, 28, 68);
    // Health bar.
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(28, 78, 150, 10);
    ctx.fillStyle = p.health > 30 ? '#4caf6d' : '#e5534b';
    ctx.fillRect(28, 78, 150 * Math.max(0, p.health / 100), 10);
    ctx.fillStyle = '#f2f4f6';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`${Math.ceil(p.health)}`, 186, 87);
    ctx.fillText(p.weapon === 'pistol' ? `Pistol · ${p.ammo} ammo` : 'Fists', 28, 100 - 2);
    // Wanted stars, top-right.
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.roundRect(width - 190, 14, 176, 44, 10);
    ctx.fill();
    drawStars(ctx, width - 176, 46, game.wanted);
    // Mission line, top-centre.
    const objective = game.missions.objectiveText();
    if (objective) {
      ctx.font = 'bold 17px system-ui, sans-serif';
      const w = ctx.measureText(objective).width + 28;
      ctx.fillStyle = PALETTE.panel;
      ctx.beginPath();
      ctx.roundRect((width - w) / 2, 14, w, 36, 10);
      ctx.fill();
      ctx.fillStyle = '#f2f4f6';
      ctx.textAlign = 'center';
      ctx.fillText(objective, width / 2, 38);
    }
    // Speed when driving.
    if (game.playerCar) {
      ctx.fillStyle = PALETTE.panel;
      ctx.beginPath();
      ctx.roundRect(width - 190, 66, 176, 44, 10);
      ctx.fill();
      ctx.fillStyle = '#f2f4f6';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(Math.abs(game.playerCar.speed) * 0.22)} mph`, width - 28, 96);
    }
    // Bust progress.
    if (game.bustProgress > 0) {
      ctx.fillStyle = PALETTE.panel;
      ctx.beginPath();
      ctx.roundRect(width / 2 - 130, height - 90, 260, 30, 8);
      ctx.fill();
      ctx.fillStyle = '#4fc3f7';
      ctx.fillRect(width / 2 - 120, height - 80, 240 * (game.bustProgress / 1.6), 10);
      ctx.fillStyle = '#f2f4f6';
      ctx.font = '14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('The law is grabbing you — run!', width / 2, height - 62);
    }
    // Transient message: wrap to two lines when it is wider than the free
    // space (the minimap owns the bottom-right corner — never draw under it).
    if (game.message && game.messageTime > 0) {
      ctx.font = 'bold 20px system-ui, sans-serif';
      const freeW = width - MAP_SIZE - 16;
      const maxW = freeW - 60;
      const centreX = freeW / 2;
      const words = game.message.split(' ');
      const lines = [''];
      for (const w of words) {
        const test = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${w}` : w;
        if (ctx.measureText(test).width > maxW && lines[lines.length - 1]) lines.push(w);
        else lines[lines.length - 1] = test;
      }
      const shown = lines.slice(0, 2);
      const w = Math.max(...shown.map((l) => ctx.measureText(l).width)) + 30;
      const h = 30 + shown.length * 24;
      ctx.fillStyle = PALETTE.panel;
      ctx.beginPath();
      ctx.roundRect(centreX - w / 2, height - 118 - (shown.length - 1) * 24, w, h, 10);
      ctx.fill();
      ctx.fillStyle = '#f2c94c';
      ctx.textAlign = 'center';
      shown.forEach((line, i) => {
        ctx.fillText(line, centreX, height - 94 - (shown.length - 1) * 24 + i * 24);
      });
    }
    // Controls hint early on (kept clear of the minimap, like the message).
    if (game.time < 25 && !game.playerCar) {
      ctx.fillStyle = 'rgba(242,244,246,0.75)';
      ctx.font = '15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('WASD to move · E to steal the nearest car · F to punch · G to shoot', (width - MAP_SIZE - 16) / 2, height - 24);
    }
    drawMinimap(ctx, game, width, height);
  }

  return { draw };
}

export function districtNameAt(x, y) {
  return districtAt(x, y).name;
}
export { DISTRICTS };
