import Phaser from 'phaser';
import { W, H, WORLD_W, FONT, COLORS, DEPTH } from '../const.js';
import audio from '../audio.js';

const BEST_KEY = 'cryptrunner.best';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.starting = false;
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // crypt backdrop: a slice of the arena, so the title screen is the world
    this.add.image(0, 0, 'floor').setOrigin(0).setDepth(DEPTH.floor);
    this.add.image(0, 0, 'walls').setOrigin(0).setDepth(DEPTH.walls);
    this.cameras.main.setScroll((WORLD_W - W) / 2, 0);

    const torchSpots = [
      [(WORLD_W - W) / 2 + 140, 60],
      [(WORLD_W - W) / 2 + 420, 60],
      [(WORLD_W - W) / 2 + 700, 60]
    ];
    for (const [x, y] of torchSpots) {
      const glow = this.add
        .image(x, y - 6, 'glowGold')
        .setDepth(DEPTH.walls + 1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.26)
        .setScale(2.5);
      this.add.image(x, y, 'torch').setDepth(DEPTH.walls + 2).setOrigin(0.5, 0.8).setAlpha(0.9);
      const flame = this.add.sprite(x, y - 14, 'flame').setDepth(DEPTH.walls + 3).setOrigin(0.5, 0.9);
      this.tweens.add({
        targets: flame,
        scaleY: { from: 0.85, to: 1.15 },
        duration: 190 + Math.random() * 80,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.22, to: 0.32 },
        duration: 260 + Math.random() * 140,
        yoyo: true,
        repeat: -1
      });
    }

    // drifting skeletons in the gloom
    this.walkers = [];
    for (let i = 0; i < 3; i++) {
      const leftSide = i % 2 === 0;
      const sk = this.add
        .sprite(
          leftSide ? Phaser.Math.Between(70, 250) : Phaser.Math.Between(710, 890),
          Phaser.Math.Between(410, 505),
          i === 2 ? 'ghost' : 'skeleton'
        )
        .setDepth(DEPTH.enemy)
        .setAlpha(i === 2 ? 0.4 : 0.6)
        .setScrollFactor(0);
      this.tweens.add({
        targets: sk,
        x: sk.x + Phaser.Math.Between(-160, 160),
        duration: Phaser.Math.Between(4200, 7000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        onYoyo: () => sk.setFlipX(!sk.flipX),
        onRepeat: () => sk.setFlipX(!sk.flipX)
      });
      this.walkers.push(sk);
    }

    this.add.particles(0, 0, 'px', {
      x: { min: 0, max: W },
      y: { min: 80, max: H },
      lifespan: { min: 3000, max: 7000 },
      speed: { min: 3, max: 16 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.5, end: 0 },
      tint: 0xf2b34a,
      blendMode: 'ADD',
      frequency: 140
    }).setDepth(DEPTH.fx).setScrollFactor(0);

    this.add
      .image(W / 2, H / 2, 'vignette')
      .setScrollFactor(0)
      .setDepth(DEPTH.vignette)
      .setAlpha(0.95);

    // title lockup
    const shadowStyle = { fontFamily: FONT, fontSize: '34px', color: '#2f7d5c' };
    const titleStyle = { fontFamily: FONT, fontSize: '34px', color: COLORS.bone };
    this.add.text(W / 2 + 4, 118 + 4, 'CRYPT', shadowStyle).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.hud);
    this.add.text(W / 2, 118, 'CRYPT', titleStyle).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.hud + 1);
    this.add
      .text(W / 2 + 4, 168 + 4, 'RUNNER', { fontFamily: FONT, fontSize: '34px', color: '#8c2f3d' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    const runner = this.add
      .text(W / 2, 168, 'RUNNER', { fontFamily: FONT, fontSize: '34px', color: COLORS.gold })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud + 1);
    this.tweens.add({ targets: runner, y: 166, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add
      .text(W / 2, 214, 'A ROGUELITE BONE CRAWL', { fontFamily: FONT, fontSize: '8px', color: COLORS.faint })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);

    const best = Number(localStorage.getItem(BEST_KEY) || 0);
    if (best > 0) {
      this.add
        .text(W / 2, 246, `BEST SCORE ${best}`, { fontFamily: FONT, fontSize: '8px', color: COLORS.mint })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud);
    }

    // hero + prompt
    const hero = this.add.sprite(W / 2, 320, 'player').setScale(2).setDepth(DEPTH.player).setScrollFactor(0);
    this.tweens.add({
      targets: hero,
      y: 314,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.add
      .image(W / 2, 344, 'glowMint')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.18)
      .setScale(0.8)
      .setScrollFactor(0)
      .setDepth(DEPTH.decal);

    const prompt = this.add
      .text(W / 2, 400, 'PRESS SPACE OR CLICK TO BEGIN', {
        fontFamily: FONT,
        fontSize: '10px',
        color: COLORS.mint
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    this.tweens.add({ targets: prompt, alpha: { from: 0.3, to: 1 }, duration: 800, yoyo: true, repeat: -1 });

    this.add
      .text(W / 2, 446, 'WASD / ARROWS  MOVE      AUTO-ATTACK AIMED AT NEAREST FOE', {
        fontFamily: FONT,
        fontSize: '7px',
        color: COLORS.dim
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    this.add
      .text(W / 2, 464, 'SPACE  DASH      P  PAUSE      M  SOUND', {
        fontFamily: FONT,
        fontSize: '7px',
        color: COLORS.dim
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);

    // input
    this.input.keyboard?.on('keydown-SPACE', () => this.begin());
    this.input.keyboard?.on('keydown-ENTER', () => this.begin());
    this.input.keyboard?.on('keydown-M', () => audio.toggleMute());
    this.input.on('pointerdown', () => this.begin());
  }

  begin() {
    if (this.starting) return;
    this.starting = true;
    audio.unlock();
    audio.select();
    this.cameras.main.flash(220, 106, 211, 160);
    this.cameras.main.fadeOut(280, 0, 0, 0);
    this.time.delayedCall(300, () => this.scene.start('Game'));
  }
}
