(function (global) {
  "use strict";
  function World() {
    this.clouds = [];
    var C = global.WWNConfig;
    for (var i = 0; i < 48; i++) {
      this.clouds.push({
        x: (Math.random() - 0.5) * C.WORLD_SIZE,
        y: (Math.random() - 0.5) * C.WORLD_SIZE,
        r: 40 + Math.random() * 120,
        layer: Math.random() < 0.4 ? 0 : Math.random() < 0.7 ? 1 : 2,
        a: 0.08 + Math.random() * 0.12,
      });
    }
  }
  World.prototype.draw = function (ctx, cam) {
    var C = global.WWNConfig, half = C.WORLD_SIZE / 2, w = cam.w, h = cam.h;
    ctx.fillStyle = "#06041a"; ctx.fillRect(0, 0, w, h);
    this.drawStars(ctx, cam, 0.15, 60, 0.25);
    this.drawStars(ctx, cam, 0.35, 40, 0.4);
    this.drawGrid(ctx, cam, 0.55);
    for (var layer = 0; layer < 3; layer++) {
      var parallax = 0.25 + layer * 0.25;
      for (var i = 0; i < this.clouds.length; i++) {
        var c = this.clouds[i]; if (c.layer !== layer) continue;
        var sx = (c.x - cam.x * parallax) + w / 2, sy = (c.y - cam.y * parallax) + h / 2;
        if (sx < -c.r || sx > w + c.r || sy < -c.r || sy > h + c.r) continue;
        var grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, c.r);
        grd.addColorStop(0, "rgba(180,200,255," + c.a + ")"); grd.addColorStop(1, "rgba(180,200,255,0)");
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(sx, sy, c.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    var bx0 = -half - cam.x + w / 2, by0 = -half - cam.y + h / 2, bs = C.WORLD_SIZE;
    ctx.strokeStyle = "rgba(255,45,149,0.35)"; ctx.lineWidth = 3; ctx.strokeRect(bx0, by0, bs, bs);
    ctx.strokeStyle = "rgba(255,215,0,0.15)"; ctx.lineWidth = 1;
    var warn = C.BORDER_WARN; ctx.strokeRect(bx0 + warn, by0 + warn, bs - warn * 2, bs - warn * 2);
  };
  World.prototype.drawStars = function (ctx, cam, parallax, count, alpha) {
    var cell = 280;
    var cx = Math.floor((cam.x * parallax) / cell), cy = Math.floor((cam.y * parallax) / cell);
    for (var iy = -2; iy <= 2; iy++) {
      for (var ix = -2; ix <= 2; ix++) {
        var seed = (cx + ix) * 73856093 ^ (cy + iy) * 19349663;
        var s = Math.abs(seed) % 10000, n = 3 + (s % 5);
        for (var k = 0; k < n; k++) {
          s = (s * 1103515245 + 12345) & 0x7fffffff;
          var lx = ((cx + ix) * cell + (s % cell) - cam.x * parallax) + cam.w / 2;
          s = (s * 1103515245 + 12345) & 0x7fffffff;
          var ly = ((cy + iy) * cell + (s % cell) - cam.y * parallax) + cam.h / 2;
          if (lx < 0 || lx > cam.w || ly < 0 || ly > cam.h) continue;
          var a = alpha * (0.4 + (s % 60) / 100);
          ctx.fillStyle = "rgba(200,220,255," + a + ")"; ctx.fillRect(lx, ly, 1.5, 1.5);
        }
      }
    }
  };
  World.prototype.drawGrid = function (ctx, cam, parallax) {
    var step = 200;
    var ox = (-cam.x * parallax + cam.w / 2) % step, oy = (-cam.y * parallax + cam.h / 2) % step;
    ctx.strokeStyle = "rgba(0,245,255,0.06)"; ctx.lineWidth = 1; ctx.beginPath();
    for (var x = ox; x < cam.w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, cam.h); }
    for (var y = oy; y < cam.h; y += step) { ctx.moveTo(0, y); ctx.lineTo(cam.w, y); }
    ctx.stroke();
    ctx.fillStyle = "rgba(0,245,255,0.2)"; ctx.font = "10px monospace";
    var gx0 = Math.floor(cam.x / step) * step, gy0 = Math.floor(cam.y / step) * step;
    for (var gx = gx0 - step * 2; gx < gx0 + step * 4; gx += step * 2) {
      for (var gy = gy0 - step * 2; gy < gy0 + step * 4; gy += step * 2) {
        var sx = gx - cam.x + cam.w / 2, sy = gy - cam.y + cam.h / 2;
        if (sx > 0 && sx < cam.w && sy > 0 && sy < cam.h) ctx.fillText(Math.round(gx) + "," + Math.round(gy), sx + 4, sy - 4);
      }
    }
  };
  global.WWNWorld = World;
})(typeof window !== "undefined" ? window : globalThis);
