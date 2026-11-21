(function (global) {
  "use strict";
  function NetSync() {
    this.acc = 0; this.remotes = new Map(); this.localId = null;
    this.onCombatEvent = null; this._bound = false; this._dataHandler = null;
    this._aiAcc = 0; this.isHost = false;
  }
  NetSync.prototype.setLocalId = function (id) { this.localId = id || null; };
  NetSync.prototype.setHost = function (v) { this.isHost = !!v; };
  NetSync.prototype.getRemotes = function () { return Array.from(this.remotes.values()); };
  NetSync.prototype.tick = function (dt, player, loadout, combat) {
    if (!global.WWNPeer || !player) return;
    this.acc += dt;
    var hz = (global.WWNConfig && WWNConfig.SYNC_HZ) || 20;
    if (this.acc < 1 / hz) return;
    this.acc = 0;
    var now = performance.now() / 1000;
    var snap = {
      t: "st", id: player.netId || this.localId,
      x: Math.round(player.x * 10) / 10, y: Math.round(player.y * 10) / 10,
      vx: Math.round(player.vx * 10) / 10, vy: Math.round(player.vy * 10) / 10,
      a: Math.round(player.angle * 1000) / 1000, hp: Math.round(player.hp),
      b: player.boosting ? 1 : 0, team: player.team || "NONE",
      st: loadout && loadout.isStealthed(now) ? 1 : 0, u: player.username || "Pilot"
    };
    try { global.WWNPeer.broadcast(snap); } catch (_) {}
    if (combat) {
      var evs = combat.flushEvents();
      for (var i = 0; i < evs.length; i++) {
        try { global.WWNPeer.broadcast({ t: "ce", e: evs[i] }); } catch (_) {}
      }
    }
    this._aiAcc += 1 / hz;
    if (this.isHost && this._aiAcc >= 0.15) {
      this._aiAcc = 0;
      this._broadcastAi();
    }
  };
  NetSync.prototype._broadcastAi = function () {
    var list = global.__wwnAiList || [];
    if (!list.length || !global.WWNPeer) return;
    var payload = [];
    for (var i = 0; i < list.length && payload.length < 80; i++) {
      var b = list[i];
      if (!b || b.isAlly) continue;
      payload.push({
        id: b.netId || b.id, g: b.group || "G1", al: 0,
        x: Math.round(b.x), y: Math.round(b.y), a: Math.round((b.angle || 0) * 100) / 100,
        hp: Math.round(b.hp || 0), alive: b.alive ? 1 : 0, role: ""
      });
    }
    try { global.WWNPeer.broadcast({ t: "ai", bots: payload }); } catch (_) {}
  };
  NetSync.prototype.bind = function () {
    if (!global.WWNPeer || this._bound) return;
    var self = this;
    this._dataHandler = function (raw) {
      var msg; try { msg = typeof raw === "string" ? JSON.parse(raw) : raw; } catch (_) { return; }
      if (!msg) return;
      if (!msg.t && msg.type) msg.t = msg.type;
      if (!msg.t) return;
      if (msg.t === "st") self._onState(msg);
      else if (msg.t === "ce" && msg.e) self._onCombat(msg.e);
      else if (msg.t === "respawn") self._onRespawn(msg);
      else if (msg.t === "ai" && msg.bots) self._onAi(msg.bots);
      else if (msg.t === "player-left") self.removePlayer(msg.peerId || msg.id);
      else if (msg.t === "player-list" && msg.players) self._pruneToList(msg.players);
    };
    global.WWNPeer.on("data", this._dataHandler);
    this._bound = true;
  };
  NetSync.prototype.unbind = function () {
    if (this._bound && global.WWNPeer && global.WWNPeer.off) global.WWNPeer.off("data", this._dataHandler);
    this._dataHandler = null; this._bound = false;
    this.remotes.clear();
  };
  NetSync.prototype._onState = function (msg) {
    if (!msg.id || msg.id === this.localId) return;
    var now = performance.now() / 1000, rp = this.remotes.get(msg.id);
    if (!rp) { rp = new global.WWNRemotePlayer(msg.id, msg.u || "Pilot"); this.remotes.set(msg.id, rp); }
    rp.applySnapshot({ x: msg.x, y: msg.y, vx: msg.vx, vy: msg.vy, angle: msg.a, hp: msg.hp, boosting: !!msg.b, team: msg.team, stealthed: !!msg.st, username: msg.u }, now);
  };
  NetSync.prototype._onCombat = function (ev) { if (this.onCombatEvent) this.onCombatEvent(ev); };
  NetSync.prototype._onRespawn = function (msg) {
    var rp = msg.id && this.remotes.get(msg.id);
    if (rp) {
      rp.hp = (global.WWNConfig && WWNConfig.HP_MAX) || 320;
      rp.alive = true; rp.x = msg.x || 0; rp.y = msg.y || 0;
      rp._renderX = rp.x; rp._renderY = rp.y;
    }
  };
  NetSync.prototype._onAi = function (bots) {
    if (this.isHost) return;
    var list = global.__wwnAiList;
    if (!list || !global.WWNAiPilot) return;
    var byId = {};
    for (var i = 0; i < list.length; i++) if (list[i]) byId[list[i].netId || list[i].id] = list[i];
    bots.forEach(function (s) {
      var b = byId[s.id];
      if (b && b.isAlly) return;
      if (!b) {
        try {
          b = new WWNAiPilot(s.id, "normal", 0, s.g || "G1", null);
          b.isAlly = false; list.push(b); byId[s.id] = b;
        } catch (e) { return; }
      }
      b.x = b.x * 0.35 + s.x * 0.65; b.y = b.y * 0.35 + s.y * 0.65;
      b.angle = s.a; b.hp = s.hp; b.alive = !!s.alive;
    });
  };
  NetSync.prototype.removePlayer = function (id) {
    if (id) this.remotes.delete(id);
  };
  NetSync.prototype._pruneToList = function (players) {
    var keep = {};
    (players || []).forEach(function (p) { if (p && p.peerId) keep[p.peerId] = 1; });
    var self = this;
    Array.from(this.remotes.keys()).forEach(function (id) {
      if (id !== self.localId && !keep[id]) self.remotes.delete(id);
    });
  };
  NetSync.prototype.updateRemotes = function (dt) {
    var now = performance.now() / 1000;
    var self = this;
    this.remotes.forEach(function (rp, id) {
      rp.update(dt, now);
      if (rp._lastSnapshot && now - rp._lastSnapshot > 4) self.remotes.delete(id);
    });
  };
  global.WWNNetSync = NetSync;
})(typeof window !== "undefined" ? window : globalThis);
