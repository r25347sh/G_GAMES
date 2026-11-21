(function () {
  "use strict";
  function patchHazards() {
    if (!window.WWNMapHazards || WWNMapHazards.__hpPatched) return;
    var Proto = WWNMapHazards.prototype;
    if (!Proto || !Proto.update) return;
    var orig = Proto.update;
    Proto.update = function (dt, player, combat, scoreApi) {
      var C = window.WWNConfig || {};
      var maxHp = C.HP_MAX || 320;
      orig.call(this, dt, player, combat, scoreApi);
      if (player && player.hp > maxHp) player.hp = maxHp;
      if (this.pickups && player && player.alive) {
        for (var i = this.pickups.length - 1; i >= 0; i--) {
          var pu = this.pickups[i];
          if (!pu || pu.__got) continue;
          if (Math.hypot(player.x - pu.x, player.y - pu.y) < 28) {
            pu.__got = true;
            if (pu.kind === "hp") player.hp = Math.min(maxHp, player.hp + 48);
            if (pu.kind === "boost") player.boost = Math.min(100, (player.boost || 0) + 45);
            if (pu.kind === "ammo" && scoreApi && scoreApi.refillAmmo) scoreApi.refillAmmo();
            if (pu.kind === "score" && scoreApi && scoreApi.add) scoreApi.add(40, "pickup");
            this.pickups.splice(i, 1);
          }
        }
      }
    };
    WWNMapHazards.__hpPatched = true;
  }
  function patchStart() {
    if (!window.WWNGame || !WWNGame.start || WWNGame.__p2pPatched) return;
    var origStart = WWNGame.start.bind(WWNGame);
    WWNGame.start = function (opts) {
      var r = origStart(opts);
      setTimeout(function () {
        var net = window.__wwnNetSync;
        var player = window.__wwnPlayer;
        var combat = window.__wwnCombat;
        if (!net && window.WWNNetSync) {
          try {
            net = new WWNNetSync();
            window.__wwnNetSync = net;
          } catch (e) {}
        }
        if (net && player) {
          try {
            net.setLocalId(player.netId);
            net.bind();
            net.onCombatEvent = function (ev) {
              try { if (combat && combat.ingestRemoteEvent) combat.ingestRemoteEvent(ev); } catch (e) {}
            };
            if (window.WWNPeer && typeof WWNPeer.isMaster === "function") net.setHost(!!WWNPeer.isMaster());
            else net.setHost(true);
          } catch (e) {}
        }
        patchHazards();
      }, 50);
      return r;
    };
    WWNGame.__p2pPatched = true;
  }
  function frame() {
    requestAnimationFrame(frame);
    try {
      patchStart();
      patchHazards();
      if (!window.WWNGame || !WWNGame.isActive || !WWNGame.isActive()) return;
      var net = window.__wwnNetSync;
      var player = window.__wwnPlayer;
      var combat = window.__wwnCombat;
      var loadout = window.__wwnLoadout;
      var cam = window.__wwnCamera;
      if (net && player) {
        try {
          if (window.WWNPeer && typeof WWNPeer.isMaster === "function") net.setHost(!!WWNPeer.isMaster());
          net.tick(1 / 60, player, loadout, combat);
          net.updateRemotes(1 / 60);
          window.__wwnRemotes = net.getRemotes();
        } catch (e) {}
      }
      if (net && cam) {
        var canvas = document.getElementById("game-canvas");
        if (canvas) {
          var ctx = canvas.getContext("2d");
          var rems = net.getRemotes();
          for (var i = 0; i < rems.length; i++) {
            try { rems[i].draw(ctx, cam, player && player.team); } catch (e) {}
          }
        }
      }
    } catch (e) {}
  }
  requestAnimationFrame(frame);
})();
