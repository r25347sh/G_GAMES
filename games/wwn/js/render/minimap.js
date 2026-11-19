(function (global) {
  "use strict";
  function drawMinimap(ctx, canvasEl, player, remotes, combat, localTeam) {
    var el = canvasEl; if (!el) return;
    var mctx = el.getContext("2d");
    var w = el.width, h = el.height;
    var C = global.WWNConfig, half = C.WORLD_SIZE / 2, scale = w / C.WORLD_SIZE;
    mctx.fillStyle = "rgba(6,4,26,0.85)"; mctx.fillRect(0, 0, w, h);
    mctx.strokeStyle = "rgba(0,245,255,0.25)"; mctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    function wx(x) { return (x + half) * scale; }
    function wy(y) { return (y + half) * scale; }
    if (combat) {
      combat.mines.forEach(function (m) {
        if (!m.alive) return;
        if (m.ownerId !== (player.netId || "local") && m.team !== localTeam) return;
        mctx.fillStyle = "#ff6b6b"; mctx.fillRect(wx(m.x) - 1.5, wy(m.y) - 1.5, 3, 3);
      });
      combat.decoys.forEach(function (d) {
        if (!d.alive) return;
        mctx.fillStyle = "rgba(255,179,71,0.7)";
        mctx.beginPath(); mctx.arc(wx(d.x), wy(d.y), 2.5, 0, Math.PI * 2); mctx.fill();
      });
    }
    (remotes || []).forEach(function (r) {
      if (!r.alive || r.stealthed) return;
      var ally = localTeam && localTeam !== "NONE" && r.team === localTeam;
      mctx.fillStyle = ally ? "#00f5ff" : "#ff2d95";
      mctx.beginPath(); mctx.arc(wx(r.x), wy(r.y), 3, 0, Math.PI * 2); mctx.fill();
    });
    mctx.fillStyle = "#ffd700";
    mctx.beginPath(); mctx.arc(wx(player.x), wy(player.y), 3.5, 0, Math.PI * 2); mctx.fill();
    mctx.strokeStyle = "#ffd700"; mctx.beginPath();
    mctx.moveTo(wx(player.x), wy(player.y));
    mctx.lineTo(wx(player.x) + Math.cos(player.angle) * 8, wy(player.y) + Math.sin(player.angle) * 8);
    mctx.stroke();
  }
  global.WWNMinimap = { draw: drawMinimap };
})(typeof window !== "undefined" ? window : globalThis);
