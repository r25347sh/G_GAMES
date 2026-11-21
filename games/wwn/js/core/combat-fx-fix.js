(function () {
  "use strict";

  function getCombat() { return window.__wwnCombat || null; }
  function getPlayer() { return window.__wwnPlayer || null; }
  function getTargets() {
    var player = getPlayer();
    var list = [];
    if (player) list.push(player);
    var rem = window.__wwnRemotes || [];
    for (var i = 0; i < rem.length; i++) list.push(rem[i]);
    var ai = window.__wwnAiList || [];
    for (var j = 0; j < ai.length; j++) list.push(ai[j]);
    return list;
  }

  function isFriendly(src, t) {
    if (!src || !t) return false;
    var me = getPlayer();
    if (t === me || (me && t.netId === me.netId)) {
      if (src.ownerId && me && src.ownerId === me.netId) return true;
      if (src.team && me.team && src.team === me.team) return true;
    }
    if (src.ownerId && (t.netId === src.ownerId || t.ownerId === src.ownerId)) return true;
    if (src.team && t.team && src.team === t.team && src.team !== "NONE") return true;
    if (t.isAlly && me && (t.ownerId === me.netId || (t.team && me.team && t.team === me.team))) return true;
    if (t.group === "ALLY" && me && src.ownerId === me.netId) return true;
    return false;
  }

  function hurt(t, dmg, ownerId) {
    if (!t || !t.alive || dmg <= 0) return;
    t.hp = Math.max(0, (t.hp || 0) - dmg);
    t.lastHitBy = ownerId;
    if (t.hp <= 0) t.alive = false;
    try {
      if (window.__wwnNetSync && window.__wwnNetSync.queueDamage && t.netId) {
        var me = getPlayer();
        if (!me || t.netId !== me.netId) window.__wwnNetSync.queueDamage(t.netId, dmg, ownerId);
      }
    } catch (e) {}
  }

  function blastAoe(x, y, radius, dmg, ownerId, team, extra) {
    var targets = getTargets();
    var src = { ownerId: ownerId, team: team };
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (!t || !t.alive) continue;
      if (t.netId === ownerId) continue;
      if (isFriendly(src, t)) continue;
      var d = Math.hypot((t.x || 0) - x, (t.y || 0) - y);
      if (d > radius + (t.radius || 18)) continue;
      var fall = 1 - (d / (radius + 1)) * 0.4;
      hurt(t, dmg * fall, ownerId);
      if (extra) extra(t);
    }
  }

  function tickEffects(combat, dt) {
    if (!combat || !combat.effects) return;
    var targets = getTargets();
    for (var i = combat.effects.length - 1; i >= 0; i--) {
      var e = combat.effects[i];
      if (!e) { combat.effects.splice(i, 1); continue; }
      e.life = (e.life == null ? 0.3 : e.life) - dt;

      if (e.type === "empRing") {
        if (!e._blasted) {
          e._blasted = true;
          e.ownerId = e.ownerId || (getPlayer() && getPlayer().netId);
          e.team = e.team || (getPlayer() && getPlayer().team) || "NONE";
          e.dmg = e.dmg || 22;
          e.maxR = e.maxR || 320;
          e.duration = e.duration || 3;
          blastAoe(e.x, e.y, e.maxR, e.dmg, e.ownerId, e.team, function (t) {
            t.empUntil = Math.max(t.empUntil || 0, performance.now() / 1000 + e.duration);
            t.vx = (t.vx || 0) * 0.35;
            t.vy = (t.vy || 0) * 0.35;
            if (t.boost != null) t.boost = Math.max(0, (t.boost || 0) - 50);
          });
        }
        e.r = Math.min(e.maxR || 320, (e.r || 0) + (e.maxR || 320) * 4 * dt);
        blastAoe(e.x, e.y, e.r || 0, (e.dmg || 22) * dt * 0.4, e.ownerId, e.team, function (t) {
          t.vx = (t.vx || 0) * 0.9; t.vy = (t.vy || 0) * 0.9;
        });
      } else if (e.type === "omni") {
        e.maxR = e.maxR || 780;
        e.r = Math.min(e.maxR, (e.r || 30) + e.maxR * 2.2 * dt);
        if (!e._blasted) {
          e._blasted = true;
          blastAoe(e.x, e.y, 220, (e.dmg || 40) * 0.7, e.ownerId, e.team);
        }
        blastAoe(e.x, e.y, e.r, (e.dmg || 40) * dt * 1.2, e.ownerId, e.team);
      } else if (e.type === "worldshift") {
        for (var k = 0; k < targets.length; k++) {
          var u = targets[k];
          if (!u || !u.alive) continue;
          if (isFriendly({ ownerId: e.ownerId, team: e.team }, u)) continue;
          if (u === getPlayer() || (getPlayer() && u.netId === getPlayer().netId)) continue;
          u.vx = (u.vx || 0) * 0.7;
          u.vy = (u.vy || 0) * 0.7;
          u.speedMul = 0.4;
          var dx = e.x - u.x, dy = e.y - u.y;
          var dd = Math.hypot(dx, dy) || 1;
          u.vx += (dx / dd) * 50 * dt;
          u.vy += (dy / dd) * 50 * dt;
        }
      } else if (e.type === "laser" || e.type === "orbital") {
        var cos = Math.cos(e.angle || 0), sin = Math.sin(e.angle || 0);
        var range = e.range || 900;
        var width = (e.width || 4) * 0.5 + 12;
        var dmg = (e.dmg || (e.type === "orbital" ? 60 : 22)) * (e.type === "orbital" ? 0.5 : 0.4);
        for (var bi = 0; bi < targets.length; bi++) {
          var t = targets[bi];
          if (!t || !t.alive) continue;
          if (t.netId === e.ownerId) continue;
          if (isFriendly(e, t)) continue;
          var dx2 = t.x - e.x, dy2 = t.y - e.y;
          var proj = dx2 * cos + dy2 * sin;
          if (proj < 0 || proj > range) continue;
          var perp = Math.abs(-dx2 * sin + dy2 * cos);
          if (perp > width + (t.radius || 18)) continue;
          hurt(t, dmg * dt * 8, e.ownerId);
        }
      } else if (e.type === "chrono") {
        for (var ci = 0; ci < targets.length; ci++) {
          var ct = targets[ci];
          if (!ct || !ct.alive) continue;
          if (isFriendly(e, ct)) continue;
          if (ct === getPlayer()) continue;
          if (Math.hypot(ct.x - e.x, ct.y - e.y) < (e.r || 500)) {
            ct.vx *= 0.12; ct.vy *= 0.12;
            ct.fireCd = Math.max(ct.fireCd || 0, 0.5);
          }
        }
      } else if (e.type === "meteor") {
        e.r = (e.r || 0) + 400 * dt;
        if (e.r > 20 && !e._hit) {
          e._hit = true;
          blastAoe(e.x, e.y, e.aoe || 180, e.dmg || 80, e.ownerId, e.team);
        }
      }

      if (e.life <= 0) combat.effects.splice(i, 1);
    }
  }

  function patchUpdate() {
    if (window.WWNCombatUpdate && !WWNCombatUpdate.__fx2) {
      var orig = WWNCombatUpdate.update;
      if (orig) {
        WWNCombatUpdate.update = function (combat, dt, player, remotes, loadout, now) {
          if (combat) window.__wwnCombat = combat;
          orig(combat, dt, player, remotes, loadout, now);
          tickEffects(combat, dt);
        };
        WWNCombatUpdate.__fx2 = true;
      }
    }
  }

  function patchEmp() {
    if (!window.WWNCombat || !WWNCombat.prototype || WWNCombat.prototype.__emp2) return;
    var oSub = WWNCombat.prototype.fireSub;
    if (!oSub) return;
    WWNCombat.prototype.fireSub = function (player, loadout, now, targets) {
      var id = loadout.subId && loadout.subId();
      if (id === "emp" && loadout.ammo && loadout.ammo.emp == null) loadout.ammo.emp = 4;
      var r = oSub.call(this, player, loadout, now, targets);
      if (id === "emp") {
        var w = window.WWNWeapons && WWNWeapons.emp;
        var found = false;
        for (var i = 0; i < this.effects.length; i++) {
          if (this.effects[i] && this.effects[i].type === "empRing" && !this.effects[i]._tagged) {
            var e = this.effects[i];
            e._tagged = true;
            e.ownerId = player.netId || "local";
            e.team = player.team || "NONE";
            e.dmg = (w && w.dmg) || 22;
            e.duration = (w && w.duration) || 3;
            e.maxR = (w && w.aoe) || 320;
            e.life = 0.7;
            e.r = 0;
            e._blasted = false;
            found = true;
            break;
          }
        }
        if (!found) {
          this.effects.push({
            type: "empRing", x: player.x, y: player.y, r: 0,
            maxR: (w && w.aoe) || 320, life: 0.7,
            dmg: (w && w.dmg) || 22, duration: (w && w.duration) || 3,
            ownerId: player.netId || "local", team: player.team || "NONE",
            color: "#9b5de5", _blasted: false
          });
        }
        try {
          if (window.WWNPeer) {
            window.WWNPeer.broadcast({
              t: "fx", kind: "empRing",
              x: player.x, y: player.y,
              maxR: (w && w.aoe) || 320, dmg: (w && w.dmg) || 22,
              duration: (w && w.duration) || 3,
              ownerId: player.netId, team: player.team, life: 0.7
            });
          }
        } catch (err) {}
      }
      return r;
    };
    WWNCombat.prototype.__emp2 = true;
  }

  function patchPlasma() {
    if (!window.WWNWeapons || !WWNWeapons.plasma) return;
    WWNWeapons.plasma.dmg = Math.max(WWNWeapons.plasma.dmg || 0, 44);
    WWNWeapons.plasma.aoe = Math.max(WWNWeapons.plasma.aoe || 0, 95);
  }

  function patchSync() {
    if (!window.WWNPeer || window.__wwnFxListen) return;
    window.__wwnFxListen = true;
    window.WWNPeer.on("data", function (raw) {
      var msg;
      try { msg = typeof raw === "string" ? JSON.parse(raw) : raw; } catch (e) { return; }
      if (!msg || msg.t !== "fx") return;
      var me = getPlayer();
      if (msg.ownerId && me && msg.ownerId === me.netId) return;
      var combat = getCombat();
      if (!combat || !combat.effects) return;
      combat.effects.push({
        type: msg.kind || "omni",
        x: msg.x, y: msg.y,
        r: msg.r || 0, maxR: msg.maxR || 500,
        life: msg.life || 1,
        dmg: msg.dmg || 20,
        duration: msg.duration || 2,
        ownerId: msg.ownerId, team: msg.team || "NONE",
        angle: msg.angle, range: msg.range, width: msg.width,
        aoe: msg.aoe, color: msg.color,
        _blasted: false, _hit: false
      });
    });
  }

  var _last = performance.now();
  function raf(now) {
    requestAnimationFrame(raf);
    var dt = Math.min(0.05, (now - _last) / 1000);
    _last = now;
    var combat = getCombat();
    if (combat) tickEffects(combat, dt);
  }
  requestAnimationFrame(raf);

  setInterval(function () {
    patchUpdate();
    patchEmp();
    patchPlasma();
    patchSync();
  }, 250);
})();
