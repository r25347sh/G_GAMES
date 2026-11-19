(function (global) {
  "use strict";
  function AiPilot(id, difficulty) {
    var C = global.WWNConfig;
    this.netId = id; this.id = id;
    this.username = "CPU-" + id.replace("cpu-", "");
    this.x = (Math.random() - 0.5) * C.WORLD_SIZE * 0.5;
    this.y = (Math.random() - 0.5) * C.WORLD_SIZE * 0.5;
    this.vx = 0; this.vy = 0; this.angle = Math.random() * Math.PI * 2;
    this.hp = C.HP_MAX; this.boost = C.BOOST_MAX; this.boosting = false;
    this.team = "RED"; this.alive = true; this.radius = C.SHIP_RADIUS;
    this.stealthed = false; this.empUntil = 0; this.lastHitBy = null;
    this.difficulty = difficulty || "normal";
    this._think = 0; this._strafe = 1; this.fireCd = 0;
  }
  AiPilot.prototype.update = function (dt, player, combat, now) {
    var C = global.WWNConfig;
    if (!this.alive) return;
    if (now < this.empUntil) {
      this.vx *= 0.95; this.vy *= 0.95; this.x += this.vx * dt; this.y += this.vy * dt; return;
    }
    this.fireCd = Math.max(0, this.fireCd - dt); this._think -= dt;
    var tx = player && player.alive ? player.x : 0, ty = player && player.alive ? player.y : 0;
    var dx = tx - this.x, dy = ty - this.y, dist = Math.hypot(dx, dy) || 1;
    var desired = Math.atan2(dy, dx);
    if (this.difficulty === "hard" && player) {
      var lead = dist / 700;
      desired = Math.atan2(ty + player.vy * lead - this.y, tx + player.vx * lead - this.x);
    }
    var diff = desired - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    var turnSp = C.TURN_RATE * (this.difficulty === "easy" ? 0.7 : this.difficulty === "hard" ? 1.2 : 1);
    var maxT = turnSp * dt;
    if (Math.abs(diff) <= maxT) this.angle = desired; else this.angle += Math.sign(diff) * maxT;
    var wantClose = this.difficulty === "hard" ? 280 : 360;
    var thrust = 1;
    if (dist < wantClose * 0.55) thrust = -0.4;
    else if (dist < wantClose) thrust = 0.35;
    if (this._think <= 0) { this._strafe = Math.random() < 0.5 ? 1 : -1; this._think = 0.6 + Math.random() * 1.2; }
    if (dist < 500) this.angle += this._strafe * 0.4 * dt;
    var accel = C.ACCEL * thrust * (this.difficulty === "easy" ? 0.75 : 1);
    this.boosting = false;
    if (thrust > 0.5 && this.boost > 20 && dist > 400 && Math.random() < 0.02) {
      this.boosting = true; accel *= C.BOOST_MULT; this.boost = Math.max(0, this.boost - C.BOOST_DRAIN * dt);
    } else this.boost = Math.min(C.BOOST_MAX, this.boost + C.BOOST_REGEN * dt);
    this.vx += Math.cos(this.angle) * accel * dt; this.vy += Math.sin(this.angle) * accel * dt;
    this.vx *= Math.exp(-C.DRAG * dt); this.vy *= Math.exp(-C.DRAG * dt);
    var sp = Math.hypot(this.vx, this.vy), maxSp = C.MAX_SPEED * (this.boosting ? 1.4 : 0.95);
    if (sp > maxSp) { this.vx = (this.vx / sp) * maxSp; this.vy = (this.vy / sp) * maxSp; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    var half = C.WORLD_SIZE / 2, margin = 40;
    if (this.x < -half + margin) this.x = -half + margin;
    if (this.x > half - margin) this.x = half - margin;
    if (this.y < -half + margin) this.y = -half + margin;
    if (this.y > half - margin) this.y = half - margin;
    if (combat && player && player.alive && this.fireCd <= 0 && dist < 900 && Math.abs(diff) < 0.35) {
      this.fireCd = this.difficulty === "easy" ? 0.35 : this.difficulty === "hard" ? 0.12 : 0.22;
      if (combat.projectiles.live.length < C.MAX_PROJECTILES) {
        var w = global.WWNWeapons.vulcan, p = combat.projectiles.acquire();
        p.alive = true; p.type = "vulcan";
        p.x = this.x + Math.cos(this.angle) * 20; p.y = this.y + Math.sin(this.angle) * 20;
        p.angle = this.angle; p.vx = Math.cos(this.angle) * w.speed; p.vy = Math.sin(this.angle) * w.speed;
        p.life = w.life; p.maxLife = w.life; p.dmg = w.dmg * (this.difficulty === "easy" ? 0.7 : 1);
        p.ownerId = this.netId; p.team = this.team; p.radius = w.radius; p.aoe = 0; p.color = "#ff8c42";
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
    ctx.shadowBlur = 0; ctx.restore();
    ctx.fillStyle = "rgba(255,180,180,0.85)"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(this.username, sx, sy - 22);
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(sx - 16, sy - 18, 32, 3);
    ctx.fillStyle = "#ff2d95"; ctx.fillRect(sx - 16, sy - 18, 32 * (this.hp / 100), 3);
  };
  global.WWNAiPilot = AiPilot;
})(typeof window !== "undefined" ? window : globalThis);
