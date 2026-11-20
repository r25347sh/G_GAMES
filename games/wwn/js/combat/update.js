(function (global) {
  "use strict";
  function friendly(a, b) {
    if (!a || !b || a === "NONE" || b === "NONE") return false;
    return a === b;
  }
  function explodeAt(combat, x, y, aoe, dmg, ownerId, team, targets) {
    combat.spawnParticle(x, y, "#ff6b6b", 18, 140);
    (targets || []).forEach(function (t) {
      if (!t || !t.alive) return;
      if (t.netId === ownerId) return;
      if (friendly(team, t.team)) return;
      var d = Math.hypot(t.x - x, t.y - y);
      if (d <= aoe + (t.radius || 18)) {
        var falloff = 1 - (d / (aoe + 20)) * 0.5;
        t.hp = Math.max(0, (t.hp || 0) - dmg * falloff);
        t.lastHitBy = ownerId;
      }
    });
  }
  function updateMissileTarget(p, combat, targets) {
    var locked = null;
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (!t || !t.alive) continue;
      if (t.netId === p.targetId || t.id === p.targetId) { locked = t; break; }
    }
    if (locked && locked.chaffUntil && performance.now() / 1000 < locked.chaffUntil) {
      if (Math.random() < 0.55) {
        p.targetId = null; locked = null;
        p.vx += (Math.random() - 0.5) * 220;
        p.vy += (Math.random() - 0.5) * 220;
      }
    }
    var bestDecoy = null, bestScore = 1e12;
    combat.decoys.forEach(function (d) {
      if (!d.alive) return;
      if (friendly(d.team, p.team)) return;
      var dd = Math.hypot(d.x - p.x, d.y - p.y);
      if (dd < bestScore) { bestScore = dd; bestDecoy = d; }
    });
    if (bestDecoy && bestScore < 500) {
      if (!locked || bestScore < Math.hypot(locked.x - p.x, locked.y - p.y) * 0.85) {
        p.targetId = bestDecoy.id;
        locked = bestDecoy;
      }
    }
    return locked;
  }
  function updateSpecialEffects(combat, dt, localPlayer, remotes) {
    if (!combat || !combat.effects) return;
    var targets = [localPlayer].concat(remotes || []).filter(function (t) { return t && t.alive; });
    for (var i = combat.effects.length - 1; i >= 0; i--) {
      var e = combat.effects[i];
      if (!e) { combat.effects.splice(i, 1); continue; }
      e.life = (e.life || 0) - dt;
      if (e.type === "blackhole") {
        e.r = Math.min(e.maxR || 160, (e.r || 0) + 80 * dt);
        targets.forEach(function (t) {
          if (!t || t.netId === e.ownerId) return;
          if (e.team && t.team && e.team === t.team && t.team !== "NONE") return;
          var dx = e.x - t.x, dy = e.y - t.y, d = Math.hypot(dx, dy) || 1;
          if (d < e.r + 40) {
            var pull = (e.pull || 400) * dt / Math.max(40, d);
            t.vx = (t.vx || 0) + (dx / d) * pull;
            t.vy = (t.vy || 0) + (dy / d) * pull;
            if (e.dmg) t.hp = Math.max(0, (t.hp || 0) - e.dmg);
          }
        });
      }
      if (e.type === "orbitalBeam" || e.type === "laser") {
        // visual only; damage applied on fire
      }
      if (e.life <= 0) combat.effects.splice(i, 1);
    }
  }
  function updateCombat(combat, dt, localPlayer, remotes, loadout, now) {
    if (!combat) return;
    var targets = [localPlayer].concat(remotes || []);
    combat.projectiles.forEach(function (p) {
      if (!p.alive) return;
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; return; }
      if (p.type === "missile" && p.turn > 0) {
        var locked = updateMissileTarget(p, combat, targets);
        if (locked) {
          var desired = Math.atan2(locked.y - p.y, locked.x - p.x);
          var diff = desired - p.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          var maxT = p.turn * dt;
          if (Math.abs(diff) <= maxT) p.angle = desired;
          else p.angle += Math.sign(diff) * maxT;
          var sp = Math.hypot(p.vx, p.vy) || 380;
          p.vx = Math.cos(p.angle) * sp;
          p.vy = Math.sin(p.angle) * sp;
        }
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      for (var ti = 0; ti < targets.length; ti++) {
        var t = targets[ti];
        if (!t || !t.alive) continue;
        if (t.netId === p.ownerId) continue;
        if (friendly(p.team, t.team)) continue;
        var rad = (t.radius || 18) + p.radius;
        if (Math.hypot(t.x - p.x, t.y - p.y) <= rad) {
          t.hp = Math.max(0, (t.hp || 0) - p.dmg);
          t.lastHitBy = p.ownerId;
          if (p.aoe > 0) explodeAt(combat, p.x, p.y, p.aoe, p.dmg * 0.5, p.ownerId, p.team, targets);
          p.alive = false;
          combat.spawnParticle(p.x, p.y, p.color || "#fff", 10, 80);
          break;
        }
      }
      combat.decoys.forEach(function (d) {
        if (!d.alive || !p.alive) return;
        if (Math.hypot(d.x - p.x, d.y - p.y) <= (d.radius || 16) + p.radius) {
          d.hp = (d.hp || 20) - p.dmg;
          p.alive = false;
          if (d.hp <= 0) d.alive = false;
          combat.spawnParticle(d.x, d.y, "#ffb347", 12, 90);
        }
      });
    });
    combat.projectiles.releaseDead(function (p) { return !p.alive; });
    combat.mines.forEach(function (m) {
      if (!m.alive) return;
      if (m.arm > 0) { m.arm -= dt; return; }
      m.life -= dt;
      if (m.life <= 0) { m.alive = false; return; }
      targets.forEach(function (t) {
        if (!t || !t.alive || t.netId === m.ownerId) return;
        if (friendly(m.team, t.team)) return;
        if (Math.hypot(t.x - m.x, t.y - m.y) < m.aoe * 0.55) {
          explodeAt(combat, m.x, m.y, m.aoe, m.dmg, m.ownerId, m.team, targets);
          m.alive = false;
        }
      });
    });
    combat.mines.releaseDead(function (m) { return !m.alive; });
    combat.decoys.forEach(function (d) {
      if (!d.alive) return;
      d.life -= dt;
      if (d.life <= 0) d.alive = false;
      d.x += (d.vx || 0) * dt; d.y += (d.vy || 0) * dt;
    });
    combat.decoys.releaseDead(function (d) { return !d.alive; });
    updateSpecialEffects(combat, dt, localPlayer, remotes);
    combat.particles.forEach(function (p) {
      p.life -= dt; p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt;
      if (p.life <= 0) p.alive = false;
    });
    combat.particles.releaseDead(function (p) { return !p.alive; });
  }
  global.WWNCombatUpdate = { update: updateCombat, friendly: friendly };
})(typeof window !== "undefined" ? window : globalThis);
