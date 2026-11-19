(function () {
  "use strict";
  var styleCounter = 0;

  function patchAi() {
    if (!window.WWNAiPilot || WWNAiPilot.__styled) return;
    var Orig = WWNAiPilot;
    function Wrapped(id, difficulty, styleIndex) {
      if (styleIndex == null) styleIndex = styleCounter++;
      Orig.call(this, id, difficulty, styleIndex);
    }
    Wrapped.prototype = Orig.prototype;
    Wrapped.__styled = true;
    window.WWNAiPilot = Wrapped;
  }

  function patchDecoy() {
    if (!window.WWNCombat || !WWNCombat.prototype || WWNCombat.prototype.__decoyPatched) return;
    WWNCombat.prototype._spawnDecoy = function (player, w) {
      var d = this.decoys.acquire();
      d.alive = true;
      d.id = "decoy-" + (player.netId || "local") + "-" + Math.floor(Math.random() * 1e6);
      d.x = player.x - Math.cos(player.angle) * 30;
      d.y = player.y - Math.sin(player.angle) * 30;
      var side = Math.random() < 0.5 ? 1 : -1;
      d.angle = player.angle + side * (0.4 + Math.random() * 0.5);
      var spd = (w.speed || 180) * (0.85 + Math.random() * 0.4);
      d.vx = Math.cos(d.angle) * spd + (player.vx || 0) * 0.5;
      d.vy = Math.sin(d.angle) * spd + (player.vy || 0) * 0.5;
      d.life = w.duration;
      d.hp = 35;
      d.ownerId = player.netId || "local";
      d.team = player.team || "NONE";
      d.radius = w.radius || 16;
      d.turn = (Math.random() - 0.5) * 1.2;
      this.events.push({
        t: "decoy", id: d.id, x: d.x, y: d.y, vx: d.vx, vy: d.vy, angle: d.angle,
        life: d.life, ownerId: d.ownerId, team: d.team, radius: d.radius, hp: d.hp,
      });
      this.spawnParticle(d.x, d.y, "#ffb347", 14, 100);
      return d;
    };
    WWNCombat.prototype.__decoyPatched = true;
  }

  function patchOpenAutoSortie() {
    var btn = document.getElementById("btn-open");
    if (!btn || btn.__patched) return;
    btn.__patched = true;
    btn.addEventListener("click", function () {
      setTimeout(function () {
        try {
          if (window.WWNRoom && WWNRoom.getState && WWNRoom.getState() && WWNRoom.getState().peerId) {
            if (WWNRoom.ensureMesh) WWNRoom.ensureMesh();
            if (window.WWNGame && !WWNGame.isActive()) {
              WWNGame.start({ mode: "online" });
            }
          }
        } catch (e) { console.warn(e); }
      }, 800);
    }, true);
  }

  function meshKeepalive() {
    try {
      if (window.WWNGame && WWNGame.isActive && WWNGame.isActive() &&
          window.WWNRoom && WWNRoom.ensureMesh) {
        WWNRoom.ensureMesh();
      }
    } catch (_) {}
  }

  function boot() {
    patchAi();
    patchDecoy();
    patchOpenAutoSortie();
    setInterval(meshKeepalive, 3000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () {
    setTimeout(boot, 50);
  });
  else setTimeout(boot, 50);
})();
