(function (global) {
  "use strict";
  function friendly(a, b) {
    if (!a || !b) return false;
    if (a === "NONE" || b === "NONE") return false;
    return a === b;
  }
  function isFriendlyEntity(p, t) {
    if (!p || !t) return false;
    if (p.ownerId && (t.netId === p.ownerId || t.ownerId === p.ownerId)) return true;
    if (t.ownerId && p.netId && t.ownerId === p.netId) return true;
    if (p.team && t.team && p.team === t.team && p.team !== "NONE") return true;
    return false;
  }
  function explodeAt(combat, x, y, aoe, dmg, ownerId, team, targets) {
    combat.spawnParticle(x, y, "#ff6b6b", 18, 140);
    (targets || []).forEach(function (t) {
      if (!t || !t.alive) return;
      if (t.netId === ownerId) return;
      if (isFriendlyEntity({ team: team, ownerId: ownerId }, t)) return;
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
          if (e.team && t.team && e.team === t.team) return;
          var dx = e.x - t.x, dy = e.y - t.y, d = Math.hypot(dx, dy) || 1;
          if (d < e.r + 40) {
            var pull = 220 * dt;
            t.vx = (t.vx || 0) + (dx / d) * pull;
            t.vy = (t.vy || 0) + (dy / d) * pull;
            if (e.dmg && d < e.r * 0.4) t.hp = Math.max(0, (t.hp || 0) - e.dmg * dt);
          }
        });
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
      if (p.split > 0 && p.life < (p.maxLife || p.life) * 0.45) {
        var n = Math.min(8, p.split | 0);
        p.split = 0; p.alive = false;
        for (var si = 0; si < n; si++) {
          if (!combat.projectiles || !combat.projectiles.acquire) break;
          var sub = combat.projectiles.acquire();
          var ang = p.angle + (si - (n - 1) / 2) * 0.35 + (Math.random() - 0.5) * 0.15;
          sub.alive = true; sub.type = "clusterbit";
          sub.x = p.x; sub.y = p.y; sub.angle = ang;
          sub.vx = Math.cos(ang) * (320 + Math.random() * 80);
          sub.vy = Math.sin(ang) * (320 + Math.random() * 80);
          sub.life = 0.85; sub.maxLife = 0.85;
          sub.dmg = (p.dmg || 10) * 0.55;
          sub.ownerId = p.ownerId; sub.team = p.team;
          sub.radius = 4; sub.aoe = 36; sub.color = p.color || "#ffa94d";
          sub.targetId = null; sub.turn = 0; sub.split = 0;
        }
        combat.spawnParticle(p.x, p.y, p.color || "#ffa94d", 14, 100);
        return;
      }
      for (var ti = 0; ti < targets.length; ti++) {
        var t = targets[ti];
        if (!t || !t.alive) continue;
        if (t.netId === p.ownerId) continue;
        if (isFriendlyEntity(p, t)) continue;
        var rad = (t.radius || 18) + (p.radius || 3) + (p.type === "missile" ? 6 : 0);
        if (Math.hypot(t.x - p.x, t.y - p.y) <= rad) {
          t.hp = Math.max(0, (t.hp || 0) - p.dmg);
          t.lastHitBy = p.ownerId;
          if (p.aoe > 0 && p.type !== "missile") explodeAt(combat, p.x, p.y, p.aoe, p.dmg * 0.5, p.ownerId, p.team, targets);
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
        if (isFriendlyEntity(m, t)) return;
        if (Math.hypot(t.x - m.x, t.y - m.y) < Math.max(m.aoe * 0.85, (m.radius || 12) + (t.radius || 18) + 8)) {
          explodeAt(combat, m.x, m.y, m.aoe, m.dmg, m.ownerId, m.team, targets);
          m.alive = false;
        }
      });
    });
    combat.mines.releaseDead(function (m) { return !m.alive; });
    combat.decoys.forEach(function (d) {
      if (!d.alive) return;
      d.life -= dt;
      d.x += (d.vx || 0) * dt; d.y += (d.vy || 0) * dt;
      if (d.life <= 0) d.alive = false;
    });
    combat.decoys.releaseDead(function (d) { return !d.alive; });
    if (combat.particles) {
      combat.particles.forEach(function (p) {
        if (!p.alive) return;
        p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.life <= 0) p.alive = false;
      });
      combat.particles.releaseDead(function (p) { return !p.alive; });
    }
    updateSpecialEffects(combat, dt, localPlayer, remotes);
  }
  global.WWNCombatUpdate = { update: updateCombat, explodeAt: explodeAt, friendly: friendly };
})(typeof window !== "undefined" ? window : globalThis);
