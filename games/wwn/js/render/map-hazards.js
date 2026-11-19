(function (global) {
  "use strict";
  function MapHazards() {
    var C = global.WWNConfig;
    this.asteroids = []; this.zones = []; this.pickups = [];
    var i;
    for (i = 0; i < 28; i++) {
      this.asteroids.push({
        x: (Math.random() - 0.5) * C.WORLD_SIZE * 0.9,
        y: (Math.random() - 0.5) * C.WORLD_SIZE * 0.9,
        r: 28 + Math.random() * 55, spin: (Math.random() - 0.5) * 0.8,
        angle: Math.random() * Math.PI * 2, hp: 40 + Math.random() * 60,
      });
    }
    var kinds = ["boost", "damage", "heal", "emp", "gold"];
    for (i = 0; i < 10; i++) {
      this.zones.push({
        x: (Math.random() - 0.5) * C.WORLD_SIZE * 0.7,
        y: (Math.random() - 0.5) * C.WORLD_SIZE * 0.7,
        r: 90 + Math.random() * 70, kind: kinds[i % kinds.length],
        pulse: Math.random() * Math.PI * 2,
      });
    }
    this._spawnPickups(12);
  }
  MapHazards.prototype._spawnPickups = function (n) {
    var C = global.WWNConfig;
    for (var i = 0; i < n; i++) {
      this.pickups.push({
        x: (Math.random() - 0.5) * C.WORLD_SIZE * 0.8,
        y: (Math.random() - 0.5) * C.WORLD_SIZE * 0.8,
        kind: ["hp", "boost", "ammo", "score"][Math.floor(Math.random() * 4)],
        life: 9999, bob: Math.random() * Math.PI * 2,
      });
    }
  };
  MapHazards.prototype.update = function (dt, player, combat, scoreApi) {
    this.asteroids.forEach(function (a) {
      a.angle += a.spin * dt;
      if (!player || !player.alive) return;
      var d = Math.hypot(player.x - a.x, player.y - a.y);
      if (d < a.r + player.radius) {
        var nx = (player.x - a.x) / (d || 1), ny = (player.y - a.y) / (d || 1);
        player.vx += nx * 180; player.vy += ny * 180;
        player.x = a.x + nx * (a.r + player.radius + 2);
        player.y = a.y + ny * (a.r + player.radius + 2);
        player.hp = Math.max(0, player.hp - 8 * dt);
      }
      if (combat) {
        combat.projectiles.forEach(function (p) {
          if (!p.alive) return;
          if (Math.hypot(p.x - a.x, p.y - a.y) < a.r) {
            a.hp -= p.dmg || 5; p.alive = false;
            combat.spawnParticle(p.x, p.y, "#aaa", 6, 80);
            if (a.hp <= 0) {
              a.hp = 40 + Math.random() * 60;
              a.x = (Math.random() - 0.5) * global.WWNConfig.WORLD_SIZE * 0.9;
              a.y = (Math.random() - 0.5) * global.WWNConfig.WORLD_SIZE * 0.9;
              if (scoreApi) scoreApi.add(15, "asteroid");
              combat.spawnParticle(a.x, a.y, "#ff8c42", 20, 140);
            }
          }
        });
      }
    });
    this.zones.forEach(function (z) {
      z.pulse += dt * 2;
      if (!player || !player.alive) return;
      if (Math.hypot(player.x - z.x, player.y - z.y) < z.r) {
        if (z.kind === "boost") player.boost = Math.min(100, player.boost + 25 * dt);
        if (z.kind === "heal") player.hp = Math.min(100, player.hp + 8 * dt);
        if (z.kind === "damage") player.hp = Math.max(0, player.hp - 12 * dt);
        if (z.kind === "gold" && scoreApi) scoreApi.add(5 * dt, "zone");
      }
    });
    for (var i = this.pickups.length - 1; i >= 0; i--) {
      var p = this.pickups[i];
      p.bob += dt * 3;
      if (!player || !player.alive) continue;
      if (Math.hypot(player.x - p.x, player.y - p.y) < 28) {
        if (p.kind === "hp") player.hp = Math.min(100, player.hp + 25);
        if (p.kind === "boost") player.boost = Math.min(100, player.boost + 40);
        if (p.kind === "ammo" && scoreApi && scoreApi.refillAmmo) scoreApi.refillAmmo();
        if (p.kind === "score" && scoreApi) scoreApi.add(50, "pickup");
        if (combat) combat.spawnParticle(p.x, p.y, "#ffd700", 12, 100);
        this.pickups.splice(i, 1);
        var mh = this;
        setTimeout(function () { mh._spawnPickups(1); }, 8000 + Math.random() * 6000);
      }
    }
  };
  MapHazards.prototype.draw = function (ctx, cam) {
    var w = cam.w, h = cam.h;
    function sx(x) { return x - cam.x + w / 2; }
    function sy(y) { return y - cam.y + h / 2; }
    this.zones.forEach(function (z) {
      var x = sx(z.x), y = sy(z.y);
      if (x < -z.r || x > w + z.r || y < -z.r || y > h + z.r) return;
      var a = 0.12 + 0.06 * Math.sin(z.pulse);
      var col = z.kind === "boost" ? "0,245,255" : z.kind === "heal" ? "80,255,120" :
        z.kind === "damage" ? "255,45,100" : z.kind === "emp" ? "180,100,255" : "255,215,0";
      ctx.beginPath(); ctx.arc(x, y, z.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + col + "," + a + ")"; ctx.fill();
      ctx.strokeStyle = "rgba(" + col + ",0.35)"; ctx.lineWidth = 2; ctx.stroke();
    });
    this.asteroids.forEach(function (a) {
      var x = sx(a.x), y = sy(a.y);
      if (x < -a.r || x > w + a.r || y < -a.r || y > h + a.r) return;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a.angle);
      ctx.beginPath();
      for (var i = 0; i < 7; i++) {
        var ang = (i / 7) * Math.PI * 2;
        var rr = a.r * (0.75 + 0.25 * Math.sin(i * 2.1));
        if (i === 0) ctx.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
        else ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(90,85,110,0.85)"; ctx.fill();
      ctx.strokeStyle = "rgba(200,200,220,0.35)"; ctx.stroke();
      ctx.restore();
    });
    this.pickups.forEach(function (p) {
      var x = sx(p.x), y = sy(p.y) + Math.sin(p.bob) * 4;
      if (x < -20 || x > w + 20 || y < -20 || y > h + 20) return;
      var col = p.kind === "hp" ? "#ff6bb5" : p.kind === "boost" ? "#00f5ff" :
        p.kind === "ammo" ? "#ffd700" : "#9b5de5";
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke();
    });
  };
  global.WWNMapHazards = MapHazards;
})(typeof window !== "undefined" ? window : globalThis);
