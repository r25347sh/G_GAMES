/**
 * ShadowScript — 1文字命令の難解言語
 */
export class ShadowScript {
  constructor(app) { this.app = app; }

  execute(code, ship, game, dt) {
    const s = ship.sensors;
    const stack = [];
    const labels = {};
    let src = code.replace(/#[^\n]*/g, '').replace(/\s+/g, '');
    for (let i = 0; i < src.length; i++) {
      if (src[i] === ':' && i+1 < src.length) { labels[src[i+1]] = i+2; i++; }
    }
    const push = (v) => stack.push(v);
    const pop = () => stack.length ? stack.pop() : 0;
    const sens = { d: s.dist, a: s.angle, l: s.leadAngle, e: s.energy, h: s.heat, p: s.hp, w: s.wallMin };
    let ip = 0, guard = 0;
    while (ip < src.length && guard++ < 4000) {
      const c = src[ip++];
      if (c === '>') { const k = src[ip++]; push(sens[k] ?? 0); }
      else if (c >= '0' && c <= '9') {
        let n = c.charCodeAt(0) - 48;
        while (ip < src.length && src[ip] >= '0' && src[ip] <= '9') n = n * 10 + (src[ip++].charCodeAt(0) - 48);
        push(n);
      } else if (c === '+') { const b=pop(),a=pop(); push(a+b); }
      else if (c === '-') { const b=pop(),a=pop(); push(a-b); }
      else if (c === '*') { const b=pop(),a=pop(); push(a*b); }
      else if (c === '/') { const b=pop(),a=pop(); push(b?a/b:0); }
      else if (c === '=') { const b=pop(),a=pop(); push(Math.abs(a-b)<0.01?1:0); }
      else if (c === '<') { const b=pop(),a=pop(); push(a<b?1:0); }
      else if (c === '!') { const b=pop(),a=pop(); push(a>b?1:0); }
      else if (c === '?') { if (!pop()) ip++; }
      else if (c === ':') { ip++; }
      else if (c === ';') { const lab = src[ip++]; if (labels[lab] != null) ip = labels[lab]; }
      else if (c === 'F') { const a = s.angle; if (Math.abs(a)>0.06) game.applyTurn(ship, Math.sign(a)*0.95); }
      else if (c === 'G') { game.applyThrust(ship, 0.85); }
      else if (c === 'L') { game.applyTurn(ship, -0.85); }
      else if (c === 'R') { game.applyTurn(ship, 0.85); }
      else if (c === 'S') { game.fireBullet(ship); }
      else if (c === 'P') { game.fireBullet(ship, { spread: true }); }
      else if (c === 'C') { game.fireBullet(ship, { charged: true }); }
      else if (c === 'H') { game.activateShield(ship); }
      else if (c === 'T') {
        const a = s.angle;
        if (Math.abs(a)>0.1) game.applyTurn(ship, Math.sign(a)*0.9);
        game.applyThrust(ship, s.dist > 120 ? 0.9 : 0.5);
      } else if (c === 'K') { game.applyTurn(ship, -Math.sign(s.angle)*0.95); game.applyThrust(ship, 1); }
      else if (c === 'O') { game.applyTurn(ship, Math.sign(s.angle)*0.35 + 0.6); game.applyThrust(ship, 0.8); }
      else if (c === '.') { pop(); }
    }
  }

  getSample() {
    return `# ShadowScript\nF T >a 0.3 < ? S >d 140 < ? P >e 30 < ? H\n`;
  }

  getTutorialStarter() {
    return `# ========== ShadowScript チュートリアル ==========\n# F face G go L left R right S shoot P spread C charge H shield\n# T chase K flee O orbit\n# >d dist >a angle >l lead >e energy >h heat >w wall\n# 数字 + - * / < ! ? :x ;x #\n#\n# --- STEP 1 ---\nFGS\n\n# --- STEP 2: 条件射撃 ---\n# F T >a 0.3 < ? S\n\n# --- STEP 3 ---\n# F T >a 0.3 < ? S >d 130 < ? P\n\n# --- STEP 4 ---\n# F T >a 0.25 < ? S >e 30 < ? H\n\n# --- STEP 5 ---\n# F >d 200 ! ? G >d 120 < ? K >a 0.2 < ? S\n`;
  }

  getReference() {
    return `<h3>ShadowScript</h3><pre>F G L R S P C H T K O\n>d >a >l >e >h >p >w\n0-9 + - * / < ! ? :x ;x</pre>`;
  }
}
