/**
 * CPU opponent — high-WPM, player-code-aware counter AI
 *
 * Rules implemented:
 * - Starts with EMPTY code.
 * - Analyzes player's current code keywords + live sensors.
 * - Generates tailored counter programs (not fixed scripts only).
 * - When switching strategy: CLEAR the editor completely, then type the NEW script from scratch (no mixing).
 * - Higher WPM across all 5 levels.
 */

const DIFF = {
  1: { wpm: 55,  label: '初心者相当だが反応は速い。単純追尾中心。', interval: 4.5, aggression: 0.35, analyzeDepth: 1 },
  2: { wpm: 85,  label: '中級。距離管理と簡易対策を混ぜてくる。', interval: 3.2, aggression: 0.5,  analyzeDepth: 2 },
  3: { wpm: 120, label: '上級。あなたのコードを読んで対策を組む。', interval: 2.4, aggression: 0.65, analyzeDepth: 3 },
  4: { wpm: 160, label: '高速。偏差射撃・回避・カウンターを高速切替。', interval: 1.6, aggression: 0.85, analyzeDepth: 4 },
  5: { wpm: 210, label: 'プロ級オーバーキル。ほぼ常時あなたの動きを読んで潰しに来る。', interval: 1.05, aggression: 1.0, analyzeDepth: 5 },
};

export class CpuController {
  constructor(app) {
    this.app = app;
    this.level = 3;
    this.cfg = DIFF[3];
    this.timer = 0;
    this.enabled = false;
    this.typeBuffer = '';
    this.typeIndex = 0;
    this.targetScript = '';
    this.typing = false;
    this.currentStrategy = '';
    this.lastPlayerSig = '';
    this.thinkCooldown = 0;
    this._acc = 0;
    this.startDelay = 0;
  }

  setLevel(lv) {
    this.level = Math.max(1, Math.min(5, lv | 0));
    this.cfg = DIFF[this.level];
  }

  getDesc(lv) {
    return (DIFF[lv] || DIFF[3]).label;
  }

  getWpm(lv) {
    return (DIFF[lv] || DIFF[3]).wpm;
  }

  start(level) {
    this.setLevel(level);
    this.enabled = true;
    this.timer = 0;
    this.thinkCooldown = 0;
    this.currentStrategy = '';
    this.lastPlayerSig = '';
    this.typing = false;
    this.typeBuffer = '';
    this.typeIndex = 0;
    this.targetScript = '';
    this._acc = 0;
    // Start empty — short delay then first think
    this.startDelay = 1.2 + Math.random() * 0.8;
    if (this.app.ui) {
      this.app.ui.setEnemyCode('');
      this.app.ui.setEnemyLang('novice');
    }
  }

  stop() {
    this.enabled = false;
    this.typing = false;
  }

  /** Completely clear then begin typing a brand-new script */
  beginTyping(script, strategyName) {
    this.currentStrategy = strategyName || 'counter';
    this.targetScript = script.trim() + '\n';
    this.typeIndex = 0;
    this.typeBuffer = '';
    this.typing = true;
    this._acc = 0;
    // HARD CLEAR — no leftover mixing
    if (this.app.ui) {
      this.app.ui.setEnemyCode('');
      this.app.ui.setEnemyLang('novice');
    }
  }

  /** Analyze player code + situation and produce a counter program */
  generateCounter() {
    const playerCode = (this.app.ui && this.app.ui.getSelfCode()) || '';
    const lower = playerCode.toLowerCase();
    const game = this.app.game;
    const self = game && game.enemy;   // CPU ship
    const player = game && game.self;  // human

    // Signature of player intent
    const hasChase   = /chase|go\b|thrust|approach|close/.test(lower);
    const hasFlee    = /flee|retreat|back|kite|away/.test(lower);
    const hasOrbit   = /orbit|circle|spiral|sine|wave/.test(lower);
    const hasShield  = /shield|guard|block|reflect/.test(lower);
    const hasSpread  = /spread|scatter|shotgun/.test(lower);
    const hasCharge  = /charge|heavy|cannon|beam/.test(lower);
    const hasLead    = /lead|predict|aim|face|angle/.test(lower);
    const hasWall    = /wall|bounce|reflect|corner/.test(lower);
    const hasStop    = /stop|brake|hold/.test(lower);
    const fireHeavy  = (lower.match(/fire|shoot|spread|charge/g) || []).length >= 3;

    let dist = 200;
    let playerHp = 100;
    let myHp = 100;
    let myEnergy = 100;
    if (self && player) {
      dist = Math.hypot(self.x - player.x, self.y - player.y);
      playerHp = player.hp;
      myHp = self.hp;
      myEnergy = self.energy;
    }

    const depth = this.cfg.analyzeDepth;
    const agr = this.cfg.aggression;

    // --- Strategy decision ---
    let name = 'balanced';
    let lines = [];

    // High priority counters based on what player is actually writing
    if (depth >= 3 && hasOrbit && !hasFlee) {
      name = 'anti-orbit';
      lines = [
        '// anti-orbit counter',
        'face enemy',
        'if dist > 180 then go',
        'if dist < 110 then flee',
        'if front then fire',
        'if near then spread',
        'if energy low then shield',
      ];
    } else if (depth >= 2 && hasChase && fireHeavy) {
      name = 'kite-punish';
      lines = [
        '// kite vs aggressive chase',
        'face enemy',
        'if dist < 160 then flee',
        'if dist > 260 then go',
        'if front then fire',
        'if near then charge',
        'if wall near then turn right',
        'if energy low then shield',
      ];
    } else if (depth >= 3 && hasFlee) {
      name = 'pressure';
      lines = [
        '// pressure against kiter',
        'face enemy',
        'chase',
        'if front then fire',
        'if near then spread',
        'if dist < 90 then charge',
        'if energy low then shield',
      ];
    } else if (depth >= 4 && hasShield && hasStop) {
      name = 'flank-burst';
      lines = [
        '// flank vs turtle',
        'turn right',
        'go',
        'if dist < 140 then face enemy',
        'if front then charge',
        'if near then spread',
        'if energy low then shield',
      ];
    } else if (depth >= 2 && hasSpread) {
      name = 'keep-distance';
      lines = [
        '// keep out of spread range',
        'face enemy',
        'if dist < 150 then flee',
        'if dist > 230 then go',
        'if front then fire',
        'if energy low then shield',
      ];
    } else if (myHp < 35 || playerHp > myHp + 30) {
      name = 'survival';
      lines = [
        '// survival mode',
        'face enemy',
        'if dist < 180 then flee',
        'if wall near then turn left',
        'if front then fire',
        'shield',
        'if energy low then stop',
      ];
    } else if (agr > 0.8 && dist < 140) {
      name = 'brawl';
      lines = [
        '// close-range brawl',
        'face enemy',
        'chase',
        'if front then fire',
        'if near then spread',
        'if dist < 80 then charge',
        'if energy low then shield',
      ];
    } else if (agr > 0.7) {
      name = 'aggressive';
      lines = [
        '// aggressive push',
        'face enemy',
        'chase',
        'if front then fire',
        'if near then charge',
        'if dist < 100 then spread',
        'if energy low then shield',
      ];
    } else if (dist > 280) {
      name = 'close-in';
      lines = [
        '// close the gap',
        'face enemy',
        'go',
        'if front then fire',
        'if energy low then shield',
      ];
    } else {
      name = 'balanced';
      lines = [
        '// balanced adaptive',
        'face enemy',
        'if dist < 130 then flee',
        'if dist > 240 then go',
        'if front then fire',
        'if near then spread',
        'if energy low then shield',
      ];
    }

    // Depth 4+ adds lead / wall tricks
    if (depth >= 4) {
      if (hasLead) {
        lines.splice(1, 0, 'if lead then fire');
      }
      if (hasWall || Math.random() < 0.4) {
        lines.push('if wall near then turn left');
      }
    }

    // Depth 5 sometimes injects unpredictability
    if (depth >= 5 && Math.random() < 0.35) {
      const extras = [
        'if heat high then stop',
        'orbit',
        'if dist < 100 then turn right',
      ];
      lines.push(extras[Math.floor(Math.random() * extras.length)]);
    }

    return { name, script: lines.join('\n') };
  }

  update(dt) {
    if (!this.enabled) return;

    // Initial delay before first code appears
    if (this.startDelay > 0) {
      this.startDelay -= dt;
      if (this.startDelay <= 0) {
        const { name, script } = this.generateCounter();
        this.beginTyping(script, name);
      }
      return;
    }

    // Typing simulation (WPM based)
    if (this.typing) {
      const cps = (this.cfg.wpm * 5) / 60; // chars per second
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
      return; // don't rethink while typing
    }

    // Periodic re-evaluation
    this.timer += dt;
    this.thinkCooldown = Math.max(0, this.thinkCooldown - dt);

    if (this.timer >= this.cfg.interval && this.thinkCooldown <= 0) {
      this.timer = 0;

      const playerCode = (this.app.ui && this.app.ui.getSelfCode()) || '';
      const sig = playerCode.replace(/\s+/g, ' ').slice(0, 120);
      const codeChanged = sig !== this.lastPlayerSig && playerCode.trim().length > 8;
      this.lastPlayerSig = sig;

      // Higher levels react more aggressively to player code changes
      const reactChance = 0.25 + this.cfg.aggression * 0.45 + (codeChanged ? 0.35 : 0);
      if (Math.random() < reactChance || codeChanged) {
        const { name, script } = this.generateCounter();
        // Only rewrite if strategy actually different or player changed code
        if (name !== this.currentStrategy || codeChanged) {
          this.beginTyping(script, name);
          this.thinkCooldown = 0.6; // brief pause after decide
        }
      }
    }
  }
}

export { DIFF };
