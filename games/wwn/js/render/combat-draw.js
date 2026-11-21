(function (global) {
  "use strict";
  function drawCombat(ctx, cam, combat) {
    if (!ctx || !cam || !combat) return;
    var w = cam.w, h = cam.h;
    function sx(x) { return cam.sx ? cam.sx(x) : (x - cam.x) * (cam.zoom || 1) + w / 2; }
    function sy(y) { return cam.sy ? cam.sy(y) : (y - cam.y) * (cam.zoom || 1) + h / 2; }

    combat.mines.forEach(function (m) {
      if (!m.alive) return;
      var x = sx(m.x), y = sy(m.y);
      if (x < -20 || x > w + 20 || y < -20 || y > h + 20) return;
      ctx.beginPath();
      ctx.arc(x, y, m.radius || 10, 0, Math.PI * 2);
      ctx.fillStyle = m.arm > 0 ? "rgba(255,100,100,0.35)" : (m.color || "#ff6b6b");
      ctx.fill();
    });

    combat.decoys.forEach(function (d) {
      if (!d.alive) return;
      var x = sx(d.x), y = sy(d.y);
      if (x < -30 || x > w + 30 || y < -30 || y > h + 30) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(d.angle || 0);
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(15, 0); ctx.lineTo(-11, 9); ctx.lineTo(-5, 0); ctx.lineTo(-11, -9);
      ctx.closePath();
      ctx.fillStyle = "#ffe0a0";
      ctx.fill();
      ctx.strokeStyle = "#ffb347";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    });

    combat.projectiles.forEach(function (p) {
      if (!p.alive) return;
      var x = sx(p.x), y = sy(p.y);
      if (x < -30 || x > w + 30 || y < -30 || y > h + 30) return;
      ctx.beginPath();
      ctx.arc(x, y, p.radius || 3, 0, Math.PI * 2);
      ctx.fillStyle = p.color || "#fff";
      ctx.fill();
      if (p.type === "missile") {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle || 0);
        ctx.fillStyle = p.color || "#ff6b6b";
        ctx.fillRect(-6, -2, 12, 4);
        ctx.restore();
      }
    });

    combat.particles.forEach(function (p) {
      if (!p.alive) return;
      var x = sx(p.x), y = sy(p.y);
      if (x < -10 || x > w + 10 || y < -10 || y > h + 10) return;
      var a = Math.max(0, p.life / (p.maxLife || 1));
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(x, y, p.r || 2, 0, Math.PI * 2);
      ctx.fillStyle = p.color || "#fff";
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    (combat.effects || []).forEach(function (e) {
      if (e.type === "laser" || e.type === "orbital") {
        var x1 = sx(e.x), y1 = sy(e.y);
        var len = e.range || 700;
        var x2 = x1 + Math.cos(e.angle) * len * (cam.zoom || 1);
        var y2 = y1 + Math.sin(e.angle) * len * (cam.zoom || 1);
        ctx.strokeStyle = e.color || (e.type === "orbital" ? "#00f5ff" : "#7df9ff");
        ctx.lineWidth = e.width || (e.type === "orbital" ? 28 : 3);
        ctx.globalAlpha = Math.max(0, Math.min(1, (e.life || 0) * 6));
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (e.type === "empRing") {
        var er = sx(e.x), es = sy(e.y);
        ctx.beginPath();
        ctx.arc(er, es, (e.r || 0) * (cam.zoom || 1), 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(155,93,229,0.55)";
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (e.type === "omni") {
        var ox = sx(e.x), oy = sy(e.y);
        ctx.beginPath();
        ctx.arc(ox, oy, (e.r || 20) * (cam.zoom || 1), 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,23,68,0.55)";
        ctx.lineWidth = 4;
        ctx.stroke();
      } else if (e.type === "worldshift") {
        var wx = sx(e.x), wy = sy(e.y);
        ctx.strokeStyle = "rgba(118,255,3,0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(wx, wy, 400 * (cam.zoom || 1), 0, Math.PI * 2); ctx.stroke();
      } else if (e.type === "blackhole") {
        var bx = sx(e.x), by = sy(e.y);
        ctx.beginPath();
        ctx.arc(bx, by, e.radius || 160, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(20,0,40,0.55)";
        ctx.fill();
        ctx.strokeStyle = "#9b5de5";
        ctx.stroke();
      }
    });
  }
  global.WWNCombatDraw = { draw: drawCombat };
})(typeof window !== "undefined" ? window : globalThis);
