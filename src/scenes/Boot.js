import Phaser from 'phaser';
import { W, H } from '../const.js';
import { buildArt } from '../art.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    buildArt(this);
    this.scene.start('Title');
  }
}
