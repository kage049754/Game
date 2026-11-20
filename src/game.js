import Phaser from 'phaser';
import { W, H } from './const.js';
import BootScene from './scenes/Boot.js';
import TitleScene from './scenes/Title.js';
import GameScene from './scenes/Game.js';

export function makeConfig(overrides = {}) {
  return {
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#0b0a12',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: W,
      height: H
    },
    physics: {
      default: 'arcade',
      arcade: { debug: false, gravity: { y: 0 } }
    },
    // the game runs its own WebAudio synth, so Phaser's sound system stays off
    audio: { noAudio: true },
    scene: [BootScene, TitleScene, GameScene],
    ...overrides
  };
}

export function launch(overrides = {}) {
  return new Phaser.Game(makeConfig(overrides));
}
