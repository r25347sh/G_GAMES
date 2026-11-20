(function () {
  "use strict";
  var supports = null;
  function ensureSupports() {
    if (!supports && window.WWNSupportSystem) supports = new WWNSupportSystem();
    return supports;
  }
  window.WWNSupportBridge = {
    get: ensureSupports,
    apiFor: function (player, combat, aiList, netSync, loadout, spawnAllyFn) {
      var s = ensureSupports();
      var enemies = function () {
        return (aiList || []).concat((netSync && netSync.getRemotes && netSync.getRemotes()) || []);
      };
      return {
        spawnAlly: spawnAllyFn || function () {},
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
        refill: function () { if (loadout && loadout.refillAmmo) loadout.refillAmmo(); },
        globalChaff: function (sec) { player.chaffUntil = performance.now() / 1000 + (sec || 4); },
        novaDamage: function (pl, aoe, dmg) {
          enemies().forEach(function (t) {
            if (!t || !t.alive || t.isAlly) return;
            var d = Math.hypot(t.x - pl.x, t.y - pl.y);
            if (d < aoe) t.hp = Math.max(0, t.hp - dmg * (1 - d / aoe * 0.5));
          });
        },
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
        getEnemies: function () {
          return enemies().filter(function (e) { return e && e.alive && !e.isAlly; });
        },
      };
    },
    update: function (dt, player, combat, enemies) {
      var s = ensureSupports();
      if (s) s.update(dt, player, combat, enemies);
    },
    draw: function (ctx, cam, player) {
      var s = ensureSupports();
      if (s) s.draw(ctx, cam, player);
    },
    clear: function () {
      var s = ensureSupports();
      if (s) s.clear();
    },
  };
})();
