(function () {
  "use strict";

  function ensureScore() {
    if (window.__wwnScore) return window.__wwnScore;
    if (window.WWNScoreBoard) {
      window.__wwnScore = new WWNScoreBoard();
      return window.__wwnScore;
    }
    return null;
  }

  function updateHud() {
    var sb = window.__wwnScore;
    if (!sb) return;
    var el = document.getElementById("hud-score");
    if (el) el.textContent = "PT " + (sb.points || 0);
  }

  var seenDead = {};
  setInterval(function () {
    var sb = ensureScore();
    var list = window.__wwnAiList;
    if (!list || !sb) return;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || b.isAlly || b._remoteAlly) continue;
      var id = String(b.netId || b.id || i);
      if ((!b.alive || (b.hp || 0) <= 0) && !seenDead[id]) {
        seenDead[id] = true;
        try {
          if (sb.onKill) sb.onKill();
          else if (sb.add) sb.add(100, "kill");
        } catch (e) {}
        updateHud();
      }
      if (b.alive && (b.hp || 0) > 0) delete seenDead[id];
    }
    if (sb.update) sb.update(0.2);
    updateHud();
  }, 200);

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
