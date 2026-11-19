(function (global) {
  "use strict";
  var GROUP_COLORS = {
    G1: { fill: "#ffc8d8", stroke: "#ff2d95", name: "PINK" },
    G2: { fill: "#c8f0ff", stroke: "#00b4ff", name: "CYAN" },
    G3: { fill: "#d4ffc8", stroke: "#3ddc84", name: "LIME" },
    G4: { fill: "#ffe4b8", stroke: "#ff9800", name: "ORANGE" },
    G5: { fill: "#e0d0ff", stroke: "#9b5de5", name: "VIOLET" },
    ALLY: { fill: "#b8e0ff", stroke: "#4fc3f7", name: "ALLY" },
    RED: { fill: "#ffc8d8", stroke: "#ff2d95", name: "RED" },
  };
  function AiPilot(id, difficulty, styleIndex, group) {
    var C = global.WWNConfig;
    this.netId = id; this.id = id;
    this.group = group || "G1";
    this.team = this.group;
    var col = GROUP_COLORS[this.group] || GROUP_COLORS.G1;
    this.colorFill = col.fill; this.colorStroke = col.stroke;
    this.username = (col.name || this.group) + "-" + String(id).replace(/^cpu-?(auto-|ally-)?/, "").slice(-2);
    var ring = 500 + (styleIndex || 0) * 220 + Math.random() * 300;
    var ang0 = ((styleIndex || 0) * 2.399) + Math.random() * 1.4;
    var sector = (String(this.group).charCodeAt(1) || 1) * 1.25;
    ang0 += sector;
    this.x = Math.cos(ang0) * ring; this.y = Math.sin(ang0) * ring;
    this.vx = 0; this.vy = 0; this.angle = ang0 + Math.PI;
    this.hp = C.HP_MAX * (this.group === "ALLY" ? 0.85 : 0.7);
    this.boost = C.BOOST_MAX * 0.6; this.boosting = false;
    this.alive = true; this.radius = C.SHIP_RADIUS;
    this.stealthed = false; this.empUntil = 0; this.lastHitBy = null;
    this.difficulty = difficulty || "easy";
    this._seed = (styleIndex || 0) * 9973 + Math.floor(Math.random() * 999);
    this._think = Math.random() * 1.2;
    this._strafe = Math.random() < 0.5 ? 1 : -1;
    this.fireCd = 0.5 + Math.random() * 0.5;
    this.preferDist = 300 + (this._seed % 5) * 40;
    this.openWeak = this.group !== "ALLY";
    this.isAlly = this.group === "ALLY";
  }
  AiPilot.prototype._pickTarget = function (player, allies, others) {
    var best = null, bestD = 1e12;
    function consider(e) {
      if (!e || !e.alive || e.stealthed) return;
      if (e.team === this.team || e.group === this.group) return;
      if (this.isAlly && player && (e === player || e.netId === player.netId)) return;
      var d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    var self = this;
    if (player) consider.call(self, player);
    (others || []).forEach(function (e) { consider.call(self, e); });
    return best;
  };
  AiPilot.prototype.update = function (dt, player, combat, now, allEntities) {
    var C = global.WWNConfig;
    if (!this.alive) return;
    if (now < this.empUntil) {
      this.vx *= 0.94; this.vy *= 0.94; this.x += this.vx * dt; this.y += this.vy * dt; return;
    }
    this.fireCd = Math.max(0, this.fireCd - dt); this._think -= dt;
    var target = this._pickTarget(player, null, allEntities || []);
    if (!target) {
      this.angle += this._strafe * 0.35 * dt;
      this.vx += Math.cos(this.angle) * 60 * dt; this.vy += Math.sin(this.angle) * 60 * dt;
      this.vx *= Math.exp(-1.2 * dt); this.vy *= Math.exp(-1.2 * dt);
      this.x += this.vx * dt; this.y += this.vy * dt; return;
    }
    if (target.stealthed) return;
    var dx = target.x - this.x, dy = target.y - this.y;
    var dist = Math.hypot(dx, dy) || 1;
    var desired = Math.atan2(dy, dx);
    if (this._think <= 0) { this._strafe = Math.random() < 0.5 ? 1 : -1; this._think = 0.6 + Math.random() * 1.1; }
    if (dist < this.preferDist + 80) desired += this._strafe * 0.55;
    var diff = desired - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    var turnSp = C.TURN_RATE * (this.isAlly ? 0.75 : 0.55);
    var maxT = turnSp * dt;
    if (Math.abs(diff) <= maxT) this.angle = desired; else this.angle += Math.sign(diff) * maxT;
    var thrust = 1;
    if (dist < this.preferDist * 0.5) thrust = -0.3;
    else if (dist < this.preferDist) thrust = 0.25;
    else if (dist > this.preferDist * 1.8) thrust = 1;
    var accel = C.ACCEL * thrust * (this.openWeak ? 0.5 : 0.7);
    this.boosting = false;
    if (thrust > 0.6 && this.boost > 25 && dist > 450 && Math.random() < 0.01) {
      this.boosting = true; accel *= C.BOOST_MULT * 0.85;
      this.boost = Math.max(0, this.boost - C.BOOST_DRAIN * dt);
    } else this.boost = Math.min(C.BOOST_MAX * 0.6, this.boost + C.BOOST_REGEN * 0.7 * dt);
    this.vx += Math.cos(this.angle) * accel * dt; this.vy += Math.sin(this.angle) * accel * dt;
    this.vx *= Math.exp(-C.DRAG * dt); this.vy *= Math.exp(-C.DRAG * dt);
    var sp = Math.hypot(this.vx, this.vy);
    var maxSp = C.MAX_SPEED * (this.boosting ? 1.1 : (this.openWeak ? 0.6 : 0.75));
    if (sp > maxSp) { this.vx = (this.vx / sp) * maxSp; this.vy = (this.vy / sp) * maxSp; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    var half = C.WORLD_SIZE / 2, margin = 80;
    if (this.x < -half + margin) { this.x = -half + margin; this.angle += 0.7; }
    if (this.x > half - margin) { this.x = half - margin; this.angle += 0.7; }
    if (this.y < -half + margin) { this.y = -half + margin; this.angle += 0.7; }
    if (this.y > half - margin) { this.y = half - margin; this.angle += 0.7; }
    if (!combat) return;
    var aimOk = Math.abs(diff) < 0.48;
    var rate = this.isAlly ? 0.32 : 0.48;
    if (this.openWeak) rate *= 1.35;
    if (this.fireCd <= 0 && dist < 720 && aimOk) {
      this.fireCd = rate + Math.random() * 0.12;
      if (combat.projectiles.live.length < C.MAX_PROJECTILES) {
        var w = global.WWNWeapons.vulcan;
        var p = combat.projectiles.acquire();
        var spread = (Math.random() - 0.5) * 0.2;
        p.alive = true; p.type = "vulcan";
        p.x = this.x + Math.cos(this.angle) * 20; p.y = this.y + Math.sin(this.angle) * 20;
        p.angle = this.angle + spread;
        p.vx = Math.cos(p.angle) * w.speed * 0.9; p.vy = Math.sin(p.angle) * w.speed * 0.9;
        p.life = w.life; p.maxLife = w.life;
        p.dmg = w.dmg * (this.isAlly ? 0.8 : 0.5);
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
    ctx.shadowColor = this.colorStroke; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-12, 10); ctx.lineTo(-6, 0); ctx.lineTo(-12, -10); ctx.closePath();
    ctx.fillStyle = this.colorFill; ctx.fill();
    ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = this.colorStroke; ctx.fillRect(-4, -3, 6, 6);
    ctx.restore();
    ctx.globalAlpha = 0.75; ctx.fillStyle = this.colorStroke;
    ctx.font = "10px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(this.username, sx, sy - 22); ctx.globalAlpha = 1;
  };
  global.WWNAiPilot = AiPilot;
  global.WWNAiGroups = GROUP_COLORS;
})(typeof window !== "undefined" ? window : globalThis);
