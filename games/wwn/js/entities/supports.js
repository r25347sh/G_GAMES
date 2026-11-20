(function (global) {
  "use strict";
  function SupportSystem() {
    this.drones = []; this.turrets = []; this.leeches = []; this.shields = [];
    this.tethers = []; this.repairBots = []; this.kamikazes = []; this.satellites = [];
    this.mines = []; this.clones = []; this.domes = []; this.freezers = []; this.batteries = [];
  }
  SupportSystem.prototype.clear = function () {
    this.drones = []; this.turrets = []; this.leeches = []; this.shields = [];
    this.tethers = []; this.repairBots = []; this.kamikazes = []; this.satellites = [];
    this.mines = []; this.clones = []; this.domes = []; this.freezers = []; this.batteries = [];
  };
  SupportSystem.prototype.spawnDrones = function (player, n) {
    n = Math.min(10, n || 6);
    for (var i = 0; i < n; i++) {
      this.drones.push({ alive: true, angle: (i / n) * Math.PI * 2, orbit: 65 + (i % 4) * 16, spin: 1.3 + (i % 3) * 0.4, fireCd: Math.random() * 0.3, hp: 22 });
    }
  };
  SupportSystem.prototype.spawnTurret = function (player) {
    this.turrets.push({ alive: true, x: player.x + Math.cos(player.angle) * 90, y: player.y + Math.sin(player.angle) * 90, life: 20, fireCd: 0, hp: 70, angle: player.angle });
  };
  SupportSystem.prototype.spawnLeech = function (player, enemies) {
    var best = null, bestD = 580;
    (enemies || []).forEach(function (e) {
      if (!e || !e.alive || e.isAlly) return;
      var d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < bestD) { bestD = d; best = e; }
    });
    this.leeches.push({ alive: true, x: player.x, y: player.y, vx: Math.cos(player.angle) * 260, vy: Math.sin(player.angle) * 260, targetId: best ? (best.netId || best.id) : null, life: 14, attached: false });
  };
  SupportSystem.prototype.spawnShield = function (player, duration) {
    this.shields.push({ alive: true, life: duration || 6, angle: player.angle, width: 1.15, radius: 58 });
  };
  SupportSystem.prototype.spawnTether = function (player, enemies) {
    var best = null, bestD = 620;
    (enemies || []).forEach(function (e) {
      if (!e || !e.alive || e.isAlly) return;
      var d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < bestD) { bestD = d; best = e; }
    });
    if (!best) return false;
    this.tethers.push({ alive: true, ax: player.x, ay: player.y, targetId: best.netId || best.id, life: 8, pull: 420 });
    return true;
  };
  SupportSystem.prototype.hiveConvert = function (player, enemies) {
    var best = null, bestD = 480;
    (enemies || []).forEach(function (e) {
      if (!e || !e.alive || e.isAlly) return;
      var d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < bestD) { bestD = d; best = e; }
    });
    if (!best) return false;
    best.isAlly = true; best.group = "ALLY"; best.team = player.team || "BLUE";
    best.allyType = "phantom"; best.username = "HYJACK";
    best.colorFill = "#e1bee7"; best.colorStroke = "#ce93d8";
    best.hp = Math.min(best.hp || 40, 60); best.openWeak = false;
    return true;
  };
  SupportSystem.prototype.spawnRepairBot = function (player) {
    this.repairBots.push({ alive: true, angle: Math.random() * Math.PI * 2, orbit: 48, spin: 2.2, life: 16, healCd: 0 });
  };
  SupportSystem.prototype.spawnKamikaze = function (player, enemies) {
    var best = null, bestD = 700;
    (enemies || []).forEach(function (e) {
      if (!e || !e.alive || e.isAlly) return;
      var d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < bestD) { bestD = d; best = e; }
    });
    for (var i = 0; i < 3; i++) {
      var a = player.angle + (i - 1) * 0.35;
      this.kamikazes.push({ alive: true, x: player.x, y: player.y, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340, targetId: best ? (best.netId || best.id) : null, life: 5, dmg: 28 });
    }
  };
  SupportSystem.prototype.spawnSatellite = function (player) {
    this.satellites.push({ alive: true, angle: Math.random() * Math.PI * 2, orbit: 160, spin: 0.55, life: 22, fireCd: 1.5 });
  };
  SupportSystem.prototype.spawnMineRing = function (player) {
    for (var i = 0; i < 6; i++) {
      var a = (i / 6) * Math.PI * 2;
      this.mines.push({ alive: true, x: player.x + Math.cos(a) * 100, y: player.y + Math.sin(a) * 100, arm: 0.6, life: 16, aoe: 48, dmg: 26, radius: 9 });
    }
  };
  SupportSystem.prototype.spawnClone = function (player) {
    this.clones.push({ alive: true, life: 10, offset: 55, side: this.clones.length % 2 === 0 ? 1 : -1, fireCd: 0 });
  };
  SupportSystem.prototype.spawnDome = function (player, duration) {
    this.domes.push({ alive: true, life: duration || 7, radius: 110, x: player.x, y: player.y, follow: true });
  };
  SupportSystem.prototype.spawnFreezer = function (player) {
    this.freezers.push({ alive: true, life: 6, x: player.x + Math.cos(player.angle) * 100, y: player.y + Math.sin(player.angle) * 100, radius: 140 });
  };
  SupportSystem.prototype.spawnBattery = function (player) {
    this.batteries.push({ alive: true, x: player.x - Math.cos(player.angle) * 70, y: player.y - Math.sin(player.angle) * 70, life: 14, fireCd: 0 });
  };
  SupportSystem.prototype.update = function (dt, player, combat, enemies) {
    if (!player) return;
    var C = global.WWNConfig || { HP_MAX: 100, MAX_PROJECTILES: 120 };
    function nearest(from, maxD) {
      var best = null, bd = maxD || 600;
      (enemies || []).forEach(function (e) {
        if (!e || !e.alive || e.isAlly) return;
        var d = Math.hypot(e.x - from.x, e.y - from.y);
        if (d < bd) { bd = d; best = e; }
      });
      return best;
    }
    function findId(id) {
      var f = null;
      (enemies || []).forEach(function (e) { if (e && (e.netId === id || e.id === id)) f = e; });
      return f;
    }
    function shoot(x, y, ang, dmg, spd, color, life) {
      if (!combat || !combat.projectiles) return;
      if (combat.projectiles.live.length >= (C.MAX_PROJECTILES || 120)) return;
      var p = combat.projectiles.acquire(); if (!p) return;
      p.alive = true; p.type = "vulcan"; p.x = x; p.y = y; p.angle = ang;
      p.vx = Math.cos(ang) * (spd || 700); p.vy = Math.sin(ang) * (spd || 700);
      p.life = life || 0.9; p.maxLife = p.life; p.dmg = dmg || 4;
      p.ownerId = player.netId; p.team = player.team;
      p.radius = 2.5; p.aoe = 0; p.color = color || "#4fc3f7"; p.targetId = null; p.turn = 0; p.split = 0;
    }
    this.drones.forEach(function (d) {
      if (!d.alive) return;
      d.angle += d.spin * dt; d.x = player.x + Math.cos(d.angle) * d.orbit; d.y = player.y + Math.sin(d.angle) * d.orbit;
      d.fireCd -= dt; if (d.fireCd > 0) return;
      var tgt = nearest(d, 500); if (!tgt) return; d.fireCd = 0.32;
      shoot(d.x, d.y, Math.atan2(tgt.y - d.y, tgt.x - d.x), 4, 720, "#4fc3f7", 0.85);
    });
    this.drones = this.drones.filter(function (d) { return d.alive; });
    this.turrets.forEach(function (t) {
      if (!t.alive) return; t.life -= dt; if (t.life <= 0) { t.alive = false; return; }
      t.fireCd -= dt; var tgt = nearest(t, 720);
      if (tgt) t.angle = Math.atan2(tgt.y - t.y, tgt.x - t.x);
      if (t.fireCd > 0 || !tgt) return; t.fireCd = 0.2;
      shoot(t.x + Math.cos(t.angle) * 12, t.y + Math.sin(t.angle) * 12, t.angle, 6, 850, "#ff9800", 1);
    });
    this.turrets = this.turrets.filter(function (t) { return t.alive; });
    this.leeches.forEach(function (L) {
      if (!L.alive) return; L.life -= dt; if (L.life <= 0) { L.alive = false; return; }
      var tgt = L.targetId ? findId(L.targetId) : nearest(L, 550);
      if (tgt) L.targetId = tgt.netId || tgt.id;
      if (!tgt) { L.x += L.vx * dt; L.y += L.vy * dt; return; }
      if (!L.attached) {
        var dx = tgt.x - L.x, dy = tgt.y - L.y, d = Math.hypot(dx, dy) || 1;
        if (d < 20) L.attached = true;
        else { L.vx = (dx / d) * 340; L.vy = (dy / d) * 340; L.x += L.vx * dt; L.y += L.vy * dt; }
      }
      if (L.attached) {
        L.x = tgt.x; L.y = tgt.y;
        tgt.hp = Math.max(0, (tgt.hp || 0) - 16 * dt);
        player.hp = Math.min(C.HP_MAX, (player.hp || 0) + 5 * dt);
      }
    });
    this.leeches = this.leeches.filter(function (L) { return L.alive; });
    this.shields.forEach(function (s) { s.life -= dt; s.angle = player.angle; if (s.life <= 0) s.alive = false; });
    this.shields = this.shields.filter(function (s) { return s.alive; });
    player._shieldWall = this.shields.length > 0;
    this.tethers.forEach(function (T) {
      T.life -= dt; if (T.life <= 0) { T.alive = false; return; }
      var tgt = findId(T.targetId);
      if (!tgt || !tgt.alive) { T.alive = false; return; }
      var dx = T.ax - tgt.x, dy = T.ay - tgt.y, d = Math.hypot(dx, dy) || 1;
      tgt.vx = (tgt.vx || 0) + (dx / d) * T.pull * dt * 0.022;
      tgt.vy = (tgt.vy || 0) + (dy / d) * T.pull * dt * 0.022;
      tgt.vx *= 0.96; tgt.vy *= 0.96; T.tx = tgt.x; T.ty = tgt.y;
    });
    this.tethers = this.tethers.filter(function (T) { return T.alive; });
    this.repairBots.forEach(function (r) {
      if (!r.alive) return; r.life -= dt; if (r.life <= 0) { r.alive = false; return; }
      r.angle += r.spin * dt; r.x = player.x + Math.cos(r.angle) * r.orbit; r.y = player.y + Math.sin(r.angle) * r.orbit;
      r.healCd -= dt; if (r.healCd <= 0) { r.healCd = 0.5; player.hp = Math.min(C.HP_MAX, (player.hp || 0) + 3); }
    });
    this.repairBots = this.repairBots.filter(function (r) { return r.alive; });
    this.kamikazes.forEach(function (k) {
      if (!k.alive) return; k.life -= dt; if (k.life <= 0) { k.alive = false; return; }
      var tgt = k.targetId ? findId(k.targetId) : nearest(k, 800);
      if (tgt) {
        var dx = tgt.x - k.x, dy = tgt.y - k.y, d = Math.hypot(dx, dy) || 1;
        k.vx = (dx / d) * 400; k.vy = (dy / d) * 400;
        if (d < 22) { tgt.hp = Math.max(0, (tgt.hp || 0) - k.dmg); if (combat && combat.spawnParticle) combat.spawnParticle(k.x, k.y, "#ff5722", 16, 120); k.alive = false; return; }
      }
      k.x += k.vx * dt; k.y += k.vy * dt;
    });
    this.kamikazes = this.kamikazes.filter(function (k) { return k.alive; });
    this.satellites.forEach(function (s) {
      if (!s.alive) return; s.life -= dt; if (s.life <= 0) { s.alive = false; return; }
      s.angle += s.spin * dt; s.x = player.x + Math.cos(s.angle) * s.orbit; s.y = player.y + Math.sin(s.angle) * s.orbit;
      s.fireCd -= dt; if (s.fireCd > 0) return;
      var tgt = nearest(s, 900); if (!tgt) return; s.fireCd = 2.2;
      var ang = Math.atan2(tgt.y - s.y, tgt.x - s.x);
      if (combat && combat.effects) combat.effects.push({ type: "laser", x: s.x, y: s.y, angle: ang, range: 900, dmg: 18, ownerId: player.netId, team: player.team, color: "#e040fb", width: 5, life: 0.12 });
      tgt.hp = Math.max(0, (tgt.hp || 0) - 18);
    });
    this.satellites = this.satellites.filter(function (s) { return s.alive; });
    this.mines.forEach(function (m) {
      if (!m.alive) return; if (m.arm > 0) { m.arm -= dt; return; }
      m.life -= dt; if (m.life <= 0) { m.alive = false; return; }
      (enemies || []).forEach(function (e) {
        if (!e || !e.alive || e.isAlly || !m.alive) return;
        if (Math.hypot(e.x - m.x, e.y - m.y) < m.aoe * 0.55) {
          e.hp = Math.max(0, (e.hp || 0) - m.dmg);
          if (combat && combat.spawnParticle) combat.spawnParticle(m.x, m.y, "#ff6b6b", 12, 100);
          m.alive = false;
        }
      });
    });
    this.mines = this.mines.filter(function (m) { return m.alive; });
    this.clones.forEach(function (c) {
      if (!c.alive) return; c.life -= dt; if (c.life <= 0) { c.alive = false; return; }
      var ang = player.angle + c.side * Math.PI / 2;
      c.x = player.x + Math.cos(ang) * c.offset; c.y = player.y + Math.sin(ang) * c.offset; c.angle = player.angle;
      c.fireCd -= dt; if (c.fireCd <= 0) {
        var tgt = nearest(c, 450); if (tgt) { c.fireCd = 0.45; shoot(c.x, c.y, Math.atan2(tgt.y - c.y, tgt.x - c.x), 3, 650, "#80cbc4", 0.7); }
      }
    });
    this.clones = this.clones.filter(function (c) { return c.alive; });
    this.domes.forEach(function (d) {
      d.life -= dt; if (d.follow) { d.x = player.x; d.y = player.y; }
      if (d.life <= 0) d.alive = false;
      (enemies || []).forEach(function (e) {
        if (!e || !e.alive || e.isAlly) return;
        if (Math.hypot(e.x - d.x, e.y - d.y) < d.radius) { e.vx = (e.vx || 0) * 0.9; e.vy = (e.vy || 0) * 0.9; }
      });
    });
    this.domes = this.domes.filter(function (d) { return d.alive; });
    player._domeActive = this.domes.length > 0;
    this.freezers.forEach(function (f) {
      f.life -= dt; if (f.life <= 0) { f.alive = false; return; }
      (enemies || []).forEach(function (e) {
        if (!e || !e.alive || e.isAlly) return;
        if (Math.hypot(e.x - f.x, e.y - f.y) < f.radius) { e.vx = (e.vx || 0) * 0.85; e.vy = (e.vy || 0) * 0.85; e.hp = Math.max(0, (e.hp || 0) - 2 * dt); }
      });
    });
    this.freezers = this.freezers.filter(function (f) { return f.alive; });
    this.batteries.forEach(function (b) {
      if (!b.alive) return; b.life -= dt; if (b.life <= 0) { b.alive = false; return; }
      b.fireCd -= dt; if (b.fireCd > 0) return;
      var tgt = nearest(b, 800); if (!tgt) return; b.fireCd = 1.1;
      if (!combat || !combat.projectiles) return;
      if (combat.projectiles.live.length >= (C.MAX_PROJECTILES || 120)) return;
      var p = combat.projectiles.acquire(); if (!p) return;
      var ang = Math.atan2(tgt.y - b.y, tgt.x - b.x);
      p.alive = true; p.type = "missile"; p.x = b.x; p.y = b.y; p.angle = ang;
      p.vx = Math.cos(ang) * 360; p.vy = Math.sin(ang) * 360;
      p.life = 2.8; p.maxLife = 2.8; p.dmg = 16; p.turn = 2.6;
      p.ownerId = player.netId; p.team = player.team; p.radius = 4; p.aoe = 0; p.color = "#ff6b6b";
      p.targetId = tgt.netId || tgt.id; p.split = 0;
    });
    this.batteries = this.batteries.filter(function (b) { return b.alive; });
  };
  SupportSystem.prototype.draw = function (ctx, cam, player) {
    function sx(x) { return x - cam.x + cam.w / 2; }
    function sy(y) { return y - cam.y + cam.h / 2; }
    this.drones.forEach(function (d) { if (!d.alive) return; ctx.beginPath(); ctx.arc(sx(d.x), sy(d.y), 5, 0, Math.PI * 2); ctx.fillStyle = "#4fc3f7"; ctx.fill(); });
    this.turrets.forEach(function (t) { if (!t.alive) return; ctx.save(); ctx.translate(sx(t.x), sy(t.y)); ctx.rotate(t.angle); ctx.fillStyle = "#ff9800"; ctx.fillRect(-8, -8, 16, 16); ctx.fillStyle = "#ffe0b2"; ctx.fillRect(4, -3, 14, 6); ctx.restore(); });
    this.leeches.forEach(function (L) { if (!L.alive) return; ctx.beginPath(); ctx.arc(sx(L.x), sy(L.y), L.attached ? 7 : 5, 0, Math.PI * 2); ctx.fillStyle = L.attached ? "#c62828" : "#ef9a9a"; ctx.fill(); });
    this.shields.forEach(function (s) { if (!s.alive || !player) return; ctx.save(); ctx.translate(sx(player.x), sy(player.y)); ctx.rotate(s.angle); ctx.beginPath(); ctx.arc(32, 0, s.radius, -s.width / 2, s.width / 2); ctx.strokeStyle = "rgba(129,212,250,0.85)"; ctx.lineWidth = 6; ctx.stroke(); ctx.restore(); });
    this.tethers.forEach(function (T) { if (!T.alive) return; ctx.strokeStyle = "rgba(255,213,79,0.75)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx(T.ax), sy(T.ay), 7, 0, Math.PI * 2); ctx.stroke(); if (T.tx != null) { ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(sx(T.ax), sy(T.ay)); ctx.lineTo(sx(T.tx), sy(T.ty)); ctx.stroke(); ctx.setLineDash([]); } });
    this.repairBots.forEach(function (r) { if (!r.alive) return; ctx.beginPath(); ctx.arc(sx(r.x), sy(r.y), 6, 0, Math.PI * 2); ctx.fillStyle = "#69f0ae"; ctx.fill(); });
    this.kamikazes.forEach(function (k) { if (!k.alive) return; ctx.beginPath(); ctx.arc(sx(k.x), sy(k.y), 4, 0, Math.PI * 2); ctx.fillStyle = "#ff5722"; ctx.fill(); });
    this.satellites.forEach(function (s) { if (!s.alive) return; ctx.save(); ctx.translate(sx(s.x), sy(s.y)); ctx.fillStyle = "#e040fb"; ctx.fillRect(-7, -5, 14, 10); ctx.restore(); });
    this.mines.forEach(function (m) { if (!m.alive) return; ctx.beginPath(); ctx.arc(sx(m.x), sy(m.y), m.radius * (m.arm > 0 ? 0.6 : 1), 0, Math.PI * 2); ctx.fillStyle = m.arm > 0 ? "rgba(255,100,100,0.35)" : "rgba(255,80,80,0.8)"; ctx.fill(); });
    this.clones.forEach(function (c) { if (!c.alive) return; ctx.save(); ctx.translate(sx(c.x), sy(c.y)); ctx.rotate(c.angle || 0); ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-9, 7); ctx.lineTo(-5, 0); ctx.lineTo(-9, -7); ctx.closePath(); ctx.fillStyle = "#80cbc4"; ctx.fill(); ctx.globalAlpha = 1; ctx.restore(); });
    this.domes.forEach(function (d) { if (!d.alive) return; ctx.beginPath(); ctx.arc(sx(d.x), sy(d.y), d.radius, 0, Math.PI * 2); ctx.strokeStyle = "rgba(179,136,255,0.55)"; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = "rgba(179,136,255,0.08)"; ctx.fill(); });
    this.freezers.forEach(function (f) { if (!f.alive) return; ctx.beginPath(); ctx.arc(sx(f.x), sy(f.y), f.radius, 0, Math.PI * 2); ctx.strokeStyle = "rgba(128,216,255,0.5)"; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = "rgba(128,216,255,0.07)"; ctx.fill(); });
    this.batteries.forEach(function (b) { if (!b.alive) return; ctx.fillStyle = "#ff6b6b"; ctx.fillRect(sx(b.x) - 8, sy(b.y) - 8, 16, 16); });
  };
  global.WWNSupportSystem = SupportSystem;
})(typeof window !== "undefined" ? window : globalThis);
