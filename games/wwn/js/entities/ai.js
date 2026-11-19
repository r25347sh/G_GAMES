(function (global) {
  "use strict";
  function AiPilot(id, difficulty, styleIndex) {
    var C = global.WWNConfig;
    this.netId = id; this.id = id;
    this.username = "CPU-" + String(id).replace(/^cpu-?(auto-)?/, "") || "X";
    var ring = 450 + (styleIndex || 0) * 200 + Math.random() * 220;
    var ang0 = ((styleIndex || 0) * 2.399) + Math.random() * 1.2;
    this.x = Math.cos(ang0) * ring; this.y = Math.sin(ang0) * ring;
    this.vx = 0; this.vy = 0; this.angle = ang0 + Math.PI;
    this.hp = C.HP_MAX; this.boost = C.BOOST_MAX * 0.7; this.boosting = false;
    this.team = "RED"; this.alive = true; this.radius = C.SHIP_RADIUS;
    this.stealthed = false; this.empUntil = 0; this.lastHitBy = null;
    this.difficulty = difficulty || "normal";
    this._seed = (styleIndex || 0) * 9973 + Math.floor(Math.random() * 999);
    this._think = Math.random() * 1.2;
    this._strafe = Math.random() < 0.5 ? 1 : -1;
    this._orbitDir = Math.random() < 0.5 ? 1 : -1;
    this.fireCd = 0.4 + Math.random() * 0.5;
    this.preferDist = 320 + (this._seed % 5) * 40;
    this.openWeak = false;
  }
  AiPilot.prototype.update = function (dt, player, combat, now) {
    var C = global.WWNConfig;
    if (!this.alive) return;
    if (now < this.empUntil) {
      this.vx *= 0.94; this.vy *= 0.94; this.x += this.vx * dt; this.y += this.vy * dt; return;
    }
    this.fireCd = Math.max(0, this.fireCd - dt); this._think -= dt;
    if (player && player.alive && player.stealthed) {
      this.angle += this._strafe * 0.6 * dt;
      this.vx += Math.cos(this.angle) * 80 * dt; this.vy += Math.sin(this.angle) * 80 * dt;
      this.vx *= Math.exp(-1.5 * dt); this.vy *= Math.exp(-1.5 * dt);
      this.x += this.vx * dt; this.y += this.vy * dt; return;
    }
    var tx = player && player.alive ? player.x : 0;
    var ty = player && player.alive ? player.y : 0;
    var dx = tx - this.x, dy = ty - this.y;
    var dist = Math.hypot(dx, dy) || 1;
    var desired = Math.atan2(dy, dx);
    if (this._think <= 0) {
      this._strafe = Math.random() < 0.5 ? 1 : -1;
      this._orbitDir = Math.random() < 0.5 ? 1 : -1;
      this._think = 0.7 + (this._seed % 5) * 0.2 + Math.random() * 1.0;
    }
    if (dist < this.preferDist + 100) desired += this._strafe * 0.5;
    var diff = desired - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    var turnSp = C.TURN_RATE * (this.difficulty === "hard" ? 0.85 : this.difficulty === "easy" ? 0.5 : 0.65);
    if (this.openWeak) turnSp *= 0.75;
    var maxT = turnSp * dt;
    if (Math.abs(diff) <= maxT) this.angle = desired; else this.angle += Math.sign(diff) * maxT;
    var thrust = 1;
    if (dist < this.preferDist * 0.55) thrust = -0.35;
    else if (dist < this.preferDist) thrust = 0.3;
    else if (dist > this.preferDist * 1.8) thrust = 1;
    var accel = C.ACCEL * thrust * (this.openWeak ? 0.55 : 0.72);
    this.boosting = false;
    if (thrust > 0.6 && this.boost > 30 && dist > 500 && Math.random() < 0.012) {
      this.boosting = true; accel *= C.BOOST_MULT * 0.9;
      this.boost = Math.max(0, this.boost - C.BOOST_DRAIN * dt);
    } else this.boost = Math.min(C.BOOST_MAX * 0.7, this.boost + C.BOOST_REGEN * 0.8 * dt);
    this.vx += Math.cos(this.angle) * accel * dt; this.vy += Math.sin(this.angle) * accel * dt;
    this.vx *= Math.exp(-C.DRAG * dt); this.vy *= Math.exp(-C.DRAG * dt);
    var sp = Math.hypot(this.vx, this.vy);
    var maxSp = C.MAX_SPEED * (this.boosting ? 1.15 : (this.openWeak ? 0.65 : 0.78));
    if (sp > maxSp) { this.vx = (this.vx / sp) * maxSp; this.vy = (this.vy / sp) * maxSp; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    var half = C.WORLD_SIZE / 2, margin = 50;
    if (this.x < -half + margin) { this.x = -half + margin; this.angle += 0.6; }
    if (this.x > half - margin) { this.x = half - margin; this.angle += 0.6; }
    if (this.y < -half + margin) { this.y = -half + margin; this.angle += 0.6; }
    if (this.y > half - margin) { this.y = half - margin; this.angle += 0.6; }
    if (!combat || !player || !player.alive) return;
    var aimOk = Math.abs(diff) < 0.45;
    var rate = this.difficulty === "easy" ? 0.55 : this.difficulty === "hard" ? 0.28 : 0.4;
    if (this.openWeak) rate *= 1.6;
    if (this.fireCd <= 0 && dist < 780 && aimOk) {
      this.fireCd = rate + Math.random() * 0.15;
      if (combat.projectiles.live.length < C.MAX_PROJECTILES) {
        var w = global.WWNWeapons.vulcan;
        var p = combat.projectiles.acquire();
        var spread = (Math.random() - 0.5) * 0.22;
        p.alive = true; p.type = "vulcan";
        p.x = this.x + Math.cos(this.angle) * 20; p.y = this.y + Math.sin(this.angle) * 20;
        p.angle = this.angle + spread;
        p.vx = Math.cos(p.angle) * w.speed * 0.92; p.vy = Math.sin(p.angle) * w.speed * 0.92;
        p.life = w.life; p.maxLife = w.life;
        var dmgMul = this.difficulty === "easy" ? 0.55 : this.difficulty === "hard" ? 0.85 : 0.7;
        if (this.openWeak) dmgMul *= 0.45;
        p.dmg = w.dmg * dmgMul;
        p.ownerId = this.netId; p.team = this.team;
        p.radius = w.radius; p.aoe = 0; p.color = "#ff8c42";
        p.targetId = null; p.turn = 0; p.split = 0;
      }
    }
  };
  AiPilot.prototype.draw = function (ctx, cam) {
    if (!this.alive) return;
    var sx = this.x - cam.x + cam.w / 2, sy = this.y - cam.y + cam.h / 2;
    if (sx < -40 || sx > cam.w + 40 || sy < -40 || sy > cam.h + 40) return;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.angle);
    ctx.shadowColor = "#ff2d95"; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-12, 10); ctx.lineTo(-6, 0); ctx.lineTo(-12, -10); ctx.closePath();
    ctx.fillStyle = "#ffc8d8"; ctx.fill(); ctx.strokeStyle = "#ff2d95"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 0.7; ctx.fillStyle = "#ff8cba"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(this.username, sx, sy - 22); ctx.globalAlpha = 1;
  };
  global.WWNAiPilot = AiPilot;
})(typeof window !== "undefined" ? window : globalThis);
