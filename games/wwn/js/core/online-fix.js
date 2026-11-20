(function () {
  "use strict";
  var supports = null;
  var lastT = performance.now();
  function ensureSupports() {
    if (!supports && window.WWNSupportSystem) supports = new WWNSupportSystem();
    return supports;
  }
  function buildApi(player, combat, api) {
    api = api || {};
    var s = ensureSupports();
    var enemies = function () {
      return ((window.__wwnAiList) || []).concat((window.__wwnRemotes) || []);
    };
    var bridge = {
      spawnDrones: function (n) { if (s) s.spawnDrones(player, n); },
      spawnTurret: function () { if (s) s.spawnTurret(player); },
      spawnLeech: function () { if (s) s.spawnLeech(player, enemies()); },
      spawnShield: function (sec) { if (s) s.spawnShield(player, sec); },
      spawnTether: function () { if (s) s.spawnTether(player, enemies()); },
      hiveConvert: function () { if (s) s.hiveConvert(player, enemies()); },
      spawnRepairBot: function () { if (s) s.spawnRepairBot(player); },
      spawnKamikaze: function () { if (s) s.spawnKamikaze(player, enemies()); },
      spawnSatellite: function () { if (s) s.spawnSatellite(player); },
      spawnMineRing: function () { if (s) s.spawnMineRing(player); },
      spawnClone: function () { if (s) s.spawnClone(player); },
      spawnDome: function (sec) { if (s) s.spawnDome(player, sec); },
      spawnFreezer: function () { if (s) s.spawnFreezer(player); },
      spawnBattery: function () { if (s) s.spawnBattery(player); },
      globalChaff: function (sec) { player.chaffUntil = performance.now() / 1000 + (sec || 4); },
      damageRay: function (x, y, ang, range, dmg, width) {
        enemies().forEach(function (t) {
          if (!t || !t.alive || t.isAlly) return;
          var x2 = x + Math.cos(ang) * range, y2 = y + Math.sin(ang) * range;
          var dx = x2 - x, dy = y2 - y, len2 = dx * dx + dy * dy || 1;
          var tpar = Math.max(0, Math.min(1, ((t.x - x) * dx + (t.y - y) * dy) / len2));
          var px = x + dx * tpar, py = y + dy * tpar;
          if (Math.hypot(t.x - px, t.y - py) < (width || 24) + (t.radius || 18))
            t.hp = Math.max(0, t.hp - dmg);
        });
      },
      novaDamage: function (pl, aoe, dmg) {
        enemies().forEach(function (t) {
          if (!t || !t.alive || t.isAlly) return;
          var d = Math.hypot(t.x - pl.x, t.y - pl.y);
          if (d < aoe) t.hp = Math.max(0, t.hp - dmg * (1 - d / aoe * 0.5));
        });
      },
      getEnemies: function () { return enemies().filter(function (e) { return e && e.alive && !e.isAlly; }); },
    };
    for (var k in bridge) if (api[k] == null) api[k] = bridge[k];
    return api;
  }

  function install() {
    if (!window.WWNSecret || WWNSecret.__bridged) return;
    var orig = WWNSecret.applyEffect.bind(WWNSecret);
    WWNSecret.applyEffect = function (id, player, combat, api) {
      window.__wwnPlayer = player;
      window.__wwnCombat = combat;
      api = buildApi(player, combat, api || {});
      return orig(id, player, combat, api);
    };
    WWNSecret.__bridged = true;
  }

  // Support tick + draw overlay
  function tick() {
    install();
    var now = performance.now();
    var dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    var player = window.__wwnPlayer;
    var combat = window.__wwnCombat;
    if (player && window.WWNGame && WWNGame.isActive && WWNGame.isActive()) {
      var s = ensureSupports();
      var enemies = ((window.__wwnAiList) || []).concat((window.__wwnRemotes) || []);
      if (s) {
        try { s.update(dt, player, combat, enemies); } catch (e) {}
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Try draw on canvas after game draws — light overlay each frame
  setInterval(function () {
    install();
    var player = window.__wwnPlayer;
    var s = ensureSupports();
    if (!player || !s || !window.WWNGame || !WWNGame.isActive || !WWNGame.isActive()) return;
    var canvas = document.getElementById("game-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    // approximate camera as player center
    var cam = { x: player.x, y: player.y, w: window.innerWidth, h: window.innerHeight };
    try { s.draw(ctx, cam, player); } catch (e) {}
  }, 50);

  window.WWNSupportBridge = {
    get: ensureSupports,
    apiFor: function (player, combat) { return buildApi(player, combat, {}); },
    update: function (dt, player, combat, enemies) {
      var s = ensureSupports();
      if (s) s.update(dt, player, combat, enemies);
    },
    draw: function (ctx, cam, player) {
      var s = ensureSupports();
      if (s) s.draw(ctx, cam, player);
    },
  };
})();
