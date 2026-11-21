(function () {
  "use strict";
  var ALLY_SVG = {};
  var ROLE_FILE = {
    guardian: "GUARDIAN", striker: "STRIKER", phantom: "PHANTOM",
    medic: "MEDIC", vanguard: "VANGUARD"
  };
  function getImg(role) {
    var key = (role || "striker").toLowerCase();
    if (ALLY_SVG[key]) return ALLY_SVG[key];
    var im = new Image();
    im.src = "DesignSVG/" + (ROLE_FILE[key] || "STRIKER") + ".svg";
    ALLY_SVG[key] = im;
    return im;
  }
  ["GUARDIAN", "STRIKER", "PHANTOM", "MEDIC", "VANGUARD"].forEach(function (n) {
    var im = new Image();
    im.src = "DesignSVG/" + n + ".svg";
  });
  function patchDraw() {
    if (!window.WWNAiPilot || !WWNAiPilot.prototype || WWNAiPilot.prototype.__svgDraw) return;
    var orig = WWNAiPilot.prototype.draw;
    WWNAiPilot.prototype.draw = function (ctx, cam) {
      if (!this.alive || !cam) return;
      if (!this.isAlly) return orig.call(this, ctx, cam);
      var z = cam.zoom || 1;
      var sx = cam.sx ? cam.sx(this.x) : (this.x - cam.x) * z + cam.w / 2;
      var sy = cam.sy ? cam.sy(this.y) : (this.y - cam.y) * z + cam.h / 2;
      if (sx < -100 || sx > cam.w + 100 || sy < -100 || sy > cam.h + 100) return;
      var im = getImg(this.allyType || "striker");
      if (im && im.complete && im.naturalWidth > 0) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(this.angle || 0);
        var sz = 48 * (this.radiusMul || 1);
        ctx.drawImage(im, -sz / 2, -sz / 2, sz, sz);
        ctx.rotate(-(this.angle || 0));
        var ratio = Math.max(0, this.hp / (this.hpMax || 1));
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(-16, -32, 32, 4);
        ctx.fillStyle = ratio > 0.35 ? (this.colorStroke || "#6effc0") : "#ff4466";
        ctx.fillRect(-16, -32, 32 * ratio, 4);
        ctx.fillStyle = this.colorStroke || "#6effc0";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText((this.username || this.allyType || "ALLY").toUpperCase(), 0, -36);
        ctx.restore();
        return;
      }
      return orig.call(this, ctx, cam);
    };
    WWNAiPilot.prototype.__svgDraw = true;
  }
  function patchOwner() {
    if (!window.WWNAiPilot || !WWNAiPilot.prototype || WWNAiPilot.prototype.__ownerFire2) return;
    var oUp = WWNAiPilot.prototype.update;
    if (!oUp) return;
    WWNAiPilot.prototype.update = function (dt, player, combat, now, entities) {
      if (this.isAlly && player) {
        this.ownerId = player.netId;
        this.leaderId = player.netId;
        this.team = player.team;
        this.dmgMul = Math.min(this.dmgMul || 0.55, 0.65);
        if (this._target === player) this._target = null;
      }
      return oUp.call(this, dt, player, combat, now, entities);
    };
    WWNAiPilot.prototype.__ownerFire2 = true;
  }
  setInterval(function () { patchDraw(); patchOwner(); }, 300);
})();
