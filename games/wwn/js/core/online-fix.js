(function () {
  "use strict";
  function ensureNetGlobals() {
    if (!window.__wwnNetSync && window.WWNNetSync) {
      try { window.__wwnNetSync = new WWNNetSync(); } catch (e) {}
    }
  }
  function patchHazards() {
    if (!window.WWNMapHazards || WWNMapHazards.__hpPatched) return;
    var Proto = WWNMapHazards.prototype;
    if (!Proto || !Proto.update) return;
    var orig = Proto.update;
    Proto.update = function (dt, player, combat, scoreApi) {
      var maxHp = (window.WWNConfig && WWNConfig.HP_MAX) || 320;
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
      opts = opts || {};
      if (!opts.team || opts.team === "NONE") opts.team = "BLUE";
      var r = origStart(opts);
      setTimeout(function () {
        ensureNetGlobals();
        var net = window.__wwnNetSync;
        var player = window.__wwnPlayer;
        var combat = window.__wwnCombat;
        if (player && (!player.team || player.team === "NONE")) player.team = "BLUE";
        if (net && player) {
          try {
            net.setLocalId(player.netId);
            net.bind();
            net.onCombatEvent = function (ev) {
              try { if (combat && combat.ingestRemoteEvent) combat.ingestRemoteEvent(ev); } catch (e) {}
            };
            if (window.WWNPeer && WWNPeer.isMaster) net.setHost(!!WWNPeer.isMaster());
            else net.setHost(!!(opts && opts.isOwner));
          } catch (e) {}
        }
        patchHazards();
      }, 30);
      return r;
    };
    WWNGame.__p2pPatched = true;
  }
  function frame() {
    requestAnimationFrame(frame);
    try {
      patchStart();
      patchHazards();
      ensureNetGlobals();
      if (!window.WWNGame || !WWNGame.isActive || !WWNGame.isActive()) return;
      var net = window.__wwnNetSync;
      var player = window.__wwnPlayer;
      var combat = window.__wwnCombat;
      var loadout = window.__wwnLoadout;
      var cam = window.__wwnCamera;
      if (player && (!player.team || player.team === "NONE")) player.team = "BLUE";
      if (net && player) {
        try {
          if (window.WWNPeer && WWNPeer.isMaster) net.setHost(!!WWNPeer.isMaster());
          net.tick(1 / 60, player, loadout, combat);
          net.updateRemotes(1 / 60);
          window.__wwnRemotes = net.getRemotes();
        } catch (e) {}
      }
      var list = window.__wwnAiList || [];
      for (var i = 0; i < list.length; i++) {
        var bot = list[i];
        if (!bot) continue;
        if (bot.alive && (bot.hp || 0) <= 0) {
          bot.alive = false;
          bot.respawnTimer = ((window.WWNConfig && WWNConfig.RESPAWN_SEC) || 3.2) * (bot.isAlly ? 0.55 : 1.1);
        }
        if (!bot.alive) {
          bot.respawnTimer = (bot.respawnTimer || 0) - 1 / 60;
          if (bot.respawnTimer <= 0) {
            bot.alive = true;
            bot.hp = bot.hpMax || ((window.WWNConfig && WWNConfig.HP_MAX) || 320) * 0.75;
            var half = ((window.WWNConfig && WWNConfig.WORLD_SIZE) || 9000) * 0.38;
            if (bot.isAlly && player) {
              var ang = Math.random() * Math.PI * 2;
              bot.x = player.x + Math.cos(ang) * 120;
              bot.y = player.y + Math.sin(ang) * 120;
            } else {
              bot.x = (Math.random() - 0.5) * half * 2;
              bot.y = (Math.random() - 0.5) * half * 2;
            }
            bot.vx = 0; bot.vy = 0;
          }
        }
      }
      if (net && cam) {
        var canvas = document.getElementById("game-canvas");
        if (canvas) {
          var ctx = canvas.getContext("2d");
          var rems = net.getRemotes();
          for (var ri = 0; ri < rems.length; ri++) {
            try { rems[ri].draw(ctx, cam, player && player.team); } catch (e) {}
          }
        }
      }
    } catch (e) {}
  }
  requestAnimationFrame(frame);
})();
