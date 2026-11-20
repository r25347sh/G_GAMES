/**
 * CyberScript — Python/Lua風 手続き型
 */
export class CyberScript {
  constructor(app) { this.app = app; this._vars = new WeakMap(); }

  execute(code, ship, game, dt) {
    const s = ship.sensors;
    if (!this._vars.has(ship)) this._vars.set(ship, {});
    const vars = this._vars.get(ship);
    const env = {
      dist: s.dist, angle: s.angle, absAngle: s.absAngle,
      dx: s.dx, dy: s.dy, vx: s.selfVx, vy: s.selfVy,
      tvx: s.targetVx, tvy: s.targetVy,
      energy: s.energy, heat: s.heat, hp: s.hp,
      wallLeft: s.wallLeft, wallRight: s.wallRight,
      wallTop: s.wallTop, wallBottom: s.wallBottom, wallMin: s.wallMin,
      time: s.time, lead: s.leadAngle, dt,
      front: Math.abs(s.angle) < 0.32, near: s.dist < 140, far: s.dist > 260,
      vars,
      thrust: (v=1) => game.applyThrust(ship, +v||0),
      turn: (v=0) => game.applyTurn(ship, +v||0),
      fire: (opt) => {
        if (opt==='spread') return game.fireBullet(ship,{spread:true});
        if (opt==='charge'||opt==='charged') return game.fireBullet(ship,{charged:true});
        return game.fireBullet(ship);
      },
      shield: () => game.activateShield(ship),
      face: (mode) => {
        const a = mode==='lead' ? s.leadAngle : s.angle;
        if (Math.abs(a)>0.05) game.applyTurn(ship, Math.sign(a)*0.95);
      },
      abs:Math.abs, sin:Math.sin, cos:Math.cos, atan2:Math.atan2,
      min:Math.min, max:Math.max, sqrt:Math.sqrt, hypot:Math.hypot,
      pi:Math.PI, sign:Math.sign,
      clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
      deg:(r)=>r*180/Math.PI, rad:(d)=>d*Math.PI/180,
      log: (m) => { if (ship.isSelf) this.app.ui.logSelf(String(m)); },
    };
    this.runScript(code, env);
  }

  runScript(code, env) {
    let src = code.replace(/\/\/.*$/gm,'').replace(/\/\*[\s\S]*?\*\//g,'');
    if (/(\beval\b|\bFunction\b|\bimport\b|\bwindow\b|\bdocument\b|\blocalStorage\b|\bfetch\b|\bXMLHttp|\bprototype\b)/i.test(src)) {
      throw new Error('Forbidden token');
    }
    src = src
      .replace(/\blet\s+(\w+)\s*=/g, 'vars.$1 =')
      .replace(/\bconst\s+(\w+)\s*=/g, 'vars.$1 =')
      .replace(/\bvar\s+(\w+)\s*=/g, 'vars.$1 =');
    const fn = new Function('env', `with(env){\n${src}\n}`);
    fn(env);
  }

  getSample() {
    return `// CyberScript — 偏差射撃＋距離管理\nface('lead');\nif (abs(lead) > 0.08) turn(sign(lead) * 0.9);\nif (dist > 200) thrust(0.9);\nelse if (dist < 110) thrust(0.2);\nif (abs(lead) < 0.25) fire();\nif (dist < 130) fire('spread');\nif (energy < 30) shield();\nif (wallMin < 50) turn(0.8);\n`;
  }

  getTutorialStarter() {
    return `// ========== CyberScript チュートリアル ==========\n// Sensors: dist, angle, lead, energy, heat, hp, wallMin\n// Actions: thrust(v) turn(v) fire() fire('spread') fire('charge') shield() face() face('lead')\n// Vars: vars.x は機体ごとに永続\n//\n// --- STEP 1 ---\nface();\nthrust(0.7);\nif (abs(angle) < 0.3) fire();\n\n// --- STEP 2: 偏差 ---\n// face('lead');\n// if (abs(lead) < 0.22) fire();\n\n// --- STEP 3: 距離帯 ---\n// if (dist > 220) { face(); thrust(1); }\n// else if (dist < 100) { turn(sign(angle)*0.5); thrust(0.3); fire('spread'); }\n// else { face('lead'); if (abs(lead) < 0.2) fire(); }\n\n// --- STEP 4: 状態変数 ---\n// if (!vars.mode) vars.mode = 'hunt';\n// if (hp < 40) vars.mode = 'survive';\n\n// --- STEP 5: 壁 ---\n// if (wallMin < 55) { if (wallLeft < wallRight) turn(0.9); else turn(-0.9); thrust(0.8); }\n`;
  }

  getReference() {
    return `<h3>CyberScript</h3><pre>dist angle lead energy heat hp wallMin time dt front near far\nthrust turn fire shield face vars.* abs sin cos sign clamp</pre>`;
  }
}
