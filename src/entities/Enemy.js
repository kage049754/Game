import Phaser from 'phaser';
import { DEPTH } from '../const.js';
import audio from '../audio.js';

export const ENEMY_TYPES = {
  skeleton: {
    texture: 'skeleton',
    hp: 22,
    speed: 58,
    damage: 1,
    xp: 2,
    body: [16, 20],
    tint: null,
    particles: 'fxBone',
    burst: 10
  },
  bat: {
    texture: 'bat',
    hp: 10,
    speed: 120,
    damage: 1,
    xp: 1,
    body: [18, 10],
    tint: null,
    particles: 'fxBlood',
    burst: 8,
    wobble: 1
  },
  ghost: {
    texture: 'ghost',
    hp: 28,
    speed: 78,
    damage: 1,
    xp: 3,
    body: [16, 18],
    tint: null,
    alpha: 0.78,
    particles: 'fxIce',
    burst: 10
  },
  brute: {
    texture: 'brute',
    hp: 95,
    speed: 40,
    damage: 2,
    xp: 6,
    body: [34, 34],
    tint: null,
    particles: 'fxBlood',
    burst: 22,
    big: true,
    scale: 1
  },
  warden: {
    texture: 'skeleton',
    hp: 420,
    speed: 46,
    damage: 2,
    xp: 30,
    body: [40, 46],
    tint: 0xd8b4ff,
    particles: 'fxBone',
    burst: 40,
    boss: true,
    scale: 3
  }
};

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, typeKey, wave = 1) {
    const def = ENEMY_TYPES[typeKey];
    super(scene, x, y, def.texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.typeKey = typeKey;
    this.def = def;
    this.setDepth(def.boss ? DEPTH.player + 1 : DEPTH.enemy);
    this.setScale(def.scale || 1);
    if (def.alpha) this.setAlpha(def.alpha);
    if (def.tint) this.setTint(def.tint);

    const [bw, bh] = def.body;
    this.body.setSize(bw / (def.scale || 1), bh / (def.scale || 1));
    this.body.setOffset((this.width - bw / (def.scale || 1)) / 2, this.height - bh / (def.scale || 1) - 2);

    this.spawnIn = 0;
    this.alphaTarget = def.alpha || 1;

    const hpScale = def.boss ? 1 + (wave / 5 - 1) * 0.55 : 1 + (wave - 1) * 0.19;
    this.maxHp = Math.round(def.hp * hpScale);
    this.hp = this.maxHp;
    this.speed = def.speed * Math.min(1.55, 1 + (wave - 1) * 0.022);
    this.damage = def.damage;
    this.xp = def.xp;
    this.knock = new Phaser.Math.Vector2(0, 0);
    this.slowUntil = 0;
    this.slowAmount = 0;
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.lungeAt = 0;
    this.specialAt = 0;
    this.summonAt = 0;
    this.radius = Math.max(bw, bh) * 0.34;

    this.shadow = scene.add
      .image(x, y + 10 * (def.scale || 1), 'shadow')
      .setDepth(DEPTH.shadow)
      .setAlpha(0.6)
      .setScale(0.9 + (def.scale || 1) * 0.3);

    if (def.boss) {
      this.crown = scene.add.image(x, y - 46, 'crown').setScale(2).setDepth(DEPTH.player + 2);
      this.glow = scene.add
        .image(x, y, 'glowRed')
        .setDepth(DEPTH.decal)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.35)
        .setScale(1.6);
    }
  }

  tick(dt, t) {
    if (!this.active) return;
    const scene = this.scene;
    const player = scene.player;

    const slow = t < this.slowUntil ? 1 - this.slowAmount : 1;
    let vx = 0;
    let vy = 0;

    if (player && !player.dead) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      vx = (dx / dist) * this.speed * slow;
      vy = (dy / dist) * this.speed * slow;

      if (this.def.wobble) {
        const w = Math.sin(t * 0.006 + this.wobblePhase) * 0.8;
        const px = -dy / dist;
        const py = dx / dist;
        vx += px * w * this.speed;
        vy += py * w * this.speed;
      }

      if (this.def.boss) {
        // charge at the player, then recover
        if (t > this.lungeAt) {
          this.lungeAt = t + 2600;
          this.chargeUntil = t + 420;
        }
        if (this.chargeUntil && t < this.chargeUntil) {
          vx *= 2.6;
          vy *= 2.6;
        }
      }
    }

    this.setVelocity(vx + this.knock.x, vy + this.knock.y);
    this.knock.scale(Math.exp(-8 * dt));

    if (vx !== 0) this.setFlipX(vx < 0);

    // slow tint feedback
    if (t < this.slowUntil) this.setTint(0x7fd8ff);
    else if (this.def.tint) this.setTint(this.def.tint);
    else this.clearTint();

    this.setDepth(this.def.boss ? DEPTH.player + 1 : DEPTH.enemy + (this.y / 2000));
    this.shadow.setPosition(this.x, this.y + 10 * (this.def.scale || 1));
    if (this.crown) {
      this.crown.setPosition(this.x, this.y - 47 + Math.sin(t * 0.004) * 2);
      this.glow.setPosition(this.x, this.y);
    }
  }

  takeDamage(amount, { crit = false, angle = 0, slow = 0, slowTime = 0 } = {}) {
    if (!this.active) return false;
    this.hp -= amount;

    if (slow > 0) {
      this.slowAmount = slow;
      this.slowUntil = this.scene.runTime + slowTime;
    }

    const resist = this.def.boss ? 0.12 : 1;
    if (!this.def.boss) {
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      this.knock.set(dirX * 90 * resist, dirY * 90 * resist);
    }

    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(55, () => {
      if (this.active) {
        if (this.def.tint) this.setTint(this.def.tint);
        else this.clearTint();
      }
    });

    this.scene.showDamage(this.x, this.y - 10 * (this.def.scale || 1), amount, crit);
    if (crit) audio.crit();
    else audio.hit();

    if (this.hp <= 0) {
      this.die(angle);
      return true;
    }
    return false;
  }

  die(angle = 0) {
    if (!this.active) return;
    const scene = this.scene;
    const emitter = scene[this.def.particles] || scene.fxBone;
    emitter.explode(this.def.burst, this.x, this.y);
    scene.spawnDeathDecal(this.x, this.y, this.def.boss ? 2 : 1, this.def.particles === 'fxBone' ? 'splatBone' : 'splat');

    if (this.def.boss) {
      audio.boss();
      scene.cameraShake(500, 0.02);
      scene.cameras.main.flash(300, 200, 170, 255);
      this.crown?.destroy();
      this.glow?.destroy();
      this.shadow.destroy();
      scene.onBossKilled(this);
      scene.dropGem(this.x, this.y, this.xp, true);
      this.destroy();
      return;
    }

    audio.kill();
    if (this.def.big) {
      scene.cameraShake(140, 0.008);
      scene.fxBone.explode(10, this.x, this.y);
    }
    scene.dropGem(this.x, this.y, this.xp);
    scene.onEnemyKilled(this);
    this.shadow.destroy();
    this.destroy();
  }

  destroy(fromScene) {
    this.shadow?.destroy();
    this.crown?.destroy();
    this.glow?.destroy();
    super.destroy(fromScene);
  }
}
