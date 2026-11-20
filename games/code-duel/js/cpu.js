/**
 * CPU opponent — WPM-based difficulty (5 levels)
 */
const DIFF = {
  1: { wpm: 20, label: '初心者相当。反応が遅く単純な追跡のみ。', interval: 3.0, aggression: 0.3 },
  2: { wpm: 40, label: 'やや遅い。距離管理を少し意識する。', interval: 2.0, aggression: 0.45 },
  3: { wpm: 60, label: '標準的な反応速度。バランス型AI。', interval: 1.2, aggression: 0.6 },
  4: { wpm: 80, label: '速い打ち手。偏差射撃と回避を併用。', interval: 0.75, aggression: 0.8 },
  5: { wpm: 100, label: 'プロ級。高頻度で戦術を切り替える。', interval: 0.45, aggression: 1.0 },
};

const SCRIPTS = {
  chase: `// CPU: chase\nface enemy\nchase\nif front then fire\nif near then spread\nif energy low then shield\n`,
  kite: `// CPU: kite\nface enemy\nif dist < 140 then flee\nif dist > 220 then go\nif front then fire\nif near then spread\n`,
  orbit: `// CPU: orbit\norbit\nif front then fire\nif energy low then shield\n`,
  aggressive: `// CPU: aggressive\nface enemy\nchase\nif front then fire\nif near then charge\nif dist < 100 then spread\nif energy low then shield\n`,
  defensive: `// CPU: defensive\nface enemy\nif dist < 160 then flee\nif wall near then turn left\nif front then fire\nshield\n`,
};

export class CpuController {
  constructor(app) {
    this.app = app;
    this.level = 3;
    this.cfg = DIFF[3];
    this.timer = 0;
    this.currentKey = 'chase';
    this.enabled = false;
    this.typeIndex = 0;
    this.targetScript = '';
    this.typing = false;
    this.typeBuffer = '';
    this._acc = 0;
  }

  setLevel(lv) {
    this.level = Math.max(1, Math.min(5, lv | 0));
    this.cfg = DIFF[this.level];
  }

  getDesc(lv) { return (DIFF[lv] || DIFF[3]).label; }
  getWpm(lv) { return (DIFF[lv] || DIFF[3]).wpm; }

  start(level) {
    this.setLevel(level);
    this.enabled = true;
    this.timer = 0;
    this.pickAndType('chase');
  }

  stop() { this.enabled = false; this.typing = false; }

  pickAndType(key) {
    this.currentKey = key || this.pickStrategy();
    this.targetScript = SCRIPTS[this.currentKey] || SCRIPTS.chase;
    this.typeIndex = 0;
    this.typeBuffer = '';
    this.typing = true;
    this._acc = 0;
    if (this.app.ui) {
      this.app.ui.setEnemyCode('');
      this.app.ui.setEnemyLang('novice');
    }
  }

  pickStrategy() {
    const s = this.app.game && this.app.game.self;
    const e = this.app.game && this.app.game.enemy;
    if (!s || !e) return 'chase';
    const dist = Math.hypot(s.x - e.x, s.y - e.y);
    const hpRatio = (e.hp || 100) / 100;
    if (this.cfg.aggression > 0.75) {
      if (dist < 120) return 'aggressive';
      if (hpRatio < 0.4) return 'defensive';
      return Math.random() < 0.5 ? 'chase' : 'orbit';
    }
    if (this.cfg.aggression < 0.4) return dist < 150 ? 'kite' : 'chase';
    if (dist < 100) return 'kite';
    if (dist > 280) return 'chase';
    const keys = ['chase', 'kite', 'orbit', 'aggressive', 'defensive'];
    return keys[Math.floor(Math.random() * keys.length)];
  }

  update(dt) {
    if (!this.enabled) return;
    if (this.typing) {
      const cps = (this.cfg.wpm * 5) / 60;
      this._acc += cps * dt;
      while (this._acc >= 1 && this.typeIndex < this.targetScript.length) {
        this.typeBuffer += this.targetScript[this.typeIndex++];
        this._acc -= 1;
      }
      if (this.app.ui) this.app.ui.setEnemyCode(this.typeBuffer);
      if (this.typeIndex >= this.targetScript.length) {
        this.typing = false;
        if (this.app.ui) this.app.ui.setEnemyCode(this.targetScript);
      }
    }
    this.timer += dt;
    if (this.timer >= this.cfg.interval && !this.typing) {
      this.timer = 0;
      if (Math.random() < 0.35 + this.cfg.aggression * 0.4) this.pickAndType();
    }
  }
}

export { DIFF };
