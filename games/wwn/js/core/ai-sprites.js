(function () {
  "use strict";
  var ALLY_SVG = {};
  var ALLY_BMP = {};
  var ROLE_FILE = {
    guardian: "GUARDIAN", striker: "STRIKER", phantom: "PHANTOM",
    medic: "MEDIC", vanguard: "VANGUARD"
  };

  function rasterize(role, img) {
    try {
      var c = document.createElement("canvas");
      c.width = 96; c.height = 96;
      var g = c.getContext("2d");
      g.drawImage(img, 0, 0, 96, 96);
      ALLY_BMP[role] = c;
    } catch (e) {}
  }

  function getBmp(role) {
    var key = (role || "striker").toLowerCase();
    if (ALLY_BMP[key]) return ALLY_BMP[key];
    if (ALLY_SVG[key] && ALLY_SVG[key].complete && ALLY_SVG[key].naturalWidth > 0) {
      rasterize(key, ALLY_SVG[key]);
      return ALLY_BMP[key];
    }
    if (!ALLY_SVG[key]) {
      var im = new Image();
      im.onload = function () { rasterize(key, im); };
      im.src = "DesignSVG/" + (ROLE_FILE[key] || "STRIKER") + ".svg";
      ALLY_SVG[key] = im;
    }
    return null;
  }

  ["GUARDIAN", "STRIKER", "PHANTOM", "MEDIC", "VANGUARD"].forEach(function (n) {
    var im = new Image();
    var key = n.toLowerCase();
    im.onload = function () { rasterize(key, im); };
    im.src = "DesignSVG/" + n + ".svg";
    ALLY_SVG[key] = im;
  });

  function patchDraw() {
    if (!window.WWNAiPilot || !WWNAiPilot.prototype || WWNAiPilot.prototype.__svgDraw2) return;
    var orig = WWNAiPilot.prototype.draw;
    WWNAiPilot.prototype.draw = function (ctx, cam) {
      if (!this.alive || !cam) return;
      if (!this.isAlly) return orig.call(this, ctx, cam);
      var z = cam.zoom || 1;
      var sx = cam.sx ? cam.sx(this.x) : (this.x - cam.x) * z + cam.w / 2;
      var sy = cam.sy ? cam.sy(this.y) : (this.y - cam.y) * z + cam.h / 2;
      if (sx < -80 || sx > cam.w + 80 || sy < -80 || sy > cam.h + 80) return;
      var bmp = getBmp(this.allyType || "striker");
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(this.angle || 0);
      var sz = 46 * (this.radiusMul || 1);
      if (bmp) {
        ctx.drawImage(bmp, -sz / 2, -sz / 2, sz, sz);
      } else {
        ctx.fillStyle = this.colorFill || "#6effc0";
        ctx.beginPath();
        ctx.moveTo(16, 0); ctx.lineTo(-12, 10); ctx.lineTo(-6, 0); ctx.lineTo(-12, -10);
        ctx.closePath(); ctx.fill();
      }
      ctx.rotate(-(this.angle || 0));
      var ratio = Math.max(0, this.hp / (this.hpMax || 1));
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(-14, -28, 28, 3);
      ctx.fillStyle = ratio > 0.35 ? (this.colorStroke || "#6effc0") : "#ff4466";
      ctx.fillRect(-14, -28, 28 * ratio, 3);
      ctx.fillStyle = this.colorStroke || "#6effc0";
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText((this.allyType || "ALLY").toUpperCase(), 0, -32);
      ctx.restore();
    };
    WWNAiPilot.prototype.__svgDraw2 = true;
  }

  function patchOwnerAndSmooth() {
    if (!window.WWNAiPilot || !WWNAiPilot.prototype || WWNAiPilot.prototype.__lagFix) return;
    var oUp = WWNAiPilot.prototype.update;
    if (!oUp) return;
    WWNAiPilot.prototype.update = function (dt, player, combat, now, entities) {
      if (this._remoteAlly) {
        if ((this.hp || 0) <= 0) { this.alive = false; return; }
        return;
      }
      if (this.isAlly && player) {
        this.ownerId = player.netId;
        this.leaderId = player.netId;
        this.team = player.team;
        this.dmgMul = Math.min(this.dmgMul || 0.55, 0.65);
        this.speedMul = Math.max(this.speedMul || 1, 1.2);
        this.leash = Math.min(this.leash || 200, 260);
        if (this._target === player) this._target = null;
      }
      return oUp.call(this, dt, player, combat, now, entities);
    };
    WWNAiPilot.prototype.__lagFix = true;
  }

  setInterval(function () { patchDraw(); patchOwnerAndSmooth(); }, 200);

  var _last = performance.now();
  function smoothFrame(now) {
    requestAnimationFrame(smoothFrame);
    var dt = Math.min(0.05, (now - _last) / 1000);
    _last = now;
    var list = window.__wwnAiList;
    if (!list) return;
    var tnow = now / 1000;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || !b._remoteAlly || !b.alive) continue;
      if (b._tx == null) continue;
      var age = Math.min(0.25, Math.max(0, tnow - (b._snapT || tnow)));
      var ex = b._tx + (b._tvx || 0) * age;
      var ey = b._ty + (b._tvy || 0) * age;
      var k = Math.min(1, 14 * dt);
      b.x += (ex - b.x) * k;
      b.y += (ey - b.y) * k;
      var ad = (b._tangle || b.angle || 0) - (b.angle || 0);
      while (ad > Math.PI) ad -= Math.PI * 2;
      while (ad < -Math.PI) ad += Math.PI * 2;
      b.angle = (b.angle || 0) + ad * k;
    }
  }
  requestAnimationFrame(smoothFrame);
})();
