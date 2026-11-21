(function () {
  "use strict";
  function patchAiTargeting() {
    if (!window.WWNAiPilot || WWNAiPilot.__ffPatched) return;
    var proto = WWNAiPilot.prototype;
    if (!proto || !proto._pickTarget) return;
    var orig = proto._pickTarget;
    proto._pickTarget = function (player, entities) {
      // ensure owner fields
      if (this.isAlly && player) {
        this.ownerId = this.ownerId || player.netId;
        this.team = this.team || player.team;
        this.leaderId = this.leaderId || player.netId;
      }
      var best = null, bestScore = Infinity, self = this, list = entities || [];
      function isEnemy(e) {
        if (!e || e === self || e.alive === false || (e.hp != null && e.hp <= 0) || e.stealthed) return false;
        if (self.isAlly) {
          if (e === player) return false;
          if (self.ownerId && (e.netId === self.ownerId || e.ownerId === self.ownerId)) return false;
          if (e.team && self.team && e.team === self.team) return false;
          return true; // other humans + their allies + enemy CPUs
        }
        if (e.isAlly) return true;
        if (e === player) return true;
        if (e.group && e.group === self.group) return false;
        if (e.team && e.team === self.team && e.team !== "NONE") return false;
        return true;
      }
      function consider(e) {
        if (!isEnemy(e)) return;
        var d = Math.hypot((e.x || 0) - self.x, (e.y || 0) - self.y);
        if (d > (self.threatR || 1000) * 1.25) return;
        var score = d;
        if (self.isAlly && player) score = Math.hypot((e.x || 0) - player.x, (e.y || 0) - player.y) * 0.65 + d * 0.35;
        if (score < bestScore) { bestScore = score; best = e; }
      }
      if (player) consider(player);
      for (var i = 0; i < list.length; i++) consider(list[i]);
      return best;
    };
    // simplify ally motion: stronger leash after original update via wrapper
    var origUp = proto.update;
    proto.update = function (dt, player, combat, now, entities) {
      if (this.isAlly && player) {
        this.leash = Math.min(this.leash || 200, 200);
        this.ownerId = this.ownerId || player.netId;
        this.team = player.team || this.team;
        // stop attacking owner if somehow targeted
        if (this._target === player) this._target = null;
      }
      origUp.call(this, dt, player, combat, now, entities);
      if (this.isAlly && player && this.alive) {
        var d = Math.hypot(this.x - player.x, this.y - player.y);
        if (d > (this.leash || 200)) {
          var ang = Math.atan2(player.y - this.y, player.x - this.x);
          this.vx += Math.cos(ang) * 400 * dt;
          this.vy += Math.sin(ang) * 400 * dt;
        }
      }
    };
    WWNAiPilot.__ffPatched = true;
  }
  function nerfAllies() {
    if (!window.WWNAllyTypes) return;
    Object.keys(WWNAllyTypes).forEach(function (k) {
      var r = WWNAllyTypes[k];
      if (!r || r.__nerfed2) return;
      r.damage = Math.min(r.damage || 0.7, 0.7);
      r.leash = Math.min(r.leash || 200, 200);
      r.__nerfed2 = true;
    });
  }
  setInterval(function () { patchAiTargeting(); nerfAllies(); }, 400);
})();
