// A small seeded random generator (mulberry32) plus the helpers the game uses,
// so a seed always builds the same city, the same traffic and the same shots.
export function createRandom(seed) {
  let a = seed >>> 0;
  return {
    next() {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(min, max) { return min + this.next() * (max - min); },
    int(min, max) { return Math.floor(this.range(min, max + 1)); },
    pick(list) { return list[Math.floor(this.next() * list.length)]; },
    chance(p) { return this.next() < p; },
  };
}

/** Deterministic hash of a string, for naming things from coordinates. */
export function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) { return a + (b - a) * t; }

/** Shortest signed turn from angle `from` toward angle `to`, in radians. */
export function angleDiff(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx; const dy = ay - by;
  return dx * dx + dy * dy;
}
