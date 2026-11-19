(function (global) {
  "use strict";

  function MapHazards() {
    var C = global.WWNConfig;
    this.asteroids = [];
    this.zones = [];
    this.pickups = [];
    this.portals = [];
    this.debris = [];
    this.rings = [];
    this.turrets = [];
    var i;

    for (i = 0; i < 36; i++) {
      var moving = Math.random() < 0.35;
      this.asteroids.push({
        x: (Math.random() - 0.5) * C.WORLD_SIZE * 0.9,
        y: (Math.random() - 0.5) * C.WORLD_SIZE * 0.9,
        r: 22 + Math.random() * 60,
        spin: (Math.random() - 0.5) * 1.2,
        angle: Math.random() * Math.PI * 2,
        hp: 35 + Math.random() * 70,
        vx: moving ? (Math.random() - 0.5) * 60 : 0,
        vy: moving ? (Math.random() - 0.5) * 60 : 0,
      });
    }

    var kinds = [
      "boost", "damage", "heal", "emp", "gold",
      "slow", "wind", "gravity", "shield", "overheat",
    ];
    for (i = 0; i < 16; i++) {
      this.zones.push({
        x: (Math.random() - 0.5) * C.WORLD_SIZE * 0.75,
        y: (Math.random() - 0.5) * C.WORLD_SIZE * 0.75,
        r: 70 + Math.random() * 90,
        kind: kinds[i % kinds.length],
        pulse: Math.random() * Math.PI * 2,
        wx: Math.cos(i * 1.7) * 220,
        wy: Math.sin(i * 1.7) * 220,
      });
    }

    for (i = 0; i < 3; i++) {
      var ax = (Math.random() - 0.5) * C.WORLD_SIZE * 0.6;
      var ay = (Math.random() - 0.5) * C.WORLD_SIZE * 0.6;
      var bx = (Math.random() - 0.5) * C.WORLD_SIZE * 0.6;
      var by = (Math.random() - 0.5) * C.WORLD_SIZE * 0.6;
      this.portals.push({ x: ax, y: ay, pair: i, r: 36, cool: 0, hue: i });
      this.portals.push({ x: bx, y: by, pair: i, r: 36, cool: 0, hue: i });
    }

    for (i = 0; i < 8; i++) {
      this.debris.push({
        x: (Math.random() - 0.5) * C.WORLD_SIZE * 0.8,
        y: (Math.random() - 0.5) * C.WORLD_SIZE * 0.8,
        r: 120 + Math.random() * 100,
        pulse: Math.random() * 10,
      });
    }

    for (i = 0; i < 10; i++) {
      this.rings.push({
        x: (Math.random() - 0.5) * C.WORLD_SIZE * 0.7,
        y: (Math.random() - 0.5) * C.WORLD_SIZE * 0.7,
        r: 40 + Math.random() * 20,
        angle: Math.random() * Math.PI * 2,
        spin: 0.8 + Math.random(),
        active: true,
        respawn: 0,
      });
    }

    for (i = 0; i < 4; i++) {
      this.turrets.push({
        x: (Math.random() - 0.5) * C.WORLD_SIZE * 0.55,
        y: (Math.random() - 0.5) * C.WORLD_SIZE * 0.55,
        angle: 0,
        cd: 1 + Math.random(),
        range: 420,
        hp: 80,
      });
    }

    this._spawnPickups(16);
    this._playerPortalCd = 0;
  }

  MapHazards.prototype._spawnPickups = function (n) {
    var C = global.WWNConfig;
    var kinds = ["hp", "boost", "ammo", "score", "shield"];
    for (var i = 0; i < n; i++) {
      this.pickups.push({
        x: (Math.random() - 0.5) * C.WORLD_SIZE * 0.8,
        y: (Math.random() - 0.5) * C.WORLD_SIZE * 0.8,
        kind: kinds[Math.floor(Math.random() * kinds.length)],
        bob: Math.random() * Math.PI * 2,
      });
    }
  };

  MapHazards.prototype.update = function (dt, player, combat, scoreApi) {
    var C = global.WWNConfig;
    var half = C.WORLD_SIZE / 2;
    this._playerPortalCd = Math.max(0, this._playerPortalCd - dt);

    this.asteroids.forEach(function (a) {
      a.angle += a.spin * dt;
      a.x += (a.vx || 0) * dt;
      a.y += (a.vy || 0) * dt;
      if (a.x < -half) a.x = half;
      if (a.x > half) a.x = -half;
      if (a.y < -half) a.y = half;
      if (a.y > half) a.y = -half;

      if (player && player.alive) {
        var d = Math.hypot(player.x - a.x, player.y - a.y);
        if (d < a.r + player.radius) {
          var nx = (player.x - a.x) / (d || 1), ny = (player.y - a.y) / (d || 1);
          player.vx += nx * 200; player.vy += ny * 200;
          player.x = a.x + nx * (a.r + player.radius + 2);
          player.y = a.y + ny * (a.r + player.radius + 2);
          player.hp = Math.max(0, player.hp - 10 * dt);
        }
      }
      if (combat) {
        combat.projectiles.forEach(function (p) {
          if (!p.alive) return;
          if (Math.hypot(p.x - a.x, p.y - a.y) < a.r) {
            a.hp -= p.dmg || 5;
            p.alive = false;
            combat.spawnParticle(p.x, p.y, "#aaa", 5, 70);
            if (a.hp <= 0) {
              a.hp = 35 + Math.random() * 70;
              a.x = (Math.random() - 0.5) * C.WORLD_SIZE * 0.9;
              a.y = (Math.random() - 0.5) * C.WORLD_SIZE * 0.9;
              if (scoreApi) scoreApi.add(15, "asteroid");
              combat.spawnParticle(a.x, a.y, "#ff8c42", 18, 130);
            }
          }
        });
      }
    });

    this.zones.forEach(function (z) {
      z.pulse += dt * 2;
      if (!player || !player.alive) return;
      if (Math.hypot(player.x - z.x, player.y - z.y) >= z.r) return;
      if (z.kind === "boost") player.boost = Math.min(100, player.boost + 28 * dt);
      if (z.kind === "heal") player.hp = Math.min(100, player.hp + 10 * dt);
      if (z.kind === "damage") player.hp = Math.max(0, player.hp - 14 * dt);
      if (z.kind === "gold" && scoreApi) scoreApi.add(6 * dt, "zone");
      if (z.kind === "slow") { player.vx *= Math.exp(-2.2 * dt); player.vy *= Math.exp(-2.2 * dt); }
      if (z.kind === "wind") { player.vx += z.wx * dt; player.vy += z.wy * dt; }
      if (z.kind === "gravity") {
        var gdx = z.x - player.x, gdy = z.y - player.y;
        var gd = Math.hypot(gdx, gdy) || 1;
        player.vx += (gdx / gd) * 280 * dt;
        player.vy += (gdy / gd) * 280 * dt;
      }
      if (z.kind === "shield") player.hp = Math.min(100, player.hp + 4 * dt);
      if (z.kind === "overheat") player.hp = Math.max(0, player.hp - 5 * dt);
      if (z.kind === "emp" && Math.random() < 0.008) {
        if (!player.empUntil || player.empUntil < performance.now() / 1000) {
          player.empUntil = performance.now() / 1000 + 1.0;
        }
      }
    });

    this.debris.forEach(function (d) {
      d.pulse += dt;
      if (!player || !player.alive) return;
      if (Math.hypot(player.x - d.x, player.y - d.y) < d.r) {
        player.vx *= Math.exp(-1.4 * dt);
        player.vy *= Math.exp(-1.4 * dt);
        player.hp = Math.max(0, player.hp - 3 * dt);
      }
    });

    if (player && player.alive && this._playerPortalCd <= 0) {
      for (var pi = 0; pi < this.portals.length; pi++) {
        var portal = this.portals[pi];
        if (Math.hypot(player.x - portal.x, player.y - portal.y) < portal.r) {
          for (var pj = 0; pj < this.portals.length; pj++) {
            if (pj === pi) continue;
            if (this.portals[pj].pair === portal.pair) {
              player.x = this.portals[pj].x + Math.cos(player.angle) * 50;
              player.y = this.portals[pj].y + Math.sin(player.angle) * 50;
              this._playerPortalCd = 2.5;
              if (combat) combat.spawnParticle(player.x, player.y, "#c77dff", 20, 140);
              if (scoreApi) scoreApi.add(5, "portal");
              break;
            }
          }
          break;
        }
      }
    }

    this.rings.forEach(function (ring) {
      ring.angle += ring.spin * dt;
      if (!ring.active) {
        ring.respawn -= dt;
        if (ring.respawn <= 0) {
          ring.active = true;
          ring.x = (Math.random() - 0.5) * C.WORLD_SIZE * 0.7;
          ring.y = (Math.random() - 0.5) * C.WORLD_SIZE * 0.7;
        }
        return;
      }
      if (!player || !player.alive) return;
      if (Math.hypot(player.x - ring.x, player.y - ring.y) < ring.r) {
        ring.active = false;
        ring.respawn = 12 + Math.random() * 8;
        if (scoreApi) scoreApi.add(40, "ring");
        if (combat) combat.spawnParticle(ring.x, ring.y, "#ffd700", 16, 120);
      }
    });

    this.turrets.forEach(function (t) {
      if (t.hp <= 0) return;
      t.cd -= dt;
      if (!player || !player.alive) return;
      var d = Math.hypot(player.x - t.x, player.y - t.y);
      if (d < t.range) {
        t.angle = Math.atan2(player.y - t.y, player.x - t.x);
        if (t.cd <= 0 && combat && combat.projectiles.live.length < C.MAX_PROJECTILES) {
          t.cd = 1.1 + Math.random() * 0.4;
          var p = combat.projectiles.acquire();
          p.alive = true; p.type = "vulcan";
          p.x = t.x; p.y = t.y;
          p.angle = t.angle;
          p.vx = Math.cos(t.angle) * 520;
          p.vy = Math.sin(t.angle) * 520;
          p.life = 1.4; p.maxLife = 1.4; p.dmg = 4;
          p.ownerId = "map-turret"; p.team = "NONE";
          p.radius = 3; p.aoe = 0; p.color = "#ff6666";
          p.targetId = null; p.turn = 0; p.split = 0;
        }
      }
      if (combat) {
        combat.projectiles.forEach(function (p) {
          if (!p.alive || p.ownerId === "map-turret") return;
          if (Math.hypot(p.x - t.x, p.y - t.y) < 28) {
            t.hp -= p.dmg || 5;
            p.alive = false;
            if (t.hp <= 0) {
              if (scoreApi) scoreApi.add(60, "turret");
              combat.spawnParticle(t.x, t.y, "#ff4444", 24, 150);
              setTimeout(function () {
                t.hp = 80;
                t.x = (Math.random() - 0.5) * C.WORLD_SIZE * 0.55;
                t.y = (Math.random() - 0.5) * C.WORLD_SIZE * 0.55;
              }, 20000);
            }
          }
        });
      }
    });

    for (var i = this.pickups.length - 1; i >= 0; i--) {
      var pu = this.pickups[i];
      pu.bob += dt * 3;
      if (!player || !player.alive) continue;
      if (Math.hypot(player.x - pu.x, player.y - pu.y) < 28) {
        if (pu.kind === "hp") player.hp = Math.min(100, player.hp + 28);
        if (pu.kind === "boost") player.boost = Math.min(100, player.boost + 45);
        if (pu.kind === "ammo" && scoreApi && scoreApi.refillAmmo) scoreApi.refillAmmo();
        if (pu.kind === "score" && scoreApi) scoreApi.add(50, "pickup");
        if (pu.kind === "shield") player.hp = Math.min(100, player.hp + 15);
        if (combat) combat.spawnParticle(pu.x, pu.y, "#ffd700", 12, 100);
        this.pickups.splice(i, 1);
        var mh = this;
        setTimeout(function () { mh._spawnPickups(1); }, 7000 + Math.random() * 6000);
      }
    }
  };

  MapHazards.prototype.draw = function (ctx, cam) {
    var w = cam.w, h = cam.h;
    function sx(x) { return x - cam.x + w / 2; }
    function sy(y) { return y - cam.y + h / 2; }

    this.debris.forEach(function (d) {
      var x = sx(d.x), y = sy(d.y);
      if (x < -d.r || x > w + d.r || y < -d.r || y > h + d.r) return;
      ctx.beginPath();
      ctx.arc(x, y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(140,130,110," + (0.06 + 0.03 * Math.sin(d.pulse)) + ")";
      ctx.fill();
    });

    var colMap = {
      boost: "0,245,255", heal: "80,255,120", damage: "255,45,100",
      emp: "180,100,255", gold: "255,215,0", slow: "100,160,255",
      wind: "200,230,255", gravity: "120,60,180", shield: "100,255,200",
      overheat: "255,120,40",
    };
    this.zones.forEach(function (z) {
      var x = sx(z.x), y = sy(z.y);
      if (x < -z.r || x > w + z.r || y < -z.r || y > h + z.r) return;
      var a = 0.11 + 0.06 * Math.sin(z.pulse);
      var col = colMap[z.kind] || "200,200,200";
      ctx.beginPath(); ctx.arc(x, y, z.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + col + "," + a + ")"; ctx.fill();
      ctx.strokeStyle = "rgba(" + col + ",0.4)"; ctx.lineWidth = 2; ctx.stroke();
    });

    this.portals.forEach(function (p) {
      var x = sx(p.x), y = sy(p.y);
      if (x < -50 || x > w + 50 || y < -50 || y > h + 50) return;
      var pulse = 0.5 + 0.3 * Math.sin(performance.now() / 300 + p.hue);
      ctx.beginPath();
      ctx.arc(x, y, p.r * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(180,100,255," + (0.5 + pulse * 0.3) + ")";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, p.r * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(120,40,200,0.35)";
      ctx.fill();
    });

    this.rings.forEach(function (ring) {
      if (!ring.active) return;
      var x = sx(ring.x), y = sy(ring.y);
      if (x < -40 || x > w + 40 || y < -40 || y > h + 40) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ring.angle);
      ctx.strokeStyle = "rgba(255,215,0,0.75)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, ring.r, ring.r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    this.turrets.forEach(function (t) {
      if (t.hp <= 0) return;
      var x = sx(t.x), y = sy(t.y);
      if (x < -40 || x > w + 40 || y < -40 || y > h + 40) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = "rgba(80,80,90,0.9)";
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(t.angle);
      ctx.fillStyle = "#ff6666";
      ctx.fillRect(0, -4, 22, 8);
      ctx.restore();
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
        p.kind === "ammo" ? "#ffd700" : p.kind === "shield" ? "#80ffc8" : "#9b5de5";
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke();
    });
  };

  global.WWNMapHazards = MapHazards;
})(typeof window !== "undefined" ? window : globalThis);
