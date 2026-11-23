// Save and load: money, completed missions, hidden packages and the best
// score live in localStorage, so a session survives a closed tab.
import { BEST_KEY, SAVE_KEY } from './config.js';

export function saveProgress(game) {
  try {
    const data = {
      money: game.player.money,
      missionsDone: game.stats.missionsDone,
      packages: game.stats.packages,
      cashEarned: game.stats.cashEarned,
      kills: game.stats.kills,
      carsStolen: game.stats.carsStolen,
      missionsCompleted: game.missions.list.map((m, i) => (i < game.missions.completed ? true : false)),
      finished: game.missions.done,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadProgress() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveBest(score) {
  try {
    const best = Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
    if (score > best) window.localStorage.setItem(BEST_KEY, String(score));
    return Math.max(best, score);
  } catch {
    return score;
  }
}

export function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}
