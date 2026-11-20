/** NoviceScript — beginner language */
export class NoviceScript {
  constructor(app) { this.app = app; }

  execute(code, ship, game, dt) {
    const lines = code.split('\n');
    const sensors = ship.sensors;
    for (let raw of lines) {
      let line = raw.trim();
      if (!line || line.startsWith('//') || line.startsWith('#')) continue;
      const lower = line.toLowerCase();
      if (lower === 'go' || lower === 'thrust' || lower.startsWith('go ')) {
        game.applyThrust(ship, this.extractNumber(line, 0.8)); continue;
      }
      if (lower === 'stop' || lower === 'brake') { ship.vx *= 0.85; ship.vy *= 0.85; continue; }
      if (lower.startsWith('turn left') || lower === 'left') { game.applyTurn(ship, -this.extractNumber(line, 0.7)); continue; }
      if (lower.startsWith('turn right') || lower === 'right') { game.applyTurn(ship, this.extractNumber(line, 0.7)); continue; }
      if (lower.startsWith('face enemy') || lower === 'aim') {
        const rel = sensors.angle;
        if (Math.abs(rel) > 0.08) game.applyTurn(ship, Math.sign(rel) * 0.9);
        continue;
      }
      if (lower === 'fire' || lower === 'shoot') { game.fireBullet(ship); continue; }
      if (lower === 'spread' || lower === 'fire spread') { game.fireBullet(ship, { spread: true }); continue; }
      if (lower === 'charge' || lower === 'fire charge') { game.fireBullet(ship, { charged: true }); continue; }
      if (lower === 'shield' || lower === 'guard') { game.activateShield(ship); continue; }
      if (lower.startsWith('if ')) { this.handleIf(line, ship, game, sensors); continue; }
      if (lower === 'chase' || lower === 'pursue') {
        const rel = sensors.angle;
        if (Math.abs(rel) > 0.1) game.applyTurn(ship, Math.sign(rel) * 0.85);
        if (sensors.dist > 120) game.applyThrust(ship, 0.9);
        else if (sensors.dist < 80) { game.applyThrust(ship, 0.3); game.applyTurn(ship, Math.sign(rel) * 0.5); }
        else game.applyThrust(ship, 0.6);
        continue;
      }
      if (lower === 'flee' || lower === 'run') {
        game.applyTurn(ship, -Math.sign(sensors.angle) * 0.9);
        game.applyThrust(ship, 1.0);
        continue;
      }
      if (lower === 'orbit' || lower === 'circle') {
        const rel = sensors.angle;
        game.applyTurn(ship, Math.sign(rel) * 0.4 + 0.6);
        game.applyThrust(ship, 0.75);
        if (Math.abs(rel) < 0.3 && sensors.dist < 220) game.fireBullet(ship);
        continue;
      }
    }
  }

  handleIf(line, ship, game, sensors) {
    const m = line.match(/if\s+(.+?)\s+then\s+(.+)/i);
    if (!m) return;
    const cond = m[1].trim().toLowerCase();
    const action = m[2].trim().toLowerCase();
    let ok = false;
    if (cond === 'near' || cond === 'close') ok = sensors.dist < 160;
    else if (cond === 'far') ok = sensors.dist > 280;
    else if (cond === 'left') ok = sensors.angle < -0.25;
    else if (cond === 'right') ok = sensors.angle > 0.25;
    else if (cond === 'front' || cond === 'ahead') ok = Math.abs(sensors.angle) < 0.3;
    else if (cond === 'energy low' || cond === 'low energy') ok = sensors.energy < 35;
    else if (cond === 'heat high' || cond === 'overheat') ok = sensors.heat > 70;
    else if (cond === 'wall near' || cond === 'near wall') ok = sensors.wallMin < 60;
    else if (cond.startsWith('dist <')) { const n = parseFloat(cond.replace('dist <', '').trim()); ok = !isNaN(n) && sensors.dist < n; }
    else if (cond.startsWith('dist >')) { const n = parseFloat(cond.replace('dist >', '').trim()); ok = !isNaN(n) && sensors.dist > n; }
    if (!ok) return;
    if (action === 'fire' || action === 'shoot') game.fireBullet(ship);
    else if (action === 'spread') game.fireBullet(ship, { spread: true });
    else if (action === 'charge') game.fireBullet(ship, { charged: true });
    else if (action === 'shield' || action === 'guard') game.activateShield(ship);
    else if (action === 'go' || action === 'thrust') game.applyThrust(ship, 0.85);
    else if (action === 'left' || action === 'turn left') game.applyTurn(ship, -0.8);
    else if (action === 'right' || action === 'turn right') game.applyTurn(ship, 0.8);
    else if (action === 'face' || action === 'aim') {
      const rel = sensors.angle;
      if (Math.abs(rel) > 0.08) game.applyTurn(ship, Math.sign(rel) * 0.9);
    } else if (action === 'flee' || action === 'run') {
      game.applyTurn(ship, -Math.sign(sensors.angle) * 0.9);
      game.applyThrust(ship, 1);
    }
  }

  extractNumber(line, defaultVal) {
    const m = line.match(/(-?\d+(\.\d+)?)/);
    if (m) { const n = parseFloat(m[1]); return Math.max(0, Math.min(1, n > 1 ? n / 100 : n)); }
    return defaultVal;
  }

  getSample() {
    return `// NoviceScript sample\nface enemy\nchase\nif front then fire\nif near then spread\nif energy low then shield\nif wall near then turn right\n`;
  }

  getReference() {
    return `<h3>NoviceScript</h3><p>英語に近い命令で機体を操作。</p><pre>go / thrust / stop\nturn left / turn right\nface enemy / aim\nfire / spread / charge / shield\nchase / flee / orbit\nif near then fire\nif front then fire\nif energy low then shield</pre>`;
  }
}
