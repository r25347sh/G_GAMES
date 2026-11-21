(function () {
  "use strict";

  // Expose score board if game created it under other name
  setInterval(function () {
    if (!window.__wwnScore && window.WWNScoreBoard) {
      // try find from HUD updater nothing - create bridge
    }
  }, 1000);

  // Watch AI deaths for PT (fallback if game-main path missed)
  var seenDead = {};
  setInterval(function () {
    var list = window.__wwnAiList;
    if (!list) return;
    if (!window.__wwnScore) {
      // attempt recover from global game if any
      try {
        if (window.WWNGame && window.WWNGame.scoreBoard) window.__wwnScore = window.WWNGame.scoreBoard;
      } catch (e) {}
    }
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || b.isAlly || b._remoteAlly) continue;
      var id = String(b.netId || b.id || i);
      if ((!b.alive || (b.hp || 0) <= 0) && !seenDead[id]) {
        seenDead[id] = true;
        try {
          if (window.__wwnScore && window.__wwnScore.onKill) window.__wwnScore.onKill();
          else if (window.__wwnScore && window.__wwnScore.add) window.__wwnScore.add(100, "kill");
        } catch (e) {}
      }
      if (b.alive && (b.hp || 0) > 0) delete seenDead[id];
    }
  }, 200);

  // Extra 10 per group (7 groups) once per session after game starts
  var boosted = false;
  setInterval(function () {
    if (boosted) return;
    var list = window.__wwnAiList;
    var player = window.__wwnPlayer;
    if (!list || !player || !window.WWNAiPilot) return;
    if (list.length < 5) return;
    boosted = true;
    var groups = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"];
    try {
      for (var g = 0; g < groups.length; g++) {
        for (var n = 0; n < 10; n++) {
          var nb = new WWNAiPilot("cpu-g" + g + "-" + n + "-" + Date.now(), "easy", list.length, groups[g]);
          nb.hp *= 0.85; nb.hpMax *= 0.85;
          var a = Math.random() * Math.PI * 2, rr = 700 + Math.random() * 1800;
          nb.x = player.x + Math.cos(a) * rr;
          nb.y = player.y + Math.sin(a) * rr;
          list.push(nb);
        }
      }
    } catch (e) {}
  }, 1500);
})();
