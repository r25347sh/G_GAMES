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
    this.w = w;
    this.h = h;
  };
  Camera.prototype.snap = function (x, y) {
    this.x = x || 0;
    this.y = y || 0;
  };
  Camera.prototype.follow = function (player, dt) {
    if (!player) return;
    var C = global.WWNConfig;
    var speedRatio = Math.min(1, (player.speed || 0) / (C.MAX_SPEED || 400));
    var look = (C.CAM_LOOKAHEAD || 110) * (0.35 + speedRatio * 0.75);
    var lookX = Math.cos(player.angle || 0) * look;
    var lookY = Math.sin(player.angle || 0) * look;
    var tx = player.x + lookX;
    var ty = player.y + lookY;
    var k = 1 - Math.exp(-(C.CAM_SMOOTH || 9.5) * dt);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
    this.targetZoom = player.boosting ? 0.88 : 1;
    this.zoom += (this.targetZoom - this.zoom) * (1 - Math.exp(-7 * dt));
    if (player.boosting) this.shake = Math.min(5.5, this.shake + 16 * dt);
    else this.shake = Math.max(0, this.shake - 22 * dt);
  };
  Camera.prototype.applyShake = function (ctx) {
    if (this.shake > 0.08) {
      var s = this.shake;
      ctx.translate((Math.random() - 0.5) * s * 2.2, (Math.random() - 0.5) * s * 2.2);
    }
  };
  global.WWNCamera = Camera;
})(typeof window !== "undefined" ? window : globalThis);
