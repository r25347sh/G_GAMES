(function (global) {
  "use strict";
  function Player(x, y) {
    var C = global.WWNConfig;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.angle = -Math.PI / 2; this.speed = 0;
    this.hp = C.HP_MAX; this.boost = C.BOOST_MAX; this.boosting = false; this.trail = [];
    this.team = "NONE"; this.netId = "local"; this.username = "You"; this.radius = C.SHIP_RADIUS;
    this.empUntil = 0; this.lastHitBy = null; this.alive = true; this.respawnTimer = 0;
    this.kills = 0; this.deaths = 0;
  }
  Player.prototype.update = function (dt, flight, boostHeld, empBlocked) {
    var C = global.WWNConfig;
    if (!this.alive) { this.respawnTimer -= dt; return; }
    var turn = flight.turn || 0, thrust = flight.thrust || 0;
    if (empBlocked) { turn *= 0.4; thrust *= 0.35; boostHeld = false; }
    this.angle += turn * C.TURN_RATE * (this.boosting ? 1.15 : 1) * dt;
    this.boosting = false;
    var accel = 0;
    if (thrust > 0.05) {
      accel = C.ACCEL * thrust;
      if (boostHeld && this.boost > 0) {
        this.boosting = true; accel *= C.BOOST_MULT;
        this.boost = Math.max(0, this.boost - C.BOOST_DRAIN * dt);
      } else this.boost = Math.min(C.BOOST_MAX, this.boost + C.BOOST_REGEN * dt);
    } else if (thrust < -0.05) {
      accel = C.ACCEL * thrust * 0.45;
      this.boost = Math.min(C.BOOST_MAX, this.boost + C.BOOST_REGEN * dt);
    } else this.boost = Math.min(C.BOOST_MAX, this.boost + C.BOOST_REGEN * dt);
    this.vx += Math.cos(this.angle) * accel * dt;
    this.vy += Math.sin(this.angle) * accel * dt;
    this.vx *= Math.exp(-C.DRAG * dt); this.vy *= Math.exp(-C.DRAG * dt);
    var sp = Math.hypot(this.vx, this.vy);
    var maxSp = C.MAX_SPEED * (this.boosting ? C.BOOST_MULT * 0.88 : 1);
    if (thrust < -0.05) maxSp *= 0.5;
    if (sp > maxSp) { this.vx = (this.vx / sp) * maxSp; this.vy = (this.vy / sp) * maxSp; }
    this.speed = Math.hypot(this.vx, this.vy);
    this.x += this.vx * dt; this.y += this.vy * dt;
    var half = C.WORLD_SIZE / 2, margin = 36;
    if (this.x < -half + margin) { this.x = -half + margin; this.vx *= -0.28; }
    if (this.x > half - margin) { this.x = half - margin; this.vx *= -0.28; }
    if (this.y < -half + margin) { this.y = -half + margin; this.vy *= -0.28; }
    if (this.y > half - margin) { this.y = half - margin; this.vy *= -0.28; }
    if (this.boosting || this.speed > 70) {
      this.trail.push({ x: this.x, y: this.y, a: 1, boost: this.boosting });
      if (this.trail.length > 32) this.trail.shift();
    }
    for (var i = 0; i < this.trail.length; i++) this.trail[i].a *= 0.9;
    this.trail = this.trail.filter(function (t) { return t.a > 0.04; });
  };
  Player.prototype.kill = function () {
    this.alive = false; this.hp = 0; this.deaths++;
    this.respawnTimer = global.WWNConfig.RESPAWN_SEC; this.vx = 0; this.vy = 0;
  };
  Player.prototype.tryRespawn = function () {
    if (this.alive || this.respawnTimer > 0) return false;
    this.alive = true; this.hp = global.WWNConfig.HP_MAX;
    var half = global.WWNConfig.WORLD_SIZE * 0.35;
    this.x = (Math.random() - 0.5) * half; this.y = (Math.random() - 0.5) * half;
    this.vx = 0; this.vy = 0; return true;
  };
  Player.prototype.draw = function (ctx, cam, stealthed) {
    if (!this.alive) return;
    var sx = this.x - cam.x + cam.w / 2, sy = this.y - cam.y + cam.h / 2;
    if (stealthed) ctx.globalAlpha = 0.35;
    for (var i = 0; i < this.trail.length; i++) {
      var t = this.trail[i];
      var tx = t.x - cam.x + cam.w / 2, ty = t.y - cam.y + cam.h / 2;
      ctx.beginPath(); ctx.arc(tx, ty, t.boost ? 4.5 : 2.6, 0, Math.PI * 2);
      ctx.fillStyle = t.boost ? "rgba(0,245,255," + t.a * 0.58 + ")" : "rgba(255,45,149," + t.a * 0.42 + ")";
      ctx.fill();
    }
    if (this.boosting) {
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.angle);
      var grd = ctx.createLinearGradient(-32, 0, -6, 0);
      grd.addColorStop(0, "rgba(0,245,255,0)"); grd.addColorStop(0.45, "rgba(0,245,255,0.75)"); grd.addColorStop(1, "rgba(255,45,149,0.95)");
      ctx.fillStyle = grd; ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-24 - Math.random() * 12, 0); ctx.lineTo(-8, 6); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.angle);
    ctx.shadowColor = "#00f5ff"; ctx.shadowBlur = this.boosting ? 20 : 9;
    ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(-13, 11); ctx.lineTo(-7, 0); ctx.lineTo(-13, -11); ctx.closePath();
    ctx.fillStyle = "#e8f7ff"; ctx.fill(); ctx.strokeStyle = "rgba(0,245,255,0.9)"; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.arc(5, 0, 3.6, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,45,149,0.92)"; ctx.fill();
    ctx.shadowBlur = 0; ctx.restore(); ctx.globalAlpha = 1;
  };
  global.WWNPlayer = Player;
})(typeof window !== "undefined" ? window : globalThis);
