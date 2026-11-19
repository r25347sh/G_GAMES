(function (global) {
  "use strict";
  function drawCombat(ctx, cam, combat) {
    if (!combat) return;
    var w = cam.w, h = cam.h;
    function sx(x) { return x - cam.x + w / 2; }
    function sy(y) { return y - cam.y + h / 2; }
    combat.mines.forEach(function (m) {
      if (!m.alive) return;
      var x = sx(m.x), y = sy(m.y);
      if (x < -20 || x > w + 20 || y < -20 || y > h + 20) return;
      ctx.beginPath(); ctx.arc(x, y, m.radius * (m.arm > 0 ? 0.6 : 1), 0, Math.PI * 2);
      ctx.fillStyle = m.arm > 0 ? "rgba(255,100,100,0.35)" : "rgba(255,60,60,0.75)"; ctx.fill();
      ctx.strokeStyle = "#ff6b6b"; ctx.stroke();
    });
    combat.decoys.forEach(function (d) {
      if (!d.alive) return;
      var x = sx(d.x), y = sy(d.y);
      if (x < -30 || x > w + 30 || y < -30 || y > h + 30) return;
      ctx.save(); ctx.translate(x, y); ctx.rotate(d.angle); ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, 8); ctx.lineTo(-6, 0); ctx.lineTo(-10, -8); ctx.closePath();
      ctx.fillStyle = "#ffb347"; ctx.fill(); ctx.restore();
    });
    combat.projectiles.forEach(function (p) {
      if (!p.alive) return;
      var x = sx(p.x), y = sy(p.y);
      if (x < -30 || x > w + 30 || y < -30 || y > h + 30) return;
      ctx.beginPath(); ctx.arc(x, y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color || "#fff"; ctx.fill();
      if (p.type === "missile") {
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.angle);
        ctx.fillStyle = p.color; ctx.fillRect(-6, -2, 12, 4); ctx.restore();
      }
    });
    combat.particles.forEach(function (p) {
      if (!p.alive) return;
      var x = sx(p.x), y = sy(p.y);
      if (x < -10 || x > w + 10 || y < -10 || y > h + 10) return;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.fill(); ctx.globalAlpha = 1;
    });
    combat.effects.forEach(function (e) {
      if (e.type === "laser" || e.type === "orbital") {
        var x1 = sx(e.x), y1 = sy(e.y);
        var len = e.range || 700;
        var x2 = x1 + Math.cos(e.angle) * len, y2 = y1 + Math.sin(e.angle) * len;
        ctx.strokeStyle = e.color || (e.type === "orbital" ? "#00f5ff" : "#7df9ff");
        ctx.lineWidth = e.width || 3;
        ctx.globalAlpha = Math.min(1, e.life * 4);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        if (e.type === "orbital") { ctx.lineWidth = (e.width || 28) * 0.35; ctx.strokeStyle = "#fff"; ctx.stroke(); }
        ctx.globalAlpha = 1;
      } else if (e.type === "empRing") {
        ctx.beginPath(); ctx.arc(sx(e.x), sy(e.y), e.r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(125,249,255,0.55)"; ctx.lineWidth = 3; ctx.stroke();
      }
    });
  }
  global.WWNCombatDraw = { draw: drawCombat };
})(typeof window !== "undefined" ? window : globalThis);
