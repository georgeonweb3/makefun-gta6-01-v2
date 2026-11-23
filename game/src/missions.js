// Missions: an eight-job story for Rook, a driver fresh back in Solmar Bay
// who owes Mama Luz money, plus taxi fares and ten hidden packages on the side.
// A mission is a list of steps; each step is a place to reach (or a thing to
// do there) with a line of text. The manager only reads the game and writes
// messages, money and the waypoint — it never draws.
import { MISSION_REWARDS } from './config.js';
import { dist2 } from './random.js';

const GARAGE = { x: 1350, y: 1350, label: 'Luz Garage' };
const STRIP = { x: 1200, y: 1200, label: 'Neon Strip' };
const DOCKS = { x: 1950, y: 450, label: 'The Docks' };
const SAFEHOUSE = { x: 750, y: 1950, label: 'Safehouse' };
const WAREHOUSE = { x: 450, y: 450, label: 'Warehouse' };
const BEACH = { x: 1200, y: 2100, label: 'South Beach' };

function step(text, x, y, radius, label) {
  return { text, x, y, radius: radius || 46, label: label || '', done: false };
}

const RACE_POINTS = [
  { x: 1050, y: 1050 }, { x: 1650, y: 1050 }, { x: 1650, y: 1650 },
  { x: 1050, y: 1650 }, { x: 750, y: 1350 }, { x: 1050, y: 1050 },
];

export function createMissions(city, random) {
  const list = [
    {
      id: 1, title: 'First Wheels', giver: 'Mama Luz',
      brief: 'You are back in Solmar Bay with empty pockets. Steal a car — any car — and bring it to my garage on the Strip.',
      reward: MISSION_REWARDS[0],
      steps: [
        { ...step('Steal a car: walk up to one and press E', 450, 450, 60, 'Steal a car'), needCar: true, anywhere: true },
        { ...step('Drive it to Luz Garage', GARAGE.x, GARAGE.y, 60, GARAGE.label), needCar: true },
      ],
    },
    {
      id: 2, title: 'Taxi for Trouble', giver: 'Mama Luz',
      brief: 'A fare is waiting at Palm Court. Pick them up and get them to the Strip before they change their mind.',
      reward: MISSION_REWARDS[1],
      steps: [
        { ...step('Pick up the fare at Palm Court (be in a car)', 750, 750, 50, 'Fare'), needCar: true, pickup: true },
        { ...step('Drop the fare at the Neon Strip', STRIP.x, STRIP.y, 60, STRIP.label), needCar: true, timer: 75 },
      ],
    },
    {
      id: 3, title: 'The Drop', giver: 'Mama Luz',
      brief: 'A package is waiting at the Docks. Walk it to Little Bay. The law will be watching — keep it quiet.',
      reward: MISSION_REWARDS[2],
      steps: [
        { ...step('Collect the package at the Docks', DOCKS.x, DOCKS.y, 46, 'Package'), onEnter: (g) => { g.heat += 25; } },
        { ...step('Deliver the package to Little Bay', 1950, 1350, 50, 'Drop-off') },
      ],
    },
    {
      id: 4, title: 'Getaway Driver', giver: 'Mama Luz',
      brief: 'The crew hit a warehouse and the whole city is coming. Get in a car and lose the law at the South Beach safehouse.',
      reward: MISSION_REWARDS[3],
      steps: [
        { ...step('Get in a car, any car', 1050, 1050, 120, 'Get a car'), needCar: true, anywhere: true, onEnter: (g) => { g.heat = Math.max(g.heat, 120); } },
        { ...step('Lose the cops: reach the safehouse', SAFEHOUSE.x, SAFEHOUSE.y, 60, SAFEHOUSE.label), needCar: true },
      ],
    },
    {
      id: 5, title: 'Debt Collection', giver: 'Mama Luz',
      brief: 'A dockworker named Sal owes me. Find him at the Docks and remind him — with your fists. Three good hits.',
      reward: MISSION_REWARDS[4],
      steps: [
        { ...step('Find Sal at the Docks', DOCKS.x, DOCKS.y + 300, 50, 'Sal'), spawnDebtor: true },
        { ...step('Remind Sal: land 3 punches (press F up close)', DOCKS.x, DOCKS.y + 300, 60, 'Sal'), beat: true },
        { ...step('Collect what Sal owes, at the Docks', DOCKS.x, DOCKS.y + 300, 46, 'Cash'), cash: 500 },
      ],
    },
    {
      id: 6, title: 'Street Race', giver: 'Jax',
      brief: 'Jax runs the Strip races. Beat his two boys around six checkpoints and the pot is yours.',
      reward: MISSION_REWARDS[5],
      steps: [
        { ...step('Get in a car and reach the start line', 1050, 1050, 60, 'Start line'), needCar: true },
        { ...step('Race! Hit all 6 checkpoints before the rivals', 1050, 1050, 60, 'Checkpoint 1/6'), race: true },
      ],
    },
    {
      id: 7, title: 'The Heist Setup', giver: 'Mama Luz',
      brief: 'An armored van is parked at the Docks. Take it — quietly if you can — and bring it to the warehouse.',
      reward: MISSION_REWARDS[6],
      steps: [
        { ...step('Steal the armored van at the Docks', 1950, 1350, 70, 'Armored van'), needCar: true, van: true },
        { ...step('Deliver the van to the warehouse', WAREHOUSE.x, WAREHOUSE.y, 60, WAREHOUSE.label), needCar: true },
      ],
    },
    {
      id: 8, title: 'King of the Bay', giver: 'Mama Luz',
      brief: 'The whole city wants the score now. Survive the heat for a minute, then bring it home to the Strip. Do this and you own this town.',
      reward: MISSION_REWARDS[7],
      steps: [
        { ...step('Survive the heat: 60 seconds', 1200, 1200, 400, 'Survive'), survive: 60, onEnter: (g) => { g.heat = 320; } },
        { ...step('Bring the score to the Neon Strip', STRIP.x, STRIP.y, 60, STRIP.label) },
      ],
    },
  ];

  let current = -1; // index into list, -1 = no mission running
  let stepIndex = 0;
  let timer = 0;
  let raceProgress = 0;
  let rivalProgress = 0;
  let debtor = null;
  let debtorHits = 0;
  let fareActive = false;
  let completedCount = 0;
  let finished = false;

  let gameRef = null;

  function start(index, game) {
    gameRef = game || null;
    current = index;
    stepIndex = 0;
    timer = 0;
    raceProgress = 0;
    rivalProgress = 0;
    debtor = null;
    debtorHits = 0;
    fareActive = false;
    const m = list[index];
    if (m && m.steps[0] && m.steps[0].onEnter && gameRef) m.steps[0].onEnter(gameRef);
    return m;
  }

  /** Restore progress from a save: `done` missions complete, `finished` all done. */
  function restore(done, finishedAll) {
    completedCount = Math.max(0, Math.min(done, list.length));
    if (finishedAll) finished = true;
  }

  function active() { return current >= 0 ? list[current] : null; }

  function currentStep() {
    const m = active();
    return m ? m.steps[stepIndex] : null;
  }

  function advance(game) {
    stepIndex += 1;
    const m = active();
    if (!m) return;
    if (stepIndex >= m.steps.length) {
      game.player.money += m.reward;
      game.stats.cashEarned += m.reward;
      game.stats.missionsDone += 1;
      completedCount += 1;
      game.message = `Job done: ${m.title} — +$${m.reward}`;
      game.messageTime = 4;
      game.audio.jingle();
      if (current === list.length - 1) finished = true;
      current = -1;
      stepIndex = 0;
      return;
    }
    const s = m.steps[stepIndex];
    if (s.onEnter) s.onEnter(game);
    if (s.spawnDebtor && game) {
      debtor = game.peds.spawn(DOCKS.x, DOCKS.y + 300, true);
      debtor.state = 'stand';
      debtor.speed = 0;
      debtor.shirt = '#e8b73a';
    }
  }

  function update(dt, game) {
    const m = active();
    if (!m) return;
    const s = currentStep();
    if (!s) return;
    if (s.timer !== undefined) {
      timer += dt;
      if (timer > s.timer) {
        game.message = `Too slow — ${m.title} failed. Talk to Mama Luz to retry.`;
        game.messageTime = 4;
        current = -1;
        stepIndex = 0;
        timer = 0;
        return;
      }
    }
    if (s.race) {
      // Rival crews run the loop at a fixed pace; the player must beat them.
      rivalProgress += dt / 88;
      const cp = RACE_POINTS[Math.min(raceProgress, RACE_POINTS.length - 1)];
      s.x = cp.x; s.y = cp.y;
      s.label = `Checkpoint ${raceProgress + 1}/6`;
      const p = game.playerCar || game.player;
      if (dist2(p.x, p.y, cp.x, cp.y) < 70 * 70) {
        raceProgress += 1;
        game.audio.blip();
        if (raceProgress >= RACE_POINTS.length) { advance(game); return; }
      }
      if (rivalProgress >= 1) {
        game.message = 'Jax\'s boys beat you to it. Race failed — retry from the Strip.';
        game.messageTime = 4;
        current = -1;
        stepIndex = 0;
        return;
      }
      return;
    }
    if (s.survive) {
      timer += dt;
      if (timer >= s.survive) { advance(game); return; }
      return;
    }
    if (s.beat) {
      if (debtorHits >= 3) {
        if (debtor) debtor.dead = true;
        advance(game);
        return;
      }
      if (debtor && debtor.dead) { debtorHits = 3; }
      return;
    }
    if (s.cash) {
      const p = game.player;
      if (dist2(p.x, p.y, s.x, s.y) < s.radius * s.radius) {
        p.money += s.cash;
        game.stats.cashEarned += s.cash;
        advance(game);
      }
      return;
    }
    // Default: reach the waypoint (in a car when the step needs one).
    // An `anywhere` step completes on its condition alone, wherever you are.
    if (s.anywhere) {
      if (s.needCar && !game.playerCar) return;
      advance(game);
      return;
    }
    const anchor = s.needCar && game.playerCar ? game.playerCar : game.player;
    if (s.needCar && !game.playerCar) return;
    if (dist2(anchor.x, anchor.y, s.x, s.y) < s.radius * s.radius) {
      if (s.pickup) fareActive = true;
      if (s.van) {
        // The van is the player's car now; mark the job.
        game.message = 'Van secured. Now lose the tail and deliver it.';
        game.messageTime = 3;
      }
      advance(game);
    }
  }

  /** Called when the player punches: counts toward the debtor beating. */
  function onPunch(game) {
    const m = active();
    if (!m) return;
    const s = currentStep();
    if (!s || !s.beat || !debtor) return;
    if (dist2(game.player.x, game.player.y, debtor.x, debtor.y) < 46 * 46) {
      debtorHits += 1;
      game.message = `Sal takes a hit (${debtorHits}/3)`;
      game.messageTime = 1.5;
    }
  }

  function waypoint() {
    const s = currentStep();
    if (!s) return null;
    if (s.race) {
      const cp = RACE_POINTS[Math.min(raceProgress, RACE_POINTS.length - 1)];
      return { x: cp.x, y: cp.y, label: `Checkpoint ${raceProgress + 1}/6` };
    }
    return { x: s.x, y: s.y, label: s.label || '' };
  }

  function objectiveText() {
    const m = active();
    if (!m) return '';
    const s = currentStep();
    if (!s) return '';
    let text = `${m.title}: ${s.text}`;
    if (s.timer !== undefined) text += ` — ${Math.max(0, Math.ceil(s.timer - timer))}s left`;
    if (s.survive) text += ` — ${Math.max(0, Math.ceil(s.survive - timer))}s left`;
    if (s.race) text += ` — rivals ${Math.floor(rivalProgress * 100)}%`;
    return text;
  }

  return {
    list, start, active, update, onPunch, waypoint, objectiveText, restore,
    get completed() { return completedCount; },
    get done() { return finished; },
    get currentIndex() { return current; },
  };
}

/** Ten hidden-package spots, scattered across the districts. */
export const PACKAGE_SPOTS = [
  { x: 200, y: 200 }, { x: 1000, y: 300 }, { x: 2100, y: 200 },
  { x: 300, y: 1000 }, { x: 1200, y: 900 }, { x: 2100, y: 1100 },
  { x: 500, y: 1900 }, { x: 1500, y: 2000 }, { x: 2200, y: 1900 },
  { x: 900, y: 2100 },
];
