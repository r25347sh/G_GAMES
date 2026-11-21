(function () {
  "use strict";

  function smoothRemotes(dt) {
    var list = window.__wwnAiList;
    if (!list) return;
    var now = performance.now() / 1000;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || !b._remoteAlly || !b.alive) continue;
      if (b._tx == null) continue;
      var age = Math.min(0.25, Math.max(0, now - (b._snapT || now)));
      var tx = b._tx + (b._tvx || 0) * age;
      var ty = b._ty + (b._tvy || 0) * age;
      var k = Math.min(1, 14 * dt);
      if (Math.hypot((b.x || 0) - tx, (b.y || 0) - ty) > 400) k = 1;
      b.x = (b.x || tx) + (tx - (b.x || tx)) * k;
      b.y = (b.y || ty) + (ty - (b.y || ty)) * k;
      if (b._tangle != null) {
        var da = b._tangle - (b.angle || 0);
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        b.angle = (b.angle || 0) + da * Math.min(1, 10 * dt);
      }
      b.vx = b._tvx || 0;
      b.vy = b._tvy || 0;
      b.isAlly = true;
      b.group = "ALLY";
      b.alive = true;
    }
  }

  function patchOnAlly() {
    if (!window.WWNNetSync || !WWNNetSync.prototype || WWNNetSync.prototype.__wingFix) return;
    var orig = WWNNetSync.prototype._onAlly;
    if (!orig) return;
    WWNNetSync.prototype._onAlly = function (msg) {
      orig.call(this, msg);
      var bots = (msg && msg.bots) || [];
      var list = window.__wwnAiList;
      if (!list) return;
      var byId = {};
      for (var i = 0; i < list.length; i++) {
        if (list[i]) byId[String(list[i].netId || list[i].id)] = list[i];
      }
      for (var bi = 0; bi < bots.length; bi++) {
        var s = bots[bi];
        if (!s || !s.id) continue;
        var b = byId[String(s.id)];
        if (!b) continue;
        b._remoteAlly = true;
        b.isAlly = true;
        b.group = "ALLY";
        b.alive = true;
        b._tx = s.x; b._ty = s.y;
        b._tvx = s.vx || 0; b._tvy = s.vy || 0;
        b._tangle = s.a;
        b._snapT = performance.now() / 1000;
        if (b.x == null || Math.hypot(b.x - s.x, b.y - s.y) > 80) {
          b.x = s.x; b.y = s.y; b.angle = s.a || 0;
        }
        if (s.hp != null) b.hp = s.hp;
        if (s.hm) b.hpMax = s.hm;
        b.ownerId = s.owner || msg.owner;
        b.team = s.team || b.team;
        b.allyType = s.role || b.allyType || "striker";
      }
    };
    WWNNetSync.prototype.__wingFix = true;
  }

  function tagLocalWingmen() {
    var list = window.__wwnAiList;
    var p = window.__wwnPlayer;
    if (!list || !p) return;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || !b.isAlly || b._remoteAlly) continue;
      if (!b.ownerId) b.ownerId = p.netId;
      if (!b.netId && b.id) b.netId = b.id;
    }
  }

  function lighten() {
    var list = window.__wwnAiList;
    var p = window.__wwnPlayer;
    if (!list) return;
    var CAP = 55;
    if (list.length > CAP) {
      var extras = [];
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
        if (!b || b.isAlly || b._remoteAlly) continue;
        extras.push(b);
      }
      if (p && extras.length > 40) {
        extras.sort(function (a, c) {
          var da = Math.hypot((a.x || 0) - p.x, (a.y || 0) - p.y);
          var dc = Math.hypot((c.x || 0) - p.x, (c.y || 0) - p.y);
          return dc - da;
        });
        var remove = extras.slice(40);
        for (var r = 0; r < remove.length; r++) {
          var idx = list.indexOf(remove[r]);
          if (idx >= 0) list.splice(idx, 1);
        }
      }
    }
  }

  var frame = 0;
  function patchAiCull() {
    if (!window.WWNAiPilot || !WWNAiPilot.prototype || WWNAiPilot.prototype.__cull) return;
    var o = WWNAiPilot.prototype.update;
    if (!o) return;
    WWNAiPilot.prototype.update = function (dt, player, combat, now, entities) {
      if (this._remoteAlly) return;
      if (this.isAlly) return o.call(this, dt, player, combat, now, entities);
      if (player) {
        var d = Math.hypot((this.x || 0) - player.x, (this.y || 0) - player.y);
        if (d > 2200) {
          this.vx *= 0.9; this.vy *= 0.9;
          this.x += (this.vx || 0) * dt;
          this.y += (this.vy || 0) * dt;
          return;
        }
        if (d > 1400 && (frame & 1)) {
          this.x += (this.vx || 0) * dt;
          this.y += (this.vy || 0) * dt;
          return;
        }
      }
      return o.call(this, dt, player, combat, now, entities);
    };
    WWNAiPilot.prototype.__cull = true;
  }

  function patchParticles() {
    if (!window.WWNCombat || !WWNCombat.prototype || WWNCombat.prototype.__partCap) return;
    var o = WWNCombat.prototype.spawnParticle;
    if (!o) return;
    WWNCombat.prototype.spawnParticle = function (x, y, color, n, speed) {
      n = Math.min(n || 6, 8);
      if (this.particles && this.particles.live && this.particles.live.length > 80) return;
      return o.call(this, x, y, color, n, speed);
    };
    WWNCombat.prototype.__partCap = true;
  }

  var last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    frame++;
    smoothRemotes(dt);
    if ((frame & 15) === 0) {
      patchOnAlly();
      patchAiCull();
      patchParticles();
      tagLocalWingmen();
      lighten();
    }
  }
  requestAnimationFrame(loop);
  setInterval(function () {
    patchOnAlly();
    patchAiCull();
    patchParticles();
  }, 400);
})();
