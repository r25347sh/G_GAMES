(function (global) {
  "use strict";
  function Pool(factory, reset, max) {
    this.factory = factory;
    this.reset = reset;
    this.max = max || 64;
    this.free = [];
    this.live = [];
  }
  Pool.prototype.acquire = function () {
    var o = this.free.length ? this.free.pop() : this.factory();
    this.live.push(o);
    return o;
  };
  Pool.prototype.release = function (o) {
    var i = this.live.indexOf(o);
    if (i >= 0) this.live.splice(i, 1);
    if (this.reset) this.reset(o);
    if (this.free.length < this.max) this.free.push(o);
  };
  Pool.prototype.releaseDead = function (isDead) {
    for (var i = this.live.length - 1; i >= 0; i--) {
      if (isDead(this.live[i])) {
        var o = this.live[i];
        this.live.splice(i, 1);
        if (this.reset) this.reset(o);
        if (this.free.length < this.max) this.free.push(o);
      }
    }
  };
  Pool.prototype.forEach = function (fn) {
    for (var i = 0; i < this.live.length; i++) fn(this.live[i], i);
  };
  Pool.prototype.clear = function () {
    while (this.live.length) {
      var o = this.live.pop();
      if (this.reset) this.reset(o);
      if (this.free.length < this.max) this.free.push(o);
    }
  };
  global.WWNPool = Pool;
})(typeof window !== "undefined" ? window : globalThis);
