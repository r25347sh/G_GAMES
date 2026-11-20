(function () {
  "use strict";
  var supports = null;
  var lastT = performance.now();
  var aiHooked = false;

  function ensureSupports() {
    if (!supports && window.WWNSupportSystem) {
      try { supports = new WWNSupportSystem(); } catch (e) { console.error(e); }
    }
    return supports;
  }

  function hookAi() {
    if (aiHooked || !window.WWNAiPilot) return;
    var Orig = window.WWNAiPilot;
    if (Orig.__wwnHooked) { aiHooked = true; return; }
    function Wrapped() {
      Orig.apply(this, arguments);
      if (!window.__wwnAiList) window.__wwnAiList = [];
      // avoid dupes
      if (window.__wwnAiList.indexOf(this) < 0) window.__wwnAiList.push(this);
    }
    Wrapped.prototype = Orig.prototype;
    Wrapped.__wwnHooked = true;
    // copy static if any
    for (var k in Orig) if (Orig.hasOwnProperty(k)) Wrapped[k] = Orig[k];
    window.WWNAiPilot = Wrapped;
    aiHooked = true;
  }

  function enemies() {
    var list = (window.__wwnAiList || []).concat(window.__wwnRemotes || []);
    // prune dead refs lightly
    return list.filter(function (e) { return e && (e.alive !== false || e.hp > 0); });
  }

  function buildApi(player, combat, api) {
    api = api || {};
    var s = ensureSupports();
    var bridge = {
      spawnAlly: api.spawnAlly || function () {},
      spawnDrones: function (n) { if (s) s.spawnDrones(player, n || 6); },
      spawnTurret: function () { if (s) s.spawnTurret(player); },
      spawnLeech: function () { if (s) s.spawnLeech(player, enemies()); },
      spawnShield: function (sec) { if (s) s.spawnShield(player, sec || 6); },
      spawnTether: function () { if (s) s.spawnTether(player, enemies()); },
      hiveConvert: function () { if (s) s.hiveConvert(player, enemies()); },
      spawnRepairBot: function () { if (s) s.spawnRepairBot(player); },
      spawnKamikaze: function () { if (s) s.spawnKamikaze(player, enemies()); },
      spawnSatellite: function () { if (s) s.spawnSatellite(player); },
      spawnMineRing: function () { if (s) s.spawnMineRing(player); },
      spawnClone: function () { if (s) s.spawnClone(player); },
      spawnDome: function (sec) { if (s) s.spawnDome(player, sec || 7); },
      spawnFreezer: function () { if (s) s.spawnFreezer(player); },
      spawnBattery: function () { if (s) s.spawnBattery(player); },
      refill: function () {
        if (window.__wwnLoadout && window.__wwnLoadout.refillAmmo) window.__wwnLoadout.refillAmmo();
      },
      globalChaff: function (sec) {
        player.chaffUntil = performance.now() / 1000 + (sec || 5);
        if (combat && combat.spawnParticle) combat.spawnParticle(player.x, player.y, "#ffe066", 40, 180);
      },
      damageRay: function (x, y, ang, range, dmg, width) {
        enemies().forEach(function (t) {
          if (!t || t.isAlly) return;
          if (t.alive === false && !(t.hp > 0)) return;
          var x2 = x + Math.cos(ang) * range, y2 = y + Math.sin(ang) * range;
          var dx = x2 - x, dy = y2 - y, len2 = dx * dx + dy * dy || 1;
          var tpar = Math.max(0, Math.min(1, ((t.x - x) * dx + (t.y - y) * dy) / len2));
          var px = x + dx * tpar, py = y + dy * tpar;
          if (Math.hypot(t.x - px, t.y - py) < (width || 30) + (t.radius || 18))
            t.hp = Math.max(0, (t.hp || 0) - dmg);
        });
      },
      novaDamage: function (pl, aoe, dmg) {
        enemies().forEach(function (t) {
          if (!t || t.isAlly) return;
          var d = Math.hypot(t.x - pl.x, t.y - pl.y);
          if (d < aoe) t.hp = Math.max(0, (t.hp || 0) - dmg * (1 - d / aoe * 0.5));
        });
      },
      getEnemies: function () {
        return enemies().filter(function (e) { return e && e.hp > 0 && !e.isAlly; });
      },
    };
    for (var k in bridge) if (api[k] == null) api[k] = bridge[k];
    return api;
  }

  function installSecretBridge() {
    hookAi();
    if (!window.WWNSecret || WWNSecret.__bridged) return;
    var orig = WWNSecret.applyEffect.bind(WWNSecret);
    WWNSecret.applyEffect = function (id, player, combat, api) {
      window.__wwnPlayer = player;
      window.__wwnCombat = combat;
      api = buildApi(player, combat, api || {});
      var ok = false;
      try { ok = !!orig(id, player, combat, api); } catch (e) {
        console.error("secret apply", id, e);
        // last resort: still try particle
        if (combat && combat.spawnParticle) combat.spawnParticle(player.x, player.y, "#ff3366", 20, 120);
        ok = true;
      }
      if (ok && combat && combat.spawnParticle) {
        try { combat.spawnParticle(player.x, player.y, "#00f5ff", 14, 110); } catch (_) {}
      }
      return ok;
    };
    WWNSecret.__bridged = true;
  }

  function tick() {
    installSecretBridge();
    var now = performance.now();
    var dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    var player = window.__wwnPlayer;
    var combat = window.__wwnCombat;
    var active = !window.WWNGame || !WWNGame.isActive || WWNGame.isActive();
    if (player && active) {
      var s = ensureSupports();
      if (s) {
        try { s.update(dt, player, combat, enemies()); } catch (e) {}
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  setInterval(function () {
    installSecretBridge();
    var player = window.__wwnPlayer;
    var s = ensureSupports();
    if (!player || !s) return;
    if (window.WWNGame && WWNGame.isActive && !WWNGame.isActive()) return;
    var canvas = document.getElementById("game-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var cam = window.__wwnCamera || { x: player.x, y: player.y, w: window.innerWidth, h: window.innerHeight };
    try { s.draw(ctx, cam, player); } catch (e) {}
  }, 33);

  window.WWNSupportBridge = {
    get: ensureSupports,
    apiFor: function (player, combat, aiList, netSync, loadout, spawnAlly) {
      if (aiList && aiList.length) window.__wwnAiList = aiList;
      if (netSync && netSync.getRemotes) window.__wwnRemotes = netSync.getRemotes();
      if (loadout) window.__wwnLoadout = loadout;
      return buildApi(player, combat, { spawnAlly: spawnAlly || function () {} });
    },
  };

  // Early AI hook attempts
  setInterval(hookAi, 500);
  hookAi();
})();
