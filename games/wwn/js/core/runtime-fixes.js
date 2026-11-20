(function () {
  "use strict";
  var netSync = null, lastRespawn = 0, secretBuffer = "", secretLast = 0;
  var WINGMAN_HASH = "5d86d506f4f54726d14d3ff3621922e97dfe6124ef8d24a140808107af89a3a2";
  function digest(text) {
    if (!window.crypto || !crypto.subtle || !window.TextEncoder) return Promise.resolve("");
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    });
  }
  // The final key is intercepted before the legacy phrase listener so this unlock is hash-verified.
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || !e.key || e.key.length !== 1 || !/[a-z0-9]/i.test(e.key)) return;
    if (window.WWNTerminal && WWNTerminal.isOpen && WWNTerminal.isOpen()) return;
    var now = performance.now();
    if (now - secretLast > 3500) secretBuffer = "";
    secretLast = now; secretBuffer = (secretBuffer + e.key.toLowerCase()).slice(-16);
    if (secretBuffer.slice(-7) !== "wingman") return;
    secretBuffer = "";
    e.preventDefault(); e.stopPropagation();
    digest("wingman").then(function (hash) {
      if (hash === WINGMAN_HASH && window.WWNSecret) {
        WWNSecret.unlock("wingman");
        if (window.WWNGame && WWNGame.isActive && WWNGame.isActive()) {
          var feed = document.getElementById("kill-feed");
          if (feed) { var line = document.createElement("div"); line.textContent = "解放: 旧式僚機"; feed.appendChild(line); setTimeout(function () { if (line.parentNode) line.parentNode.removeChild(line); }, 3200); }
        }
      }
    }).catch(function () {});
  }, true);

  function installAiTuning() {
    var Original = window.WWNAiPilot;
    if (!Original || Original.__wwnTuned) return;
    function TunedAi() {
      Original.apply(this, arguments);
      if (this.isAlly) return;
      this.hp = this.hpMax = window.WWNConfig.HP_MAX;
      this.openWeak = false;
      var d = this.difficulty || "normal";
      this.dmgMul = d === "hard" ? 1.15 : (d === "easy" ? 0.72 : 0.95);
      this.speedMul = d === "hard" ? 0.92 : (d === "easy" ? 0.72 : 0.82);
      this.fireRate = d === "hard" ? 0.29 : (d === "easy" ? 0.48 : 0.36);
      this._respawnTimer = 0;
    }
    TunedAi.prototype = Original.prototype;
    for (var k in Original) if (Object.prototype.hasOwnProperty.call(Original, k)) TunedAi[k] = Original[k];
    var update = Original.prototype.update;
    TunedAi.prototype.update = function (dt, player, combat, now, entities) {
      if (!this.isAlly) {
        if (this.alive && this.hp <= 0) { this.alive = false; this._respawnTimer = window.WWNConfig.RESPAWN_SEC; }
        if (!this.alive) {
          this._respawnTimer = Math.max(0, (this._respawnTimer || window.WWNConfig.RESPAWN_SEC) - dt);
          if (this._respawnTimer > 0) return;
          this.alive = true; this.hp = this.hpMax = window.WWNConfig.HP_MAX;
          var a = Math.random() * Math.PI * 2, d = 500 + Math.random() * 900;
          this.x = (player ? player.x : 0) + Math.cos(a) * d;
          this.y = (player ? player.y : 0) + Math.sin(a) * d;
          this.vx = 0; this.vy = 0; this.angle = a + Math.PI;
          this.fireCd = 0.25; this._respawnTimer = 0;
        }
      }
      var before = combat && combat.projectiles ? combat.projectiles.live.length : 0;
      update.call(this, dt, player, combat, now, entities);
      if (this.isAlly && combat && combat.projectiles) {
        for (var i = before; i < combat.projectiles.live.length; i++) {
          var p = combat.projectiles.live[i];
          if (p && p.ownerId === this.netId) p.dmg *= 3;
        }
      } else if (!this.isAlly && this.hp <= 0) {
        this.alive = false; this._respawnTimer = window.WWNConfig.RESPAWN_SEC;
      }
    };
    TunedAi.__wwnTuned = true;
    window.WWNAiPilot = TunedAi;
  }

  function configureSession() {
    var room = window.WWNRoom && WWNRoom.getState && WWNRoom.getState();
    if (!room || !window.WWNPeer || !window.WWNNetSync || !window.__wwnPlayer) return false;
    var p = window.__wwnPlayer;
    p.netId = room.peerId; p.username = room.username; p.team = room.team || "NONE";
    if (netSync) netSync.unbind();
    netSync = new window.WWNNetSync();
    netSync.setLocalId(room.peerId); netSync.bind();
    netSync.onCombatEvent = function (ev) {
      if (window.__wwnCombat && window.__wwnCombat.ingestRemoteEvent) window.__wwnCombat.ingestRemoteEvent(ev);
    };
    window.__wwnNetSync = netSync;
    return true;
  }
  function frame() {
    if (window.WWNGame && WWNGame.isActive && WWNGame.isActive()) {
      if (window.WWNRoom && WWNRoom.getState && WWNRoom.getState()) {
        if (!netSync || !window.__wwnNetSync) configureSession();
        if (netSync && window.__wwnPlayer) {
          var p = window.__wwnPlayer;
          if (!p.alive && p.respawnTimer <= 0 && p.tryRespawn && p.tryRespawn()) {
            p.hp = WWNConfig.HP_MAX;
            if (window.__wwnLoadout && __wwnLoadout.refillAmmo) __wwnLoadout.refillAmmo();
            WWNPeer.broadcast({ t: "respawn", id: p.netId, x: p.x, y: p.y });
          }
          netSync.update(1 / 60, p, window.__wwnLoadout, window.__wwnCombat);
          netSync.updateRemotes(1 / 60);
          window.__wwnRemotes = netSync.getRemotes();
        }
      }
      var canvas = document.getElementById("game-canvas"), cam = window.__wwnCamera;
      if (canvas && cam && window.WWNRemotePlayer) requestAnimationFrame(function () {
        if (!WWNGame.isActive || !WWNGame.isActive()) return;
        var ctx = canvas.getContext("2d");
        (window.__wwnRemotes || []).forEach(function (r) { if (r.draw) r.draw(ctx, cam, window.__wwnPlayer && window.__wwnPlayer.team); });
      });
    } else if (netSync) {
      netSync.unbind(); netSync = null; window.__wwnNetSync = null;
    }
    requestAnimationFrame(frame);
  }

  function installMinimapBridge() {
    if (!window.WWNMinimap || WWNMinimap.__wwnRemotes) return;
    var draw = WWNMinimap.draw;
    WWNMinimap.draw = function (canvas, player, bots, remotes, world, combat, team) {
      var merged = (remotes || []).slice();
      (window.__wwnRemotes || []).forEach(function (r) {
        if (!merged.some(function (x) { return x.netId === r.netId; })) merged.push(r);
      });
      return draw(canvas, player, bots, merged, world, combat || window.__wwnCombat, team || (player && player.team));
    };
    WWNMinimap.__wwnRemotes = true;
  }
  function installGameBridge() {
    if (!window.WWNGame || WWNGame.__wwnWrapped) return;
    var start = WWNGame.start;
    WWNGame.start = function (options) {
      options = options || {};
      var room = window.WWNRoom && WWNRoom.getState && WWNRoom.getState();
      if (room && options.mode === "online") {
        options.netId = room.peerId; options.team = room.team || "NONE";
      }
      var result = start.call(WWNGame, options);
      if (room && window.WWNRoom.ensureMesh) WWNRoom.ensureMesh();
      return result;
    };
    WWNGame.__wwnWrapped = true;
  }
  installAiTuning(); installMinimapBridge(); installGameBridge();
  setInterval(function () { installAiTuning(); installMinimapBridge(); installGameBridge(); }, 250);
  requestAnimationFrame(frame);
})();
