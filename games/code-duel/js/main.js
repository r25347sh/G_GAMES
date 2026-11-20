/**
 * G_GAMES - CODE DUEL
 * Entry point
 */

import { Game } from './game.js';
import { Network } from './network.js';
import { UI } from './ui.js';
import { LanguageManager } from './languages/manager.js';

class App {
  constructor() {
    this.game = null;
    this.network = null;
    this.ui = null;
    this.langManager = null;
    this.rafId = null;
    this.lastTime = 0;
    this.fps = 0;
    this.frameCount = 0;
    this.fpsTime = 0;
  }

  async init() {
    this.ui = new UI(this);
    this.langManager = new LanguageManager(this);
    this.game = new Game(this);
    this.network = new Network(this);

    this.ui.bindEvents();
    this.game.init();
    this.network.init();

    this.langManager.setLanguage('novice');
    this.ui.updateHelp('novice');

    this.startLoop();
    console.log('[G_GAMES] Initialized');
  }

  startLoop() {
    const loop = (timestamp) => {
      if (!this.lastTime) this.lastTime = timestamp;
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
      this.lastTime = timestamp;

      this.game.update(dt);
      this.game.render();

      this.frameCount++;
      this.fpsTime += dt;
      if (this.fpsTime >= 0.5) {
        this.fps = Math.round(this.frameCount / this.fpsTime);
        this.frameCount = 0;
        this.fpsTime = 0;
        this.ui.updateFps(this.fps);
      }

      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }
}

const app = new App();
window.addEventListener('DOMContentLoaded', () => app.init());
window.G_GAMES = app;
