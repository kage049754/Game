// Level-up "blessings". Each has a max level so the pool naturally dries up
// into the strongest picks on a long run.
export const UPGRADES = [
  {
    id: 'shard',
    name: 'BONE SHARD',
    icon: 'bullet',
    iconTint: 0xf2eefc,
    max: 5,
    desc: () => '+22% bolt damage',
    apply: (p) => { p.stats.damage *= 1.22; }
  },
  {
    id: 'quiver',
    name: 'QUICK DRAW',
    icon: 'bullet',
    iconTint: 0xf2b34a,
    max: 5,
    desc: () => '+18% fire rate',
    apply: (p) => { p.stats.fireRate = Math.max(110, p.stats.fireRate * 0.82); }
  },
  {
    id: 'split',
    name: 'SPLIT SHOT',
    icon: 'bullet',
    iconTint: 0x7fd8ff,
    max: 3,
    desc: () => '+1 bolt per volley',
    apply: (p) => {
      p.stats.bullets += 1;
      p.stats.spread = Math.max(0.1, 0.16 - p.stats.bullets * 0.008);
    }
  },
  {
    id: 'pierce',
    name: 'PIERCING',
    icon: 'bullet',
    iconTint: 0xd8b4ff,
    max: 3,
    desc: () => 'bolts pass through +1 foe',
    apply: (p) => { p.stats.pierce += 1; }
  },
  {
    id: 'boots',
    name: 'SWIFT BOOTS',
    icon: 'player',
    max: 4,
    desc: () => '+10% move speed',
    apply: (p) => { p.stats.speed *= 1.1; }
  },
  {
    id: 'dash',
    name: 'PHASE DASH',
    icon: 'glowMint',
    iconTint: 0x6ad3a0,
    max: 4,
    desc: () => '-18% dash cooldown',
    apply: (p) => { p.stats.dashCooldown = Math.max(420, p.stats.dashCooldown * 0.82); }
  },
  {
    id: 'vitality',
    name: 'VITALITY',
    icon: 'heart',
    max: 4,
    desc: () => '+1 max heart, heal 1',
    apply: (p) => {
      p.stats.maxHp += 1;
      p.hp = Math.min(p.stats.maxHp, p.hp + 1);
    }
  },
  {
    id: 'magnet',
    name: 'SOUL MAGNET',
    icon: 'gem',
    max: 3,
    desc: () => '+70% pickup range',
    apply: (p) => { p.stats.magnet *= 1.7; }
  },
  {
    id: 'crit',
    name: 'CRITICAL EYE',
    icon: 'skull',
    iconTint: 0xf2b34a,
    max: 5,
    desc: () => '+12% crit chance',
    apply: (p) => { p.stats.critChance = Math.min(0.85, p.stats.critChance + 0.12); }
  },
  {
    id: 'frost',
    name: 'FROST BOLT',
    icon: 'glowMint',
    iconTint: 0x7fd8ff,
    max: 2,
    desc: () => 'bolts chill foes',
    apply: (p) => { p.stats.slow = Math.min(0.6, p.stats.slow + 0.3); }
  },
  {
    id: 'leech',
    name: 'SOUL SIPHON',
    icon: 'heart',
    iconTint: 0x6ad3a0,
    max: 3,
    desc: () => 'heal 1 every 14 kills',
    apply: (p) => {
      p.stats.leechEvery = p.stats.leechEvery === 0 ? 14 : Math.max(6, p.stats.leechEvery - 4);
    }
  },
  {
    id: 'greed',
    name: 'GRAVE GREED',
    icon: 'gemBig',
    iconTint: 0xf2b34a,
    max: 3,
    desc: () => '+25% soul value',
    apply: (p) => { p.stats.lucky += 25; }
  }
];

export function upgradeLevel(player, def) {
  return player.levels[def.id] || 0;
}

export function rollUpgrades(player, count = 3) {
  const pool = UPGRADES.filter((u) => upgradeLevel(player, u) < u.max);
  const picked = [];
  while (picked.length < count && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked;
}
