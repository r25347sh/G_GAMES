(function () {
  "use strict";
  function patchPick() {
    if (!window.WWNAiPilot || !WWNAiPilot.prototype || WWNAiPilot.prototype.__hiveTargetFix) return;
    var orig = WWNAiPilot.prototype._pickTarget;
    if (!orig) return;
    WWNAiPilot.prototype._pickTarget = function (player, entities) {
      var self = this;
      var list = entities || [];
      // stick less if player is near
      if (this._target && this._target.alive !== false && (this._target.hp || 0) > 0) {
        var keep = false;
        if (this._target === player) keep = true;
        for (var i = 0; i < list.length && !keep; i++) if (list[i] === this._target) keep = true;
        if (keep) {
          var d0 = Math.hypot(this.x - this._target.x, this.y - this._target.y);
          if (d0 < (this.attackRange || 500) * 1.4) {
            if (!this.isAlly && player && player.alive && this._target !== player) {
              var pd = Math.hypot(this.x - player.x, this.y - player.y);
              if (pd < (this.threatR || 900) * 0.7 && pd < d0 * 1.15) {
                /* re-evaluate */
              } else {
                return this._target;
              }
            } else {
              return this._target;
            }
          }
        }
      }
      var best = null, bestScore = Infinity;
      function isEnemy(e) {
        if (!e || e === self || e.alive === false || (e.hp != null && e.hp <= 0) || e.stealthed) return false;
        if (self.isAlly) {
          if (e === player) return false;
          if (e.isAlly || e.group === "ALLY") return false;
          if (self.ownerId && (e.netId === self.ownerId || e.ownerId === self.ownerId)) return false;
          if (e.ownerId && player && e.ownerId === player.netId) return false;
          if (e.team && self.team && e.team === self.team) return false;
          if (e.team && player && e.team === player.team && e.team !== "NONE") return false;
          return true;
        }
        if (e.isAlly || e.group === "ALLY") return true;
        if (e === player) return true;
        if (e.group && e.group === self.group) return false;
        if (e.team && e.team === self.team && e.team !== "NONE") return false;
        return true;
      }
      function consider(e) {
        if (!isEnemy(e)) return;
        var d = Math.hypot(self.x - e.x, self.y - e.y);
        if (d > (self.threatR || 900) * 1.25) return;
        var score = d;
        if (self.isAlly && player) {
          score = Math.hypot(player.x - e.x, player.y - e.y) * 0.65 + d * 0.35;
        } else if (e === player) {
          score = d * 0.42;
          if (self.lastHitBy && player && self.lastHitBy === player.netId) score *= 0.5;
        } else {
          score = d * 1.08;
          if (player && player.alive) {
            var pd2 = Math.hypot(self.x - player.x, self.y - player.y);
            if (pd2 < (self.threatR || 900) * 0.85) score += 200;
          }
        }
        if (score < bestScore) { bestScore = score; best = e; }
      }
      if (player) consider(player);
      for (var j = 0; j < list.length; j++) consider(list[j]);
      return best;
    };
    WWNAiPilot.prototype.__hiveTargetFix = true;
  }
  function reinforce() {
    if (!window.WWNGame || !WWNGame.isActive || !WWNGame.isActive()) return;
    var list = window.__wwnAiList;
    var player = window.__wwnPlayer;
    if (!list || !window.WWNAiPilot) return;
    var aliveEnemy = 0;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b && b.alive && !b.isAlly && !b._remoteAlly) aliveEnemy++;
      // ensure hive converts stay allied for squad targeting
      if (b && b.isAlly) {
        b.group = "ALLY";
        if (player) {
          b.ownerId = b.ownerId || player.netId;
          b.team = b.team || player.team;
        }
      }
      // local respawn failsafe for dead non-remote
      if (b && !b._remoteAlly && !b.alive) {
        b.respawnTimer = (b.respawnTimer || 0) - 0.2;
        if (b.respawnTimer <= 0) {
          b.alive = true;
          b.hp = b.hpMax || 200;
          b._target = null;
          if (player) {
            var a = Math.random() * Math.PI * 2, r = 700 + Math.random() * 900;
            b.x = player.x + Math.cos(a) * r;
            b.y = player.y + Math.sin(a) * r;
          }
        }
      }
    }
    var minE = 45;
    if (aliveEnemy < minE && list.length < 85) {
      try {
        var groups = ["G1","G2","G3","G4","G5","G6","G7"];
        var nb = new WWNAiPilot("cpu-rf-" + Date.now() + "-" + list.length, "easy", list.length, groups[list.length % 7]);
        nb.hp *= 0.75; nb.hpMax *= 0.75;
        if (player) {
          var ar = Math.random() * Math.PI * 2, rr = 900 + Math.random() * 1400;
          nb.x = player.x + Math.cos(ar) * rr; nb.y = player.y + Math.sin(ar) * rr;
        }
        list.push(nb);
      } catch (e) {}
    }
  }
  setInterval(function () { patchPick(); reinforce(); }, 200);
})();
