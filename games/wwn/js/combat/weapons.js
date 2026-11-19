(function (global) {
  "use strict";
  function WeaponLoadout() {
    this.mainIdx = 0; this.subIdx = 0; this.gadgetIdx = 0;
    this.heat = 0; this.energy = 100; this.overheated = false;
    this.ammo = {}; this.cd = {}; this._ammoAcc = {};
    this.stealthUntil = 0; this.chaffUntil = 0; this.empUntil = 0;
    var W = global.WWNWeapons;
    Object.keys(W).forEach(function (id) {
      var w = W[id];
      if (w.ammoMax != null) this.ammo[id] = w.ammoMax;
      this.cd[id] = 0;
    }, this);
  }
  WeaponLoadout.prototype._order = function () {
    return global.WWNWeaponOrder || {
      main: ["vulcan", "laser", "plasma"],
      sub: ["missile", "cluster", "emp"],
      gadget: ["mine", "stealth", "chaff", "decoy"],
    };
  };
  WeaponLoadout.prototype.mainId = function () { return this._order().main[this.mainIdx] || "vulcan"; };
  WeaponLoadout.prototype.subId = function () { return this._order().sub[this.subIdx] || "missile"; };
  WeaponLoadout.prototype.gadgetId = function () { return this._order().gadget[this.gadgetIdx] || "mine"; };
  WeaponLoadout.prototype.cycleMain = function () { var o = this._order().main; this.mainIdx = (this.mainIdx + 1) % o.length; };
  WeaponLoadout.prototype.cycleSub = function () { var o = this._order().sub; this.subIdx = (this.subIdx + 1) % o.length; };
  WeaponLoadout.prototype.cycleGadget = function () { var o = this._order().gadget; this.gadgetIdx = (this.gadgetIdx + 1) % o.length; };
  WeaponLoadout.prototype.update = function (dt) {
    var W = global.WWNWeapons;
    if (this.overheated) {
      this.heat = Math.max(0, this.heat - 40 * dt);
      if (this.heat <= 0) this.overheated = false;
    } else this.heat = Math.max(0, this.heat - (W.vulcan.cool || 22) * dt);
    this.energy = Math.min(100, this.energy + 16 * dt);
    var self = this;
    Object.keys(this.cd).forEach(function (id) {
      if (self.cd[id] > 0) self.cd[id] = Math.max(0, self.cd[id] - dt);
    });
    Object.keys(this.ammo).forEach(function (id) {
      var w = W[id];
      if (!w || w.ammoMax == null) return;
      if (self.ammo[id] < w.ammoMax) {
        self._ammoAcc[id] = (self._ammoAcc[id] || 0) + dt;
        var need = (w.reload || 8) / Math.max(1, w.ammoMax);
        if (self._ammoAcc[id] >= need) {
          self._ammoAcc[id] = 0;
          self.ammo[id]++;
        }
      }
    });
  };
  WeaponLoadout.prototype.refillAmmo = function () {
    var W = global.WWNWeapons, self = this;
    Object.keys(this.ammo).forEach(function (id) {
      if (W[id] && W[id].ammoMax != null) self.ammo[id] = W[id].ammoMax;
    });
    this.energy = 100; this.heat = 0; this.overheated = false;
  };
  WeaponLoadout.prototype.isStealthed = function (now) { return now < this.stealthUntil; };
  WeaponLoadout.prototype.hasChaff = function (now) { return now < this.chaffUntil; };
  WeaponLoadout.prototype.isEmped = function (now) { return now < this.empUntil; };
  global.WWNWeaponLoadout = WeaponLoadout;
})(typeof window !== "undefined" ? window : globalThis);
