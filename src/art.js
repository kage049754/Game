// All art is generated at boot: tiny pixel grids for characters, procedural
// stonework for the crypt. No external image assets, so the game is a few
// kilobytes of JS instead of a texture folder.
import { W, H, WORLD_W, WORLD_H, TILE } from './const.js';

export const PAL = {
  '0': '#0b0a12', // outline
  '1': '#171122', // deep shadow
  '2': '#3d3054', // purple dark
  '3': '#6b568f', // purple mid
  '4': '#f2eefc', // bone highlight
  '5': '#b9b1cf', // bone shadow
  '6': '#6ad3a0', // mint
  '7': '#2f7d5c', // mint dark
  '8': '#f2b34a', // gold
  '9': '#e0574f', // red
  'a': '#8c2f3d', // red dark
  'b': '#7fd8ff', // ice
  'c': '#33466b', // blue dark
  'w': '#ffffff',
  'x': '#000000',
  'm': '#4a3f63', // stone light
  'n': '#332b4a'  // stone mid
};

export const ART = {
  // A hooded crypt runner: purple hood, mint eyes, mint cloak.
  player: [
    '.....00.....',
    '....0330....',
    '...033330...',
    '..03333330..',
    '..03111130..',
    '..03611630..',
    '..03111130..',
    '..00333300..',
    '.0066666600.',
    '.0666666660.',
    '.0666886660.',
    '.0666666660.',
    '.0077777700.',
    '..02....20..'
  ],


  skeleton: [
    '....0000....',
    '...044440...',
    '..04444440..',
    '..04044040..',
    '..04444440..',
    '...045540...',
    '....0000....',
    '..00444400..',
    '.0444444440.',
    '.0404404040.',
    '.0444444440.',
    '..04444440..',
    '...0.00.0...'
  ],

  bat: [
    '..2......2..',
    '.222.00.222.',
    '.2339229332.',
    '..23022032..',
    '...0.22.0...',
    '....0..0....'
  ],

  ghost: [
    '....0000....',
    '..00bbbb00..',
    '.0bbbbbbbb0.',
    '.0bb0bb0bb0.',
    '.0bbbbbbbb0.',
    '.0bbbbbbbb0.',
    '.0bbbbbbbb0.',
    '.0bbbbbbbb0.',
    '.0b0b0b0b0b.',
    '..0.0.0.0.0.',
    '............'
  ],

  brute: [
    '................',
    '....00000000....',
    '...0aaaaaaaa0...',
    '..0aa444444aa0..',
    '..0a44444444a0..',
    '..0a49044094a0..',
    '..0a44444444a0..',
    '...0aa4444aa0...',
    '..00aaaaaaaa00..',
    '.0aa99aaaa99aa0.',
    '.0aaaaaaaaaaaa0.',
    '.0aaaa0aa0aaaa0.',
    '..0aaaaaaaaaa0..',
    '...00a0..0a00...',
    '....0......0....'
  ],

  crown: [
    '8.8.8.8.8',
    '888888888',
    '.8888888.'
  ],

  bullet: [
    '.66.',
    '6ww6',
    '6ww6',
    '.66.'
  ],

  bulletEnemy: [
    '.99.',
    '9ww9',
    '9ww9',
    '.99.'
  ],

  gem: [
    '..8..',
    '.888.',
    '88888',
    '.888.',
    '..8..'
  ],

  gemBig: [
    '...6...',
    '..666..',
    '.66666.',
    '6666666',
    '.66666.',
    '..666..',
    '...6...'
  ],

  heart: [
    '.99.99.',
    '9999999',
    '9999999',
    '9999999',
    '.99999.',
    '..999..'
  ],

  heartEmpty: [
    '.11.11.',
    '1222221',
    '1222221',
    '1222221',
    '.12221.',
    '..111..'
  ],

  flame: [
    '..8..',
    '.888.',
    '.898.',
    '.898.',
    '88a88',
    '.8a8.'
  ],

  torch: [
    '.mmm.',
    '.mnm.',
    '.mmm.',
    '..n..',
    '..n..'
  ],

  splat: [
    '..aa...',
    '.aaaa.a',
    'aaaaaaa',
    '.aaaaa.',
    'aa.aaaa',
    '.aa.aa.',
    'a.....a'
  ],

  splatBone: [
    '..55...',
    '.5555.5',
    '5555555',
    '.55555.',
    '55.5555',
    '.55.55.',
    '5.....5'
  ],

  skull: [
    '.444.',
    '40404',
    '44444',
    '.4.4.'
  ],

  pillar: [
    '..nnnnnnnn..',
    '.nmmmmmmmmn.',
    '.nmmmmmmmmn.',
    '..nmmmmmmn..',
    '..nmmmmmmn..',
    '..nmmmmmmn..',
    '..nmmmmmmn..',
    '..nmmmmmmn..',
    '..nmmmmmmn..',
    '..nmmmmmmn..',
    '..nmmmmmmn..',
    '..nmmmmmmn..',
    '..nmmmmmmn..',
    '..nmmmmmmn..',
    '.nmmmmmmmmn.',
    '.nnnnnnnnnn.'
  ]
};

/** Draw a pixel-grid sprite into a Phaser canvas texture. */
export function makePixelTexture(scene, key, rows, { px = 2, palette = PAL } = {}) {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const tex = scene.textures.createCanvas(key, w * px, h * px);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    if (row.length !== w) console.warn(`art "${key}" row ${y} is ${row.length} wide, expected ${w}`);
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = palette[ch];
      if (!col) {
        console.warn(`art "${key}" uses unknown colour "${ch}"`);
        continue;
      }
      ctx.fillStyle = col;
      ctx.fillRect(x * px, y * px, px, px);
    }
  }
  tex.refresh();
  return tex;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STONE = ['#241d38', '#2a2340', '#1f1930', '#2d2645', '#221b34'];
const STONE_EDGE = '#171122';
const STONE_LIGHT = '#3a3052';

/** Paints the whole crypt floor (and its flagstones) into one big texture. */
export function makeFloorTexture(scene, key = 'floor') {
  const tex = scene.textures.createCanvas(key, WORLD_W, WORLD_H);
  const ctx = tex.getContext();
  const rnd = mulberry32(1337);

  ctx.fillStyle = '#151020';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const cols = Math.ceil(WORLD_W / TILE);
  const rows = Math.ceil(WORLD_H / TILE);

  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const x = tx * TILE;
      const y = ty * TILE;
      const base = STONE[Math.floor(rnd() * STONE.length)];
      ctx.fillStyle = base;
      ctx.fillRect(x, y, TILE, TILE);

      // bevel
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      ctx.fillRect(x, y, TILE, 2);
      ctx.fillRect(x, y, 2, TILE);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x, y + TILE - 2, TILE, 2);
      ctx.fillRect(x + TILE - 2, y, 2, TILE);

      // speckle: grain so the stone is not flat
      for (let s = 0; s < 5; s++) {
        const sx = x + 4 + Math.floor(rnd() * (TILE - 8));
        const sy = y + 4 + Math.floor(rnd() * (TILE - 8));
        ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.22)';
        ctx.fillRect(sx, sy, 2, 2);
      }

      // occasional crack
      if (rnd() < 0.16) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        let cx = x + 6 + Math.floor(rnd() * (TILE - 12));
        let cy = y + 4;
        for (let i = 0; i < 7; i++) {
          ctx.fillRect(cx, cy, 2, 2);
          cx += rnd() > 0.5 ? 2 : -2;
          cy += 3;
        }
      }

      // moss creeping in from the walls
      const borderDist = Math.min(x, y, WORLD_W - x - TILE, WORLD_H - y - TILE);
      if (borderDist < 160 && rnd() < 0.18) {
        ctx.fillStyle = 'rgba(47,125,92,0.16)';
        ctx.fillRect(x + Math.floor(rnd() * 12), y + Math.floor(rnd() * 12), 8 + rnd() * 10, 6 + rnd() * 8);
      }
    }
  }

  tex.refresh();
  return tex;
}

/** Wall ring drawn on its own transparent layer so it can sit above the floor. */
export function makeWallTexture(scene, key = 'walls') {
  const tex = scene.textures.createCanvas(key, WORLD_W, WORLD_H);
  const ctx = tex.getContext();
  const band = TILE * 1.5;
  const rnd = mulberry32(99);

  const brick = (x, y, w, h) => {
    ctx.fillStyle = '#1a1526';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#241d33';
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(x + 2, y + 2, w - 4, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 2, y + h - 4, w - 4, 2);
    if (rnd() < 0.3) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x + 6 + rnd() * (w - 16), y + 6, 3, 3);
    }
  };

  // top / bottom bands
  for (let x = 0; x < WORLD_W; x += 32) {
    brick(x, 0, 32, 22);
    brick(x, 16, 32, 22);
    brick(x, WORLD_H - 44, 32, 22);
    brick(x, WORLD_H - 28, 32, 22);
  }
  // left / right bands
  for (let y = 0; y < WORLD_H; y += 32) {
    brick(0, y, 22, 32);
    brick(16, y, 22, 32);
    brick(WORLD_W - 44, y, 22, 32);
    brick(WORLD_W - 28, y, 22, 32);
  }

  // inner lip highlight so the arena reads as a recessed pit
  ctx.fillStyle = 'rgba(107,86,143,0.55)';
  ctx.fillRect(band, band, WORLD_W - band * 2, 3);
  ctx.fillRect(band, WORLD_H - band - 3, WORLD_W - band * 2, 3);
  ctx.fillRect(band, band, 3, WORLD_H - band * 2);
  ctx.fillRect(WORLD_W - band - 3, band, 3, WORLD_H - band * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(band, band + 3, WORLD_W - band * 2, 6);
  ctx.fillRect(band, WORLD_H - band - 9, WORLD_W - band * 2, 6);
  ctx.fillRect(band + 3, band, 6, WORLD_H - band * 2);
  ctx.fillRect(WORLD_W - band - 9, band, 6, WORLD_H - band * 2);

  tex.refresh();
  return tex;
}

/** Soft radial sprite used for lantern light, muzzle flashes and pickups. */
export function makeGlowTexture(scene, key = 'glow', size = 128, color = '255,255,255') {
  const tex = scene.textures.createCanvas(key, size, size);
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, `rgba(${color},1)`);
  g.addColorStop(0.35, `rgba(${color},0.5)`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
  return tex;
}

/** Hard-edged diamond used for glints. */
export function makeVignetteTexture(scene, key = 'vignette') {
  const tex = scene.textures.createCanvas(key, W, H);
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.32)');
  g.addColorStop(1, 'rgba(0,0,0,0.82)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  tex.refresh();
  return tex;
}

export function makeShadowTexture(scene, key = 'shadow') {
  const tex = scene.textures.createCanvas(key, 48, 18);
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(24, 9, 1, 24, 9, 22);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.save();
  ctx.translate(24, 9);
  ctx.scale(1, 0.36);
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  tex.refresh();
  return tex;
}

export function makeParticleTexture(scene, key = 'px') {
  const tex = scene.textures.createCanvas(key, 4, 4);
  const ctx = tex.getContext();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 4, 4);
  tex.refresh();
  return tex;
}

/** Create every texture the game needs. Called from BootScene. */
// Gameplay sprites are drawn at 3x so the characters read clearly at 960x540;
// bolts and HUD glyphs stay chunky-but-small at 2x.
const PX = { splat: 3, splatBone: 3, bullet: 2, bulletEnemy: 2, heart: 2, heartEmpty: 2, skull: 2, crown: 2, flame: 2, torch: 2, particle: 2, gem: 2, gemBig: 2 };

export function buildArt(scene) {
  for (const [key, rows] of Object.entries(ART)) {
    makePixelTexture(scene, key, rows, { px: PX[key] ?? 3 });
  }
  makeFloorTexture(scene);
  makeWallTexture(scene);
  makeGlowTexture(scene, 'glow');
  makeGlowTexture(scene, 'glowMint', 96, '106,211,160');
  makeGlowTexture(scene, 'glowGold', 96, '242,179,74');
  makeGlowTexture(scene, 'glowRed', 96, '224,87,79');
  makeVignetteTexture(scene);
  makeShadowTexture(scene);
  makeParticleTexture(scene);
}
