(function (global) {
  "use strict";
  function World() {
    this.clouds = []; this.nebulae = []; this.aurora = [];
    var C = global.WWNConfig, i;
    for (i = 0; i < 56; i++) {
      this.clouds.push({
        x: (Math.random() - 0.5) * C.WORLD_SIZE, y: (Math.random() - 0.5) * C.WORLD_SIZE,
        r: 40 + Math.random() * 140, layer: Math.random() < 0.35 ? 0 : Math.random() < 0.7 ? 1 : 2,
        a: 0.06 + Math.random() * 0.12, tint: Math.floor(Math.random() * 4),
      });
    }
    var tints = [[255,45,149],[0,245,255],[155,93,229],[255,180,60],[80,200,120],[100,140,255]];
    for (i = 0; i < 12; i++) {
      var col = tints[i % tints.length];
      this.nebulae.push({
        x: (Math.random() - 0.5) * C.WORLD_SIZE * 0.85, y: (Math.random() - 0.5) * C.WORLD_SIZE * 0.85,
        r: 280 + Math.random() * 420, col: col, a: 0.04 + Math.random() * 0.05, drift: (Math.random() - 0.5) * 8,
      });
    }
    for (i = 0; i < 5; i++) {
      this.aurora.push({
        y: (Math.random() - 0.5) * C.WORLD_SIZE * 0.6, phase: Math.random() * Math.PI * 2,
        speed: 0.15 + Math.random() * 0.25, amp: 40 + Math.random() * 60, col: tints[i % tints.length],
      });
    }
    this._t = 0;
  }
  function biomeAt(x, y) {
    var n = Math.sin(x * 0.00035) * Math.cos(y * 0.00035);
    if (n > 0.35) return { bg: "#0a0520", accent: [255, 45, 149] };
    if (n < -0.35) return { bg: "#041218", accent: [0, 245, 255] };
    if (x * y > 0) return { bg: "#08061a", accent: [155, 93, 229] };
    return { bg: "#0c0a12", accent: [255, 180, 60] };
  }
  World.prototype.draw = function (ctx, cam) {
    var C = global.WWNConfig, half = C.WORLD_SIZE / 2, w = cam.w, h = cam.h;
    this._t += 0.016;
    var bio = biomeAt(cam.x, cam.y);
    ctx.fillStyle = bio.bg; ctx.fillRect(0, 0, w, h);
    var grd = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.85);
    var ac = bio.accent;
    grd.addColorStop(0, "rgba(" + ac[0] + "," + ac[1] + "," + ac[2] + ",0.05)");
    grd.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
    this.drawStars(ctx, cam, 0.12, 70, 0.3);
    this.drawStars(ctx, cam, 0.32, 45, 0.45);
    this.drawStars(ctx, cam, 0.55, 25, 0.55);
    for (var i = 0; i < this.nebulae.length; i++) {
      var n = this.nebulae[i];
      var nx = n.x - cam.x * 0.4 + w / 2 + Math.sin(this._t * 0.2 + i) * n.drift;
      var ny = n.y - cam.y * 0.4 + h / 2;
      if (nx < -n.r || nx > w + n.r || ny < -n.r || ny > h + n.r) continue;
      var ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.r);
      ng.addColorStop(0, "rgba(" + n.col[0] + "," + n.col[1] + "," + n.col[2] + "," + n.a + ")");
      ng.addColorStop(1, "rgba(" + n.col[0] + "," + n.col[1] + "," + n.col[2] + ",0)");
      ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(nx, ny, n.r, 0, Math.PI * 2); ctx.fill();
    }
    for (var a = 0; a < this.aurora.length; a++) {
      var au = this.aurora[a];
      var ay = au.y - cam.y * 0.3 + h / 2;
      if (ay < -80 || ay > h + 80) continue;
      ctx.beginPath(); ctx.moveTo(0, ay);
      for (var px = 0; px <= w; px += 24) {
        ctx.lineTo(px, ay + Math.sin(px * 0.012 + this._t * au.speed + au.phase) * au.amp);
      }
      ctx.strokeStyle = "rgba(" + au.col[0] + "," + au.col[1] + "," + au.col[2] + ",0.12)";
      ctx.lineWidth = 18; ctx.stroke();
    }
    this.drawGrid(ctx, cam, 0.5);
    var cloudCols = ["180,200,255", "255,180,220", "160,255,240", "255,220,160"];
    for (var layer = 0; layer < 3; layer++) {
      var parallax = 0.25 + layer * 0.25;
      for (var c = 0; c < this.clouds.length; c++) {
        var cl = this.clouds[c];
        if (cl.layer !== layer) continue;
        var sx = cl.x - cam.x * parallax + w / 2, sy = cl.y - cam.y * parallax + h / 2;
        if (sx < -cl.r || sx > w + cl.r || sy < -cl.r || sy > h + cl.r) continue;
        var cc = cloudCols[cl.tint % cloudCols.length];
        var cg = ctx.createRadialGradient(sx, sy, 0, sx, sy, cl.r);
        cg.addColorStop(0, "rgba(" + cc + "," + cl.a + ")"); cg.addColorStop(1, "rgba(" + cc + ",0)");
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(sx, sy, cl.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    var bx0 = -half - cam.x + w / 2, by0 = -half - cam.y + h / 2, bs = C.WORLD_SIZE;
    ctx.strokeStyle = "rgba(255,45,149,0.35)"; ctx.lineWidth = 3; ctx.strokeRect(bx0, by0, bs, bs);
    ctx.strokeStyle = "rgba(255,215,0,0.15)"; ctx.lineWidth = 1;
    var warn = C.BORDER_WARN; ctx.strokeRect(bx0 + warn, by0 + warn, bs - warn * 2, bs - warn * 2);
  };
  World.prototype.drawStars = function (ctx, cam, parallax, count, alpha) {
    var cell = 280, cx = Math.floor((cam.x * parallax) / cell), cy = Math.floor((cam.y * parallax) / cell);
    for (var iy = -2; iy <= 2; iy++) {
      for (var ix = -2; ix <= 2; ix++) {
        var seed = (cx + ix) * 73856093 ^ (cy + iy) * 19349663;
        var s = Math.abs(seed) | 0;
        for (var k = 0; k < count / 5; k++) {
          s = (s * 1103515245 + 12345) & 0x7fffffff;
          var px = ((cx + ix) * cell - cam.x * parallax) + (s % cell) + cam.w / 2;
          s = (s * 1103515245 + 12345) & 0x7fffffff;
          var py = ((cy + iy) * cell - cam.y * parallax) + (s % cell) + cam.h / 2;
          if (px < 0 || px > cam.w || py < 0 || py > cam.h) continue;
          var twinkle = 0.5 + 0.5 * Math.sin(this._t * 2 + s * 0.01);
          ctx.fillStyle = "rgba(255,255,255," + (alpha * 0.4 * twinkle) + ")";
          ctx.fillRect(px, py, 1 + (s % 3 === 0 ? 1 : 0), 1 + (s % 3 === 0 ? 1 : 0));
        }
      }
    }
  };
  World.prototype.drawGrid = function (ctx, cam, parallax) {
    var step = 200, w = cam.w, h = cam.h;
    var ox = (-cam.x * parallax) % step, oy = (-cam.y * parallax) % step;
    ctx.strokeStyle = "rgba(0,245,255,0.04)"; ctx.lineWidth = 1; ctx.beginPath();
    for (var x = ox; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (var y = oy; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
  };
  global.WWNWorld = World;
})(typeof window !== "undefined" ? window : globalThis);
