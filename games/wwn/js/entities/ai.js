(function (global) {
  "use strict";
  var GROUP_COLORS = {
    G1: { fill: "#ffc8d8", stroke: "#ff2d95", name: "PINK" },
    G2: { fill: "#c8f0ff", stroke: "#00b4ff", name: "CYAN" },
    G3: { fill: "#d4ffc8", stroke: "#3ddc84", name: "LIME" },
    G4: { fill: "#ffe4b8", stroke: "#ff9800", name: "ORANGE" },
    G5: { fill: "#e0d0ff", stroke: "#9b5de5", name: "VIOLET" },
    G6: { fill: "#fff0b0", stroke: "#ffd600", name: "GOLD" },
    G7: { fill: "#ffd0e8", stroke: "#e91e8c", name: "ROSE" },
    ALLY: { fill: "#b8e8ff", stroke: "#4fc3f7", name: "ALLY" },
  };
  var ALLY_TYPES = {
    guardian: {
      label: "守護", hpMul: 4.5, dmgMul: 0.55, speedMul: 0.72, fireRate: 0.38,
      leash: 140, threatR: 420, colorFill: "#c8e6c9", colorStroke: "#66bb6a", radiusMul: 1.25,
    },
    striker: {
      label: "突撃", hpMul: 1.1, dmgMul: 1.35, speedMul: 1.05, fireRate: 0.16,
      leash: 280, threatR: 620, colorFill: "#ffcdd2", colorStroke: "#ef5350", radiusMul: 1.0,
    },
    phantom: {
      label: "幻影", hpMul: 1.4, dmgMul: 0.75, speedMul: 1.2, fireRate: 0.2,
      leash: 220, threatR: 520, colorFill: "#e1bee7", colorStroke: "#ab47bc", radiusMul: 0.9,
    },
  };
  function AiPilot(id, difficulty, styleIndex, group, allyType) {
    var C = global.WWNConfig;
    this.netId = id; this.id = id;
    this.group = group || "G1"; this.team = this.group;
    this.isAlly = this.group === "ALLY";
    var types = ["guardian", "striker", "phantom"];
    this.allyType = this.isAlly ? (allyType || types[(styleIndex || 0) % 3]) : null;
    var at = this.allyType ? ALLY_TYPES[this.allyType] : null;
    var col = GROUP_COLORS[this.group] || GROUP_COLORS.G1;
    if (at) {
      this.colorFill = at.colorFill; this.colorStroke = at.colorStroke; this.username = at.label;
    } else {
      this.colorFill = col.fill; this.colorStroke = col.stroke;
      this.username = (col.name || this.group) + "-" + String(id).replace(/^cpu-?(auto-|ally-)?/, "").slice(-2);
    }
    var half = C.WORLD_SIZE * 0.42;
    this.x = (Math.random() - 0.5) * half * 2;
    this.y = (Math.random() - 0.5) * half * 2;
    this.vx = 0; this.vy = 0; this.angle = Math.random() * Math.PI * 2;
    this.hp = C.HP_MAX * (at ? at.hpMul : 0.65); this.hpMax = this.hp;
    this.boost = C.BOOST_MAX * (this.isAlly ? 0.7 : 0.5); this.boosting = false;
    this.alive = true; this.radius = C.SHIP_RADIUS * (at ? at.radiusMul : 1);
    this.stealthed = false; this.empUntil = 0; this.lastHitBy = null;
    this.difficulty = difficulty || "easy";
    this._seed = (styleIndex || 0) * 9973 + Math.floor(Math.random() * 999);
    this._think = Math.random() * 0.8; this._strafe = Math.random() < 0.5 ? 1 : -1;
    this.fireCd = 0.3 + Math.random() * 0.4;
    this.preferDist = this.isAlly ? 200 : 320 + (this._seed % 5) * 35;
    this.openWeak = !this.isAlly; this.focusId = null;
    this.dmgMul = at ? at.dmgMul : 0.48;
    this.speedMul = at ? at.speedMul : (this.openWeak ? 0.6 : 0.75);
    this.fireRate = at ? at.fireRate : 0.5;
    this.leash = at ? at.leash : 9999;
    this.threatR = at ? at.threatR : 700;
  }
  AiPilot.prototype._pickThreatNearMaster = function (player, entities) {
    if (!player || !this.isAlly) return null;
    var best = null, bestScore = 1e12, self = this;
    (entities || []).forEach(function (e) {
      if (!e || !e.alive || e.stealthed) return;
      if (e === self || e.isAlly) return;
      if (e === player || e.netId === player.netId) return;
      if (e.team === player.team && e.team !== "NONE") return;
      var dMaster = Math.hypot(e.x - player.x, e.y - player.y);
      if (dMaster > self.threatR) return;
      var score = dMaster + (e.hp || 50) * 0.4;
      if (e.vx != null) {
        var toward = (player.x - e.x) * e.vx + (player.y - e.y) * e.vy;
        if (toward > 0) score *= 0.7;
      }
      if (score < bestScore) { bestScore = score; best = e; }
    });
    return best;
  };
  AiPilot.prototype._pickTarget = function (player, entities) {
    if (this.isAlly) return this._pickThreatNearMaster(player, entities);
    var best = null, bestD = 1e12, self = this;
    function consider(e) {
      if (!e || !e.alive || e.stealthed) return;
      if (e === self) return;
      if (e.team === self.team || e.group === self.group) return;
      var d = Math.hypot(e.x - self.x, e.y - self.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (player) consider(player);
    (entities || []).forEach(consider);
    return best;
  };
  AiPilot.prototype.update = function (dt, player, combat, now, allEntities) {
    var C = global.WWNConfig;
    if (!this.alive) return;
    if (this.isAlly && this.allyType === "guardian") this.hp = Math.min(this.hpMax, this.hp + 18 * dt);
    else if (this.isAlly) this.hp = Math.min(this.hpMax, this.hp + 3 * dt);
    if (now < this.empUntil) {
      this.vx *= 0.94; this.vy *= 0.94; this.x += this.vx * dt; this.y += this.vy * dt; return;
    }
    this.fireCd = Math.max(0, this.fireCd - dt); this._think -= dt;
    var entities = allEntities || [];
    var target = this._pickTarget(player, entities);
    if (this._think <= 0) {
      this._strafe = Math.random() < 0.5 ? 1 : -1;
      this._think = this.isAlly ? 0.4 + Math.random() * 0.4 : 0.7 + Math.random() * 1.0;
    }
    if (this.isAlly && player) {
      var mx = player.x, my = player.y;
      var dMaster = Math.hypot(this.x - mx, this.y - my);
      var aimX, aimY, faceAng;
      if (target) {
        if (this.allyType === "guardian") {
          var ang = Math.atan2(target.y - my, target.x - mx);
          aimX = mx + Math.cos(ang) * 70; aimY = my + Math.sin(ang) * 70;
          faceAng = Math.atan2(target.y - this.y, target.x - this.x);
        } else if (this.allyType === "striker") {
          aimX = target.x; aimY = target.y;
          faceAng = Math.atan2(target.y - this.y, target.x - this.x);
        } else {
          var oa = this._seed * 0.01 + now * 1.6 * this._strafe;
          aimX = target.x + Math.cos(oa) * 110; aimY = target.y + Math.sin(oa) * 110;
          if (Math.hypot(aimX - mx, aimY - my) > this.leash) {
            aimX = mx + (aimX - mx) * 0.4; aimY = my + (aimY - my) * 0.4;
          }
          faceAng = Math.atan2(target.y - this.y, target.x - this.x);
        }
      } else {
        var slot = this.allyType === "guardian" ? 0 : (this.allyType === "striker" ? 1 : 2);
        var fa = player.angle + Math.PI + (slot - 1) * 0.7;
        var hold = this.allyType === "guardian" ? 55 : (this.allyType === "striker" ? 95 : 120);
        aimX = mx + Math.cos(fa) * hold; aimY = my + Math.sin(fa) * hold;
        faceAng = player.angle;
      }
      if (dMaster > this.leash * 1.35) {
        aimX = mx; aimY = my; faceAng = Math.atan2(my - this.y, mx - this.x);
      }
      var desired = faceAng, diff = desired - this.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      var maxT = C.TURN_RATE * 1.05 * dt;
      if (Math.abs(diff) <= maxT) this.angle = desired; else this.angle += Math.sign(diff) * maxT;
      var dx = aimX - this.x, dy = aimY - this.y, dist = Math.hypot(dx, dy) || 1;
      var thrust = dist > 40 ? 1 : (dist > 18 ? 0.35 : 0);
      if (dMaster > this.leash) thrust = 1.15;
      var accel = C.ACCEL * thrust * this.speedMul;
      this.boosting = false;
      if (thrust > 0.9 && dMaster > this.leash * 0.9 && this.boost > 15) {
        this.boosting = true; accel *= C.BOOST_MULT;
        this.boost = Math.max(0, this.boost - C.BOOST_DRAIN * dt);
      } else this.boost = Math.min(C.BOOST_MAX * 0.9, this.boost + C.BOOST_REGEN * dt);
      var moveAng = Math.atan2(dy, dx);
      this.vx += Math.cos(moveAng) * accel * dt; this.vy += Math.sin(moveAng) * accel * dt;
      this.vx *= Math.exp(-C.DRAG * 1.1 * dt); this.vy *= Math.exp(-C.DRAG * 1.1 * dt);
      var sp = Math.hypot(this.vx, this.vy);
      var maxSp = C.MAX_SPEED * this.speedMul * (this.boosting ? 1.2 : 1);
      if (sp > maxSp) { this.vx = (this.vx / sp) * maxSp; this.vy = (this.vy / sp) * maxSp; }
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (target && combat) {
        var tdx = target.x - this.x, tdy = target.y - this.y, tdist = Math.hypot(tdx, tdy) || 1;
        var shootAng = Math.atan2(tdy, tdx);
        if (target.vx != null) {
          var lead = tdist / (this.allyType === "striker" ? 700 : 950);
          shootAng = Math.atan2(tdy + (target.vy || 0) * lead, tdx + (target.vx || 0) * lead);
        }
        var aimDiff = shootAng - this.angle;
        while (aimDiff > Math.PI) aimDiff -= Math.PI * 2;
        while (aimDiff < -Math.PI) aimDiff += Math.PI * 2;
        if (this.fireCd <= 0 && tdist < 780 && Math.abs(aimDiff) < 0.45) {
          this.fireCd = this.fireRate + Math.random() * 0.06;
          if (combat.projectiles.live.length < C.MAX_PROJECTILES) {
            var w = global.WWNWeapons.vulcan, p = combat.projectiles.acquire();
            var spread = (Math.random() - 0.5) * (this.allyType === "striker" ? 0.06 : 0.12);
            p.alive = true; p.type = "vulcan";
            p.x = this.x + Math.cos(this.angle) * 18; p.y = this.y + Math.sin(this.angle) * 18;
            p.angle = shootAng + spread;
            p.vx = Math.cos(p.angle) * w.speed; p.vy = Math.sin(p.angle) * w.speed;
            p.life = w.life; p.maxLife = w.life; p.dmg = w.dmg * this.dmgMul;
            p.ownerId = this.netId; p.team = player.team || "BLUE";
            p.radius = w.radius; p.aoe = 0; p.color = this.colorStroke;
            p.targetId = null; p.turn = 0; p.split = 0;
          }
        }
      }
      return;
    }
    if (!target) {
      this.angle += this._strafe * 0.4 * dt;
      this.vx += Math.cos(this.angle) * 70 * dt; this.vy += Math.sin(this.angle) * 70 * dt;
      this.vx *= Math.exp(-1.2 * dt); this.vy *= Math.exp(-1.2 * dt);
      this.x += this.vx * dt; this.y += this.vy * dt; return;
    }
    if (target.stealthed) return;
    var desired2 = Math.atan2(target.y - this.y, target.x - this.x);
    var dist0 = Math.hypot(target.x - this.x, target.y - this.y);
    if (dist0 < this.preferDist + 80) desired2 += this._strafe * 0.55;
    var dff = desired2 - this.angle;
    while (dff > Math.PI) dff -= Math.PI * 2;
    while (dff < -Math.PI) dff += Math.PI * 2;
    var maxTe = C.TURN_RATE * 0.55 * dt;
    if (Math.abs(dff) <= maxTe) this.angle = desired2; else this.angle += Math.sign(dff) * maxTe;
    var thrustE = 1;
    if (dist0 < this.preferDist * 0.5) thrustE = -0.3;
    else if (dist0 < this.preferDist) thrustE = 0.25;
    else if (dist0 > this.preferDist * 1.8) thrustE = 1;
    var accelE = C.ACCEL * thrustE * (this.openWeak ? 0.5 : 0.7);
    this.boosting = false;
    this.vx += Math.cos(this.angle) * accelE * dt; this.vy += Math.sin(this.angle) * accelE * dt;
    this.vx *= Math.exp(-C.DRAG * dt); this.vy *= Math.exp(-C.DRAG * dt);
    var spE = Math.hypot(this.vx, this.vy), maxSpE = C.MAX_SPEED * this.speedMul;
    if (spE > maxSpE) { this.vx = (this.vx / spE) * maxSpE; this.vy = (this.vy / spE) * maxSpE; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    var halfW = C.WORLD_SIZE / 2, margin = 80;
    if (this.x < -halfW + margin) { this.x = -halfW + margin; this.angle += 0.7; }
    if (this.x > halfW - margin) { this.x = halfW - margin; this.angle += 0.7; }
    if (this.y < -halfW + margin) { this.y = -halfW + margin; this.angle += 0.7; }
    if (this.y > halfW - margin) { this.y = halfW - margin; this.angle += 0.7; }
    if (!combat) return;
    var tdx2 = target.x - this.x, tdy2 = target.y - this.y, tdist2 = Math.hypot(tdx2, tdy2) || 1;
    var shootAng2 = Math.atan2(tdy2, tdx2);
    var aimDiff2 = shootAng2 - this.angle;
    while (aimDiff2 > Math.PI) aimDiff2 -= Math.PI * 2;
    while (aimDiff2 < -Math.PI) aimDiff2 += Math.PI * 2;
    if (this.fireCd <= 0 && tdist2 < 700 && Math.abs(aimDiff2) < 0.48) {
      this.fireCd = this.fireRate * (this.openWeak ? 1.3 : 1) + Math.random() * 0.14;
      if (combat.projectiles.live.length < C.MAX_PROJECTILES) {
        var w2 = global.WWNWeapons.vulcan, p2 = combat.projectiles.acquire();
        var spr = (Math.random() - 0.5) * 0.22;
        p2.alive = true; p2.type = "vulcan";
        p2.x = this.x + Math.cos(this.angle) * 20; p2.y = this.y + Math.sin(this.angle) * 20;
        p2.angle = this.angle + spr;
        p2.vx = Math.cos(p2.angle) * w2.speed * 0.9; p2.vy = Math.sin(p2.angle) * w2.speed * 0.9;
        p2.life = w2.life; p2.maxLife = w2.life; p2.dmg = w2.dmg * this.dmgMul;
        p2.ownerId = this.netId; p2.team = this.team;
        p2.radius = w2.radius; p2.aoe = 0; p2.color = this.colorStroke;
        p2.targetId = null; p2.turn = 0; p2.split = 0;
      }
    }
  };
  AiPilot.prototype.draw = function (ctx, cam) {
    if (!this.alive) return;
    var sx = this.x - cam.x + cam.w / 2, sy = this.y - cam.y + cam.h / 2;
    if (sx < -50 || sx > cam.w + 50 || sy < -50 || sy > cam.h + 50) return;
    var sc = this.radius / (global.WWNConfig.SHIP_RADIUS || 18);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.angle); ctx.scale(sc, sc);
    ctx.shadowColor = this.colorStroke; ctx.shadowBlur = this.isAlly ? 14 : 8;
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-12, 10); ctx.lineTo(-6, 0); ctx.lineTo(-12, -10); ctx.closePath();
    ctx.fillStyle = this.colorFill; ctx.fill();
    ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 1.6; ctx.stroke();
    if (this.allyType === "guardian") {
      ctx.strokeStyle = "#66bb6a"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(2, 0, 7, 0, Math.PI * 2); ctx.stroke();
    } else if (this.allyType === "striker") {
      ctx.fillStyle = "#ef5350";
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(2, -4); ctx.lineTo(2, 4); ctx.fill();
    } else if (this.allyType === "phantom") {
      ctx.globalAlpha = 0.5; ctx.fillStyle = "#ab47bc";
      ctx.beginPath(); ctx.arc(3, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.globalAlpha = 0.85; ctx.fillStyle = this.colorStroke;
    ctx.font = "10px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(this.username, sx, sy - 22 - (sc - 1) * 10);
    if (this.isAlly) {
      var bw = 28, ratio = Math.max(0, this.hp / this.hpMax);
      ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(sx - bw / 2, sy + 18, bw, 3);
      ctx.fillStyle = this.colorStroke; ctx.fillRect(sx - bw / 2, sy + 18, bw * ratio, 3);
    }
    ctx.globalAlpha = 1;
  };
  global.WWNAiPilot = AiPilot;
  global.WWNAiGroups = GROUP_COLORS;
  global.WWNAllyTypes = ALLY_TYPES;
})(typeof window !== "undefined" ? window : globalThis);
