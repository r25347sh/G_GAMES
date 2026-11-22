(function (global) {
  "use strict";
  function Camera() {
    this.x = 0; this.y = 0; this.w = 800; this.h = 600;
    this.zoom = 1; this.shake = 0; this.tx = 0; this.ty = 0;
  }
  Camera.prototype.resize = function (w, h) {
    this.w = w; this.h = h;
  };
  Camera.prototype.follow = function (target, dt) {
    if (!target) return;
    var C = global.WWNConfig || {};
    var look = C.CAM_LOOKAHEAD || 110;
    var smooth = C.CAM_SMOOTH || 9.5;
    var lx = target.x + Math.cos(target.angle || 0) * look;
    var ly = target.y + Math.sin(target.angle || 0) * look;
    var k = 1 - Math.exp(-(smooth || 9) * (dt || 0.016));
    this.x += (lx - this.x) * k;
    this.y += (ly - this.y) * k;
  };
  Camera.prototype.update = function (dt, target) {
    if (target) this.follow(target, dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - (dt || 0.016) * 20);
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

  if (Camera && Camera.prototype && Camera.prototype.update && !Camera.prototype.__expose) {
    var _ou = Camera.prototype.update;
    Camera.prototype.update = function () {
      var r = _ou.apply(this, arguments);
      global.__wwnCamera = this;
      return r;
    };
    Camera.prototype.__expose = true;
  }
})(typeof window !== "undefined" ? window : globalThis);
