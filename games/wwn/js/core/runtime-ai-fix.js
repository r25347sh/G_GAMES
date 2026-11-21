(function () {
  "use strict";
  window.__wwnAllyFocus = null;
  window.__wwnAllyFocusT = 0;

  function dist(a, b) {
    return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
  }
  function angDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }
  function turnTo(self, ang, dt) {
    var d = angDiff(ang, self.angle || 0);
    var m = 4.2 * dt;
    self.angle = Math.abs(d) <= m ? ang : (self.angle || 0) + Math.sign(d) * m;
  }
  function selfHold(self, dt) {
    self.vx *= 0.75; self.vy *= 0.75;
    self.x += self.vx * dt; self.y += self.vy * dt;
  }
  function holdOrMove(self, tx, ty, dt, maxSp) {
    var d = Math.hypot(tx - self.x, ty - self.y);
    if (d < 28) {
      selfHold(self, dt);
      return d;
    }
    var a = Math.atan2(ty - self.y, tx - self.x);
    turnTo(self, a, dt);
    var sp = Math.min(maxSp || 320, 80 + d * 1.6);
    self.vx = Math.cos(self.angle) * sp;
    self.vy = Math.sin(self.angle) * sp;
    self.x += self.vx * dt; self.y += self.vy * dt;
    return d;
  }
  function shoot(self, tgt, combat, player, dt, rate, dmgMul) {
    self.fireCd = (self.fireCd || 0) - dt;
    if (self.fireCd > 0 || !tgt || !combat || !combat.projectiles || !combat.projectiles.acquire) return;
    var a = Math.atan2(tgt.y - self.y, tgt.x - self.x);
    turnTo(self, a, dt);
    if (Math.abs(angDiff(a, self.angle)) > 0.45) return;
    if (dist(self, tgt) > 720) return;
    var p = combat.projectiles.acquire();
    var w = (window.WWNWeapons && WWNWeapons.vulcan) || { speed: 900, dmg: 9 };
    p.alive = true; p.type = "bullet";
    p.x = self.x; p.y = self.y; p.angle = self.angle;
    p.vx = Math.cos(self.angle) * (w.speed || 900);
    p.vy = Math.sin(self.angle) * (w.speed || 900);
    p.life = 1; p.dmg = (w.dmg || 9) * (dmgMul || 0.7);
    p.ownerId = self.ownerId || (player && player.netId);
    p.team = (player && player.team) || self.team;
    p.radius = 3; p.color = self.colorStroke || "#6effc0";
    self.fireCd = rate || 0.3;
  }

  function pickFocus(player, list) {
    var now = performance.now() / 1000;
    var cur = window.__wwnAllyFocus;
    if (cur && cur.alive && (cur.hp || 0) > 0 && dist(player, cur) < 850) {
      if (now - (window.__wwnAllyFocusT || 0) < 2.0) return cur;
    }
    var best = null, sc = 1e12;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e || !e.alive || e.isAlly || e.group === "ALLY") continue;
      if (e.team && player.team && e.team === player.team) continue;
      var d = dist(player, e);
      if (d > 900) continue;
      var s = d + (e.hp || 100) * 0.4;
      if ((e.hp || 100) < 70) s *= 0.65;
      if (s < sc) { sc = s; best = e; }
    }
    window.__wwnAllyFocus = best;
    window.__wwnAllyFocusT = now;
    return best;
  }

  function patchAlly() {
    if (!window.WWNAiPilot || !WWNAiPilot.prototype || WWNAiPilot.prototype.__calmSmart) return;
    var oUp = WWNAiPilot.prototype.update;
    if (!oUp) return;
    WWNAiPilot.prototype.update = function (dt, player, combat, now, entities) {
      if (this._remoteAlly) return;
      if (!(this.isAlly && player && player.alive)) return oUp.call(this, dt, player, combat, now, entities);

      this.ownerId = player.netId;
      this.team = player.team;
      this.group = "ALLY";
      var role = this.allyType || "striker";
      var list = entities || window.__wwnAiList || [];
      var focus = pickFocus(player, list);

      if (role === "guardian") {
        if (focus) {
          var gx = player.x * 0.55 + focus.x * 0.45;
          var gy = player.y * 0.55 + focus.y * 0.45;
          gx = player.x + (gx - player.x) * 0.7;
          gy = player.y + (gy - player.y) * 0.7;
          holdOrMove(this, gx, gy, dt, 280);
          shoot(this, focus, combat, player, dt, 0.28, 0.65);
        } else {
          holdOrMove(this,
            player.x + Math.cos(player.angle + 1.0) * 70,
            player.y + Math.sin(player.angle + 1.0) * 70,
            dt, 240);
        }
        return;
      }

      if (role === "medic") {
        holdOrMove(this,
          player.x - Math.cos(player.angle) * 90,
          player.y - Math.sin(player.angle) * 90,
          dt, 260);
        if (dist(this, player) < 130) {
          player.hp = Math.min(player.hpMax || 560, (player.hp || 0) + 10 * dt);
        }
        if (focus && dist(player, focus) < 200) {
          shoot(this, focus, combat, player, dt, 0.5, 0.35);
        }
        return;
      }

      if (role === "hivemind") {
        var prey = focus;
        if (!prey) {
          var bd = 900;
          for (var i = 0; i < list.length; i++) {
            var e = list[i];
            if (!e || !e.alive || e.isAlly || e.group === "ALLY") continue;
            var dd = dist(this, e);
            if (dd < bd) { bd = dd; prey = e; }
          }
        }
        if (prey) {
          var ix = prey.x + (prey.vx || 0) * 0.4;
          var iy = prey.y + (prey.vy || 0) * 0.4;
          var away = Math.atan2(prey.y - player.y, prey.x - player.x);
          ix += Math.cos(away + 1.2) * 100;
          iy += Math.sin(away + 1.2) * 100;
          if (dist(this, prey) > 180) holdOrMove(this, ix, iy, dt, 400);
          else {
            selfHold(this, dt);
            turnTo(this, Math.atan2(prey.y - this.y, prey.x - this.x), dt);
          }
          shoot(this, prey, combat, player, dt, 0.2, 0.95);
        } else {
          holdOrMove(this, player.x + 80, player.y, dt, 300);
        }
        return;
      }

      if (!focus) {
        var ang = player.angle + (role === "phantom" ? -1.1 : role === "vanguard" ? 0.2 : 0.9);
        holdOrMove(this, player.x + Math.cos(ang) * 110, player.y + Math.sin(ang) * 110, dt, 260);
        return;
      }
      var base = Math.atan2(focus.y - player.y, focus.x - player.x);
      var offset = role === "phantom" ? 1.0 : role === "vanguard" ? 0.15 : -0.55;
      var prefer = role === "phantom" ? 210 : role === "vanguard" ? 140 : 175;
      if ((focus.hp || 100) < 55) prefer = 100;
      var ax = focus.x - Math.cos(base + offset) * prefer;
      var ay = focus.y - Math.sin(base + offset) * prefer;
      var dF = holdOrMove(this, ax, ay, dt, 360);
      if (dF < 40) {
        selfHold(this, dt);
        turnTo(this, Math.atan2(focus.y - this.y, focus.x - this.x), dt);
      }
      shoot(this, focus, combat, player, dt, role === "striker" ? 0.22 : 0.3, role === "striker" ? 0.8 : 0.65);
    };
    WWNAiPilot.prototype.__calmSmart = true;
  }

  var _last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - _last) / 1000); _last = now;
    var list = window.__wwnAiList; if (!list) return;
    var tnow = now / 1000;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || !b.alive || !b._remoteAlly || b._tx == null) continue;
      var age = Math.min(0.18, Math.max(0, tnow - (b._snapT || tnow)));
      var k = Math.min(1, 16 * dt);
      b.x += (b._tx + (b._tvx || 0) * age - b.x) * k;
      b.y += (b._ty + (b._tvy || 0) * age - b.y) * k;
    }
  }
  requestAnimationFrame(frame);
  setInterval(patchAlly, 200);
})();
