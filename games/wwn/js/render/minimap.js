(function (global) {
  "use strict";
  function drawMinimap(canvas, player, bots, remotes, world, combat, localTeam) {
    if (!canvas || !player || !global.WWNConfig) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var w = canvas.width, h = canvas.height, half = global.WWNConfig.WORLD_SIZE / 2;
    var sx = w / global.WWNConfig.WORLD_SIZE, sy = h / global.WWNConfig.WORLD_SIZE;
    function px(x) { return Math.max(0, Math.min(w, (x + half) * sx)); }
    function py(y) { return Math.max(0, Math.min(h, (y + half) * sy)); }
    ctx.clearRect(0, 0, w, h);
    var bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#101832"); bg.addColorStop(1, "#07101e");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(95,160,210,.17)"; ctx.lineWidth = 1;
    for (var i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(w * i / 4, 0); ctx.lineTo(w * i / 4, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, h * i / 4); ctx.lineTo(w, h * i / 4); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,75,120,.72)"; ctx.strokeRect(.5, .5, w - 1, h - 1);
    if (combat) {
      if (combat.mines && combat.mines.forEach) combat.mines.forEach(function (m) {
        if (!m.alive) return;
        ctx.fillStyle = m.team === localTeam ? "#ff866b" : "#ff4f76";
        ctx.fillRect(px(m.x) - 1.5, py(m.y) - 1.5, 3, 3);
      });
      if (combat.decoys && combat.decoys.forEach) combat.decoys.forEach(function (d) {
        if (!d.alive) return;
        ctx.fillStyle = "#ffbf68"; ctx.beginPath(); ctx.arc(px(d.x), py(d.y), 2, 0, Math.PI * 2); ctx.fill();
      });
    }
    (bots || []).concat(remotes || []).forEach(function (r) {
      if (!r || r.alive === false || r.hp <= 0 || r.stealthed) return;
      var ally = r.isAlly || (localTeam && localTeam !== "NONE" && r.team === localTeam);
      ctx.fillStyle = ally ? "#48e5ff" : "#ff4d91";
      ctx.beginPath(); ctx.arc(px(r.x), py(r.y), r.isAlly ? 2.5 : 2, 0, Math.PI * 2); ctx.fill();
    });
    var x = px(player.x), y = py(player.y);
    ctx.fillStyle = "#ffe15a"; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#ffe15a"; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(player.angle) * 9, y + Math.sin(player.angle) * 9); ctx.stroke();
  }
  global.WWNMinimap = { draw: drawMinimap };
})(typeof window !== "undefined" ? window : globalThis);
