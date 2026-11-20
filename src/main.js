import './style.css';
import '@fontsource/press-start-2p/400.css';
import { launch } from './game.js';

async function start() {
  // Phaser rasterises text into textures, so the pixel font must be ready first.
  try {
    await document.fonts.load('10px "Press Start 2P"');
    await document.fonts.ready;
  } catch {
    /* font loading is best-effort; falls back to monospace */
  }
  window.__CRYPT__ = launch();
}

start();
