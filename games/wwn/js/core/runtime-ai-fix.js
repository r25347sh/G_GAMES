(function () {
  "use strict";

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
      if (!b || !b.alive) continue;
      if (b._remoteAlly && b._tx != null) {
        var age = Math.min(0.2, Math.max(0, tnow - (b._snapT || tnow)));
        var ex = b._tx + (b._tvx || 0) * age;
        var ey = b._ty + (b._tvy || 0) * age;
        var k = Math.min(1, 16 * dt);
        b.x += (ex - b.x) * k;
        b.y += (ey - b.y) * k;
        var ad = (b._tangle || b.angle || 0) - (b.angle || 0);
        while (ad > Math.PI) ad -= Math.PI * 2;
        while (ad < -Math.PI) ad += Math.PI * 2;
        b.angle = (b.angle || 0) + ad * k;
      }
    }
  }
  requestAnimationFrame(smoothFrame);

  var FORM = {
    guardian: { dist: 90,  angle: Math.PI * 0.85, engage: 280 },
    medic:    { dist: 70,  angle: Math.PI,        engage: 200 },
    striker:  { dist: 140, angle: Math.PI * 0.5,  engage: 520 },
    phantom:  { dist: 160, angle: -Math.PI * 0.5, engage: 480 },
    vanguard: { dist: 110, angle: 0.3,            engage: 420 }
  };

  function patchAllyBehavior() {
    if (!window.WWNAiPilot || !WWNAiPilot.prototype || WWNAiPilot.prototype.__allyForm) return;
    var oUp = WWNAiPilot.prototype.update;
    if (!oUp) return;
    WWNAiPilot.prototype.update = function (dt, player, combat, now, entities) {
      if (this._remoteAlly) return;
      if (this.isAlly && player && player.alive) {
        this.ownerId = player.netId;
        this.leaderId = player.netId;
        this.team = player.team;
        this.group = "ALLY";
        var role = this.allyType || "striker";
        var f = FORM[role] || FORM.striker;
        var hx = player.x + Math.cos(player.angle + f.angle) * f.dist;
        var hy = player.y + Math.sin(player.angle + f.angle) * f.dist;
        var dx = hx - this.x, dy = hy - this.y;
        var fd = Math.hypot(dx, dy);
        var tgt = null, best = f.engage;
        var list = entities || [];
        for (var i = 0; i < list.length; i++) {
          var e = list[i];
          if (!e || !e.alive || e.isAlly || e.group === "ALLY") continue;
          if (e.team && e.team === player.team) continue;
          var d = Math.hypot(e.x - player.x, e.y - player.y);
          if (d < best) { best = d; tgt = e; }
        }
        if (role === "medic") {
          if (player.hp < (player.hpMax || 560) * 0.9 && fd < 120) {
            player.hp = Math.min(player.hpMax || 560, player.hp + 6 * dt);
          }
          tgt = null;
          this.dmgMul = 0.25;
        } else if (role === "guardian") {
          this.dmgMul = Math.min(this.dmgMul || 0.5, 0.55);
          if (!tgt || best > 220) tgt = null;
        } else {
          this.dmgMul = Math.min(this.dmgMul || 0.65, 0.7);
        }
        this._target = tgt;
        if (tgt) {
          var desired = Math.atan2(tgt.y - this.y, tgt.x - this.x);
          var ad2 = desired - this.angle;
          while (ad2 > Math.PI) ad2 -= Math.PI * 2;
          while (ad2 < -Math.PI) ad2 += Math.PI * 2;
          this.angle += Math.max(-3.5 * dt, Math.min(3.5 * dt, ad2));
          var sp = ((window.WWNConfig && WWNConfig.MAX_SPEED) || 420) * 0.95;
          this.vx = Math.cos(this.angle) * sp;
          this.vy = Math.sin(this.angle) * sp;
          this.x += this.vx * dt;
          this.y += this.vy * dt;
          this.fireCd = (this.fireCd || 0) - dt;
          if (this.fireCd <= 0 && combat && combat.projectiles && combat.projectiles.acquire) {
            var distT = Math.hypot(tgt.x - this.x, tgt.y - this.y);
            if (distT < (this.attackRange || 700) && Math.abs(ad2) < 0.6) {
              var p = combat.projectiles.acquire();
              var w = (window.WWNWeapons && WWNWeapons.vulcan) || { speed: 800, dmg: 5, radius: 3 };
              p.alive = true; p.type = "bullet";
              p.x = this.x; p.y = this.y; p.angle = this.angle;
              p.vx = Math.cos(this.angle) * (w.speed || 800);
              p.vy = Math.sin(this.angle) * (w.speed || 800);
              p.life = 0.9; p.dmg = (w.dmg || 5) * (this.dmgMul || 0.6);
              p.ownerId = this.ownerId || player.netId;
              p.team = player.team;
              p.radius = w.radius || 3; p.aoe = 0; p.color = this.colorStroke || "#6effc0";
              this.fireCd = role === "striker" ? 0.22 : 0.35;
            }
          }
          return;
        }
        if (fd > 18) {
          var desired2 = Math.atan2(dy, dx);
          var ad3 = desired2 - this.angle;
          while (ad3 > Math.PI) ad3 -= Math.PI * 2;
          while (ad3 < -Math.PI) ad3 += Math.PI * 2;
          this.angle += Math.max(-4 * dt, Math.min(4 * dt, ad3));
          var sp2 = Math.min(420, 180 + fd * 1.8);
          this.vx = Math.cos(this.angle) * sp2;
          this.vy = Math.sin(this.angle) * sp2;
          this.x += this.vx * dt;
          this.y += this.vy * dt;
        } else {
          this.vx *= 0.85; this.vy *= 0.85;
          this.angle = player.angle;
        }
        return;
      }
      return oUp.call(this, dt, player, combat, now, entities);
    };
    WWNAiPilot.prototype.__allyForm = true;
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
          b.vx = 0; b.vy = 0;
        }
      } else {
        aliveEnemy++;
      }
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
    patchAllyBehavior();
    tickWorld();
  }, 250);
})();
