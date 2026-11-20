/**
 * CtrlWorld — SECRET 低レイヤー言語
 */
export class CtrlWorld {
  constructor(app) {
    this.app = app;
    this.unlocked = false;
    this._cpu = new WeakMap();
  }

  unlock() { this.unlocked = true; }

  execute(code, ship, game, dt) {
    if (!this.unlocked && !(this.app && this.app.secretUnlocked)) return;

    if (!this._cpu.has(ship)) {
      this._cpu.set(ship, { R: [0,0,0,0,0,0,0,0], Z:0, G:0, L:0, slomo:0 });
    }
    const cpu = this._cpu.get(ship);
    cpu.slomo = Math.max(0, cpu.slomo - dt);

    const s = ship.sensors;
    const mem = {
      dist: s.dist, angle: s.angle, lead: s.leadAngle,
      energy: s.energy, heat: s.heat, hp: s.hp, wall: s.wallMin, time: s.time,
    };

    const lines = code.split('\n').map(l => l.replace(/;.*$/, '').trim()).filter(Boolean);
    const labels = {};
    lines.forEach((l, i) => {
      const m = l.match(/^(\w+):\s*$/);
      if (m) labels[m[1].toLowerCase()] = i;
    });

    const resolve = (tok) => {
      if (!tok) return 0;
      tok = tok.toLowerCase();
      if (tok.startsWith('r') && tok.length === 2) return cpu.R[+tok[1]] || 0;
      if (mem[tok] != null) return mem[tok];
      const n = parseFloat(tok);
      return isNaN(n) ? 0 : n;
    };
    const setR = (tok, v) => {
      if (tok && tok.toLowerCase().startsWith('r')) cpu.R[+tok[1]] = v;
    };

    let ip = 0, guard = 0;
    while (ip < lines.length && guard++ < 500) {
      let line = lines[ip++];
      if (/^\w+:\s*$/.test(line)) continue;
      const parts = line.split(/[\s,]+/).filter(Boolean);
      const op = (parts[0] || '').toUpperCase();

      if (op === 'MOV') setR(parts[1], resolve(parts[2]));
      else if (op === 'ADD') setR(parts[1], resolve(parts[1]) + resolve(parts[2]));
      else if (op === 'SUB') setR(parts[1], resolve(parts[1]) - resolve(parts[2]));
      else if (op === 'MUL') setR(parts[1], resolve(parts[1]) * resolve(parts[2]));
      else if (op === 'CMP') {
        const a = resolve(parts[1]), b = resolve(parts[2]);
        cpu.Z = a === b ? 1 : 0; cpu.G = a > b ? 1 : 0; cpu.L = a < b ? 1 : 0;
      } else if (op === 'JMP') { const t = labels[(parts[1]||'').toLowerCase()]; if (t!=null) ip=t; }
      else if (op === 'JZ') { if (cpu.Z) { const t=labels[(parts[1]||'').toLowerCase()]; if(t!=null) ip=t; } }
      else if (op === 'JNZ') { if (!cpu.Z) { const t=labels[(parts[1]||'').toLowerCase()]; if(t!=null) ip=t; } }
      else if (op === 'JG') { if (cpu.G) { const t=labels[(parts[1]||'').toLowerCase()]; if(t!=null) ip=t; } }
      else if (op === 'JL') { if (cpu.L) { const t=labels[(parts[1]||'').toLowerCase()]; if(t!=null) ip=t; } }
      else if (op === 'THRUST') game.applyThrust(ship, Math.max(0, Math.min(1, resolve(parts[1]) || 1)));
      else if (op === 'TURN') game.applyTurn(ship, Math.max(-1, Math.min(1, resolve(parts[1]) || 0)));
      else if (op === 'FIRE') {
        const m = (parts[1]||'').toUpperCase();
        if (m === 'SPREAD') game.fireBullet(ship, { spread: true });
        else if (m === 'CHARGE') game.fireBullet(ship, { charged: true });
        else game.fireBullet(ship);
      } else if (op === 'SHIELD') game.activateShield(ship);
      else if (op === 'FACE') {
        if (Math.abs(s.angle) > 0.05) game.applyTurn(ship, Math.sign(s.angle) * 0.95);
      } else if (op === 'FACELEAD') {
        if (Math.abs(s.leadAngle) > 0.05) game.applyTurn(ship, Math.sign(s.leadAngle) * 0.95);
      } else if (op === 'SLOMO') {
        const v = Math.max(0, Math.min(1, resolve(parts[1]) || 0.5));
        if (ship.energy > 20) {
          ship.energy -= 20; cpu.slomo = 1.2;
          const other = ship.isSelf ? game.enemy : game.self;
          if (other) { other.vx *= (1 - 0.35 * v); other.vy *= (1 - 0.35 * v); }
        }
      } else if (op === 'PULL' || op === 'PUSH') {
        const v = Math.max(0, Math.min(1, resolve(parts[1]) || 0.5));
        if (ship.energy > 18) {
          ship.energy -= 18;
          const other = ship.isSelf ? game.enemy : game.self;
          if (other) {
            const dx = other.x - ship.x, dy = other.y - ship.y;
            const d = Math.hypot(dx, dy) || 1;
            const sign = op === 'PULL' ? -1 : 1;
            other.vx += sign * (dx / d) * 80 * v * dt * 10;
            other.vy += sign * (dy / d) * 80 * v * dt * 10;
          }
        }
      } else if (op === 'HALT') break;
    }
  }

  getSample() {
    return `; CtrlWorld\nFACELEAD\nMOV R0, dist\nCMP R0, 150\nJL close\nTHRUST 0.9\nJMP shoot\nclose:\nFIRE SPREAD\nSHIELD\nshoot:\nFIRE\n`;
  }

  getTutorialStarter() {
    return `; ========== CtrlWorld チュートリアル (SECRET) ==========\n; R0-R7 / flags Z G L / SLOMO PULL PUSH\n;\n; --- STEP 1 ---\nFACELEAD\nTHRUST 0.8\nFIRE\n\n; --- STEP 2: 分岐 ---\n; MOV R0, dist\n; CMP R0, 140\n; JL near\n; THRUST 1\n; JMP done\n; near:\n; FIRE SPREAD\n; done:\n\n; --- STEP 3 ---\n; FACELEAD\n; FIRE CHARGE\n\n; --- STEP 4: 物理干渉 ---\n; MOV R0, dist\n; CMP R0, 160\n; JG far\n; PULL 0.7\n; FIRE\n; JMP end\n; far:\n; PUSH 0.4\n; THRUST 0.9\n; end:\n\n; --- STEP 5 ---\n; MOV R0, hp\n; CMP R0, 40\n; JG ok\n; SHIELD\n; SLOMO 0.8\n; ok:\n; FACELEAD\n; THRUST 0.7\n`;
  }

  getReference() {
    return `<h3>CtrlWorld (SECRET)</h3><pre>MOV ADD SUB MUL CMP JMP JZ JNZ JG JL\nTHRUST TURN FIRE SHIELD FACE FACELEAD\nSLOMO PULL PUSH HALT</pre>`;
  }
}
