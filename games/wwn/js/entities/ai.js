(function (global) {
  "use strict";
  function AiPilot(id, difficulty, styleIndex, group, allyType) {
    var C = global.WWNConfig, at = null;
    this.netId = id; this.id = id; this.group = group || "G1"; this.team = this.group;
    this.isAlly = this.group === "ALLY";
    var types = ["guardian", "striker", "phantom"];
    this.allyType = this.isAlly ? (allyType || types[(styleIndex || 0) % 3]) : null;
    at = this.allyType && global.WWNAllyTypes ? global.WWNAllyTypes[this.allyType] : null;
    this.hp = C.HP_MAX; this.hpMax = C.HP_MAX;
    this.radius = C.SHIP_RADIUS * (at ? at.radiusMul : 1);
    this.dmgMul = at ? ({ guardian: 1.8, striker: 3.2, phantom: 2.4 }[this.allyType] || 2) : ({ easy: 0.7, normal: 0.95, hard: 1.15 }[difficulty || "normal"] || 0.95);
    this.speedMul = at ? at.speedMul : ({ easy: 0.78, normal: 0.88, hard: 0.96 }[difficulty || "normal"] || 0.88);
    this.fireRate = at ? ({ guardian: 0.28, striker: 0.16, phantom: 0.21 }[this.allyType] || 0.24) : ({ easy: 0.48, normal: 0.36, hard: 0.28 }[difficulty || "normal"] || 0.36);
    this.openWeak = false; this.alive = true; this.respawnTimer = 0; this.empUntil = 0;
    this.difficulty = difficulty || "normal"; this._seed = (styleIndex || 0) * 9973 + Math.floor(Math.random() * 999);
    var half = C.WORLD_SIZE * 0.42; this.x = (Math.random() - .5) * half * 2; this.y = (Math.random() - .5) * half * 2;
    this.vx = 0; this.vy = 0; this.angle = Math.random() * Math.PI * 2; this.boost = C.BOOST_MAX; this.boosting = false;
    this.stealthed = false; this._think = Math.random(); this._strafe = Math.random() < .5 ? -1 : 1; this.fireCd = Math.random() * .5;
    this.preferDist = this.isAlly ? 220 : 300; this.leash = at ? at.leash : 9999; this.threatR = at ? at.threatR : 760;
    var colors = global.WWNAiGroups || {}; var col = colors[this.group] || colors.G1 || { fill: "#ffc8d8", stroke: "#ff2d95", name: "CPU" };
    if (at) { this.colorFill = at.colorFill; this.colorStroke = at.colorStroke; this.username = at.label; } else { this.colorFill = col.fill; this.colorStroke = col.stroke; this.username = (col.name || "CPU") + "-" + String(id).slice(-2); }
  }
  function dist(a, b) { return Math.hypot((b.x || 0) - (a.x || 0), (b.y || 0) - (a.y || 0)); }
  AiPilot.prototype.pickTarget = function (player, entities) {
    var self = this, best = null, bestScore = Infinity;
    (entities || []).concat(player ? [player] : []).forEach(function (target) {
      if (!target || !target.alive || target.hp <= 0 || target.stealthed || target === self) return;
      if (target.isAlly === self.isAlly) return;
      if (self.team !== "NONE" && target.team === self.team && target.team !== "NONE") return;
      var d = dist(self, target), score = d + (target.hp || 100) * 0.15;
      if (self.isAlly) { if (d > self.threatR) return; score = d + (target.hp || 100) * 0.35; }
      if (score < bestScore) { bestScore = score; best = target; }
    });
    return best;
  };
  AiPilot.prototype.respawn = function (player) {
    this.alive = true; this.hp = this.hpMax = global.WWNConfig.HP_MAX; this.respawnTimer = 0;
    var angle = Math.random() * Math.PI * 2, range = 520 + Math.random() * 700;
    this.x = (player ? player.x : 0) + Math.cos(angle) * range; this.y = (player ? player.y : 0) + Math.sin(angle) * range;
    this.vx = 0; this.vy = 0; this.fireCd = .35;
  };
  AiPilot.prototype.update = function (dt, player, combat, now, entities) {
    var C = global.WWNConfig;
    if (!this.alive) { this.respawnTimer -= dt; if (this.respawnTimer <= 0) this.respawn(player); return; }
    if (this.hp <= 0) { this.alive = false; this.respawnTimer = C.RESPAWN_SEC; return; }
    if (now < this.empUntil) { this.vx *= .9; this.vy *= .9; this.x += this.vx * dt; this.y += this.vy * dt; return; }
    this.fireCd = Math.max(0, this.fireCd - dt); this._think -= dt;
    if (this._think <= 0) { this._think = .45 + Math.random() * .7; this._strafe *= Math.random() < .25 ? -1 : 1; }
    var target = this.pickTarget(player, entities);
    if (!target) {
      if (this.isAlly && player) { var dx = player.x - this.x, dy = player.y - this.y, da = Math.atan2(dy, dx); this.angle += Math.max(-C.TURN_RATE * dt, Math.min(C.TURN_RATE * dt, da - this.angle)); }
      else this.angle += this._strafe * C.TURN_RATE * .35 * dt;
    } else {
      var tx = target.x - this.x, ty = target.y - this.y, distance = Math.hypot(tx, ty) || 1, aim = Math.atan2(ty, tx);
      var diff = aim - this.angle; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
      var turnLimit = C.TURN_RATE * dt * (this.isAlly ? 1.15 : .82); this.angle += Math.max(-turnLimit, Math.min(turnLimit, diff));
      var desired = distance > this.preferDist ? 1 : (distance < this.preferDist * .55 ? -.35 : .25);
      if (this.isAlly) { desired = distance > 150 ? 1 : (distance < 65 ? -.45 : 0); }
      this.vx += Math.cos(this.angle) * C.ACCEL * desired * this.speedMul * dt; this.vy += Math.sin(this.angle) * C.ACCEL * desired * this.speedMul * dt;
    }
    this.vx *= Math.exp(-C.DRAG * dt); this.vy *= Math.exp(-C.DRAG * dt);
    var speed = Math.hypot(this.vx, this.vy), maxSpeed = C.MAX_SPEED * this.speedMul;
    if (speed > maxSpeed) { this.vx = this.vx / speed * maxSpeed; this.vy = this.vy / speed * maxSpeed; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    var half = C.WORLD_SIZE / 2 - 100; if (this.x < -half) { this.x = -half; this.vx *= -.4; } if (this.x > half) { this.x = half; this.vx *= -.4; } if (this.y < -half) { this.y = -half; this.vy *= -.4; } if (this.y > half) { this.y = half; this.vy *= -.4; }
    if (!target || !combat || this.fireCd > 0) return;
    var td = dist(this, target); if (td > (this.isAlly ? 850 : 720)) return;
    var shoot = Math.atan2(target.y - this.y, target.x - this.x), spread = (Math.random() - .5) * (this.isAlly ? .035 : .14);
    var w = global.WWNWeapons.vulcan, p = combat.projectiles.acquire(); p.alive = true; p.type = "vulcan";
    p.x = this.x + Math.cos(shoot) * 20; p.y = this.y + Math.sin(shoot) * 20; p.angle = shoot + spread;
    p.vx = Math.cos(p.angle) * w.speed * (this.isAlly ? 1.05 : .92); p.vy = Math.sin(p.angle) * w.speed * (this.isAlly ? 1.05 : .92);
    p.life = w.life; p.maxLife = w.life; p.dmg = w.dmg * this.dmgMul; p.ownerId = this.netId; p.team = this.team;
    p.radius = w.radius; p.aoe = 0; p.color = this.colorStroke || w.color; p.targetId = null; p.turn = 0; p.split = 0;
    this.fireCd = this.fireRate + Math.random() * .08;
  };
  AiPilot.prototype.draw = function (ctx, cam) {
    if (!this.alive) return; var sx = this.x - cam.x + cam.w / 2, sy = this.y - cam.y + cam.h / 2;
    if (sx < -60 || sx > cam.w + 60 || sy < -60 || sy > cam.h + 60) return;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.angle); ctx.shadowColor = this.colorStroke; ctx.shadowBlur = this.isAlly ? 16 : 8;
    ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(-13, 11); ctx.lineTo(-7, 0); ctx.lineTo(-13, -11); ctx.closePath(); ctx.fillStyle = this.colorFill; ctx.fill(); ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
    ctx.fillStyle = this.colorStroke; ctx.font = "10px sans-serif"; ctx.textAlign = "center"; ctx.fillText(this.username, sx, sy - 24);
    if (this.isAlly) { ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(sx - 18, sy + 17, 36, 3); ctx.fillStyle = this.colorStroke; ctx.fillRect(sx - 18, sy + 17, 36 * Math.max(0, this.hp / this.hpMax), 3); }
  };
  global.WWNAiPilot = AiPilot;
})(typeof window !== "undefined" ? window : globalThis);
