import Phaser from 'phaser';
import { W, H, WORLD_W, WORLD_H, ARENA, FONT, COLORS, DEPTH } from '../const.js';
import Player from '../entities/Player.js';
import Enemy, { ENEMY_TYPES } from '../entities/Enemy.js';
import Bullet from '../entities/Bullet.js';
import { rollUpgrades } from '../upgrades.js';
import audio from '../audio.js';

const BEST_KEY = 'cryptrunner.best';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.runTime = 0;
    this.paused = false;
    this.gameOver = false;
    this.upgradeOpen = false;
    this.wave = 0;
    this.waveState = 'idle';
    this.spawnLeft = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 0.7;
    this.restUntil = 0;
    this.kills = 0;
    this.score = 0;
    this.gemStreak = 0;
    this.lastGemAt = -9999;
    this.pendingLevels = 0;
    this.boss = null;
    this.upgradeCards = null;
    this.overlay = null;

    this.buildCrypt();
    this.buildGroups();
    this.buildPlayer();
    this.buildFx();
    this.buildColliders();
    this.buildHud();
    this.buildInput();

    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.time.delayedCall(600, () => this.startWave(1));
    audio.startMusic();

    this.events.once('shutdown', () => audio.stopMusic(0.3));
  }

  // ---------------------------------------------------------------------
  // world
  // ---------------------------------------------------------------------

  buildCrypt() {
    this.add.image(0, 0, 'floor').setOrigin(0).setDepth(DEPTH.floor);
    this.add.image(0, 0, 'walls').setOrigin(0).setDepth(DEPTH.walls);

    this.physics.world.setBounds(ARENA.left, ARENA.top, ARENA.right - ARENA.left, ARENA.bottom - ARENA.top);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBackgroundColor('#0b0a12');

    // decorative pillars tucked into the wall band
    const spots = [
      [110, 58], [WORLD_W / 2, 58], [WORLD_W - 110, 58],
      [110, WORLD_H - 58], [WORLD_W / 2, WORLD_H - 58], [WORLD_W - 110, WORLD_H - 58]
    ];
    for (const [x, y] of spots) {
      this.add.image(x, y, 'shadow').setDepth(DEPTH.walls).setScale(1.1).setAlpha(0.5);
      this.add.image(x, y, 'pillar').setDepth(DEPTH.walls + 1).setOrigin(0.5, 0.85);
    }

    // wall torches
    this.torches = [];
    const torchSpots = [
      [190, 60], [WORLD_W / 2 - 150, 60], [WORLD_W / 2 + 150, 60], [WORLD_W - 190, 60],
      [190, WORLD_H - 60], [WORLD_W / 2 - 150, WORLD_H - 60], [WORLD_W / 2 + 150, WORLD_H - 60], [WORLD_W - 190, WORLD_H - 60]
    ];
    for (const [x, y] of torchSpots) {
      const glow = this.add
        .image(x, y - 6, 'glowGold')
        .setDepth(DEPTH.decal)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.28)
        .setScale(2.4);
      this.add.image(x, y, 'torch').setDepth(DEPTH.walls + 2).setOrigin(0.5, 0.8);
      const flame = this.add.sprite(x, y - 14, 'flame').setDepth(DEPTH.walls + 3).setOrigin(0.5, 0.9);
      this.tweens.add({
        targets: flame,
        scaleY: { from: 0.85, to: 1.15 },
        scaleX: { from: 1.05, to: 0.9 },
        duration: 180 + Math.random() * 90,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.24, to: 0.34 },
        scale: { from: 2.3, to: 2.6 },
        duration: 240 + Math.random() * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      this.torches.push({ flame, glow });
    }

    // ambient dust
    this.add.particles(0, 0, 'px', {
      x: { min: 40, max: WORLD_W - 40 },
      y: { min: 40, max: WORLD_H - 40 },
      lifespan: { min: 4000, max: 9000 },
      speed: { min: 4, max: 18 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.5, end: 0 },
      tint: 0xf2b34a,
      blendMode: 'ADD',
      frequency: 120,
      quantity: 1
    }).setDepth(DEPTH.fx);
  }

  buildGroups() {
    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.gems = this.physics.add.group();
  }

  buildPlayer() {
    this.player = new Player(this, WORLD_W / 2, WORLD_H / 2 + 60);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setDeadzone(140, 90);
  }

  buildFx() {
    this.fxBone = this.add.particles(0, 0, 'px', {
      speed: { min: 40, max: 180 },
      lifespan: { min: 240, max: 560 },
      scale: { start: 1.4, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0xf2eefc,
      blendMode: 'ADD',
      emitting: false
    }).setDepth(DEPTH.fx);

    this.fxBlood = this.add.particles(0, 0, 'px', {
      speed: { min: 30, max: 140 },
      lifespan: { min: 260, max: 620 },
      scale: { start: 1.3, end: 0 },
      alpha: { start: 0.95, end: 0 },
      tint: [0xe0574f, 0x8c2f3d],
      gravityY: 220,
      emitting: false
    }).setDepth(DEPTH.fx);

    this.fxMint = this.add.particles(0, 0, 'px', {
      speed: { min: 30, max: 150 },
      lifespan: { min: 260, max: 620 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0x6ad3a0, 0x7fd8ff],
      blendMode: 'ADD',
      emitting: false
    }).setDepth(DEPTH.fx);

    this.fxGold = this.add.particles(0, 0, 'px', {
      speed: { min: 20, max: 90 },
      lifespan: { min: 240, max: 520 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xf2b34a, 0xffffff],
      blendMode: 'ADD',
      emitting: false
    }).setDepth(DEPTH.fx);

    this.fxIce = this.add.particles(0, 0, 'px', {
      speed: { min: 20, max: 110 },
      lifespan: { min: 300, max: 700 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0x7fd8ff, 0xffffff],
      blendMode: 'ADD',
      emitting: false
    }).setDepth(DEPTH.fx);

    this.fxSpawn = this.add.particles(0, 0, 'px', {
      speed: { min: 30, max: 150 },
      lifespan: { min: 260, max: 620 },
      scale: { start: 2.4, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: [0x8c2f3d, 0xd8b4ff, 0x6ad3a0],
      blendMode: 'ADD',
      emitting: false
    }).setDepth(DEPTH.fx);

    this.fxDust = this.add.particles(0, 0, 'px', {
      speed: { min: 10, max: 70 },
      lifespan: { min: 300, max: 700 },
      scale: { start: 2, end: 0 },
      alpha: { start: 0.35, end: 0 },
      tint: 0xb9b1cf,
      emitting: false
    }).setDepth(DEPTH.fx);

    // floating damage numbers
    this.dmgPool = [];
    for (let i = 0; i < 24; i++) {
      const t = this.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '8px', color: '#f2eefc' })
        .setOrigin(0.5)
        .setDepth(DEPTH.fx)
        .setActive(false)
        .setVisible(false);
      this.dmgPool.push(t);
    }

    this.vignette = this.add
      .image(W / 2, H / 2, 'vignette')
      .setScrollFactor(0)
      .setDepth(DEPTH.vignette)
      .setAlpha(0.9);
  }

  buildColliders() {
    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHitsEnemy, null, this);
    this.physics.add.overlap(this.enemyBullets, this.player, this.onEnemyBulletHitsPlayer, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerHitsEnemy, null, this);
    this.physics.add.overlap(this.player, this.gems, this.onGemPickup, null, this);
    this.physics.add.collider(this.enemies, this.enemies);
  }

  // ---------------------------------------------------------------------
  // hud
  // ---------------------------------------------------------------------

  buildHud() {
    const fixed = (obj) => obj.setScrollFactor(0).setDepth(DEPTH.hud);

    this.hudGfx = fixed(this.add.graphics());

    this.levelText = fixed(
      this.add.text(292, 17, 'LV 1', { fontFamily: FONT, fontSize: '8px', color: COLORS.mint }).setOrigin(1, 0)
    );
    this.xpText = fixed(
      this.add.text(668, 17, '0/6', { fontFamily: FONT, fontSize: '8px', color: COLORS.dim }).setOrigin(0, 0)
    );
    this.waveText = fixed(
      this.add.text(W - 28, 74, 'WAVE 1', { fontFamily: FONT, fontSize: '10px', color: COLORS.gold }).setOrigin(1, 0)
    );
    this.timeText = fixed(
      this.add.text(W - 28, 92, '0:00', { fontFamily: FONT, fontSize: '8px', color: COLORS.dim }).setOrigin(1, 0)
    );
    this.killText = fixed(
      this.add.text(W - 28, 112, '0', { fontFamily: FONT, fontSize: '8px', color: COLORS.dim }).setOrigin(1, 0)
    );
    this.add.image(W - 74, 116, 'skull').setScrollFactor(0).setDepth(DEPTH.hud).setScale(1).setAlpha(0.8);
    this.scoreText = fixed(
      this.add.text(W - 28, 132, '0', { fontFamily: FONT, fontSize: '8px', color: COLORS.faint }).setOrigin(1, 0)
    );
    this.bossName = fixed(
      this.add.text(W / 2, 58, 'THE BONE WARDEN', { fontFamily: FONT, fontSize: '8px', color: COLORS.red })
        .setOrigin(0.5, 0)
        .setVisible(false)
    );

    this.hintText = fixed(
      this.add.text(26, H - 26, 'WASD / ARROWS  MOVE     SPACE  DASH     P  PAUSE', {
        fontFamily: FONT,
        fontSize: '7px',
        color: COLORS.faint
      }).setOrigin(0, 0)
    );

    this.heartImgs = [];
    this.refreshHearts();

    // small clickable buttons (pause / mute)
    this.pauseBtn = this.makeIconButton(W - 86, 28, 'II', () => this.togglePause());
    this.muteBtn = this.makeIconButton(W - 54, 28, 'M', () => this.toggleMute());
    this.muteBtn.label.setColor(audio.muted ? COLORS.faint : COLORS.mint);

    this.touchDash = null;
    this.buildTouchUi();
  }

  makeIconButton(x, y, label, onClick) {
    const box = this.add
      .rectangle(x, y, 26, 20, 0x161125, 0.85)
      .setStrokeStyle(1, 0x3d3054)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, y + 1, label, { fontFamily: FONT, fontSize: '8px', color: COLORS.dim })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud + 1);
    box.on('pointerover', () => box.setFillStyle(0x241d33, 0.95));
    box.on('pointerout', () => box.setFillStyle(0x161125, 0.85));
    box.on('pointerdown', (p) => {
      p.event?.stopPropagation?.();
      audio.click();
      onClick();
    });
    return { box, label: text };
  }

  refreshHearts() {
    if (this.heartImgs) this.heartImgs.forEach((h) => h.destroy());
    this.heartImgs = [];
    const max = this.player.stats.maxHp;
    const perRow = 8;
    for (let i = 0; i < max; i++) {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const img = this.add
        .image(32 + col * 17, 30 + row * 15, 'heart')
        .setScrollFactor(0)
        .setDepth(DEPTH.hud)
        .setScale(0.85);
      this.heartImgs.push(img);
    }
    this.dashBarY = 46 + Math.floor((max - 1) / perRow) * 15;
  }

  updateHud() {
    const g = this.hudGfx;
    const p = this.player;
    g.clear();

    // hearts
    this.heartImgs.forEach((img, i) => {
      img.setTexture(i < p.hp ? 'heart' : 'heartEmpty');
    });

    // dash cooldown
    const barX = 26;
    const barW = 96;
    const y = this.dashBarY;
    g.fillStyle(0x161125, 0.9).fillRect(barX, y, barW, 7);
    const charge = Phaser.Math.Clamp(p.dashCharge(), 0, 1);
    g.fillStyle(charge >= 1 ? 0x6ad3a0 : 0x3d3054, 1).fillRect(barX + 1, y + 1, (barW - 2) * charge, 5);
    if (charge < 1) {
      g.fillStyle(0x6ad3a0, 0.35).fillRect(barX + 1, y + 1, (barW - 2) * charge, 2);
    }

    // xp bar
    const xpX = 300;
    const xpW = 360;
    const xpY = 22;
    g.fillStyle(0x0b0a12, 0.9).fillRect(xpX - 2, xpY - 2, xpW + 4, 12);
    g.fillStyle(0x241d33, 1).fillRect(xpX, xpY, xpW, 8);
    const pct = Phaser.Math.Clamp(p.xp / p.xpNext, 0, 1);
    g.fillStyle(0x6ad3a0, 1).fillRect(xpX, xpY, xpW * pct, 8);
    g.fillStyle(0x9ef0c4, 0.6).fillRect(xpX, xpY, xpW * pct, 2);
    g.lineStyle(1, 0x3d3054, 1).strokeRect(xpX - 2, xpY - 2, xpW + 4, 12);

    this.levelText.setText(`LV ${p.level}`);
    this.xpText.setText(`${Math.floor(p.xp)}/${p.xpNext}`);

    const secs = Math.floor(this.runTime / 1000);
    this.timeText.setText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`);
    this.killText.setText(`${this.kills}`);
    this.scoreText.setText(`${this.score}`);
    this.waveText.setText(`WAVE ${Math.max(1, this.wave)}`);

    // boss bar
    if (this.boss && this.boss.active) {
      const bw = 420;
      const bx = (W - bw) / 2;
      const by = 46;
      g.fillStyle(0x0b0a12, 0.9).fillRect(bx - 2, by - 2, bw + 4, 12);
      g.fillStyle(0x2a1220, 1).fillRect(bx, by, bw, 8);
      const bhp = Phaser.Math.Clamp(this.boss.hp / this.boss.maxHp, 0, 1);
      g.fillStyle(0xe0574f, 1).fillRect(bx, by, bw * bhp, 8);
      g.fillStyle(0xff9d90, 0.7).fillRect(bx, by, bw * bhp, 2);
      this.bossName.setVisible(true);
    } else {
      this.bossName.setVisible(false);
    }

    // touch dash button
    if (this.touchDash) {
      const ready = p.dashCharge() >= 1;
      this.touchDash.clear();
      this.touchDash
        .fillStyle(0x161125, 0.55)
        .fillCircle(W - 92, H - 84, 40)
        .lineStyle(2, ready ? 0x6ad3a0 : 0x3d3054, 0.9)
        .strokeCircle(W - 92, H - 84, 40);
      if (!ready) {
        this.touchDash
          .fillStyle(0x6ad3a0, 0.25)
          .slice(W - 92, H - 84, 40, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + 360 * p.dashCharge()), true)
          .fillPath();
      }
    }
  }

  buildTouchUi() {
    const isTouch = this.sys.game.device.input.touch;
    if (!isTouch) return;
    this.touchDash = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud);
    this.stickGfx = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud);
    this.hintText.setVisible(false);
  }

  // ---------------------------------------------------------------------
  // input
  // ---------------------------------------------------------------------

  buildInput() {
    this.moveVec = new Phaser.Math.Vector2(0, 0);
    this.stick = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };

    const kb = this.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,P,ESC,M,R,ONE,TWO,THREE');
      kb.on('keydown-P', () => this.togglePause());
      kb.on('keydown-ESC', () => this.togglePause());
      kb.on('keydown-M', () => this.toggleMute());
      kb.on('keydown-R', () => {
        if (this.gameOver) this.restart();
      });
      kb.on('keydown-ONE', () => this.selectUpgrade(0));
      kb.on('keydown-TWO', () => this.selectUpgrade(1));
      kb.on('keydown-THREE', () => this.selectUpgrade(2));
    }

    this.input.on('pointerdown', (p) => this.onPointerDown(p));
    this.input.on('pointermove', (p) => this.onPointerMove(p));
    this.input.on('pointerup', (p) => this.onPointerUp(p));
  }

  onPointerDown(p) {
    audio.unlock();
    if (this.gameOver) {
      if (this.runTime > this.deathAt + 800) this.restart();
      return;
    }
    if (this.paused || this.upgradeOpen) return;

    // touch dash button
    if (this.touchDash && Phaser.Math.Distance.Between(p.x, p.y, W - 92, H - 84) < 52) {
      this.tryPlayerDash();
      return;
    }

    if (!this.stick.active && p.x < W * 0.62) {
      this.stick.active = true;
      this.stick.id = p.id;
      this.stick.ox = p.x;
      this.stick.oy = p.y;
      this.stick.x = p.x;
      this.stick.y = p.y;
    }
  }

  onPointerMove(p) {
    if (this.stick.active && p.id === this.stick.id) {
      this.stick.x = p.x;
      this.stick.y = p.y;
    }
  }

  onPointerUp(p) {
    if (this.stick.active && p.id === this.stick.id) {
      this.stick.active = false;
      this.stick.id = null;
    }
  }

  stickVector() {
    if (!this.stick.active) return { x: 0, y: 0, len: 0 };
    const dx = this.stick.x - this.stick.ox;
    const dy = this.stick.y - this.stick.oy;
    const len = Math.hypot(dx, dy);
    const max = 52;
    if (len < 8) return { x: 0, y: 0, len: 0 };
    const clamped = Math.min(len, max) / max;
    return { x: (dx / len) * clamped, y: (dy / len) * clamped, len };
  }

  readInput() {
    let mx = 0;
    let my = 0;
    const k = this.keys;
    if (k) {
      if (k.A.isDown || k.LEFT.isDown) mx -= 1;
      if (k.D.isDown || k.RIGHT.isDown) mx += 1;
      if (k.W.isDown || k.UP.isDown) my -= 1;
      if (k.S.isDown || k.DOWN.isDown) my += 1;
    }
    const stick = this.stickVector();
    mx += stick.x;
    my += stick.y;
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    this.moveVec.set(mx, my);
    return { mx, my };
  }

  tryPlayerDash() {
    if (!this.player || this.player.dead) return;
    const { mx, my } = this.readInput();
    this.player.tryDash(mx, my);
  }

  toggleMute() {
    const muted = audio.toggleMute();
    if (this.muteBtn) this.muteBtn.label.setColor(muted ? COLORS.faint : COLORS.mint);
    this.toast(muted ? 'SOUND OFF' : 'SOUND ON');
  }

  togglePause() {
    if (this.gameOver || this.upgradeOpen) return;
    if (this.paused) this.resumeGame();
    else this.pauseGame();
  }

  pauseGame() {
    this.paused = true;
    this.physics.pause();
    audio.click();
    this.overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.modal);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x05040a, 0.8).setInteractive();
    const panel = this.add.rectangle(W / 2, H / 2, 460, 210, 0x161125, 0.98).setStrokeStyle(2, 0x3d3054);
    const title = this.add
      .text(W / 2, H / 2 - 62, 'PAUSED', { fontFamily: FONT, fontSize: '22px', color: COLORS.mint })
      .setOrigin(0.5);
    const secs = Math.floor(this.runTime / 1000);
    const info = this.add
      .text(W / 2, H / 2 - 12, `WAVE ${Math.max(1, this.wave)}   LV ${this.player.level}   SCORE ${this.score}\n${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} SURVIVED`, {
        fontFamily: FONT,
        fontSize: '8px',
        color: COLORS.dim,
        align: 'center',
        lineSpacing: 12
      })
      .setOrigin(0.5);
    const sub = this.add
      .text(W / 2, H / 2 + 56, 'P or ESC  RESUME      M  SOUND', { fontFamily: FONT, fontSize: '8px', color: COLORS.faint })
      .setOrigin(0.5);
    this.overlay.add([dim, panel, title, info, sub]);
    dim.on('pointerdown', () => this.resumeGame());
  }

  resumeGame() {
    if (!this.paused) return;
    this.paused = false;
    this.physics.resume();
    audio.click();
    this.overlay?.destroy(true);
    this.overlay = null;
  }

  // ---------------------------------------------------------------------
  // main loop
  // ---------------------------------------------------------------------

  update(time, delta) {
    const dt = Math.min(delta, 48) / 1000;

    if (this.gameOver || this.paused || this.upgradeOpen) {
      return;
    }

    this.runTime += delta;
    const t = this.runTime;

    this.readInput();
    this.updatePlayer(dt, t);
    this.updateWaves(dt, t);
    this.updateEnemies(dt, t);
    this.updateBullets(dt, t);
    this.updateGems(dt, t);

    if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) this.tryPlayerDash();

    this.updateHud();
    this.drawStick();
  }

  drawStick() {
    if (!this.stickGfx) return;
    const g = this.stickGfx;
    g.clear();
    if (!this.stick.active) return;
    const max = 52;
    g.fillStyle(0x161125, 0.5).fillCircle(this.stick.ox, this.stick.oy, max);
    g.lineStyle(2, 0x6ad3a0, 0.5).strokeCircle(this.stick.ox, this.stick.oy, max);
    const v = this.stickVector();
    g.fillStyle(0x6ad3a0, 0.75).fillCircle(this.stick.ox + v.x * max, this.stick.oy + v.y * max, 20);
  }

  updatePlayer(dt, t) {
    const p = this.player;
    if (!p || p.dead) return;
    p.tick(dt, this.moveVec.x, this.moveVec.y);
  }

  updateEnemies(dt, t) {
    const list = this.enemies.getChildren();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.active) e.tick(dt, t);
    }
    if (this.boss && this.boss.active) this.bossTick(t);
  }

  updateBullets(dt, t) {
    const killOut = (b) => {
      if (b.x < ARENA.left - 40 || b.x > ARENA.right + 40 || b.y < ARENA.top - 40 || b.y > ARENA.bottom + 40) {
        b.kill();
      }
    };
    for (const b of this.bullets.getChildren()) {
      if (!b.active) continue;
      if (t > b.lifeUntil) b.kill();
      else killOut(b);
    }
    for (const b of this.enemyBullets.getChildren()) {
      if (!b.active) continue;
      if (t > b.lifeUntil) b.kill();
      else killOut(b);
    }
  }

  updateGems(dt, t) {
    const p = this.player;
    if (!p || p.dead) return;
    for (const gem of this.gems.getChildren()) {
      if (!gem.active) continue;
      const dist = Phaser.Math.Distance.Between(gem.x, gem.y, p.x, p.y);
      const pull = p.stats.magnet * 2.4;
      if (dist < p.stats.magnet) {
        const angle = Math.atan2(p.y - gem.y, p.x - gem.x);
        const speed = Phaser.Math.Linear(160, 700, 1 - dist / p.stats.magnet);
        gem.body.velocity.x = Math.cos(angle) * speed;
        gem.body.velocity.y = Math.sin(angle) * speed;
      } else if (dist < pull) {
        const angle = Math.atan2(p.y - gem.y, p.x - gem.x);
        const speed = 40 + 150 * (1 - dist / pull);
        gem.body.velocity.x = Math.cos(angle) * speed;
        gem.body.velocity.y = Math.sin(angle) * speed;
      } else {
        gem.body.velocity.scale(0.9);
      }
      gem.setDepth(DEPTH.pickup + gem.y / 4000);
      gem.y += Math.sin(t * 0.006 + gem.x) * 6 * dt;
    }
  }

  // ---------------------------------------------------------------------
  // waves & spawning
  // ---------------------------------------------------------------------

  updateWaves(dt, t) {
    if (this.waveState === 'resting') {
      if (t > this.restUntil) this.startWave(this.wave + 1);
      return;
    }
    if (this.waveState !== 'spawning') return;

    const alive = this.enemies.countActive(true);
    this.spawnTimer -= dt;

    if (this.spawnLeft > 0 && this.spawnTimer <= 0 && alive < 72) {
      this.spawnEnemy(this.pickEnemyType());
      this.spawnLeft--;
      this.spawnTimer = this.spawnInterval * Phaser.Math.FloatBetween(0.7, 1.3);
    }

    if (this.spawnLeft <= 0 && alive === 0) {
      this.waveState = 'resting';
      this.restUntil = t + 1500;
      this.score += 60 + this.wave * 25;
      this.collectXp(3);
      this.banner('WAVE CLEARED', '+1 HEART', COLORS.mint);
      this.player.heal(1);
    }
  }

  startWave(n) {
    this.wave = n;
    this.waveState = 'spawning';
    this.spawnTimer = 0;

    const bossWave = n % 5 === 0;
    if (bossWave) {
      this.spawnLeft = 1;
      this.spawnInterval = 1;
      this.waveState = 'boss-incoming';
      this.banner(`WAVE ${n}`, 'THE BONE WARDEN AWAKENS', COLORS.red);
      audio.boss();
      this.cameras.main.shake(600, 0.012);
      this.time.delayedCall(1100, () => {
        this.spawnBoss();
        this.waveState = 'spawning';
      });
    } else {
      this.spawnLeft = 5 + Math.floor(n * 2.1);
      this.spawnInterval = Math.max(0.22, 0.72 - n * 0.04);
      this.banner(`WAVE ${n}`, '', COLORS.gold);
      audio.waveStart();
    }
  }

  pickEnemyType() {
    const w = this.wave;
    const pool = ['skeleton', 'skeleton'];
    if (w >= 2) pool.push('bat');
    if (w >= 3) pool.push('bat', 'skeleton');
    if (w >= 4) pool.push('ghost');
    if (w >= 6) pool.push('brute', 'ghost');
    if (w >= 8) pool.push('brute');
    return Phaser.Utils.Array.GetRandom(pool);
  }

  randomEdgePoint() {
    const pad = 34;
    const side = Phaser.Math.Between(0, 3);
    if (side === 0) return { x: Phaser.Math.Between(ARENA.left + pad, ARENA.right - pad), y: ARENA.top + pad };
    if (side === 1) return { x: ARENA.right - pad, y: Phaser.Math.Between(ARENA.top + pad, ARENA.bottom - pad) };
    if (side === 2) return { x: Phaser.Math.Between(ARENA.left + pad, ARENA.right - pad), y: ARENA.bottom - pad };
    return { x: ARENA.left + pad, y: Phaser.Math.Between(ARENA.top + pad, ARENA.bottom - pad) };
  }

  spawnEnemy(typeKey) {
    const { x, y } = this.randomEdgePoint();
    const enemy = new Enemy(this, x, y, typeKey, this.wave);
    this.enemies.add(enemy);
    enemy.setAlpha(0);
    this.tweens.add({ targets: enemy, alpha: enemy.alphaTarget, duration: 260 });
    this.spawnPuff(x, y, 0x8c2f3d);
    return enemy;
  }

  spawnBoss() {
    if (this.gameOver) return;
    const x = WORLD_W / 2;
    const y = ARENA.top + 150;
    const boss = new Enemy(this, x, y, 'warden', this.wave);
    this.boss = boss;
    this.enemies.add(boss);
    boss.setAlpha(0);
    this.tweens.add({ targets: boss, alpha: 1, duration: 600 });
    this.spawnPuff(x, y, 0xd8b4ff, 26);
    this.cameras.main.flash(260, 160, 120, 220);
    this.bossSpecialAt = this.runTime + 2200;
    this.bossSummonAt = this.runTime + 3800;
  }

  bossTick(t) {
    const boss = this.boss;
    if (!boss || !boss.active) return;
    if (t > this.bossSpecialAt) {
      this.bossSpecialAt = t + 2100;
      // telegraph, then a radial bone burst
      this.tweens.add({ targets: boss.glow, alpha: 0.95, yoyo: true, duration: 170 });
      this.time.delayedCall(170, () => {
        if (!boss.active || this.gameOver) return;
        const count = 12;
        const base = Math.random() * Math.PI * 2;
        for (let i = 0; i < count; i++) {
          const angle = base + (i / count) * Math.PI * 2;
          const b = this.getBullet(this.enemyBullets, 'bulletEnemy');
          b.fire(boss.x, boss.y, angle, this.player.stats, { enemy: true, speed: 235, damage: 1, life: 4200 });
        }
        this.fxIce.explode(10, boss.x, boss.y);
        audio.shoot();
      });
    }
    if (t > this.bossSummonAt) {
      this.bossSummonAt = t + 6000;
      for (let i = 0; i < 3; i++) {
        this.spawnEnemy(i % 2 === 0 ? 'skeleton' : 'bat');
      }
    }
  }

  spawnPuff(x, y, tint, count = 12) {
    this.fxSpawn.explode(count, x, y);
  }

  spawnDeathDecal(x, y, size = 1, texture = 'splat') {
    const stain = this.add
      .image(x + Phaser.Math.Between(-4, 4), y + Phaser.Math.Between(2, 10), texture)
      .setDepth(DEPTH.decal)
      .setAlpha(0.45)
      .setScale(Phaser.Math.FloatBetween(1, 1.8) * size)
      .setFlipX(Math.random() < 0.5)
      .setFlipY(Math.random() < 0.5);
    this.tweens.add({ targets: stain, alpha: 0, duration: 9000, delay: 4000, onComplete: () => stain.destroy() });
  }

  // ---------------------------------------------------------------------
  // combat
  // ---------------------------------------------------------------------

  nearestEnemy(x, y, range = 9999) {
    let best = null;
    let bestD = range * range;
    for (const e of this.enemies.getChildren()) {
      if (!e.active) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  getBullet(group, texture) {
    const b = group.getFirstDead(false);
    if (b) {
      b.setTexture(texture);
      b.setActive(true).setVisible(true);
      if (b.body) b.body.enable = true;
      return b;
    }
    const nb = new Bullet(this, texture);
    group.add(nb);
    return nb;
  }

  fireBullet(x, y, angle, stats) {
    const b = this.getBullet(this.bullets, 'bullet');
    b.fire(x, y, angle, stats);
    this.fxMint.explode(1, x, y);
  }

  muzzleFlash(x, y) {
    const flash = this.add
      .image(x, y, 'glowMint')
      .setDepth(DEPTH.fx)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.13)
      .setAlpha(0.55);
    this.tweens.add({
      targets: flash,
      scale: 0.3,
      alpha: 0,
      duration: 90,
      onComplete: () => flash.destroy()
    });
    audio.shoot();
  }

  onBulletHitsEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active) return;
    if (bullet.hitSet.has(enemy)) return;
    bullet.hitSet.add(enemy);

    const stats = bullet.stats;
    const crit = Math.random() < stats.critChance;
    const dmg = stats.damage * (crit ? stats.critMult : 1);

    this.fxBone.explode(crit ? 6 : 3, bullet.x, bullet.y);
    enemy.takeDamage(dmg, {
      crit,
      angle: bullet.rotation,
      slow: stats.slow,
      slowTime: 1400
    });

    if (bullet.pierce > 0) {
      bullet.pierce -= 1;
    } else {
      bullet.kill();
    }
  }

  // Phaser normalises mixed group/sprite overlaps to (sprite, groupChild),
  // so the player arrives first here.
  onEnemyBulletHitsPlayer(player, bullet) {
    if (!player || !bullet || !bullet.active || player.dead) return;
    bullet.kill();
    player.takeDamage(bullet.damage, bullet.x, bullet.y);
  }

  onPlayerHitsEnemy(player, enemy) {
    if (player.dead || !enemy.active) return;
    if (player.t < player.invulnUntil) return;
    const dmg = enemy.damage;
    if (player.takeDamage(dmg, enemy.x, enemy.y)) {
      enemy.knock.set((enemy.x - player.x) * 1.4, (enemy.y - player.y) * 1.4);
      this.enemyBounce(enemy);
    }
  }

  enemyBounce(enemy) {
    const angle = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
    enemy.knock.set(Math.cos(angle) * 200, Math.sin(angle) * 200);
  }

  onGemPickup(player, gem) {
    if (!gem.active) return;
    const value = gem.getData('xp') || 1;
    const big = gem.getData('big');
    gem.destroy();
    this.collectXp(value * (1 + player.stats.lucky / 100));
    this.fxGold.explode(big ? 12 : 4, gem.x, gem.y);
    if (this.runTime - this.lastGemAt < 900) this.gemStreak = Math.min(12, this.gemStreak + 1);
    else this.gemStreak = 0;
    this.lastGemAt = this.runTime;
    audio.gem(this.gemStreak);
  }

  collectXp(amount) {
    const p = this.player;
    p.xp += amount;
    let leveled = false;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level += 1;
      p.xpNext = Math.round(6 + (p.level - 1) * 5);
      this.pendingLevels += 1;
      leveled = true;
    }
    if (leveled) {
      this.score += 50;
      this.openUpgrade();
    }
  }

  dropGem(x, y, xp, big = false) {
    const gem = this.physics.add.image(x, y, big ? 'gemBig' : 'gem');
    gem.setDepth(DEPTH.pickup);
    gem.body.setCircle(8, gem.width / 2 - 8, gem.height / 2 - 8);
    gem.setDrag(220);
    gem.setData('xp', xp);
    gem.setData('big', big);
    this.gems.add(gem);
    this.tweens.add({
      targets: gem,
      scale: { from: 1.4, to: 1 },
      duration: 220,
      ease: 'Back.easeOut'
    });
  }

  onEnemyKilled(enemy) {
    this.kills += 1;
    this.score += 10 + this.wave * 2;
    const p = this.player;
    if (p.stats.leechEvery > 0) {
      p.killsSinceHeal += 1;
      if (p.killsSinceHeal >= p.stats.leechEvery) {
        p.killsSinceHeal = 0;
        p.heal(1);
      }
    }
  }

  onBossKilled(boss) {
    this.kills += 1;
    this.score += 500 + this.wave * 50;
    this.boss = null;
    this.banner('WARDEN SLAIN', '+2 HEARTS, +30 SOULS', COLORS.gold);
    this.player.heal(2);
    this.cameras.main.flash(400, 255, 240, 200);
  }

  // ---------------------------------------------------------------------
  // fx helpers
  // ---------------------------------------------------------------------

  cameraShake(duration, intensity) {
    if (this.cameras.main) this.cameras.main.shake(duration, intensity, false);
  }

  showDamage(x, y, amount, crit = false, color = null) {
    const t = this.dmgPool.find((d) => !d.active);
    if (!t) return;
    t.setText(`${Math.round(amount)}`)
      .setPosition(x + Phaser.Math.Between(-4, 4), y)
      .setActive(true)
      .setVisible(true)
      .setAlpha(1)
      .setScale(crit ? 1.5 : 1)
      .setColor(color || (crit ? COLORS.gold : COLORS.bone));
    this.tweens.add({
      targets: t,
      y: y - 24,
      alpha: 0,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => t.setActive(false).setVisible(false)
    });
  }

  banner(title, sub = '', color = COLORS.gold) {
    const c = this.add.container(W / 2, 150).setScrollFactor(0).setDepth(DEPTH.modal - 1).setAlpha(0);
    const t1 = this.add.text(0, 0, title, { fontFamily: FONT, fontSize: '22px', color }).setOrigin(0.5);
    const t2 = this.add
      .text(0, 34, sub, { fontFamily: FONT, fontSize: '8px', color: COLORS.dim })
      .setOrigin(0.5);
    c.add([t1, t2]);
    c.setScale(1.25);
    this.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: c,
      alpha: 0,
      y: 130,
      delay: 1300,
      duration: 420,
      onComplete: () => c.destroy()
    });
  }

  toast(text) {
    const t = this.add
      .text(W / 2, H - 60, text, { fontFamily: FONT, fontSize: '8px', color: COLORS.mint })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    this.tweens.add({ targets: t, alpha: 0, y: H - 80, duration: 700, onComplete: () => t.destroy() });
  }

  dashTrail(player) {
    const ghost = this.add
      .image(player.x, player.y, 'player')
      .setDepth(DEPTH.player - 1)
      .setFlipX(player.flipX)
      .setAlpha(0.5)
      .setTint(0x6ad3a0);
    this.tweens.add({ targets: ghost, alpha: 0, scale: 0.8, duration: 220, onComplete: () => ghost.destroy() });
  }

  // ---------------------------------------------------------------------
  // upgrades
  // ---------------------------------------------------------------------

  openUpgrade() {
    if (this.upgradeOpen || this.gameOver) return;
    this.upgradeOpen = true;
    this.physics.pause();
    audio.levelUp();
    this.cameras.main.flash(180, 60, 120, 90);

    const choices = rollUpgrades(this.player, 3);
    this.upgradeChoices = choices;

    const container = this.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.modal);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x05040a, 0.78).setInteractive();
    const title = this.add
      .text(W / 2, 108, 'LEVEL UP', { fontFamily: FONT, fontSize: '20px', color: COLORS.mint })
      .setOrigin(0.5);
    const sub = this.add
      .text(W / 2, 140, 'CHOOSE A BLESSING', { fontFamily: FONT, fontSize: '8px', color: COLORS.faint })
      .setOrigin(0.5);
    container.add([dim, title, sub]);

    const cards = [];
    choices.forEach((def, i) => {
      const card = this.buildUpgradeCard(def, i, choices.length);
      container.add(card);
      cards.push(card);
    });
    this.upgradeCards = cards;
    this.overlay = container;
  }

  buildUpgradeCard(def, index, total) {
    const level = this.player.levels[def.id] || 0;
    const card = this.add.container(W / 2 + (index - (total - 1) / 2) * 244, 330);

    const bg = this.add.rectangle(0, 0, 220, 196, 0x1b1430, 0.98).setStrokeStyle(2, 0x3d3054);
    const inner = this.add.rectangle(0, 0, 208, 184).setStrokeStyle(1, 0x241d33);

    const icon = this.add.image(0, -60, def.icon);
    icon.setScale(44 / Math.max(icon.width, icon.height));
    if (def.iconTint) icon.setTint(def.iconTint);
    if (def.icon.startsWith('glow')) icon.setBlendMode(Phaser.BlendModes.ADD);

    const name = this.add
      .text(0, -18, def.name, { fontFamily: FONT, fontSize: '9px', color: COLORS.gold })
      .setOrigin(0.5);
    const desc = this.add
      .text(0, 12, def.desc(), {
        fontFamily: FONT,
        fontSize: '7px',
        color: COLORS.dim,
        align: 'center',
        wordWrap: { width: 180 }
      })
      .setOrigin(0.5);

    // pips
    const pips = [];
    for (let i = 0; i < def.max; i++) {
      const pip = this.add
        .rectangle(-((def.max - 1) * 7) / 2 + i * 7, 44, 5, 5, i < level ? 0x6ad3a0 : 0x2a2340);
      pips.push(pip);
    }

    const hint = this.add
      .text(0, 70, `[ ${index + 1} ]`, { fontFamily: FONT, fontSize: '7px', color: COLORS.faint })
      .setOrigin(0.5);

    card.add([bg, inner, icon, name, desc, ...pips, hint]);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      bg.setStrokeStyle(2, 0x6ad3a0);
      bg.setFillStyle(0x241d3f, 0.98);
      card.setScale(1.04);
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(2, 0x3d3054);
      bg.setFillStyle(0x1b1430, 0.98);
      card.setScale(1);
    });
    bg.on('pointerdown', (p) => {
      p.event?.stopPropagation?.();
      this.selectUpgrade(index);
    });

    return card;
  }

  selectUpgrade(index) {
    if (!this.upgradeOpen) return;
    const def = this.upgradeChoices[index];
    if (!def) return;

    this.upgradeOpen = false;
    def.apply(this.player);
    this.player.levels[def.id] = (this.player.levels[def.id] || 0) + 1;
    audio.select();
    this.fxMint.explode(18, this.player.x, this.player.y);
    this.cameras.main.flash(120, 40, 90, 70);
    if (def.id === 'vitality') this.refreshHearts();

    this.pendingLevels = Math.max(0, this.pendingLevels - 1);

    if (this.overlay) {
      const overlay = this.overlay;
      this.overlay = null;
      this.tweens.add({
        targets: overlay,
        alpha: 0,
        duration: 180,
        onComplete: () => overlay.destroy(true)
      });
    }
    this.upgradeCards = null;

    if (this.pendingLevels > 0) {
      this.time.delayedCall(240, () => this.openUpgrade());
    } else {
      this.time.delayedCall(220, () => {
        if (!this.gameOver) this.physics.resume();
      });
    }
  }

  // ---------------------------------------------------------------------
  // death & restart
  // ---------------------------------------------------------------------

  onPlayerDeath() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.deathAt = this.runTime;
    this.physics.pause();
    this.cameras.main.shake(500, 0.02);
    this.cameras.main.flash(300, 120, 20, 30);
    this.hudGfx?.setAlpha(0.25);
    this.heartImgs?.forEach((h) => h.setAlpha(0.25));
    [this.levelText, this.xpText, this.waveText, this.timeText, this.killText, this.scoreText, this.bossName].forEach((t) => t?.setAlpha(0.25));
    audio.stopMusic(0.4);
    audio.gameOver();

    const best = Math.max(this.score, Number(localStorage.getItem(BEST_KEY) || 0));
    localStorage.setItem(BEST_KEY, String(best));

    this.time.delayedCall(650, () => this.showGameOver(best));
  }

  showGameOver(best) {
    const container = this.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.modal);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x05040a, 0.82).setInteractive();
    const skull = this.add.image(W / 2, 122, 'skull').setScale(3).setTint(0xe0574f);
    const title = this.add
      .text(W / 2, 158, 'YOU DIED', { fontFamily: FONT, fontSize: '24px', color: COLORS.red })
      .setOrigin(0.5);
    const secs = Math.floor(this.runTime / 1000);
    const stats = [
      `WAVE      ${Math.max(1, this.wave)}`,
      `KILLS     ${this.kills}`,
      `TIME      ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`,
      `SCORE     ${this.score}`,
      `BEST      ${best}`
    ].join('\n');
    const statsText = this.add
      .text(W / 2, 232, stats, { fontFamily: FONT, fontSize: '9px', color: COLORS.dim, lineSpacing: 10 })
      .setOrigin(0.5, 0);
    const isBest = this.score >= best && this.score > 0;
    const bestText = this.add
      .text(W / 2, 196, isBest ? 'NEW BEST!' : '', { fontFamily: FONT, fontSize: '8px', color: COLORS.gold })
      .setOrigin(0.5);
    const prompt = this.add
      .text(W / 2, 452, 'CLICK OR PRESS R TO RISE AGAIN', {
        fontFamily: FONT,
        fontSize: '8px',
        color: COLORS.mint
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: { from: 0.35, to: 1 }, duration: 700, yoyo: true, repeat: -1 });

    container.add([dim, skull, title, bestText, statsText, prompt]);
    this.overlay = container;

    dim.on('pointerdown', () => {
      if (this.runTime > this.deathAt + 900) this.restart();
    });
  }

  restart() {
    this.overlay?.destroy(true);
    this.overlay = null;
    this.scene.restart();
  }
}
