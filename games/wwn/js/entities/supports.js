(function (global) {
  "use strict";
  function SupportSystem() {
    this.drones = []; this.turrets = []; this.leeches = []; this.shields = [];
    this.tethers = []; this.sats = []; this.mines = []; this.clones = [];
    this.domes = []; this.freezers = []; this.kamikazes = []; this.repairBots = [];
  }
  SupportSystem.prototype.clear = function () {
    this.drones = []; this.turrets = []; this.leeches = []; this.shields = [];
    this.tethers = []; this.sats = []; this.mines = []; this.clones = [];
    this.domes = []; this.freezers = []; this.kamikazes = []; this.repairBots = [];
  };
  SupportSystem.prototype.spawnDrones = function (player, n) {
    n = n || 6;
    for (var i = 0; i < n; i++) {
      this.drones.push({
        x: player.x + Math.cos(i) * 40, y: player.y + Math.sin(i) * 40,
        angle: 0, life: 18 + Math.random() * 6, hp: 30, orbit: i * (Math.PI * 2 / n)
      });
    }
  };
  SupportSystem.prototype.spawnTurret = function (player) {
    this.turrets.push({ x: player.x, y: player.y, life: 25, hp: 80, fireCd: 0 });
  };
  SupportSystem.prototype.spawnLeech = function (player) {
    this.leeches.push({ x: player.x, y: player.y, life: 12, attached: null });
  };
  SupportSystem.prototype.spawnShield = function (player, n) {
    this.shields.push({ x: player.x, y: player.y, life: 10, n: n || 6 });
  };
  SupportSystem.prototype.hiveConvert = function (player, enemies) {
    var best = null, bestD = 480;
    (enemies || []).forEach(function (e) {
      if (!e || !e.alive || e.isAlly) return;
      var d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < bestD) { bestD = d; best = e; }
    });
    if (!best) return false;
    best.isAlly = true;
    best.group = "ALLY";
    best.team = (player.team && player.team !== "NONE") ? player.team : "BLUE";
    best.ownerId = player.netId || player.id;
    best.leaderId = player.netId || player.id;
    best.allyType = "phantom";
    best.username = "HIVE";
    best.colorFill = "#e1bee7"; best.colorStroke = "#ce93d8";
    best._target = null;
    best.fireCd = 0.6;
    best.dmgMul = Math.min(best.dmgMul || 1, 0.6);
    best.openWeak = false;
    best._remoteAlly = false;
    if (best.hpMax) best.hp = Math.min(best.hpMax, Math.max(best.hp || 40, 80));
    return true;
  };
  SupportSystem.prototype.spawnTether = function (player) {
    this.tethers.push({ x: player.x, y: player.y, life: 8 });
  };
  SupportSystem.prototype.spawnRepairBot = function (player) {
    this.repairBots.push({ x: player.x, y: player.y, life: 14 });
  };
  SupportSystem.prototype.spawnKamikaze = function (player) {
    this.kamikazes.push({ x: player.x, y: player.y, life: 6, angle: player.angle });
  };
  SupportSystem.prototype.spawnSatellite = function (player) {
    this.sats.push({ x: player.x, y: player.y, life: 20, orbit: 0 });
  };
  SupportSystem.prototype.spawnMineRing = function (player, combat) {
    if (!combat || !combat.spawnMine) return;
    for (var i = 0; i < 6; i++) {
      var a = (Math.PI * 2 * i) / 6;
      combat.spawnMine(player.x + Math.cos(a) * 80, player.y + Math.sin(a) * 80, player);
    }
  };
  SupportSystem.prototype.spawnClone = function (player) {
    this.clones.push({ x: player.x, y: player.y, life: 10, angle: player.angle });
  };
  SupportSystem.prototype.spawnDome = function (player, n) {
    this.domes.push({ x: player.x, y: player.y, life: n || 7, r: 120 });
  };
  SupportSystem.prototype.spawnFreezer = function (player) {
    this.freezers.push({ x: player.x, y: player.y, life: 6, r: 160 });
  };
  SupportSystem.prototype.update = function (dt, player, combat, entities) {
    var list = entities || [];
    // drones orbit + shoot nearest enemy
    for (var i = this.drones.length - 1; i >= 0; i--) {
      var d = this.drones[i];
      d.life -= dt; d.orbit += dt * 2.2;
      if (player) {
        d.x = player.x + Math.cos(d.orbit) * 55;
        d.y = player.y + Math.sin(d.orbit) * 55;
      }
      if (d.life <= 0) { this.drones.splice(i, 1); continue; }
      d.fireCd = (d.fireCd || 0) - dt;
      if (d.fireCd <= 0 && combat && combat.projectiles) {
        var tgt = null, best = 500;
        for (var j = 0; j < list.length; j++) {
          var e = list[j];
          if (!e || !e.alive || e.isAlly) continue;
          if (e.team && player && e.team === player.team) continue;
          var dd = Math.hypot(e.x - d.x, e.y - d.y);
          if (dd < best) { best = dd; tgt = e; }
        }
        if (tgt && combat.projectiles.acquire) {
          var p = combat.projectiles.acquire();
          var ang = Math.atan2(tgt.y - d.y, tgt.x - d.x);
          p.alive = true; p.type = "bullet"; p.x = d.x; p.y = d.y; p.angle = ang;
          p.vx = Math.cos(ang) * 700; p.vy = Math.sin(ang) * 700;
          p.life = 0.9; p.dmg = 4; p.ownerId = player.netId; p.team = player.team;
          p.radius = 2; p.aoe = 0; p.color = "#4fc3f7";
          d.fireCd = 0.35;
        }
      }
    }
    for (var ti = this.turrets.length - 1; ti >= 0; ti--) {
      var t = this.turrets[ti];
      t.life -= dt; t.fireCd = (t.fireCd || 0) - dt;
      if (t.life <= 0) { this.turrets.splice(ti, 1); continue; }
      if (t.fireCd <= 0 && combat) {
        var tgt2 = null, best2 = 700;
        for (var j2 = 0; j2 < list.length; j2++) {
          var e2 = list[j2];
          if (!e2 || !e2.alive || e2.isAlly) continue;
          if (e2.team && player && e2.team === player.team) continue;
          var d2 = Math.hypot(e2.x - t.x, e2.y - t.y);
          if (d2 < best2) { best2 = d2; tgt2 = e2; }
        }
        if (tgt2 && combat.projectiles && combat.projectiles.acquire) {
          var p2 = combat.projectiles.acquire();
          var ang2 = Math.atan2(tgt2.y - t.y, tgt2.x - t.x);
          p2.alive = true; p2.type = "bullet"; p2.x = t.x; p2.y = t.y; p2.angle = ang2;
          p2.vx = Math.cos(ang2) * 820; p2.vy = Math.sin(ang2) * 820;
          p2.life = 1.1; p2.dmg = 9; p2.ownerId = player.netId; p2.team = player.team;
          p2.radius = 3; p2.color = "#ff9800";
          t.fireCd = 0.4;
        }
      }
    }
    for (var li = this.leeches.length - 1; li >= 0; li--) {
      var L = this.leeches[li];
      L.life -= dt;
      if (L.life <= 0) { this.leeches.splice(li, 1); continue; }
      if (!L.attached) {
        var bt = null, bd = 400;
        for (var j3 = 0; j3 < list.length; j3++) {
          var e3 = list[j3];
          if (!e3 || !e3.alive || e3.isAlly) continue;
          var d3 = Math.hypot(e3.x - L.x, e3.y - L.y);
          if (d3 < bd) { bd = d3; bt = e3; }
        }
        if (bt) L.attached = bt;
      }
      if (L.attached && L.attached.alive) {
        L.x = L.attached.x; L.y = L.attached.y;
        L.attached.hp = Math.max(0, (L.attached.hp || 0) - 12 * dt);
        if (player) player.hp = Math.min(player.hpMax || 560, (player.hp || 0) + 6 * dt);
      }
    }
    for (var si = this.shields.length - 1; si >= 0; si--) {
      this.shields[si].life -= dt;
      if (player) { this.shields[si].x = player.x; this.shields[si].y = player.y; }
      if (this.shields[si].life <= 0) this.shields.splice(si, 1);
    }
    for (var ri = this.repairBots.length - 1; ri >= 0; ri--) {
      var rb = this.repairBots[ri];
      rb.life -= dt;
      if (player) {
        rb.x = player.x + 30; rb.y = player.y;
        player.hp = Math.min(player.hpMax || 560, (player.hp || 0) + 8 * dt);
      }
      if (rb.life <= 0) this.repairBots.splice(ri, 1);
    }
    for (var ki = this.kamikazes.length - 1; ki >= 0; ki--) {
      var k = this.kamikazes[ki];
      k.life -= dt;
      k.x += Math.cos(k.angle) * 420 * dt;
      k.y += Math.sin(k.angle) * 420 * dt;
      for (var j4 = 0; j4 < list.length; j4++) {
        var e4 = list[j4];
        if (!e4 || !e4.alive || e4.isAlly) continue;
        if (Math.hypot(e4.x - k.x, e4.y - k.y) < 30) {
          e4.hp = Math.max(0, e4.hp - 45);
          k.life = 0;
        }
      }
      if (k.life <= 0) this.kamikazes.splice(ki, 1);
    }
    for (var sati = this.sats.length - 1; sati >= 0; sati--) {
      var sat = this.sats[sati];
      sat.life -= dt; sat.orbit += dt;
      if (player) {
        sat.x = player.x + Math.cos(sat.orbit) * 140;
        sat.y = player.y + Math.sin(sat.orbit) * 140;
      }
      if (sat.life <= 0) this.sats.splice(sati, 1);
    }
    for (var ci = this.clones.length - 1; ci >= 0; ci--) {
      var c = this.clones[ci];
      c.life -= dt;
      if (player) { c.x = player.x - 40; c.y = player.y; c.angle = player.angle; }
      if (c.life <= 0) this.clones.splice(ci, 1);
    }
    for (var di = this.domes.length - 1; di >= 0; di--) {
      var dm = this.domes[di];
      dm.life -= dt;
      if (player) { dm.x = player.x; dm.y = player.y; }
      if (dm.life <= 0) this.domes.splice(di, 1);
    }
    for (var fi = this.freezers.length - 1; fi >= 0; fi--) {
      var fz = this.freezers[fi];
      fz.life -= dt;
      if (player) { fz.x = player.x; fz.y = player.y; }
      for (var j5 = 0; j5 < list.length; j5++) {
        var e5 = list[j5];
        if (!e5 || !e5.alive || e5.isAlly) continue;
        if (Math.hypot(e5.x - fz.x, e5.y - fz.y) < fz.r) {
          e5.vx = (e5.vx || 0) * 0.92; e5.vy = (e5.vy || 0) * 0.92;
        }
      }
      if (fz.life <= 0) this.freezers.splice(fi, 1);
    }
  };
  SupportSystem.prototype.draw = function (ctx, cam, player) {
    if (!ctx || !cam) return;
    function sx(x) { return cam.sx ? cam.sx(x) : x - cam.x + cam.w / 2; }
    function sy(y) { return cam.sy ? cam.sy(y) : y - cam.y + cam.h / 2; }
    this.drones.forEach(function (d) {
      ctx.fillStyle = "#4fc3f7";
      ctx.beginPath(); ctx.arc(sx(d.x), sy(d.y), 5, 0, Math.PI * 2); ctx.fill();
    });
    this.turrets.forEach(function (t) {
      ctx.fillStyle = "#ff9800";
      ctx.fillRect(sx(t.x) - 8, sy(t.y) - 8, 16, 16);
    });
    this.leeches.forEach(function (L) {
      ctx.fillStyle = "#c62828";
      ctx.beginPath(); ctx.arc(sx(L.x), sy(L.y), 6, 0, Math.PI * 2); ctx.fill();
    });
    this.shields.forEach(function (s) {
      ctx.strokeStyle = "rgba(129,212,250,0.5)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sx(s.x), sy(s.y), 50, 0, Math.PI * 2); ctx.stroke();
    });
    this.sats.forEach(function (sat) {
      ctx.fillStyle = "#b388ff";
      ctx.beginPath(); ctx.arc(sx(sat.x), sy(sat.y), 7, 0, Math.PI * 2); ctx.fill();
    });
    this.domes.forEach(function (dm) {
      ctx.strokeStyle = "rgba(128,203,196,0.4)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx(dm.x), sy(dm.y), dm.r, 0, Math.PI * 2); ctx.stroke();
    });
    this.freezers.forEach(function (fz) {
      ctx.strokeStyle = "rgba(129,212,250,0.35)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx(fz.x), sy(fz.y), fz.r, 0, Math.PI * 2); ctx.stroke();
    });
    this.kamikazes.forEach(function (k) {
      ctx.fillStyle = "#ff5252";
      ctx.beginPath(); ctx.arc(sx(k.x), sy(k.y), 6, 0, Math.PI * 2); ctx.fill();
    });
    this.clones.forEach(function (c) {
      ctx.globalAlpha = 0.45; ctx.fillStyle = "#ce93d8";
      ctx.beginPath(); ctx.arc(sx(c.x), sy(c.y), 12, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    });
    this.repairBots.forEach(function (rb) {
      ctx.fillStyle = "#69f0ae";
      ctx.beginPath(); ctx.arc(sx(rb.x), sy(rb.y), 5, 0, Math.PI * 2); ctx.fill();
    });
  };
  global.WWNSupportSystem = SupportSystem;
})(typeof window !== "undefined" ? window : globalThis);
