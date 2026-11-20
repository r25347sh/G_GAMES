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
  function AiPilot(id, difficulty, styleIndex, group) {
    var C = global.WWNConfig;
    this.netId = id; this.id = id;
    this.group = group || "G1"; this.team = this.group;
    var col = GROUP_COLORS[this.group] || GROUP_COLORS.G1;
    this.colorFill = col.fill; this.colorStroke = col.stroke;
    this.username = (col.name || this.group) + "-" + String(id).replace(/^cpu-?(auto-|ally-)?/, "").slice(-2);
    var half = C.WORLD_SIZE * 0.42;
    this.x = (Math.random() - 0.5) * half * 2;
    this.y = (Math.random() - 0.5) * half * 2;
    this.vx = 0; this.vy = 0; this.angle = Math.random() * Math.PI * 2;
    this.isAlly = this.group === "ALLY";
    this.hp = C.HP_MAX * (this.isAlly ? 0.9 : 0.65);
    this.boost = C.BOOST_MAX * 0.55; this.boosting = false;
    this.alive = true; this.radius = C.SHIP_RADIUS;
    this.stealthed = false; this.empUntil = 0; this.lastHitBy = null;
    this.difficulty = difficulty || "easy";
    this._seed = (styleIndex || 0) * 9973 + Math.floor(Math.random() * 999);
    this._think = Math.random() * 0.8;
    this._strafe = Math.random() < 0.5 ? 1 : -1;
    this._role = this.isAlly ? (["flank", "pin", "support"][(styleIndex || 0) % 3]) : "solo";
    this.fireCd = 0.35 + Math.random() * 0.4;
    this.preferDist = this.isAlly ? 260 : 320 + (this._seed % 5) * 35;
    this.openWeak = !this.isAlly; this.focusId = null;
  }
  AiPilot.prototype._pickTarget = function (player, entities) {
    var best = null, bestD = 1e12, self = this;
    function consider(e) {
      if (!e || !e.alive || e.stealthed) return;
      if (e === self) return;
      if (e.team === self.team || e.group === self.group) return;
      if (self.isAlly && player && (e === player || e.netId === player.netId)) return;
      var d = Math.hypot(e.x - self.x, e.y - self.y);
      if (self.isAlly && self.focusId && e.netId === self.focusId) d *= 0.55;
      if (d < bestD) { bestD = d; best = e; }
    }
    if (player) consider(player);
    (entities || []).forEach(consider);
    return best;
  };
  AiPilot.prototype._syncAllyFocus = function (player, entities, allies) {
    if (!this.isAlly) return;
    var focus = null, bestScore = 1e12;
    (entities || []).forEach(function (e) {
      if (!e || !e.alive || e.stealthed) return;
      if (e.group === "ALLY") return;
      if (player && (e === player || e.team === player.team)) return;
      var dPlayer = player ? Math.hypot(e.x - player.x, e.y - player.y) : 500;
      var score = (e.hp || 50) + dPlayer * 0.08;
      if (score < bestScore) { bestScore = score; focus = e; }
    });
    if (focus) {
      this.focusId = focus.netId || focus.id;
      if (allies && allies.length) {
        for (var i = 0; i < allies.length; i++) {
          if (allies[i].isAlly) allies[i].focusId = this.focusId;
        }
      }
    }
  };
  AiPilot.prototype._allyAimPoint = function (target, player) {
    if (!target) return null;
    var tx = target.x, ty = target.y;
    var angToT = Math.atan2(ty - (player ? player.y : this.y), tx - (player ? player.x : this.x));
    if (this._role === "flank") {
      return { x: tx + Math.cos(angToT + Math.PI / 2) * 180, y: ty + Math.sin(angToT + Math.PI / 2) * 180 };
    }
    if (this._role === "pin") {
      var mx = player ? (player.x + tx) * 0.5 : tx, my = player ? (player.y + ty) * 0.5 : ty;
      return { x: mx + Math.cos(angToT) * 40, y: my + Math.sin(angToT) * 40 };
    }
    if (player) {
      var sa = this._seed * 0.01 + (this._strafe * 1.2);
      return { x: player.x + Math.cos(sa) * 120, y: player.y + Math.sin(sa) * 120 };
    }
    return { x: tx, y: ty };
  };
  AiPilot.prototype.update = function (dt, player, combat, now, allEntities) {
    var C = global.WWNConfig;
    if (!this.alive) return;
    if (now < this.empUntil) {
      this.vx *= 0.94; this.vy *= 0.94; this.x += this.vx * dt; this.y += this.vy * dt; return;
    }
    this.fireCd = Math.max(0, this.fireCd - dt); this._think -= dt;
    var entities = allEntities || [];
    var allies = entities.filter(function (e) { return e && e.isAlly; });
    if (this.isAlly && this._think <= 0.15) this._syncAllyFocus(player, entities, allies);
    var target = this._pickTarget(player, entities);
    if (this._think <= 0) {
      this._strafe = Math.random() < 0.5 ? 1 : -1;
      this._think = this.isAlly ? (0.45 + Math.random() * 0.55) : (0.7 + Math.random() * 1.0);
    }
    var aimX, aimY, desired;
    if (this.isAlly && target) {
      var wp = this._allyAimPoint(target, player);
      aimX = wp.x; aimY = wp.y;
      desired = Math.atan2(target.y - this.y, target.x - this.x);
    } else if (target) {
      aimX = target.x; aimY = target.y;
      desired = Math.atan2(aimY - this.y, aimX - this.x);
      var dist0 = Math.hypot(target.x - this.x, target.y - this.y);
      if (dist0 < this.preferDist + 80) desired += this._strafe * 0.55;
    } else {
      this.angle += this._strafe * 0.4 * dt;
      this.vx += Math.cos(this.angle) * 70 * dt; this.vy += Math.sin(this.angle) * 70 * dt;
      this.vx *= Math.exp(-1.2 * dt); this.vy *= Math.exp(-1.2 * dt);
      this.x += this.vx * dt; this.y += this.vy * dt; return;
    }
    if (target && target.stealthed) return;
    var dx = aimX - this.x, dy = aimY - this.y;
    var dist = Math.hypot(dx, dy) || 1;
    var tdx = target ? target.x - this.x : dx, tdy = target ? target.y - this.y : dy;
    var tdist = Math.hypot(tdx, tdy) || 1;
    var diff = desired - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    var turnSp = C.TURN_RATE * (this.isAlly ? 0.95 : 0.55);
    var maxT = turnSp * dt;
    if (Math.abs(diff) <= maxT) this.angle = desired; else this.angle += Math.sign(diff) * maxT;
    var thrust = 1;
    if (this.isAlly) {
      if (this._role === "support") thrust = dist > 140 ? 0.85 : (dist < 70 ? -0.2 : 0.2);
      else if (this._role === "pin") thrust = tdist > 200 ? 1 : 0.45;
      else thrust = dist > 90 ? 1 : 0.35;
      if (player && target && tdist > 280 && Math.random() < 0.02) thrust = 1.2;
    } else {
      if (tdist < this.preferDist * 0.5) thrust = -0.3;
      else if (tdist < this.preferDist) thrust = 0.25;
      else if (tdist > this.preferDist * 1.8) thrust = 1;
    }
    var accel = C.ACCEL * Math.min(1.15, thrust) * (this.isAlly ? 0.85 : (this.openWeak ? 0.5 : 0.7));
    this.boosting = false;
    if (thrust > 0.7 && this.boost > 20 && tdist > 300 && Math.random() < (this.isAlly ? 0.03 : 0.01)) {
      this.boosting = true; accel *= C.BOOST_MULT * (this.isAlly ? 1 : 0.85);
      this.boost = Math.max(0, this.boost - C.BOOST_DRAIN * dt);
    } else {
      this.boost = Math.min(C.BOOST_MAX * (this.isAlly ? 0.85 : 0.55), this.boost + C.BOOST_REGEN * 0.75 * dt);
    }
    this.vx += Math.cos(this.angle) * accel * dt; this.vy += Math.sin(this.angle) * accel * dt;
    this.vx *= Math.exp(-C.DRAG * dt); this.vy *= Math.exp(-C.DRAG * dt);
    var sp = Math.hypot(this.vx, this.vy);
    var maxSp = C.MAX_SPEED * (this.boosting ? 1.15 : (this.isAlly ? 0.88 : (this.openWeak ? 0.6 : 0.75)));
    if (sp > maxSp) { this.vx = (this.vx / sp) * maxSp; this.vy = (this.vy / sp) * maxSp; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    var halfW = C.WORLD_SIZE / 2, margin = 80;
    if (this.x < -halfW + margin) { this.x = -halfW + margin; this.angle += 0.7; }
    if (this.x > halfW - margin) { this.x = halfW - margin; this.angle += 0.7; }
    if (this.y < -halfW + margin) { this.y = -halfW + margin; this.angle += 0.7; }
    if (this.y > halfW - margin) { this.y = halfW - margin; this.angle += 0.7; }
    if (!combat || !target) return;
    var shootAng = Math.atan2(tdy, tdx);
    if (this.isAlly && target.vx != null) {
      var lead = tdist / 900;
      shootAng = Math.atan2(tdy + (target.vy || 0) * lead, tdx + (target.vx || 0) * lead);
    }
    var aimDiff = shootAng - this.angle;
    while (aimDiff > Math.PI) aimDiff -= Math.PI * 2;
    while (aimDiff < -Math.PI) aimDiff += Math.PI * 2;
    var aimOk = Math.abs(aimDiff) < (this.isAlly ? 0.35 : 0.48);
    var rate = this.isAlly ? 0.22 : 0.5;
    if (this.openWeak) rate *= 1.3;
    if (this.fireCd <= 0 && tdist < (this.isAlly ? 820 : 700) && aimOk) {
      this.fireCd = rate + Math.random() * (this.isAlly ? 0.08 : 0.14);
      if (combat.projectiles.live.length < C.MAX_PROJECTILES) {
        var w = global.WWNWeapons.vulcan;
        var p = combat.projectiles.acquire();
        var spread = (Math.random() - 0.5) * (this.isAlly ? 0.08 : 0.22);
        p.alive = true; p.type = "vulcan";
        p.x = this.x + Math.cos(this.angle) * 20; p.y = this.y + Math.sin(this.angle) * 20;
        p.angle = this.isAlly ? (shootAng + spread) : (this.angle + spread);
        p.vx = Math.cos(p.angle) * w.speed * (this.isAlly ? 1 : 0.9);
        p.vy = Math.sin(p.angle) * w.speed * (this.isAlly ? 1 : 0.9);
        p.life = w.life; p.maxLife = w.life;
        p.dmg = w.dmg * (this.isAlly ? 0.95 : 0.48);
        p.ownerId = this.netId; p.team = this.team;
        p.radius = w.radius; p.aoe = 0; p.color = this.colorStroke;
        p.targetId = null; p.turn = 0; p.split = 0;
      }
    }
  };
  AiPilot.prototype.draw = function (ctx, cam) {
    if (!this.alive) return;
    var sx = this.x - cam.x + cam.w / 2, sy = this.y - cam.y + cam.h / 2;
    if (sx < -40 || sx > cam.w + 40 || sy < -40 || sy > cam.h + 40) return;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.angle);
    ctx.shadowColor = this.colorStroke; ctx.shadowBlur = this.isAlly ? 12 : 8;
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-12, 10); ctx.lineTo(-6, 0); ctx.lineTo(-12, -10); ctx.closePath();
    ctx.fillStyle = this.colorFill; ctx.fill();
    ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = this.colorStroke; ctx.fillRect(-4, -3, 6, 6);
    ctx.restore();
    ctx.globalAlpha = 0.8; ctx.fillStyle = this.colorStroke;
    ctx.font = "10px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(this.username, sx, sy - 22); ctx.globalAlpha = 1;
  };
  global.WWNAiPilot = AiPilot;
  global.WWNAiGroups = GROUP_COLORS;
})(typeof window !== "undefined" ? window : globalThis);
