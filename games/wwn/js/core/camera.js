(function (global) {
  "use strict";
  function Camera() {
    this.x = 0; this.y = 0; this.w = 800; this.h = 600;
    this.shake = 0; this.zoom = 1; this.targetZoom = 1;
  }
  Camera.prototype.resize = function (w, h) { this.w = w; this.h = h; };
  Camera.prototype.follow = function (player, dt) {
    var C = global.WWNConfig;
    var lookX = Math.cos(player.angle) * C.CAM_LOOKAHEAD * (player.speed / C.MAX_SPEED);
    var lookY = Math.sin(player.angle) * C.CAM_LOOKAHEAD * (player.speed / C.MAX_SPEED);
    var tx = player.x + lookX, ty = player.y + lookY;
    var k = 1 - Math.exp(-C.CAM_SMOOTH * dt);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
    this.targetZoom = player.boosting ? 0.92 : 1;
    this.zoom += (this.targetZoom - this.zoom) * (1 - Math.exp(-6 * dt));
    if (player.boosting) this.shake = Math.min(4, this.shake + 12 * dt);
    else this.shake = Math.max(0, this.shake - 18 * dt);
  };
  Camera.prototype.applyShake = function (ctx) {
    if (this.shake > 0.1) {
      ctx.translate((Math.random() - 0.5) * this.shake * 2, (Math.random() - 0.5) * this.shake * 2);
    }
  };
  global.WWNCamera = Camera;
})(typeof window !== "undefined" ? window : globalThis);
