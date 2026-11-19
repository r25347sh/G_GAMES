(function (global) {
  "use strict";
  function patch() {
    if (!global.WWNCombat) return;
    var Proto = global.WWNCombat.prototype;
    if (!Proto.spawnBlackHole) {
      Proto.spawnBlackHole = function (player) {
        this.effects.push({
          type: "blackhole",
          x: player.x + Math.cos(player.angle) * 200,
          y: player.y + Math.sin(player.angle) * 200,
          life: 5, pull: 420, radius: 160, dmg: 8,
          ownerId: player.netId || "local", team: player.team || "NONE",
        });
        this.events.push({
          t: "blackhole",
          x: player.x + Math.cos(player.angle) * 200,
          y: player.y + Math.sin(player.angle) * 200,
          life: 5, ownerId: player.netId || "local", team: player.team || "NONE",
        });
        this.spawnParticle(player.x, player.y, "#9b5de5", 24, 160);
      };
    }
    var origIngest = Proto.ingestRemoteEvent;
    if (origIngest && !Proto._bhPatched) {
      Proto._bhPatched = true;
      Proto.ingestRemoteEvent = function (ev) {
        if (ev && ev.t === "blackhole") {
          this.effects.push({
            type: "blackhole", x: ev.x, y: ev.y, life: ev.life || 5,
            pull: 420, radius: 160, dmg: 8, ownerId: ev.ownerId, team: ev.team,
          });
          return;
        }
        return origIngest.call(this, ev);
      };
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", patch);
  else patch();
  setTimeout(patch, 0);
})(typeof window !== "undefined" ? window : globalThis);
