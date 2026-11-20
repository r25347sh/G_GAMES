/**
 * CODE DUEL — Entry (lobby + game)
 */
import { Game } from './game.js';
import { Network } from './network.js';
import { UI } from './ui.js';
import { LanguageManager } from './languages/manager.js';
import { CpuController } from './cpu.js';

class App {
  constructor() {
    this.game = null;
    this.network = null;
    this.ui = null;
    this.langManager = null;
    this.cpu = null;
    this.rafId = null;
    this.lastTime = 0;
    this.fps = 0;
    this.frameCount = 0;
    this.fpsTime = 0;
    this.mode = 'lobby';
    this.secretUnlocked = false;
    this.cpuLevel = 3;
    this._secretBuf = '';
  }

  async init() {
    this.ui = new UI(this);
    this.langManager = new LanguageManager(this);
    this.game = new Game(this);
    this.network = new Network(this);
    this.cpu = new CpuController(this);

    this.ui.bindLobbyEvents();
    this.ui.bindGameEvents();
    this.game.init();
    this.network.init();

    window.addEventListener('keydown', (e) => {
      if (this.mode !== 'lobby') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (k.length !== 1) return;
      this._secretBuf = (this._secretBuf + k.toLowerCase()).slice(-16);
      if (this._secretBuf.includes('overkill')) {
        this.unlockSecret();
        this._secretBuf = '';
      }
    });

    try {
      if (localStorage.getItem('cd_secret') === '1') this.unlockSecret(true);
    } catch (_) {}

    this.startLoop();
    console.log('[CODE DUEL] Initialized');
  }

  unlockSecret(silent) {
    if (this.secretUnlocked) return;
    this.secretUnlocked = true;
    try { localStorage.setItem('cd_secret', '1'); } catch (_) {}
    this.ui.onSecretUnlocked();
    if (!silent) this.ui.showToast('SECRET UNLOCKED: CtrlWorld', false, true);
    const cw = this.langManager.interpreters.ctrlworld;
    if (cw && cw.unlock) cw.unlock();
  }

  startCpu(level) {
    this.mode = 'cpu';
    this.cpuLevel = level;
    this.cpu.start(level);
    this.ui.showGameLayer('CPU Lv' + level + ' (' + this.cpu.getWpm(level) + ' WPM)');
    this.ui.setCpuWpmLabel(this.cpu.getWpm(level) + ' WPM · Lv' + level);
    this.langManager.setLanguage('novice');
    const sample = this.langManager.getSample('novice');
    if (sample) this.ui.setSelfCode(sample);
    this.game.startMatch();
  }

  startOnline() {
    this.mode = 'online';
    this.cpu.stop();
    this.ui.showGameLayer('ONLINE');
    this.ui.setCpuWpmLabel('');
    this.game.startMatch();
  }

  returnToLobby() {
    this.mode = 'lobby';
    this.cpu.stop();
    this.game.state = 'idle';
    this.game.running = false;
    this.ui.showLobby();
  }

  startLoop() {
    const loop = (timestamp) => {
      if (!this.lastTime) this.lastTime = timestamp;
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
      this.lastTime = timestamp;

      if (this.mode === 'cpu' || this.mode === 'online') {
        if (this.mode === 'cpu') this.cpu.update(dt);
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
      }

      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }
}

const app = new App();
window.addEventListener('DOMContentLoaded', () => app.init());
window.G_GAMES = app;
