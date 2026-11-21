(function () {
  "use strict";

  window.__wwnAllyFocus = window.__wwnAllyFocus || null;
  window.__wwnAllyFocusT = 0;

  var _last = performance.now();
  function smoothFrame(now) {
    requestAnimationFrame(smoothFrame);
    var dt = Math.min(0.05, (now - _last) / 1000);
    _last = now;
    var list = window.__wwnAiList;
    if (!list) return;
    var tnow = now / 1000;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || !b.alive || !b._remoteAlly || b._tx == null) continue;
      var age = Math.min(0.18, Math.max(0, tnow - (b._snapT || tnow)));
      var ex = b._tx + (b._tvx || 0) * age;
      var ey = b._ty + (b._tvy || 0) * age;
      var k = Math.min(1, 18 * dt);
      b.x += (ex - b.x) * k;
      b.y += (ey - b.y) * k;
      var ad = (b._tangle || b.angle || 0) - (b.angle || 0);
      while (ad > Math.PI) ad -= Math.PI * 2;
      while (ad < -Math.PI) ad += Math.PI * 2;
      b.angle = (b.angle || 0) + ad * k;
    }
  }
  requestAnimationFrame(smoothFrame);

  function angDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }
  function dist(a, b) {
    return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
  }
  function turnToward(self, ang, rate, dt) {
    var d = angDiff(ang, self.angle || 0);
    var m = rate * dt;
    if (Math.abs(d) <= m) self.angle = ang;
    else self.angle = (self.angle || 0) + Math.sign(d) * m;
  }
  function moveToward(self, tx, ty, speed, dt) {
    var a = Math.atan2(ty - self.y, tx - self.x);
    turnToward(self, a, 5.5, dt);
    self.vx = Math.cos(self.angle) * speed;
    self.vy = Math.sin(self.angle) * speed;
    self.x += self.vx * dt;
    self.y += self.vy * dt;
  }
  function fireAt(self, tgt, combat, player, dt, rate, dmgMul) {
    self.fireCd = (self.fireCd || 0) - dt;
    if (self.fireCd > 0 || !combat || !combat.projectiles || !combat.projectiles.acquire) return;
    var a = Math.atan2(tgt.y - self.y, tgt.x - self.x);
    if (Math.abs(angDiff(a, self.angle)) > 0.55) return;
    if (dist(self, tgt) > (self.attackRange || 750)) return;
    var p = combat.projectiles.acquire();
    var w = (window.WWNWeapons && WWNWeapons.vulcan) || { speed: 820, dmg: 5, radius: 3 };
    p.alive = true; p.type = "bullet";
    p.x = self.x; p.y = self.y; p.angle = self.angle;
    p.vx = Math.cos(self.angle) * (w.speed || 820);
    p.vy = Math.sin(self.angle) * (w.speed || 820);
    p.life = 0.95; p.dmg = (w.dmg || 5) * (dmgMul || 0.65);
    p.ownerId = self.ownerId || (player && player.netId);
    p.team = (player && player.team) || self.team;
    p.radius = 3; p.aoe = 0; p.color = self.colorStroke || "#6effc0";
    self.fireCd = rate || 0.28;
  }

  function updateSquadFocus(player, entities) {
    var now = performance.now() / 1000;
    var cur = window.__wwnAllyFocus;
    if (cur && cur.alive && (cur.hp || 0) > 0 && dist(player, cur) < 900) {
      if (now - (window.__wwnAllyFocusT || 0) < 1.4) return cur;
    }
    var best = null, score = 1e12;
    for (var i = 0; i < entities.length; i++) {
      var e = entities[i];
      if (!e || !e.alive || e.isAlly || e.group === "ALLY") continue;
      if (e.team && player.team && e.team === player.team) continue;
      var d = dist(player, e);
      if (d > 950) continue;
      var s = d + (e.hp || 100) * 0.35;
      if ((e.hp || 100) < 80) s *= 0.7;
      if (s < score) { score = s; best = e; }
    }
    window.__wwnAllyFocus = best;
    window.__wwnAllyFocusT = now;
    return best;
  }

  function patchAllyBrain() {
    if (!window.WWNAiPilot || !WWNAiPilot.prototype || WWNAiPilot.prototype.__smartAlly) return;
    var oUp = WWNAiPilot.prototype.update;
    if (!oUp) return;

    WWNAiPilot.prototype.update = function (dt, player, combat, now, entities) {
      if (this._remoteAlly) return;
      if (!(this.isAlly && player && player.alive)) {
        return oUp.call(this, dt, player, combat, now, entities);
      }

      this.ownerId = player.netId;
      this.team = player.team;
      this.group = "ALLY";
      var role = this.allyType || "striker";
      var list = entities || window.__wwnAiList || [];
      var focus = updateSquadFocus(player, list);

      var allies = [];
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].isAlly && list[i].alive && !list[i]._remoteAlly) allies.push(list[i]);
      }
      var idx = Math.max(0, allies.indexOf(this));
      var nAllies = Math.max(1, allies.length);

      if (role === "medic") {
        var bx = player.x - Math.cos(player.angle) * 95;
        var by = player.y - Math.sin(player.angle) * 95;
        moveToward(this, bx, by, 360, dt);
        if (dist(this, player) < 140) {
          player.hp = Math.min(player.hpMax || 560, (player.hp || 0) + 9 * dt);
        }
        if (focus && dist(player, focus) < 220) {
          turnToward(this, Math.atan2(focus.y - this.y, focus.x - this.x), 4, dt);
          fireAt(this, focus, combat, player, dt, 0.55, 0.35);
        }
        return;
      }

      if (role === "guardian") {
        if (focus) {
          var gx = player.x + (focus.x - player.x) * 0.28;
          var gy = player.y + (focus.y - player.y) * 0.28;
          moveToward(this, gx, gy, 400, dt);
          turnToward(this, Math.atan2(focus.y - this.y, focus.x - this.x), 5, dt);
          fireAt(this, focus, combat, player, dt, 0.32, 0.55);
        } else {
          var hx = player.x + Math.cos(player.angle + 1.2) * 85;
          var hy = player.y + Math.sin(player.angle + 1.2) * 85;
          moveToward(this, hx, hy, 340, dt);
        }
        return;
      }

      if (role === "hivemind") {
        var prey = focus;
        if (!prey) {
          var bestD = 1000;
          for (var j = 0; j < list.length; j++) {
            var e = list[j];
            if (!e || !e.alive || e.isAlly || e.group === "ALLY") continue;
            var dd = dist(this, e);
            if (dd < bestD) { bestD = dd; prey = e; }
          }
        }
        if (prey) {
          var ix = prey.x + (prey.vx || 0) * 0.35;
          var iy = prey.y + (prey.vy || 0) * 0.35;
          var away = Math.atan2(prey.y - player.y, prey.x - player.x);
          ix += Math.cos(away + Math.PI * 0.55) * 90;
          iy += Math.sin(away + Math.PI * 0.55) * 90;
          var dP = dist(this, prey);
          if (dP > 160) moveToward(this, ix, iy, 460, dt);
          else {
            var ca = Math.atan2(this.y - prey.y, this.x - prey.x) + 1.7 * dt;
            var cx = prey.x + Math.cos(ca) * 140;
            var cy = prey.y + Math.sin(ca) * 140;
            moveToward(this, cx, cy, 420, dt);
          }
          turnToward(this, Math.atan2(prey.y - this.y, prey.x - this.x), 6, dt);
          fireAt(this, prey, combat, player, dt, 0.18, 0.9);
        } else {
          moveToward(this, player.x + 100, player.y, 380, dt);
        }
        return;
      }

      if (!focus) {
        var slotAng = player.angle + (idx / nAllies) * Math.PI * 1.6 - 0.8;
        var slotR = role === "vanguard" ? 100 : role === "phantom" ? 150 : 120;
        moveToward(this,
          player.x + Math.cos(slotAng) * slotR,
          player.y + Math.sin(slotAng) * slotR,
          360, dt);
        return;
      }

      var base = Math.atan2(focus.y - player.y, focus.x - player.x);
      var spread = (idx - (nAllies - 1) / 2) * 0.55;
      if (role === "phantom") spread += 0.9;
      if (role === "vanguard") spread *= 0.4;
      if (role === "striker") spread -= 0.25;
      var attackAng = base + spread;
      var preferDist = role === "phantom" ? 220 : role === "vanguard" ? 130 : 170;
      if ((focus.hp || 100) < 60) preferDist = 110;
      var ax = focus.x - Math.cos(attackAng) * preferDist;
      var ay = focus.y - Math.sin(attackAng) * preferDist;

      var headOn = Math.abs(angDiff(Math.atan2(focus.y - this.y, focus.x - this.x), this.angle)) < 0.3;
      if (headOn && dist(this, focus) < 200 && role === "phantom") {
        ax += Math.cos(attackAng + Math.PI / 2) * 120;
        ay += Math.sin(attackAng + Math.PI / 2) * 120;
      }

      moveToward(this, ax, ay, role === "striker" ? 450 : 410, dt);
      turnToward(this, Math.atan2(focus.y - this.y, focus.x - this.x), 5.5, dt);
      var rate = role === "striker" ? 0.2 : role === "vanguard" ? 0.24 : 0.3;
      var dmg = role === "striker" ? 0.75 : 0.6;
      fireAt(this, focus, combat, player, dt, rate, dmg);
    };

    WWNAiPilot.prototype.__smartAlly = true;
  }

  function tickWorld() {
    var list = window.__wwnAiList;
    var player = window.__wwnPlayer;
    if (!list) return;
    var aliveEnemy = 0;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || b._remoteAlly) continue;
      if (b.isAlly) {
        b.group = "ALLY";
        if (player) {
          b.ownerId = b.ownerId || player.netId;
          b.team = b.team || player.team;
        }
        continue;
      }
      if (b.alive && (b.hp || 0) <= 0) {
        b.alive = false;
        b.respawnTimer = 2.0 + Math.random() * 1.2;
      }
      if (!b.alive) {
        b.respawnTimer = (b.respawnTimer || 0) - 0.25;
        if (b.respawnTimer <= 0) {
          b.alive = true;
          b.hp = b.hpMax || 180;
          b._target = null;
          if (player) {
            var a = Math.random() * Math.PI * 2, r = 700 + Math.random() * 1100;
            b.x = player.x + Math.cos(a) * r;
            b.y = player.y + Math.sin(a) * r;
          }
        }
      } else aliveEnemy++;
    }
    if (aliveEnemy < 48 && list.length < 90 && window.WWNAiPilot && player) {
      try {
        var groups = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"];
        var nb = new WWNAiPilot("cpu-rf-" + Date.now() + "-" + list.length, "easy", list.length, groups[list.length % 7]);
        nb.hp *= 0.8; nb.hpMax *= 0.8;
        var ar = Math.random() * Math.PI * 2, rr = 900 + Math.random() * 1400;
        nb.x = player.x + Math.cos(ar) * rr;
        nb.y = player.y + Math.sin(ar) * rr;
        list.push(nb);
      } catch (e) {}
    }
  }

  setInterval(function () {
    patchAllyBrain();
    tickWorld();
  }, 200);
})();
