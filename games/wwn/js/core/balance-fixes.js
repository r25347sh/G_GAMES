(function () {
  "use strict";
  function patch() {
    if (window.WWNAllyTypes) {
      Object.keys(WWNAllyTypes).forEach(function (k) {
        var r = WWNAllyTypes[k];
        if (!r) return;
        if ((r.damage || 0) > 0.75) r.damage = 0.65;
        if ((r.fireRate || 1) < 0.25) r.fireRate = 0.28;
        r.leash = Math.min(r.leash || 200, 220);
      });
    }
    if (window.WWNAiPilot && WWNAiPilot.prototype && !WWNAiPilot.prototype.__dmgCap) {
      var oUp = WWNAiPilot.prototype.update;
      if (oUp) {
        WWNAiPilot.prototype.update = function (dt, player, combat, now, entities) {
          if (this.isAlly) {
            this.ownerId = this.ownerId || (player && player.netId);
            this.team = (player && player.team) || this.team;
            this.dmgMul = Math.min(this.dmgMul || 0.6, 0.7);
            if (this._target === player) this._target = null;
          } else {
            this.dmgMul = Math.min(this.dmgMul || 0.8, 0.85);
          }
          return oUp.call(this, dt, player, combat, now, entities);
        };
        WWNAiPilot.prototype.__dmgCap = true;
      }
    }
  }
  setInterval(patch, 500);
  ["GUARDIAN", "STRIKER", "PHANTOM", "MEDIC", "VANGUARD"].forEach(function (n) {
    var im = new Image();
    im.src = "DesignSVG/" + n + ".svg";
  });
})();
