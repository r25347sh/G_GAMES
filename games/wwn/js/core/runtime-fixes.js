(function () {
  "use strict";
  var netSync = null, secretBuffer = "", secretLast = 0;
  var WINGMAN_HASH = "5d86d506f4f54726d14d3ff3621922e97dfe6124ef8d24a140808107af89a3a2";
  function digest(text) {
    if (!window.crypto || !crypto.subtle || !window.TextEncoder) return Promise.resolve("");
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    });
  }
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
          if (feed) { var line = document.createElement("div"); line.textContent = "解放: 5機小隊"; feed.appendChild(line); setTimeout(function () { if (line.parentNode) line.parentNode.removeChild(line); }, 3200); }
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
      var d = this.difficulty || "normal";
      if (d === "easy") {
        this.dmgMul = Math.min(this.dmgMul || 0.35, 0.38);
        this.speedMul = Math.min(this.speedMul || 0.65, 0.68);
      }
      this._respawnTimer = 0;
    }
    TunedAi.prototype = Original.prototype;
    for (var k in Original) if (Object.prototype.hasOwnProperty.call(Original, k)) TunedAi[k] = Original[k];
    TunedAi.__wwnTuned = true;
    window.WWNAiPilot = TunedAi;
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
      // Cap solo filler after start by trimming excess bots
      var result = start.call(WWNGame, options);
      try {
        var list = window.__wwnAiList;
        if (list && list.length > 28 && options.mode !== "over") {
          while (list.length > 21) {
            var b = list.pop();
            if (b && b.isAlly) list.unshift(b);
          }
        }
      } catch (e) {}
      if (room && window.WWNRoom.ensureMesh) WWNRoom.ensureMesh();
      return result;
    };
    WWNGame.__wwnWrapped = true;
  }
  function installAllyDefaultFive() {
    if (!window.WWNSecret || WWNSecret.__ally5) return;
    var orig = WWNSecret.applyEffect.bind(WWNSecret);
    WWNSecret.applyEffect = function (id, player, combat, api) {
      api = Object.assign({}, api || {});
      if (id === "wingman") {
        var roles = window.WWNAllyRoleOrder || ["guardian", "striker", "phantom", "medic", "vanguard"];
        api.spawnAlly = function () {
          var list = window.__wwnAiList || [];
          if (!player || !window.WWNAiPilot) return;
          for (var i = 0; i < 5; i++) {
            try {
              var bot = new WWNAiPilot("ally-" + roles[i] + "-" + i, "normal", i, "ALLY", roles[i]);
              bot.isAlly = true; bot.group = "ALLY"; bot.team = player.team || "BLUE"; bot.roleIndex = i;
              bot.leaderId = player.netId;
              var a = player.angle + Math.PI + (i - 2) * 0.45, d = 95 + i * 18;
              bot.x = player.x + Math.cos(a) * d; bot.y = player.y + Math.sin(a) * d; bot.angle = player.angle;
              list.push(bot);
            } catch (e) {}
          }
        };
      }
      return orig(id, player, combat, api);
    };
    WWNSecret.__ally5 = true;
  }
  installAiTuning(); installMinimapBridge(); installGameBridge(); installAllyDefaultFive();
  setInterval(function () {
    installAiTuning(); installMinimapBridge(); installGameBridge(); installAllyDefaultFive();
  }, 400);
})();
