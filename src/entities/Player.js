import Phaser from 'phaser';
import { BASE_STATS, DEPTH } from '../const.js';
import audio from '../audio.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(DEPTH.player);
    this.setCollideWorldBounds(true);
    this.body.setSize(18, 14);
    this.body.setOffset(9, 26);

    this.stats = { ...BASE_STATS };
    this.levels = {};
    this.hp = this.stats.maxHp;
    this.level = 1;
    this.xp = 0;
    this.xpNext = 6;
    this.dead = false;

    this.lastShot = -999;
    this.invulnUntil = 0;
    this.dashUntil = 0;
    this.dashReadyAt = 0;
    this.killsSinceHeal = 0;
    this.facing = 1;
    this.dashDir = new Phaser.Math.Vector2(1, 0);

    this.shadow = scene.add.image(x, y + 17, 'shadow').setDepth(DEPTH.shadow).setAlpha(0.75);
    this.light = scene.add
      .image(x, y, 'glowMint')
      .setDepth(DEPTH.decal)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.1)
      .setScale(1.15);
  }

  get t() {
    return this.scene.runTime;
  }

  dashCharge() {
    const cd = this.stats.dashCooldown;
    const left = Math.max(0, this.dashReadyAt - this.t);
    return 1 - left / cd;
  }

  canDash() {
    return this.t >= this.dashReadyAt && !this.dead;
  }

  tryDash(moveX, moveY) {
    if (!this.canDash()) return false;
    const dir = new Phaser.Math.Vector2(moveX, moveY);
    if (dir.lengthSq() < 0.01) dir.set(this.facing, 0);
    dir.normalize();
    this.dashDir.copy(dir);
    this.dashUntil = this.t + 170;
    this.dashReadyAt = this.t + this.stats.dashCooldown;
    this.invulnUntil = Math.max(this.invulnUntil, this.t + this.stats.dashInvuln);
    // phase through the horde while dashing so you never get wedged in a blob
    this.body.checkCollision.none = true;
    this.setVelocity(dir.x * this.stats.dashPower, dir.y * this.stats.dashPower);
    this.scene.cameraShake(60, 0.003);
    this.scene.dashTrail(this);
    audio.dash();
    return true;
  }

  tick(dt, moveX, moveY) {
    if (this.dead) return;

    const t = this.t;
    const dashing = t < this.dashUntil;

    if (!dashing) {
      const speed = this.stats.speed;
      const targetX = moveX * speed;
      const targetY = moveY * speed;
      const k = 1 - Math.exp(-16 * dt);
      this.setVelocity(
        Phaser.Math.Linear(this.body.velocity.x, targetX, k),
        Phaser.Math.Linear(this.body.velocity.y, targetY, k)
      );
    } else if (t > this.dashUntil - 30) {
      this.setVelocity(this.dashDir.x * this.stats.dashPower * 0.35, this.dashDir.y * this.stats.dashPower * 0.35);
    }

    if (this.body.checkCollision.none && t > this.dashUntil) {
      this.body.checkCollision.none = false;
    }

    if (moveX !== 0) this.facing = moveX > 0 ? 1 : -1;
    this.setFlipX(this.facing < 0);

    // bobbing walk cycle
    const moving = Math.abs(this.body.velocity.x) + Math.abs(this.body.velocity.y) > 30;
    this.setScale(1, moving ? 1 + Math.sin(t * 0.02) * 0.04 : 1);

    const invuln = t < this.invulnUntil;
    this.setAlpha(invuln ? (Math.floor(t / 70) % 2 ? 0.45 : 1) : 1);

    const trail = dashing ? 1 : 0;
    this.light.setAlpha(0.09 + trail * 0.12 + Math.sin(t * 0.004) * 0.015);

    if (t >= this.lastShot + this.stats.fireRate) this.shoot(t);

    this.shadow.setPosition(this.x, this.y + 17);
    this.light.setPosition(this.x, this.y - 2);
  }

  shoot(t) {
    const target = this.scene.nearestEnemy(this.x, this.y, 460);
    if (!target) return;
    const base = Math.atan2(target.y - this.y, target.x - this.x);
    const n = this.stats.bullets;
    for (let i = 0; i < n; i++) {
      const offset = (i - (n - 1) / 2) * this.stats.spread;
      this.scene.fireBullet(this.x, this.y - 4, base + offset, this.stats);
    }
    this.lastShot = t;
    this.setFlipX(Math.cos(base) < 0);
    this.scene.muzzleFlash(this.x + Math.cos(base) * 16, this.y - 4 + Math.sin(base) * 16);
  }

  takeDamage(amount, fromX, fromY) {
    const t = this.t;
    if (this.dead || t < this.invulnUntil) return false;

    this.hp -= amount;
    this.invulnUntil = t + 900;
    this.dashUntil = 0;

    if (fromX !== undefined) {
      const angle = Math.atan2(this.y - fromY, this.x - fromX);
      this.setVelocity(Math.cos(angle) * 260, Math.sin(angle) * 260);
    }

    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => this.clearTint());
    this.scene.cameraShake(220, 0.011);
    this.scene.cameras.main.flash(140, 120, 20, 32, false);
    this.scene.fxBlood.explode(10, this.x, this.y);
    this.scene.showDamage(this.x, this.y - 16, amount, false, '#e0574f');
    audio.hurt();

    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
    this.scene.events.emit('hp-changed', this.hp, this.stats.maxHp);
    return true;
  }

  heal(n) {
    this.hp = Math.min(this.stats.maxHp, this.hp + n);
    this.scene.fxMint.explode(8, this.x, this.y);
    audio.gem(3);
    this.scene.events.emit('hp-changed', this.hp, this.stats.maxHp);
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.setVelocity(0, 0);
    this.body.enable = false;
    this.setAlpha(1);
    this.scene.fxMint.explode(26, this.x, this.y);
    this.scene.fxBone.explode(20, this.x, this.y);
    this.scene.tweens.add({
      targets: [this, this.shadow, this.light],
      alpha: 0,
      scaleY: 0.2,
      duration: 700,
      ease: 'Quad.easeIn'
    });
    this.scene.onPlayerDeath();
  }

  destroy(fromScene) {
    this.shadow?.destroy();
    this.light?.destroy();
    super.destroy(fromScene);
  }
}
