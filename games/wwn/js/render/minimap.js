(function (global) {
  "use strict";
  function drawMinimap(canvas, player, bots, remotes, world, combat, localTeam) {
    if (!canvas || !player) return;
    var ctx = canvas.getContext("2d"); if (!ctx) return;
    var w = canvas.width || 120, h = canvas.height || 120, C = global.WWNConfig;
    if (!C) return; var half = C.WORLD_SIZE / 2;
    var sx = w / C.WORLD_SIZE, sy = h / C.WORLD_SIZE;
    var px = function (x) { return Math.max(0, Math.min(w, (x + half) * sx)); };
    var py = function (y) { return Math.max(0, Math.min(h, (y + half) * sy)); };
    ctx.clearRect(0, 0, w, h);
    var grd = ctx.createRadialGradient(w * .5, h * .5, 4, w * .5, h * .5, w * .72);
    grd.addColorStop(0, "#18264a"); grd.addColorStop(1, "#070a16"); ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(0,245,255,.16)"; ctx.lineWidth = 1;
    for (var g = 1; g < 6; g++) { ctx.beginPath(); ctx.moveTo(w * g / 6, 0); ctx.lineTo(w * g / 6, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, h * g / 6); ctx.lineTo(w, h * g / 6); ctx.stroke(); }
    ctx.strokeStyle = "rgba(255,80,130,.9)"; ctx.strokeRect(.5, .5, w - 1, h - 1);
    if (combat) {
      combat.mines && combat.mines.forEach(function (m) { if (m.alive) { ctx.fillStyle = "#ff5577"; ctx.beginPath(); ctx.arc(px(m.x), py(m.y), 1.8, 0, Math.PI * 2); ctx.fill(); } });
      combat.decoys && combat.decoys.forEach(function (d) { if (d.alive) { ctx.fillStyle = "#ffbd66"; ctx.beginPath(); ctx.arc(px(d.x), py(d.y), 2, 0, Math.PI * 2); ctx.fill(); } });
    }
    (bots || []).concat(remotes || []).forEach(function (r) {
      if (!r || r.alive === false || r.hp <= 0 || r.stealthed) return;
      ctx.fillStyle = r.isAlly || (localTeam && localTeam !== "NONE" && r.team === localTeam) ? "#48e9ff" : "#ff4d91";
      ctx.beginPath(); ctx.arc(px(r.x), py(r.y), r.isAlly ? 3 : 2.2, 0, Math.PI * 2); ctx.fill();
    });
    var x = px(player.x), y = py(player.y); ctx.fillStyle = "#ffe369"; ctx.beginPath(); ctx.arc(x, y, 3.8, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#fff4a8"; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(player.angle) * 10, y + Math.sin(player.angle) * 10); ctx.stroke();
  }
  global.WWNMinimap = { draw: drawMinimap };
})(typeof window !== "undefined" ? window : globalThis);
