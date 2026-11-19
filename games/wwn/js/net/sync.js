(function (global) {
  "use strict";
  function NetSync() {
    this.acc = 0;
    this.remotes = new Map();
    this.localId = null;
    this.onCombatEvent = null;
  }
  NetSync.prototype.setLocalId = function (id) { this.localId = id; };
  NetSync.prototype.getRemotes = function () { return Array.from(this.remotes.values()); };
  NetSync.prototype.update = function (dt, player, loadout, combat) {
    this.acc += dt;
    var interval = 1 / (global.WWNConfig.SYNC_HZ || 25);
    if (this.acc < interval) return;
    this.acc = 0;
    if (!global.WWNPeer || !player) return;
    if (!this.localId) this.localId = player.netId || (global.WWNRoom && global.WWNRoom.getState && global.WWNRoom.getState().peerId);
    var now = performance.now() / 1000;
    var snap = {
      t: "st", id: this.localId,
      x: Math.round(player.x * 10) / 10, y: Math.round(player.y * 10) / 10,
      vx: Math.round(player.vx * 10) / 10, vy: Math.round(player.vy * 10) / 10,
      a: Math.round(player.angle * 1000) / 1000, hp: Math.round(player.hp),
      b: player.boosting ? 1 : 0, team: player.team || "NONE",
      st: loadout && loadout.isStealthed(now) ? 1 : 0, u: player.username || "",
    };
    try { global.WWNPeer.broadcast(snap); } catch (_) {}
    if (combat) {
      var evs = combat.flushEvents();
      for (var i = 0; i < evs.length; i++) {
        try { global.WWNPeer.broadcast({ t: "ce", e: evs[i] }); } catch (_) {}
      }
    }
  };
  NetSync.prototype.bind = function () {
    if (!global.WWNPeer) return;
    var self = this;
    global.WWNPeer.on("data", function (raw) {
      var msg; try { msg = typeof raw === "string" ? JSON.parse(raw) : raw; } catch (_) { return; }
      if (!msg || !msg.t) return;
      if (msg.t === "st") self._onState(msg);
      else if (msg.t === "ce" && msg.e) self._onCombat(msg.e);
      else if (msg.t === "respawn") self._onRespawn(msg);
    });
  };
  NetSync.prototype._onState = function (msg) {
    if (!msg.id || msg.id === this.localId) return;
    var now = performance.now() / 1000;
    var rp = this.remotes.get(msg.id);
    if (!rp) { rp = new global.WWNRemotePlayer(msg.id, msg.u || "Pilot"); this.remotes.set(msg.id, rp); }
    rp.applySnapshot({ x: msg.x, y: msg.y, vx: msg.vx, vy: msg.vy, angle: msg.a, hp: msg.hp, boosting: !!msg.b, team: msg.team, stealthed: !!msg.st, username: msg.u }, now);
  };
  NetSync.prototype._onCombat = function (ev) { if (this.onCombatEvent) this.onCombatEvent(ev); };
  NetSync.prototype._onRespawn = function (msg) {
    if (!msg.id) return;
    var rp = this.remotes.get(msg.id);
    if (rp) { rp.hp = 100; rp.alive = true; rp.x = msg.x || 0; rp.y = msg.y || 0; }
  };
  NetSync.prototype.removePlayer = function (id) { this.remotes.delete(id); };
  NetSync.prototype.updateRemotes = function (dt) {
    var now = performance.now() / 1000;
    this.remotes.forEach(function (rp) { rp.update(dt, now); });
  };
  global.WWNNetSync = NetSync;
})(typeof window !== "undefined" ? window : globalThis);
