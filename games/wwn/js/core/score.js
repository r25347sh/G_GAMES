(function (global) {
  "use strict";
  function ScoreBoard() {
    this.points = 0; this.combo = 0; this.comboTimer = 0; this.kills = 0; this.log = [];
  }
  ScoreBoard.prototype.add = function (n, reason) {
    var mult = 1 + Math.min(8, this.combo) * 0.18;
    var gained = Math.round(n * mult);
    this.points += gained;
    if (reason === "kill" || reason === "asteroid" || reason === "streak" || reason === "beacon") {
      this.combo++; this.comboTimer = 4;
    }
    this.log.unshift({ n: gained, reason: reason || "", t: 1.5 });
    if (this.log.length > 6) this.log.pop();
    return gained;
  };
  ScoreBoard.prototype.onKill = function () { this.kills++; return this.add(120, "kill"); };
  ScoreBoard.prototype.update = function (dt) {
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;
    for (var i = this.log.length - 1; i >= 0; i--) {
      this.log[i].t -= dt;
      if (this.log[i].t <= 0) this.log.splice(i, 1);
    }
  };
  global.WWNScoreBoard = ScoreBoard;
})(typeof window !== "undefined" ? window : globalThis);
