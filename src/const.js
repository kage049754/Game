// Shared layout + palette constants.
export const W = 960;
export const H = 540;

export const TILE = 32;
export const WORLD_W = 1280;
export const WORLD_H = 800;

// Playable area (inside the wall ring).
export const ARENA = {
  left: TILE * 1.5,
  top: TILE * 1.5,
  right: WORLD_W - TILE * 1.5,
  bottom: WORLD_H - TILE * 1.5
};

export const FONT = '"Press Start 2P", monospace';

export const COLORS = {
  bone: '#f2eefc',
  dim: '#b9b1cf',
  faint: '#6b568f',
  mint: '#6ad3a0',
  mintDark: '#2f7d5c',
  gold: '#f2b34a',
  red: '#e0574f',
  redDark: '#8c2f3d',
  purple: '#3d3054',
  ink: '#0b0a12',
  panel: 0x161125
};

export const DEPTH = {
  floor: 0,
  walls: 1,
  decal: 2,
  shadow: 3,
  pickup: 4,
  enemy: 6,
  player: 7,
  bullet: 8,
  fx: 9,
  overhead: 10,
  vignette: 90,
  hud: 100,
  modal: 200
};

// Player starts with these; upgrades mutate the live copy.
export const BASE_STATS = {
  maxHp: 6,
  speed: 158,
  damage: 9,
  fireRate: 460, // ms between shots
  bullets: 1,
  spread: 0.16, // radians between extra bullets
  pierce: 0,
  bulletSpeed: 520,
  bulletLife: 900,
  critChance: 0,
  critMult: 2,
  magnet: 130,
  dashCooldown: 1500,
  dashPower: 760,
  dashInvuln: 220,
  slow: 0,
  leechEvery: 0,
  lucky: 0 // bonus xp per gem, in percent
};
