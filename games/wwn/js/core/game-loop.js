(function (global) {
  "use strict";
  function GameLoop(update, render) {
    this.update = update;
    this.render = render;
    this.running = false;
    this._raf = 0;
    this._last = 0;
    this.fps = 0;
    this._frames = 0;
    this._fpsT = 0;
  }
  GameLoop.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    var self = this;
    function frame(now) {
      if (!self.running) return;
      var dt = (now - self._last) / 1000;
      self._last = now;
      if (dt > 0.05) dt = 0.05;
      self.update(dt);
      self.render();
      self._frames++;
      self._fpsT += dt;
      if (self._fpsT >= 0.5) {
        self.fps = Math.round(self._frames / self._fpsT);
        self._frames = 0;
        self._fpsT = 0;
      }
      self._raf = requestAnimationFrame(frame);
    }
    this._raf = requestAnimationFrame(frame);
  };
  GameLoop.prototype.stop = function () {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  };
  global.WWNGameLoop = GameLoop;
})(typeof window !== "undefined" ? window : globalThis);
