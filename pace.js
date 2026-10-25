// One shared clock for live play and offline catch-up.
export const REAL_SECONDS_PER_STEP = 18;
export const GAME_MINUTES_PER_STEP = 10;
export const WALK_UNITS_PER_SECOND = 6;
export function elapsedGameMinutes(milliseconds) {
  return Math.max(0, Math.floor(milliseconds / (REAL_SECONDS_PER_STEP * 1000))) * GAME_MINUTES_PER_STEP;
}
