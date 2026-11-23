// The renderer: a camera that follows the player and paints the city —
// roads, blocks, beach and sea — then the cars, the people and the effects.
// Everything is flat vector shapes on one canvas; no images, no network.
import { PALETTE, WORLD } from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;
export const SCREEN_BUSTED = 4;
export const SCREEN_WIN = 5;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function drawCar(car, time) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    const L = 46; const W = 24;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-L / 2 + 3, -W / 2 + 4, L, W);
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-L / 2, -W / 2, L, W, 7);
    ctx.fill();
    if (car.kind === 'police') {
      ctx.fillStyle = '#f2f4f6';
      ctx.fillRect(-6, -W / 2, 12, W);
      const flash = Math.floor(time * 6) % 2 === 0;
      ctx.fillStyle = flash ? '#ff3b30' : '#2f7bff';
      ctx.fillRect(-4, -W / 2 - 3, 8, 5);
      ctx.fillStyle = flash ? '#2f7bff' : '#ff3b30';
      ctx.fillRect(-4, W / 2 - 2, 8, 5);
      ctx.fillStyle = '#20242c';
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PD', 10, 3);
    } else if (car.kind === 'taxi') {
      ctx.fillStyle = '#111';
      ctx.fillRect(-L / 2 + 4, -W / 2, 10, 5);
      ctx.fillRect(-L / 2 + 4, W / 2 - 5, 10, 5);
      ctx.fillStyle = '#f2c94c';
      ctx.fillRect(-2, -5, 14, 10);
    } else {
      ctx.fillStyle = 'rgba(20,28,38,0.85)';
      ctx.fillRect(-8, -W / 2 + 4, 14, W - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(-8, -W / 2 + 4, 14, 3);
    }
    // Headlights.
    ctx.fillStyle = '#fff8c9';
    ctx.fillRect(L / 2 - 2, -W / 2 + 2, 3, 4);
    ctx.fillRect(L / 2 - 2, W / 2 - 6, 3, 4);
    if (car.smoke > 0) {
      ctx.fillStyle = 'rgba(120,120,120,0.7)';
      ctx.beginPath();
      ctx.arc(-L / 2, 0, 6 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPerson(p, isPlayer) {
    ctx.save();
    ctx.translate(p.x, p.y);
    const r = isPlayer ? 14 : 10;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(2, 3, r, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.shirt || '#d94f3d';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.color || '#e8c39e';
    ctx.beginPath();
    ctx.arc(Math.cos(p.angle) * 4, Math.sin(p.angle) * 4, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    if (isPlayer) {
      ctx.strokeStyle = '#f2c94c';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWorld(game) {
    const cam = game.camera;
    const x0 = cam.x - width / 2;
    const y0 = cam.y - height / 2;
    ctx.save();
    ctx.translate(-x0, -y0);

    // Ground.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(x0, y0, width, height);
    // Sea and sand along the south edge.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(x0, WORLD.beachY, width, 240);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(x0, WORLD.beachY + 130, width, 140);
    ctx.fillStyle = PALETTE.waterDeep;
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(x0, WORLD.beachY + 170 + i * 18, width, 4);
    }

    const city = game.city;
    // Parks.
    for (const park of city.parks) {
      ctx.fillStyle = park.plaza ? '#9a938a' : PALETTE.park;
      ctx.fillRect(park.x0, park.y0, park.x1 - park.x0, park.y1 - park.y0);
    }
    // Roads.
    ctx.fillStyle = PALETTE.road;
    for (const c of city.centers) {
      ctx.fillRect(x0, c - WORLD.roadWidth / 2, width, WORLD.roadWidth);
      ctx.fillRect(c - WORLD.roadWidth / 2, y0, WORLD.roadWidth, height);
    }
    // Centre dashes.
    ctx.fillStyle = PALETTE.roadLine;
    for (const c of city.centers) {
      for (let d = 0; d < WORLD.size; d += 46) {
        ctx.fillRect(d, c - 2, 24, 4);
        ctx.fillRect(c - 2, d, 4, 24);
      }
    }
    // District labels.
    ctx.fillStyle = 'rgba(242,244,246,0.55)';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const label of city.labels) {
      ctx.fillText(label.text, label.x, label.y);
    }
    // Trees.
    for (const t of city.trees) {
      ctx.fillStyle = '#2a5a2e';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f8a44';
      ctx.beginPath();
      ctx.arc(t.x - 2, t.y - 2, t.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Buildings: wall, roof, windows; taller ones cast a longer shadow.
    for (const b of city.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + b.height * 2, b.y + b.height * 3, b.w, b.h);
      ctx.fillStyle = b.wall;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
      ctx.fillStyle = 'rgba(255,240,180,0.75)';
      const cols = Math.max(1, Math.floor((b.w - 16) / 18));
      const rows = Math.max(1, Math.floor((b.h - 16) / 18));
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rows; j += 1) {
          if ((i * 7 + j * 3 + b.windows) % 4 === 0) continue;
          ctx.fillRect(b.x + 9 + i * 18, b.y + 9 + j * 18, 8, 8);
        }
      }
    }
    // Hidden packages and pickups.
    for (const pk of game.combat.pickups) {
      if (pk.taken) continue;
      const bob = Math.sin(game.time * 3 + pk.x) * 2;
      if (pk.kind === 'package') {
        ctx.fillStyle = '#f2c94c';
        ctx.fillRect(pk.x - 8, pk.y - 8 + bob, 16, 16);
        ctx.fillStyle = '#111';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('$', pk.x, pk.y + 4 + bob);
      } else if (pk.kind === 'health') {
        ctx.fillStyle = '#e5534b';
        ctx.fillRect(pk.x - 9, pk.y - 9 + bob, 18, 18);
        ctx.fillStyle = '#fff';
        ctx.fillRect(pk.x - 2, pk.y - 6 + bob, 4, 12);
        ctx.fillRect(pk.x - 6, pk.y - 2 + bob, 12, 4);
      } else if (pk.kind === 'ammo') {
        ctx.fillStyle = '#4fc3f7';
        ctx.fillRect(pk.x - 8, pk.y - 8 + bob, 16, 16);
        ctx.fillStyle = '#111';
        ctx.fillText('A', pk.x, pk.y + 4 + bob);
      }
    }
    // Waypoint beacon.
    const wp = game.missions.waypoint();
    if (wp) {
      const pulse = 1 + Math.sin(game.time * 4) * 0.15;
      ctx.strokeStyle = '#f2c94c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 26 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath();
      ctx.moveTo(wp.x, wp.y - 44);
      ctx.lineTo(wp.x - 10, wp.y - 26);
      ctx.lineTo(wp.x + 10, wp.y - 26);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(wp.label, wp.x, wp.y - 52);
    }
    // Cars.
    for (const car of game.traffic.cars) drawCar(car, game.time);
    for (const car of game.police.copCars) drawCar(car, game.time);
    if (game.playerCar) drawCar(game.playerCar, game.time);
    // People.
    for (const ped of game.peds.peds) drawPerson(ped, false);
    for (const cop of game.police.copPeds) drawPerson(cop, false);
    if (!game.playerCar) drawPerson(game.player, true);
    // Gunfire tracers.
    for (const s of game.combat.shots) {
      ctx.strokeStyle = 'rgba(255,220,120,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + Math.cos(s.angle) * 60, s.y + Math.sin(s.angle) * 60);
      ctx.stroke();
    }
    // Particles (sparks, smoke, impact stars).
    for (const pt of game.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawTitle(game) {
    ctx.fillStyle = 'rgba(8,10,16,0.55)';
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f2c94c';
    ctx.font = 'bold 84px system-ui, sans-serif';
    ctx.fillText('SOLMAR BAY', width / 2, height / 2 - 110);
    ctx.fillStyle = '#f2f4f6';
    ctx.font = '28px system-ui, sans-serif';
    ctx.fillText('An open-world crime game', width / 2, height / 2 - 64);
    ctx.fillStyle = '#aab2bd';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('Steal cars. Outrun the law. Run eight jobs for Mama Luz and own the town.', width / 2, height / 2 - 28);
    ctx.fillStyle = '#f2f4f6';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('Press ENTER to start', width / 2, height / 2 + 40);
    ctx.fillStyle = '#aab2bd';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('WASD / arrows — move & drive · E — enter / steal car · F — punch · G — shoot · Q — weapon · Shift — sprint · P — pause · M — mute', width / 2, height / 2 + 84);
    if (game.best > 0) {
      ctx.fillText(`Best score: $${game.best.toLocaleString()}`, width / 2, height / 2 + 116);
    }
  }

  function drawOverlay(game, screen) {
    ctx.textAlign = 'center';
    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(8,10,16,0.6)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#f2f4f6';
      ctx.font = 'bold 48px system-ui, sans-serif';
      ctx.fillText('PAUSED', width / 2, height / 2 - 10);
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillStyle = '#aab2bd';
      ctx.fillText('P to resume · progress saves when you finish a job', width / 2, height / 2 + 28);
    } else if (screen === SCREEN_OVER) {
      ctx.fillStyle = 'rgba(20,4,6,0.72)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#e5534b';
      ctx.font = 'bold 72px system-ui, sans-serif';
      ctx.fillText('WASTED', width / 2, height / 2 - 20);
      ctx.fillStyle = '#f2f4f6';
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText('The bay keeps what it takes. You lost $100 at the hospital.', width / 2, height / 2 + 24);
      ctx.fillText('Press ENTER to get back out there', width / 2, height / 2 + 60);
    } else if (screen === SCREEN_BUSTED) {
      ctx.fillStyle = 'rgba(4,8,20,0.72)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#4fc3f7';
      ctx.font = 'bold 72px system-ui, sans-serif';
      ctx.fillText('BUSTED', width / 2, height / 2 - 20);
      ctx.fillStyle = '#f2f4f6';
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText('The law caught up with you. Bail cost $150.', width / 2, height / 2 + 24);
      ctx.fillText('Press ENTER to walk free', width / 2, height / 2 + 60);
    } else if (screen === SCREEN_WIN) {
      ctx.fillStyle = 'rgba(8,16,10,0.72)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#f2c94c';
      ctx.font = 'bold 64px system-ui, sans-serif';
      ctx.fillText('KING OF THE BAY', width / 2, height / 2 - 20);
      ctx.fillStyle = '#f2f4f6';
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText(`All eight jobs done. Final score: $${game.score.toLocaleString()}`, width / 2, height / 2 + 24);
      ctx.fillText('Press ENTER to keep cruising Solmar Bay', width / 2, height / 2 + 60);
    }
  }

  function draw(game, screen) {
    ctx.clearRect(0, 0, width, height);
    drawWorld(game);
    if (screen === SCREEN_TITLE) drawTitle(game);
    else if (screen !== SCREEN_PLAY) drawOverlay(game, screen);
  }

  return { draw, resize, get width() { return width; }, get height() { return height; } };
}
