/**
 * CODE DUEL — Entry (lobby + game + tutorial)
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
    this.mode = 'lobby'; // lobby | cpu | online | tutorial
    this.secretUnlocked = false;
    this.cpuLevel = 3;
    this.selectedLang = 'novice'; // chosen only in lobby
    this.tutorialLang = null;
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

    // Secret: type "overkill" anywhere in lobby
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
    if (!silent) {
      this.ui.showToast('SECRET UNLOCKED: CtrlWorld', false, true);
    }
    const cw = this.langManager.interpreters.ctrlworld;
    if (cw && cw.unlock) cw.unlock();
  }

  /** Language can only be chosen in lobby */
  setSelectedLang(lang) {
    if (this.mode !== 'lobby') return;
    this.selectedLang = lang || 'novice';
    this.langManager.setLanguage(this.selectedLang);
  }

  startCpu(level) {
    this.mode = 'cpu';
    this.cpuLevel = level;
    this.cpu.start(level);

    // Language locked to lobby selection
    this.langManager.setLanguage(this.selectedLang);
    this.ui.lockLanguage(this.selectedLang);

    // EMPTY start — no sample code
    this.ui.setSelfCode('');
    this.ui.setEnemyCode('');
    this.ui.clearConsoles();

    this.ui.showGameLayer('CPU Lv' + level + ' (' + this.cpu.getWpm(level) + ' WPM)');
    this.ui.setCpuWpmLabel(this.cpu.getWpm(level) + ' WPM · Lv' + level);
    this.game.startMatch();
  }

  startOnline() {
    this.mode = 'online';
    this.cpu.stop();
    this.langManager.setLanguage(this.selectedLang);
    this.ui.lockLanguage(this.selectedLang);
    this.ui.setSelfCode('');
    this.ui.setEnemyCode('');
    this.ui.clearConsoles();
    this.ui.showGameLayer('ONLINE');
    this.ui.setCpuWpmLabel('');
    this.game.startMatch();
  }

  /** Per-language tutorial mode */
  startTutorial(lang) {
    this.mode = 'tutorial';
    this.tutorialLang = lang || this.selectedLang;
    this.cpu.stop();
    this.langManager.setLanguage(this.tutorialLang);
    this.ui.lockLanguage(this.tutorialLang);

    // Load tutorial starter code (guided, not full sample)
    const starter = this.langManager.getTutorialStarter(this.tutorialLang);
    this.ui.setSelfCode(starter || '');
    this.ui.setEnemyCode('');
    this.ui.clearConsoles();

    // Very weak dummy CPU for tutorial
    this.cpu.setLevel(1);
    this.cpu.start(1);
    // Override to almost passive
    this.cpu.cfg = {
      wpm: 30,
      label: 'Tutorial Dummy',
      interval: 8,
      aggression: 0.15,
      analyzeDepth: 0,
    };

    this.ui.showGameLayer('TUTORIAL · ' + (this.tutorialLang || '').toUpperCase());
    this.ui.setCpuWpmLabel('TUTORIAL MODE');
    this.ui.logSelf('Tutorial started for ' + this.tutorialLang + '. Follow the comments in the editor.');
    this.game.startMatch();
  }

  returnToLobby() {
    this.mode = 'lobby';
    this.cpu.stop();
    this.game.state = 'idle';
    this.game.running = false;
    this.ui.unlockLanguage();
    this.ui.showLobby();
  }

  startLoop() {
    const loop = (timestamp) => {
      if (!this.lastTime) this.lastTime = timestamp;
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
      this.lastTime = timestamp;

      if (this.mode === 'cpu' || this.mode === 'online' || this.mode === 'tutorial') {
        if (this.mode === 'cpu' || this.mode === 'tutorial') this.cpu.update(dt);
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
