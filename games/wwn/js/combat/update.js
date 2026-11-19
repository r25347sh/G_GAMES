(function (global) {
  "use strict";
  function friendly(aTeam, bTeam) {
    if (!aTeam || !bTeam || aTeam === "NONE" || bTeam === "NONE") return false;
    return aTeam === bTeam;
  }
  function applyDamage(target, dmg, srcTeam, srcId) {
    if (!target || target.hp <= 0) return false;
    if (friendly(srcTeam, target.team)) return false;
    target.hp = Math.max(0, target.hp - dmg);
    target.lastHitBy = srcId;
    return true;
  }
  function explodeAt(combat, x, y, aoe, dmg, ownerId, team, targets) {
    combat.spawnParticle(x, y, "#ff6b6b", 18, 150);
    combat.events.push({ t: "explode", x: x, y: y, color: "#ff8c42", n: 16 });
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (!t || t.hp <= 0) continue;
      var d = Math.hypot(t.x - x, t.y - y);
      if (d <= aoe + (t.radius || 18)) {
        var falloff = 1 - (d / (aoe + 20)) * 0.5;
        applyDamage(t, dmg * falloff, team, ownerId);
      }
    }
  }
  function segmentHit(x1, y1, x2, y2, cx, cy, r) {
    var dx = x2 - x1, dy = y2 - y1;
    var len2 = dx * dx + dy * dy || 1;
    var t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / len2));
    var px = x1 + t * dx, py = y1 + t * dy;
    return Math.hypot(cx - px, cy - py) <= r;
  }
  function updateCombat(combat, dt, localPlayer, remotes, loadout, now) {
    var targets = [localPlayer].concat(remotes || []);
    var C = global.WWNConfig;
    combat.projectiles.forEach(function (p) {
      if (!p.alive) return;
      if (p.targetId && p.turn > 0) {
        var tgt = null;
        for (var i = 0; i < targets.length; i++) {
          if (targets[i].netId === p.targetId || targets[i].id === p.targetId) { tgt = targets[i]; break; }
        }
        if (tgt && tgt.hp > 0 && !tgt.stealthed) {
          var desired = Math.atan2(tgt.y - p.y, tgt.x - p.x);
          var diff = desired - p.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          var maxT = p.turn * dt;
          if (Math.abs(diff) <= maxT) p.angle = desired; else p.angle += Math.sign(diff) * maxT;
          var spd = Math.hypot(p.vx, p.vy) || 380;
          p.vx = Math.cos(p.angle) * spd; p.vy = Math.sin(p.angle) * spd;
        }
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) {
        if (p.split > 0) {
          for (var s = 0; s < p.split; s++) {
            if (combat.projectiles.live.length >= C.MAX_PROJECTILES) break;
            var c = combat.projectiles.acquire();
            var ang = p.angle + (s - p.split / 2) * 0.35;
            c.alive = true; c.type = "shard"; c.x = p.x; c.y = p.y;
            c.vx = Math.cos(ang) * 280; c.vy = Math.sin(ang) * 280;
            c.angle = ang; c.life = 0.9; c.maxLife = 0.9; c.dmg = p.dmg * 0.6;
            c.ownerId = p.ownerId; c.team = p.team; c.radius = 4; c.aoe = 40;
            c.color = "#ff8c42"; c.targetId = null; c.turn = 0; c.split = 0;
          }
        }
        if (p.aoe > 0) explodeAt(combat, p.x, p.y, p.aoe, p.dmg, p.ownerId, p.team, targets);
        p.alive = false; return;
      }
      for (var j = 0; j < targets.length; j++) {
        var t = targets[j];
        if (!t || t.hp <= 0) continue;
        if (t.netId === p.ownerId || t.id === p.ownerId) continue;
        if (friendly(p.team, t.team)) continue;
        if (Math.hypot(t.x - p.x, t.y - p.y) <= (t.radius || 18) + p.radius) {
          applyDamage(t, p.dmg, p.team, p.ownerId);
          combat.spawnParticle(p.x, p.y, p.color, 8, 100);
          if (p.aoe > 0) explodeAt(combat, p.x, p.y, p.aoe, p.dmg * 0.5, p.ownerId, p.team, targets);
          p.alive = false; break;
        }
      }
    });
    combat.projectiles.releaseDead(function (p) { return !p.alive; });
    for (var ei = combat.effects.length - 1; ei >= 0; ei--) {
      var e = combat.effects[ei];
      if (e.type === "blackhole") {
        e.life -= dt;
        for (var bi = 0; bi < targets.length; bi++) {
          var bt = targets[bi];
          if (!bt || bt.hp <= 0) continue;
          if (bt.netId === e.ownerId) continue;
          var bdx = e.x - bt.x, bdy = e.y - bt.y;
          var bd = Math.hypot(bdx, bdy) || 1;
          if (bd < (e.radius || 160)) {
            var pull = (e.pull || 400) * dt / bd;
            bt.vx += (bdx / bd) * pull;
            bt.vy += (bdy / bd) * pull;
            if (bd < 50) applyDamage(bt, (e.dmg || 8) * dt, e.team, e.ownerId);
          }
        }
        if (e.life <= 0) combat.effects.splice(ei, 1);
      } else if (e.type === "laser" || e.type === "orbital") {
        e.life -= dt;
        var range = e.range || 700;
        var x2 = e.x + Math.cos(e.angle) * range, y2 = e.y + Math.sin(e.angle) * range;
        for (var k = 0; k < targets.length; k++) {
          var sh = targets[k];
          if (!sh || sh.hp <= 0) continue;
          if (sh.netId === e.ownerId || sh.id === e.ownerId) continue;
          if (friendly(e.team, sh.team)) continue;
          if (segmentHit(e.x, e.y, x2, y2, sh.x, sh.y, (sh.radius || 18) + (e.width || 3))) {
            applyDamage(sh, e.dmg * (e.type === "orbital" ? dt * 2 : 1), e.team, e.ownerId);
            combat.spawnParticle(sh.x, sh.y, e.color || "#00f5ff", 4, 60);
          }
        }
        if (e.life <= 0) combat.effects.splice(ei, 1);
      } else if (e.type === "empRing") {
        e.r += (e.maxR / 0.45) * dt; e.life -= dt;
        if (e.r >= e.maxR * 0.5 && !e.applied) {
          e.applied = true;
          for (var m = 0; m < targets.length; m++) {
            var tg = targets[m];
            if (!tg || Math.hypot(tg.x - e.x, tg.y - e.y) > e.maxR) continue;
            if (tg.netId === e.ownerId) continue;
            if (friendly(e.team, tg.team)) continue;
            tg.empUntil = now + 3.5;
            applyDamage(tg, 8, e.team, e.ownerId);
            if (tg === localPlayer && loadout) loadout.empUntil = now + 3.5;
          }
        }
        if (e.life <= 0) combat.effects.splice(ei, 1);
      } else {
        e.life -= dt;
        if (e.life <= 0) combat.effects.splice(ei, 1);
      }
    }
    combat.mines.forEach(function (m) {
      if (!m.alive) return;
      if (m.arm > 0) { m.arm -= dt; return; }
      for (var i = 0; i < targets.length; i++) {
        var t = targets[i];
        if (!t || t.hp <= 0 || t.netId === m.ownerId) continue;
        if (friendly(m.team, t.team)) continue;
        if (Math.hypot(t.x - m.x, t.y - m.y) < m.aoe * 0.55) {
          explodeAt(combat, m.x, m.y, m.aoe, m.dmg, m.ownerId, m.team, targets);
          m.alive = false; break;
        }
      }
    });
    combat.mines.releaseDead(function (m) { return !m.alive; });
    combat.decoys.forEach(function (d) {
      if (!d.alive) return;
      d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt;
      if (d.life <= 0) d.alive = false;
    });
    combat.decoys.releaseDead(function (d) { return !d.alive; });
    combat.particles.forEach(function (p) {
      if (!p.alive) return;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; p.life -= dt;
      if (p.life <= 0) p.alive = false;
    });
    combat.particles.releaseDead(function (p) { return !p.alive; });
  }
  global.WWNCombatUpdate = { update: updateCombat, applyDamage: applyDamage, friendly: friendly };
})(typeof window !== "undefined" ? window : globalThis);
