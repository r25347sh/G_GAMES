/**
 * Vectra — ベクトル・軌道特化
 * 正規化・回転・内積風の記述で軌道を組む
 */
export class Vectra {
  constructor(app) { this.app = app; this._t = new WeakMap(); }

  execute(code, ship, game, dt) {
    const s = ship.sensors;
    if (!this._t.has(ship)) this._t.set(ship, 0);
    this._t.set(ship, this._t.get(ship) + dt);
    const t = this._t.get(ship);

    const env = {
      dist: s.dist, angle: s.angle, lead: s.leadAngle,
      energy: s.energy, heat: s.heat, hp: s.hp, wallMin: s.wallMin, time: s.time, t, dt,
      N: (a) => {
        while (a > Math.PI) a -= Math.PI*2;
        while (a < -Math.PI) a += Math.PI*2;
        return a;
      },
      rot: (a, deg) => a + deg * Math.PI/180,
      face: (a) => { const d = env.N(a); if (Math.abs(d)>0.05) game.applyTurn(ship, Math.sign(d)*Math.min(1,Math.abs(d)*2)); },
      thrust: (v=1) => game.applyThrust(ship, +v||0),
      turn: (v) => game.applyTurn(ship, +v||0),
      fire: (k) => {
        if (k==='spread') game.fireBullet(ship,{spread:true});
        else if (k==='charge') game.fireBullet(ship,{charged:true});
        else game.fireBullet(ship);
      },
      shield: () => game.activateShield(ship),
      abs:Math.abs, sin:Math.sin, cos:Math.cos, sign:Math.sign, pi:Math.PI,
      min:Math.min, max:Math.max, sqrt:Math.sqrt,
    };

    let src = code.replace(/\/\/.*$/gm,'').replace(/\/\*[\s\S]*?\*\//g,'');
    if (/(\beval\b|\bFunction\b|\bimport\b|\bwindow\b|\bdocument\b)/i.test(src)) throw new Error('Forbidden');
    src = src.replace(/fire\s+when\s+(.+)/gi, 'if($1) fire()');
    src = src.replace(/thrust\s+when\s+(.+)/gi, 'if($1) thrust(0.8)');
    const fn = new Function('env', `with(env){\n${src}\n}`);
    fn(env);
  }

  getSample() {
    return `// Vectra — サイン波軌道 + 偏差射撃\nface(lead);\nthrust(0.75 + 0.2 * sin(t * 3));\nturn(0.35 * cos(t * 2.5));\nfire when abs(lead) < 0.22;\nif (dist < 120) fire('spread');\nif (energy < 28) shield();\n`;
  }

  getTutorialStarter() {
    return `// ========== Vectra チュートリアル ==========\n// t = 経過時間, lead = 偏差角, angle = 相対角\n//\n// --- STEP 1: 基本 ---\nface(angle);\nthrust(0.7);\nfire when abs(angle) < 0.3;\n\n// --- STEP 2: 偏差 ---\n// face(lead);\n// fire when abs(lead) < 0.2;\n\n// --- STEP 3: サイン波スラスト ---\n// face(lead);\n// thrust(0.65 + 0.25 * sin(t * 4));\n// fire when abs(lead) < 0.2;\n\n// --- STEP 4: 円軌道 ---\n// face(N(angle + 1.2));\n// thrust(0.85);\n// fire when abs(lead) < 0.25;\n\n// --- STEP 5: 壁反射トリック ---\n// if (wallMin < 50) { face(N(angle + pi)); thrust(1); }\n// else { face(lead); thrust(0.7 + 0.15*sin(t*2)); fire when abs(lead) < 0.18; }\n`;
  }

  getReference() {
    return `<h3>Vectra</h3><pre>t time dist angle lead energy heat hp wallMin\nface(a) thrust(v) turn(v) fire() fire('spread'|'charge') shield()\nN(a) rot(a,deg) sin cos abs sign pi\nsugar: fire when EXPR</pre>`;
  }
}
