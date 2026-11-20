/**
 * CyberHack — イベント駆動 + 電子戦
 */
export class CyberHack {
  constructor(app) {
    this.app = app;
    this._state = new WeakMap();
  }

  execute(code, ship, game, dt) {
    const s = ship.sensors;
    if (!this._state.has(ship)) this._state.set(ship, { jam: 0, decoy: 0, noise: 0 });
    const st = this._state.get(ship);
    st.jam = Math.max(0, st.jam - dt);
    st.decoy = Math.max(0, st.decoy - dt);
    st.noise = Math.max(0, st.noise - dt);

    const hooks = [];
    for (const raw of code.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('//') || line.startsWith('#')) continue;
      const m = line.match(/^ON\s+(\w+)\s+DO\s+(.+)/i);
      if (m) hooks.push({ ev: m[1].toLowerCase(), act: m[2].trim() });
      else this.runAction(line, ship, game, s, st);
    }

    const events = [];
    if (s.dist < 130) events.push('near');
    if (s.dist > 260) events.push('far');
    if (Math.abs(s.angle) < 0.3) events.push('front');
    if (Math.abs(s.leadAngle) < 0.25) events.push('lead');
    if (s.energy < 35) events.push('lowenergy');
    if (s.heat > 70) events.push('hot');
    if (s.wallMin < 55) events.push('wall');
    if (s.hp < 40) events.push('lowhp');
    if (s.time < 0.5) events.push('ready');
    if (s.time > 0 && Math.floor(s.time * 2) !== Math.floor((s.time - dt) * 2)) events.push('tick');

    for (const h of hooks) {
      if (events.includes(h.ev) || h.ev === 'always') this.runAction(h.act, ship, game, s, st);
    }

    if (st.jam > 0) {
      const target = ship.isSelf ? game.enemy : game.self;
      if (target) target.heat = Math.min(100, target.heat + 4 * dt);
    }
  }

  runAction(act, ship, game, s, st) {
    const a = act.toLowerCase();
    if (a === 'face' || a.startsWith('face ')) {
      const ang = a.includes('lead') ? s.leadAngle : s.angle;
      if (Math.abs(ang) > 0.06) game.applyTurn(ship, Math.sign(ang) * 0.95);
    } else if (a === 'go' || a.startsWith('thrust')) game.applyThrust(ship, 0.85);
    else if (a === 'left') game.applyTurn(ship, -0.85);
    else if (a === 'right') game.applyTurn(ship, 0.85);
    else if (a === 'fire' || a === 'shoot') game.fireBullet(ship);
    else if (a === 'spread') game.fireBullet(ship, { spread: true });
    else if (a === 'charge') game.fireBullet(ship, { charged: true });
    else if (a === 'shield') game.activateShield(ship);
    else if (a === 'chase') {
      if (Math.abs(s.angle) > 0.1) game.applyTurn(ship, Math.sign(s.angle) * 0.9);
      game.applyThrust(ship, 0.85);
    } else if (a === 'flee') {
      game.applyTurn(ship, -Math.sign(s.angle) * 0.95); game.applyThrust(ship, 1);
    } else if (a === 'orbit') {
      game.applyTurn(ship, Math.sign(s.angle) * 0.4 + 0.55); game.applyThrust(ship, 0.8);
    } else if (a === 'jam' || a.startsWith('jam ')) {
      if (ship.energy > 15) { ship.energy -= 15; st.jam = 2.5; }
    } else if (a === 'decoy') {
      if (ship.energy > 12) { ship.energy -= 12; st.decoy = 3; }
    } else if (a === 'noise') {
      if (ship.energy > 8) { ship.energy -= 8; st.noise = 2; }
    }
  }

  getSample() {
    return `// CyberHack\nON ready DO face\nON always DO chase\nON front DO fire\nON near DO spread\nON lowenergy DO shield\nON wall DO right\nON hot DO jam\n`;
  }

  getTutorialStarter() {
    return `// ========== CyberHack チュートリアル ==========\n// ON <event> DO <action>\n// events: ready near far front lead lowenergy hot wall lowhp tick always\n// actions: face go left right fire spread charge shield chase flee orbit jam decoy noise\n//\n// --- STEP 1 ---\nON ready DO face\nON always DO go\nON front DO fire\n\n// --- STEP 2 ---\n// ON near DO spread\n// ON far DO chase\n// ON lowenergy DO shield\n\n// --- STEP 3: 電子戦 ---\n// ON hot DO jam\n// ON near DO decoy\n// ON tick DO noise\n\n// --- STEP 4 ---\n// ON always DO face lead\n// ON lead DO charge\n// ON near DO flee\n// ON wall DO left\n// ON lowhp DO shield\n`;
  }

  getReference() {
    return `<h3>CyberHack</h3><pre>ON event DO action\nevents: ready near far front lead lowenergy hot wall lowhp tick always\njam decoy noise</pre>`;
  }
}
