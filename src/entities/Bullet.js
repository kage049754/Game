import Phaser from 'phaser';
import { DEPTH } from '../const.js';

export default class Bullet extends Phaser.Physics.Arcade.Image {
  constructor(scene, texture = 'bullet') {
    super(scene, 0, 0, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.bullet);
    this.setBlendMode(Phaser.BlendModes.ADD);
    this.setActive(false).setVisible(false);
    this.body.enable = false;
    this.hitSet = new Set();
    this.pierce = 0;
    this.lifeUntil = 0;
    this.stats = null;
    this.enemyBullet = false;
    this.damage = 1;
  }

  fire(x, y, angle, stats, { enemy = false, speed = 0, damage = 0, life = 0 } = {}) {
    this.enemyBullet = enemy;
    this.stats = stats;
    this.damage = damage || stats.damage;

    this.setPosition(x, y);
    this.setActive(true).setVisible(true);
    this.body.enable = true;
    this.body.reset(x, y);

    this.setRotation(0);
    this.hitSet.clear();
    this.pierce = enemy ? 0 : stats.pierce;

    const v = enemy ? speed || 250 : stats.bulletSpeed;
    this.scene.physics.velocityFromRotation(angle, v, this.body.velocity);
    this.lifeUntil = this.scene.runTime + (life || (enemy ? 4000 : stats.bulletLife));
    this.setScale(enemy ? 1.15 : 1.2);
    this.setTint(enemy ? 0xffffff : 0xffffff);
  }

  kill() {
    this.setActive(false).setVisible(false);
    if (this.body) {
      this.body.stop();
      this.body.enable = false;
    }
  }
}
