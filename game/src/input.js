// Keyboard and pointer input. Held keys give movement; one-shot presses (enter
// car, punch, shoot, pause, mute, confirm) are queued as bit flags and taken
// once by the loop, so a press between two frames is never lost or counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_PUNCH = 8;
export const ACTION_SHOOT = 16;
export const ACTION_WEAPON = 32;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const SPRINT = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Enter', 'Space']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER = new Set(['KeyE']);
const PUNCH = new Set(['KeyF']);
const SHOOT = new Set(['KeyG']);
const WEAPON = new Set(['KeyQ', 'Digit1', 'Digit2']);
const MUTE = new Set(['KeyM']);

export function createInput(target) {
  const held = new Set();
  let actions = 0;
  let mutePressed = false;

  function onKey(code, down) {
    if (down) held.add(code);
    else held.delete(code);
  }

  window.addEventListener('keydown', (event) => {
    const c = event.code;
    if (UP.has(c) || DOWN.has(c) || LEFT.has(c) || RIGHT.has(c) || SPRINT.has(c)) {
      onKey(c, true);
      event.preventDefault();
      return;
    }
    if (event.repeat) return;
    if (CONFIRM.has(c)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(c)) actions |= ACTION_PAUSE;
    else if (ENTER.has(c)) actions |= ACTION_ENTER;
    else if (PUNCH.has(c)) actions |= ACTION_PUNCH;
    else if (SHOOT.has(c)) actions |= ACTION_SHOOT;
    else if (WEAPON.has(c)) actions |= ACTION_WEAPON;
    else if (MUTE.has(c)) mutePressed = true;
    else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => onKey(event.code, false));
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => held.clear());
  target.addEventListener('pointerdown', () => { actions |= ACTION_CONFIRM; });

  const any = (set) => { for (const c of set) if (held.has(c)) return true; return false; };

  return {
    /** -1..1 forward/back, -1..1 left/right. */
    move() {
      const y = (any(DOWN) ? 1 : 0) - (any(UP) ? 1 : 0);
      const x = (any(RIGHT) ? 1 : 0) - (any(LEFT) ? 1 : 0);
      return { x, y };
    },
    sprint() { return any(SPRINT); },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeMute() {
      const m = mutePressed;
      mutePressed = false;
      return m;
    },
  };
}
