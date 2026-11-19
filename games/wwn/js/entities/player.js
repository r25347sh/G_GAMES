(function (global) {
  "use strict";
  function Player(x, y) {
    var C = global.WWNConfig;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.angle = -Math.PI / 2; this.targetAngle = this.angle;
    this.speed = 0; this.hp = C.HP_MAX; this.boost = C.BOOST_MAX;
    this.boosting = false; this.trail = [];
  }
  Player.prototype.update = function (dt, axis, boostHeld) {
    var C = global.WWNConfig;
    var inputMag = Math.hypot(axis.x, axis.y);
    if (inputMag > 0.08) this.targetAngle = Math.atan2(axis.y, axis.x);
    var diff = this.targetAngle - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    var turnSpeed = C.TURN_RATE * (this.boosting ? 1.15 : 1);
    var maxTurn = turnSpeed * dt;
    if (Math.abs(diff) <= maxTurn) this.angle = this.targetAngle;
    else this.angle += Math.sign(diff) * maxTurn;
    this.boosting = false;
    var accel = C.ACCEL * inputMag;
    if (boostHeld && this.boost > 0 && inputMag > 0.05) {
      this.boosting = true;
      accel *= C.BOOST_MULT;
      this.boost = Math.max(0, this.boost - C.BOOST_DRAIN * dt);
    } else {
      this.boost = Math.min(C.BOOST_MAX, this.boost + C.BOOST_REGEN * dt);
    }
    this.vx += Math.cos(this.angle) * accel * dt;
    this.vy += Math.sin(this.angle) * accel * dt;
    this.vx *= Math.exp(-C.DRAG * dt);
    this.vy *= Math.exp(-C.DRAG * dt);
    var sp = Math.hypot(this.vx, this.vy);
    var maxSp = C.MAX_SPEED * (this.boosting ? C.BOOST_MULT * 0.85 : 1);
    if (sp > maxSp) { this.vx = (this.vx / sp) * maxSp; this.vy = (this.vy / sp) * maxSp; }
    this.speed = Math.hypot(this.vx, this.vy);
    this.x += this.vx * dt; this.y += this.vy * dt;
    var half = C.WORLD_SIZE / 2, margin = 40;
    if (this.x < -half + margin) { this.x = -half + margin; this.vx *= -0.3; }
    if (this.x > half - margin) { this.x = half - margin; this.vx *= -0.3; }
    if (this.y < -half + margin) { this.y = -half + margin; this.vy *= -0.3; }
    if (this.y > half - margin) { this.y = half - margin; this.vy *= -0.3; }
    if (this.boosting || this.speed > 80) {
      this.trail.push({ x: this.x, y: this.y, a: 1, boost: this.boosting });
      if (this.trail.length > 28) this.trail.shift();
    }
    for (var i = 0; i < this.trail.length; i++) this.trail[i].a *= 0.92;
    this.trail = this.trail.filter(function (t) { return t.a > 0.05; });
  };
  Player.prototype.draw = function (ctx, cam) {
    var sx = this.x - cam.x + cam.w / 2;
    var sy = this.y - cam.y + cam.h / 2;
    for (var i = 0; i < this.trail.length; i++) {
      var t = this.trail[i];
      var tx = t.x - cam.x + cam.w / 2, ty = t.y - cam.y + cam.h / 2;
      ctx.beginPath(); ctx.arc(tx, ty, t.boost ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = t.boost ? "rgba(0,245,255," + t.a * 0.55 + ")" : "rgba(255,45,149," + t.a * 0.4 + ")";
      ctx.fill();
    }
    if (this.boosting) {
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.angle);
      var grd = ctx.createLinearGradient(-28, 0, -8, 0);
      grd.addColorStop(0, "rgba(0,245,255,0)"); grd.addColorStop(0.5, "rgba(0,245,255,0.7)"); grd.addColorStop(1, "rgba(255,45,149,0.9)");
      ctx.fillStyle = grd; ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(-22 - Math.random() * 10, 0); ctx.lineTo(-10, 5); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.angle);
    ctx.shadowColor = "#00f5ff"; ctx.shadowBlur = this.boosting ? 18 : 8;
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-12, 10); ctx.lineTo(-6, 0); ctx.lineTo(-12, -10); ctx.closePath();
    ctx.fillStyle = "#e8f7ff"; ctx.fill(); ctx.strokeStyle = "rgba(0,245,255,0.85)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(4, 0, 3.5, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,45,149,0.9)"; ctx.fill();
    ctx.shadowBlur = 0; ctx.restore();
  };
  global.WWNPlayer = Player;
})(typeof window !== "undefined" ? window : globalThis);
