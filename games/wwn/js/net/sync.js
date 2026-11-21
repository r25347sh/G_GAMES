(function (global) {
  "use strict";
  function NetSync() {
    this.acc = 0;
    this.remotes = new Map();
    this.localId = null;
    this.onCombatEvent = null;
    this._bound = false;
    this._dataHandler = null;
    this._aiAcc = 0;
    this._allyAcc = 0;
    this.isHost = false;
    this._dmgOut = [];
  }
  NetSync.prototype.setLocalId = function (id) { this.localId = id || null; };
  NetSync.prototype.setHost = function (v) { this.isHost = !!v; };
  NetSync.prototype.getRemotes = function () { return Array.from(this.remotes.values()); };
  NetSync.prototype.queueDamage = function (targetId, dmg, srcId) {
    if (!targetId || !dmg) return;
    this._dmgOut.push({ t: "dmg", id: targetId, d: Math.round(dmg * 10) / 10, s: srcId || this.localId });
  };
  NetSync.prototype.tick = function (dt, player, loadout, combat) {
    if (!global.WWNPeer || !player) return;
    this.acc += dt;
    var hz = (global.WWNConfig && WWNConfig.SYNC_HZ) || 25;
    if (this.acc < 1 / hz) return;
    this.acc = 0;
    var now = performance.now() / 1000;
    var snap = {
      t: "st", id: player.netId || this.localId,
      x: Math.round(player.x * 10) / 10, y: Math.round(player.y * 10) / 10,
      vx: Math.round(player.vx * 10) / 10, vy: Math.round(player.vy * 10) / 10,
      a: Math.round(player.angle * 1000) / 1000, hp: Math.round(player.hp),
      hm: Math.round(player.hpMax || (global.WWNConfig && WWNConfig.HP_MAX) || 560),
      b: player.boosting ? 1 : 0, team: player.team || "NONE",
      st: loadout && loadout.isStealthed && loadout.isStealthed(now) ? 1 : 0,
      u: player.username || "Pilot"
    };
    try { global.WWNPeer.broadcast(snap); } catch (_) {}
    if (combat && combat.flushEvents) {
      var evs = combat.flushEvents();
      for (var i = 0; i < evs.length; i++) {
        try { global.WWNPeer.broadcast({ t: "ce", e: evs[i] }); } catch (_) {}
      }
    }
    if (this._dmgOut.length) {
      for (var di = 0; di < this._dmgOut.length; di++) {
        try { global.WWNPeer.broadcast(this._dmgOut[di]); } catch (_) {}
      }
      this._dmgOut.length = 0;
    }
    this._allyAcc += 1 / hz;
    if (this._allyAcc >= 0.05) { this._allyAcc = 0; this._broadcastAllies(); }
    this._aiAcc += 1 / hz;
    if (this.isHost && this._aiAcc >= 0.18) { this._aiAcc = 0; this._broadcastAi(); }
  };
  NetSync.prototype._broadcastAllies = function () {
    var list = global.__wwnAiList || [];
    if (!list.length || !global.WWNPeer) return;
    var payload = [], lid = this.localId;
    for (var i = 0; i < list.length && payload.length < 12; i++) {
      var b = list[i];
      if (!b || !b.isAlly || !b.alive) continue;
      if (b._remoteAlly) continue;
      if (b.ownerId && lid && b.ownerId !== lid) continue;
      payload.push({
        id: b.netId || b.id,
        x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10,
        vx: Math.round((b.vx || 0) * 10) / 10, vy: Math.round((b.vy || 0) * 10) / 10,
        a: Math.round((b.angle || 0) * 1000) / 1000, hp: Math.round(b.hp || 0),
        hm: Math.round(b.hpMax || 200), team: b.team || "ALLY",
        owner: b.ownerId || lid, role: b.allyType || "striker", alive: 1
      });
    }
    if (!payload.length) return;
    try { global.WWNPeer.broadcast({ t: "ally", bots: payload, owner: lid }); } catch (_) {}
  };
  NetSync.prototype._broadcastAi = function () {
    var list = global.__wwnAiList || [];
    if (!list.length || !global.WWNPeer) return;
    var payload = [];
    for (var i = 0; i < list.length && payload.length < 80; i++) {
      var b = list[i];
      if (!b || b.isAlly) continue;
      payload.push({
        id: b.netId || b.id, g: b.group || "G1",
        x: Math.round(b.x), y: Math.round(b.y),
        a: Math.round((b.angle || 0) * 100) / 100,
        hp: Math.round(b.hp || 0), alive: b.alive ? 1 : 0
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
      else if (msg.t === "dmg") self._onDamage(msg);
      else if (msg.t === "ai" && msg.bots) self._onAi(msg.bots);
      else if (msg.t === "ally" && msg.bots) self._onAlly(msg);
      else if (msg.t === "player-left") self.removePlayer(msg.peerId || msg.id);
      else if (msg.t === "player-list" && msg.players) self._pruneToList(msg.players);
      else if (msg.t === "mapseed" && msg.seed != null) global.__wwnMapSeed = msg.seed;
    };
    global.WWNPeer.on("data", this._dataHandler);
    this._bound = true;
  };
  NetSync.prototype.unbind = function () {
    if (this._bound && global.WWNPeer && global.WWNPeer.off) global.WWNPeer.off("data", this._dataHandler);
    this._dataHandler = null; this._bound = false; this.remotes.clear();
  };
  NetSync.prototype._onState = function (msg) {
    if (!msg.id || msg.id === this.localId) return;
    var now = performance.now() / 1000, rp = this.remotes.get(msg.id);
    if (!rp) { rp = new global.WWNRemotePlayer(msg.id, msg.u || "Pilot"); this.remotes.set(msg.id, rp); }
    rp.applySnapshot({ x: msg.x, y: msg.y, vx: msg.vx, vy: msg.vy, angle: msg.a, hp: msg.hp, hpMax: msg.hm, boosting: !!msg.b, team: msg.team, stealthed: !!msg.st, username: msg.u }, now);
  };
  NetSync.prototype._onCombat = function (ev) { if (this.onCombatEvent) this.onCombatEvent(ev); };
  NetSync.prototype._onDamage = function (msg) {
    if (!msg || !msg.id || !msg.d) return;
    if (msg.id === this.localId && global.__wwnPlayer) {
      var p = global.__wwnPlayer;
      if (p.alive) { p.hp = Math.max(0, (p.hp || 0) - msg.d); p.lastHitBy = msg.s; }
      return;
    }
    var list = global.__wwnAiList || [];
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || !b.alive) continue;
      if ((b.netId || b.id) === msg.id) {
        b.hp = Math.max(0, (b.hp || 0) - msg.d);
        if (b.hp <= 0) b.alive = false;
        return;
      }
    }
    var rp = this.remotes.get(msg.id);
    if (rp) { rp.hp = Math.max(0, (rp.hp || 0) - msg.d); if (rp.hp <= 0) rp.alive = false; }
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
        try { b = new WWNAiPilot(s.id, "normal", 0, s.g || "G1", null); b.isAlly = false; list.push(b); byId[s.id] = b; }
        catch (e) { return; }
      }
      b.x = b.x * 0.3 + s.x * 0.7; b.y = b.y * 0.3 + s.y * 0.7;
      b.angle = s.a; b.hp = s.hp; b.alive = !!s.alive;
    });
  };
  NetSync.prototype._onAlly = function (msg) {
    var bots = msg.bots || [], owner = msg.owner;
    if (owner && owner === this.localId) return;
    var list = global.__wwnAiList;
    if (!list || !global.WWNAiPilot) return;
    var byId = {};
    for (var i = 0; i < list.length; i++) if (list[i]) byId[list[i].netId || list[i].id] = list[i];
    var seen = {};
    bots.forEach(function (s) {
      seen[s.id] = 1;
      var b = byId[s.id];
      if (!b) {
        try {
          b = new WWNAiPilot(s.id, "normal", 0, "ALLY", s.role || "striker");
          b.isAlly = true; b._remoteAlly = true; list.push(b); byId[s.id] = b;
        } catch (e) { return; }
      }
      if (b.ownerId && global.__wwnPlayer && b.ownerId === global.__wwnPlayer.netId && !b._remoteAlly) return;
      b.isAlly = true; b._remoteAlly = true;
      b.ownerId = s.owner || owner; b.team = s.team; b.allyType = s.role || b.allyType;
      b._tx = s.x; b._ty = s.y;
      b._tvx = s.vx || 0; b._tvy = s.vy || 0;
      b._tangle = s.a;
      b._snapT = performance.now() / 1000;
      if (b.x == null || !b._smoothInit) {
        b.x = s.x; b.y = s.y; b.angle = s.a; b._smoothInit = true;
      }
      b.vx = s.vx || 0; b.vy = s.vy || 0;
      b.hp = s.hp; b.hpMax = s.hm || b.hpMax; b.alive = true;
    });
    for (var j = list.length - 1; j >= 0; j--) {
      var bot = list[j];
      if (!bot || !bot._remoteAlly) continue;
      if (owner && bot.ownerId === owner && !seen[bot.netId || bot.id]) list.splice(j, 1);
    }
  };
  NetSync.prototype.removePlayer = function (id) {
    if (!id) return;
    this.remotes.delete(id);
    var list = global.__wwnAiList;
    if (!list) return;
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i] && list[i]._remoteAlly && list[i].ownerId === id) list.splice(i, 1);
    }
  };
  NetSync.prototype._pruneToList = function (players) {
    var keep = {};
    (players || []).forEach(function (p) { if (p && p.peerId) keep[p.peerId] = 1; });
    var self = this;
    Array.from(this.remotes.keys()).forEach(function (id) {
      if (id !== self.localId && !keep[id]) self.removePlayer(id);
    });
  };
  NetSync.prototype.updateRemotes = function (dt) {
    var now = performance.now() / 1000, self = this;
    this.remotes.forEach(function (rp, id) {
      rp.update(dt, now);
      if (rp._lastSnapshot && now - rp._lastSnapshot > 4) self.removePlayer(id);
    });
  };
  global.WWNNetSync = NetSync;
})(typeof window !== "undefined" ? window : globalThis);
