(function () {
  "use strict";

  function friendly(a, b) {
    if (!a || !b) return false;
    if (a.ownerId && (b.netId === a.ownerId || b.ownerId === a.ownerId)) return true;
    if (window.__wwnPlayer) {
      var me = window.__wwnPlayer;
      if (b === me || b.netId === me.netId) {
        if (a.team && me.team && a.team === me.team) return true;
        if (a.ownerId && a.ownerId === me.netId) return true;
      }
    }
    if (a.team && b.team && a.team === b.team && a.team !== "NONE") return true;
    if (b.isAlly && a.team && window.__wwnPlayer && a.team === window.__wwnPlayer.team) return true;
    return false;
  }

  function applyBeamDamage(beam, targets) {
    if (!beam || !targets) return;
    var cos = Math.cos(beam.angle || 0), sin = Math.sin(beam.angle || 0);
    var range = beam.range || 800;
    var width = (beam.width || 4) * 0.55 + 10;
    var dmg = beam.dmg || 20;
    if (beam.type === "orbital") dmg = beam.dmg || 55;
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (!t || !t.alive || (t.hp || 0) <= 0) continue;
      if (t.netId === beam.ownerId) continue;
      if (friendly(beam, t)) continue;
      var dx = t.x - beam.x, dy = t.y - beam.y;
      var proj = dx * cos + dy * sin;
      if (proj < 0 || proj > range) continue;
      var perp = Math.abs(-dx * sin + dy * cos);
      if (perp > width + (t.radius || 18)) continue;
      t.hp = Math.max(0, (t.hp || 0) - dmg * (beam._tickDmg || 0.35));
      t.lastHitBy = beam.ownerId;
      if (window.__wwnNetSync && window.__wwnNetSync.queueDamage && t.netId && t.netId !== (window.__wwnPlayer && window.__wwnPlayer.netId)) {
        try { window.__wwnNetSync.queueDamage(t.netId, dmg * (beam._tickDmg || 0.35), beam.ownerId); } catch (e) {}
      }
    }
  }

  function applyEmp(e, targets, dt) {
    var maxR = e.maxR || 280;
    e.r = Math.min(maxR, (e.r || 0) + maxR * 3 * dt);
    var dmg = (e.dmg || 12) * dt * 1.2;
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (!t || !t.alive) continue;
      if (t.netId === e.ownerId) continue;
      if (friendly(e, t)) continue;
      if (Math.hypot(t.x - e.x, t.y - e.y) > e.r + (t.radius || 18)) continue;
      t.hp = Math.max(0, (t.hp || 0) - dmg);
      t.empUntil = Math.max(t.empUntil || 0, performance.now() / 1000 + (e.duration || 2.5));
      t.vx = (t.vx || 0) * 0.85;
      t.vy = (t.vy || 0) * 0.85;
      if (t.boost != null) t.boost = Math.max(0, t.boost - 25 * dt);
    }
  }

  function processEffects(combat, dt, player, entities) {
    if (!combat || !combat.effects) return;
    var targets = [player].concat(entities || []);
    for (var i = combat.effects.length - 1; i >= 0; i--) {
      var e = combat.effects[i];
      if (!e) { combat.effects.splice(i, 1); continue; }
      e.life = (e.life == null ? 0.2 : e.life) - dt;
      if (e.type === "laser" || e.type === "orbital") {
        e._tickDmg = e.type === "orbital" ? 0.55 : 0.4;
        if (e.type === "orbital" && !e.dmg) e.dmg = 55;
        applyBeamDamage(e, targets);
      } else if (e.type === "empRing") {
        if (e.dmg == null) e.dmg = 12;
        applyEmp(e, targets, dt);
      } else if (e.type === "omni") {
        e.r = (e.r || 0) + (e.maxR || 600) * 1.5 * dt;
        for (var j = 0; j < targets.length; j++) {
          var t = targets[j];
          if (!t || !t.alive || t.netId === e.ownerId) continue;
          if (friendly(e, t)) continue;
          if (Math.hypot(t.x - e.x, t.y - e.y) < e.r) {
            t.hp = Math.max(0, t.hp - (e.dmg || 8) * dt);
          }
        }
      } else if (e.type === "worldshift") {
        for (var k = 0; k < targets.length; k++) {
          var u = targets[k];
          if (!u || !u.alive || u.isAlly) continue;
          if (u === player || (player && u.netId === player.netId)) continue;
          u.vx = (u.vx || 0) * (1 - 0.55 * dt);
          u.vy = (u.vy || 0) * (1 - 0.55 * dt);
        }
      }
      if (e.life <= 0) combat.effects.splice(i, 1);
    }
  }

  function patch() {
    if (!window.WWNCombatUpdate || WWNCombatUpdate.__fxPatched) return;
    var orig = WWNCombatUpdate.update;
    if (!orig) return;
    WWNCombatUpdate.update = function (combat, dt, player, remotes, loadout, now) {
      orig(combat, dt, player, remotes, loadout, now);
      var ents = (remotes || []).concat(window.__wwnAiList || []);
      processEffects(combat, dt, player, ents);
    };
    WWNCombatUpdate.__fxPatched = true;
  }

  function patchFireRate() {
    if (window.WWNCombat && WWNCombat.prototype && !WWNCombat.prototype.__plasmaFix) {
      var oMain = WWNCombat.prototype.fireMain;
      if (oMain) {
        WWNCombat.prototype.fireMain = function (player, loadout, now) {
          var id = loadout.mainId();
          var w = window.WWNWeapons && WWNWeapons[id];
          if (id === "plasma" && w) {
            if (loadout.overheated || (loadout.isEmped && loadout.isEmped(now))) return null;
            if (loadout.cd && loadout.cd.plasma > 0) return null;
            if (loadout.heat >= (w.overheat || 100)) { loadout.overheated = true; return null; }
            loadout.heat = Math.min(w.overheat || 100, (loadout.heat || 0) + (w.heat || 38));
            if (loadout.cd) loadout.cd.plasma = 1 / Math.max(0.2, w.rate || 0.55);
            return this._spawnBullet(player, w, "plasma");
          }
          var r = oMain.call(this, player, loadout, now);
          if (id === "laser" && r && loadout.cd) loadout.cd.laser = 1 / Math.max(0.5, (w && w.rate) || 2.4);
          if (id === "vulcan" && r && loadout.cd) loadout.cd.vulcan = 1 / Math.max(4, (w && w.rate) || 11);
          return r;
        };
        WWNCombat.prototype.__plasmaFix = true;
      }
      var oSub = WWNCombat.prototype.fireSub;
      if (oSub) {
        WWNCombat.prototype.fireSub = function (player, loadout, now, targets) {
          var id = loadout.subId();
          var r = oSub.call(this, player, loadout, now, targets);
          if (id === "emp" && this.effects && this.effects.length) {
            var last = this.effects[this.effects.length - 1];
            if (last && last.type === "empRing") {
              last.ownerId = player.netId || "local";
              last.team = player.team || "NONE";
              last.dmg = (window.WWNWeapons && WWNWeapons.emp && WWNWeapons.emp.dmg) || 12;
              last.duration = (window.WWNWeapons && WWNWeapons.emp && WWNWeapons.emp.duration) || 2.8;
              last.life = 0.55;
              last.maxR = (window.WWNWeapons && WWNWeapons.emp && WWNWeapons.emp.aoe) || 280;
            }
          }
          return r;
        };
      }
    }
  }

  setInterval(function () {
    patch();
    patchFireRate();
  }, 300);
})();
