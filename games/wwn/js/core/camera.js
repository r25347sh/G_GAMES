(function (global) {
  "use strict";
  function Camera() {
    this.x = 0;
    this.y = 0;
    this.w = 800;
    this.h = 600;
    this.shake = 0;
    this.zoom = 1;
    this.targetZoom = 1;
  }
  Camera.prototype.resize = function (w, h) {
    this.w = Math.max(1, w || 800);
    this.h = Math.max(1, h || 600);
  };
  Camera.prototype.snap = function (x, y) {
    this.x = x || 0;
    this.y = y || 0;
  };
  Camera.prototype.follow = function (player, dt) {
    if (!player) return;
    var C = global.WWNConfig || {};
    var maxSp = C.MAX_SPEED || 420;
    var speedRatio = Math.min(1, (player.speed || 0) / maxSp);
    var look = (C.CAM_LOOKAHEAD || 110) * (0.35 + speedRatio * 0.75);
    var ang = player.angle || 0;
    var tx = player.x + Math.cos(ang) * look;
    var ty = player.y + Math.sin(ang) * look;
    var k = 1 - Math.exp(-(C.CAM_SMOOTH || 9.5) * dt);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
    this.targetZoom = player.boosting ? 0.9 : 1;
    this.zoom += (this.targetZoom - this.zoom) * (1 - Math.exp(-6 * dt));
    if (player.boosting) this.shake = Math.min(4.5, this.shake + 14 * dt);
    else this.shake = Math.max(0, this.shake - 20 * dt);
  };
  Camera.prototype.sx = function (x) {
    return (x - this.x) * (this.zoom || 1) + this.w * 0.5;
  };
  Camera.prototype.sy = function (y) {
    return (y - this.y) * (this.zoom || 1) + this.h * 0.5;
  };
  Camera.prototype.worldToScreen = function (x, y) {
    return { x: this.sx(x), y: this.sy(y) };
  };
  Camera.prototype.applyShake = function (ctx) {
    if (this.shake > 0.08) {
      var s = this.shake;
      ctx.translate((Math.random() - 0.5) * s * 2, (Math.random() - 0.5) * s * 2);
    }
  };
  global.WWNCamera = Camera;
})(typeof window !== "undefined" ? window : globalThis);
