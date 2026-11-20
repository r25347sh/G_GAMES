/**
 * NoviceScript — 初心者向けだが実用レベル
 */
export class NoviceScript {
  constructor(app) { this.app = app; }

  execute(code, ship, game, dt) {
    const sensors = ship.sensors;
    for (let raw of code.split('\n')) {
      let line = raw.trim();
      if (!line || line.startsWith('//') || line.startsWith('#')) continue;
      const lower = line.toLowerCase();

      if (lower === 'go' || lower === 'thrust' || lower.startsWith('go ')) {
        game.applyThrust(ship, this.extractNumber(line, 0.85)); continue;
      }
      if (lower === 'stop' || lower === 'brake') { ship.vx *= 0.82; ship.vy *= 0.82; continue; }
      if (lower.startsWith('turn left') || lower === 'left') { game.applyTurn(ship, -this.extractNumber(line, 0.8)); continue; }
      if (lower.startsWith('turn right') || lower === 'right') { game.applyTurn(ship, this.extractNumber(line, 0.8)); continue; }
      if (lower.startsWith('face enemy') || lower === 'aim' || lower === 'face') {
        const rel = sensors.angle;
        if (Math.abs(rel) > 0.06) game.applyTurn(ship, Math.sign(rel) * 0.95);
        continue;
      }
      if (lower.startsWith('face lead') || lower === 'lead aim') {
        const rel = sensors.leadAngle;
        if (Math.abs(rel) > 0.06) game.applyTurn(ship, Math.sign(rel) * 0.95);
        continue;
      }
      if (lower === 'fire' || lower === 'shoot') { game.fireBullet(ship); continue; }
      if (lower === 'spread' || lower === 'fire spread') { game.fireBullet(ship, { spread: true }); continue; }
      if (lower === 'charge' || lower === 'fire charge') { game.fireBullet(ship, { charged: true }); continue; }
      if (lower === 'shield' || lower === 'guard') { game.activateShield(ship); continue; }
      if (lower === 'chase' || lower === 'pursue') {
        const rel = sensors.angle;
        if (Math.abs(rel) > 0.1) game.applyTurn(ship, Math.sign(rel) * 0.9);
        if (sensors.dist > 140) game.applyThrust(ship, 0.95);
        else if (sensors.dist < 90) { game.applyThrust(ship, 0.25); game.applyTurn(ship, Math.sign(rel) * 0.5); }
        else game.applyThrust(ship, 0.65);
        continue;
      }
      if (lower === 'flee' || lower === 'run') {
        game.applyTurn(ship, -Math.sign(sensors.angle) * 0.95);
        game.applyThrust(ship, 1.0);
        continue;
      }
      if (lower === 'orbit' || lower === 'circle') {
        const rel = sensors.angle;
        game.applyTurn(ship, Math.sign(rel) * 0.35 + 0.65);
        game.applyThrust(ship, 0.8);
        if (Math.abs(rel) < 0.35 && sensors.dist < 240) game.fireBullet(ship);
        continue;
      }
      if (lower === 'strafe left') { game.applyTurn(ship, -0.4); game.applyThrust(ship, 0.7); continue; }
      if (lower === 'strafe right') { game.applyTurn(ship, 0.4); game.applyThrust(ship, 0.7); continue; }
      if (lower.startsWith('if ')) { this.handleIf(line, ship, game, sensors); continue; }
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
    else if (cond === 'front' || cond === 'ahead') ok = Math.abs(sensors.angle) < 0.32;
    else if (cond === 'lead') ok = Math.abs(sensors.leadAngle) < 0.28;
    else if (cond === 'energy low' || cond === 'low energy') ok = sensors.energy < 35;
    else if (cond === 'heat high' || cond === 'overheat') ok = sensors.heat > 70;
    else if (cond === 'wall near' || cond === 'near wall') ok = sensors.wallMin < 60;
    else if (cond === 'hp low') ok = sensors.hp < 40;
    else if (cond.startsWith('dist <')) ok = sensors.dist < parseFloat(cond.slice(6));
    else if (cond.startsWith('dist >')) ok = sensors.dist > parseFloat(cond.slice(6));
    if (!ok) return;

    if (action === 'fire' || action === 'shoot') game.fireBullet(ship);
    else if (action === 'spread') game.fireBullet(ship, { spread: true });
    else if (action === 'charge') game.fireBullet(ship, { charged: true });
    else if (action === 'shield' || action === 'guard') game.activateShield(ship);
    else if (action === 'go' || action === 'thrust') game.applyThrust(ship, 0.9);
    else if (action === 'stop' || action === 'brake') { ship.vx *= 0.8; ship.vy *= 0.8; }
    else if (action === 'left' || action === 'turn left') game.applyTurn(ship, -0.85);
    else if (action === 'right' || action === 'turn right') game.applyTurn(ship, 0.85);
    else if (action === 'face' || action === 'aim') {
      if (Math.abs(sensors.angle) > 0.06) game.applyTurn(ship, Math.sign(sensors.angle) * 0.95);
    } else if (action === 'flee' || action === 'run') {
      game.applyTurn(ship, -Math.sign(sensors.angle) * 0.95); game.applyThrust(ship, 1);
    } else if (action === 'chase') {
      if (Math.abs(sensors.angle) > 0.1) game.applyTurn(ship, Math.sign(sensors.angle) * 0.9);
      game.applyThrust(ship, 0.85);
    }
  }

  extractNumber(line, def) {
    const m = line.match(/(-?\d+(\.\d+)?)/);
    if (!m) return def;
    const n = parseFloat(m[1]);
    return Math.max(0, Math.min(1, n > 1 ? n / 100 : n));
  }

  getSample() {
    return `// NoviceScript sample\nface enemy\nchase\nif front then fire\nif near then spread\nif energy low then shield\nif wall near then turn right\n`;
  }

  getTutorialStarter() {
    return `// ========== NoviceScript チュートリアル ==========\n// STEP1 基本 / STEP2 条件 / STEP3 追跡 / STEP4 kite / STEP5 応用\n//\n// --- STEP 1 ---\nface enemy\ngo\nif front then fire\n\n// --- STEP 2（コメント外して試す） ---\n// if near then spread\n// if energy low then shield\n// if wall near then turn left\n\n// --- STEP 3 ---\n// face enemy\n// chase\n// if front then fire\n// if near then spread\n\n// --- STEP 4 kite ---\n// face enemy\n// if dist < 150 then flee\n// if dist > 230 then go\n// if front then fire\n\n// --- STEP 5 ---\n// face lead\n// if lead then charge\n// if heat high then stop\n// if hp low then shield\n// orbit\n`;
  }

  getReference() {
    return `<h3>NoviceScript</h3><pre>go stop turn left/right face enemy/lead\nfire spread charge shield chase flee orbit\nif near|far|front|lead|energy low|heat high|wall near|hp low then ACTION\nif dist < N then ACTION</pre>`;
  }
}
