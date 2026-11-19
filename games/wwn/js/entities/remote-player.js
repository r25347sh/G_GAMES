(function (global) {
  "use strict";
  function RemotePlayer(id, username) {
    this.netId = id; this.id = id; this.username = username || "Pilot";
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.angle = -Math.PI / 2;
    this.hp = 100; this.boosting = false; this.team = "NONE"; this.stealthed = false;
    this.alive = true; this.radius = 18; this.empUntil = 0; this.lastHitBy = null;
    this._tx = 0; this._ty = 0; this._tvx = 0; this._tvy = 0; this._tangle = 0;
    this._ox = 0; this._oy = 0; this._oangle = 0; this._t0 = 0; this._t1 = 0;
    this._renderX = 0; this._renderY = 0; this._renderAngle = 0;
  }
  RemotePlayer.prototype.applySnapshot = function (snap, now) {
    this._ox = this._renderX || snap.x; this._oy = this._renderY || snap.y;
    this._oangle = this._renderAngle || snap.angle;
    this._tx = snap.x; this._ty = snap.y; this._tvx = snap.vx || 0; this._tvy = snap.vy || 0;
    this._tangle = snap.angle; this._t0 = now;
    this._t1 = now + (global.WWNConfig.INTERP_DELAY || 0.08);
    this.vx = snap.vx || 0; this.vy = snap.vy || 0;
    this.hp = snap.hp != null ? snap.hp : this.hp;
    this.boosting = !!snap.boosting; this.team = snap.team || this.team;
    this.stealthed = !!snap.stealthed; this.alive = this.hp > 0;
    if (snap.username) this.username = snap.username;
  };
  RemotePlayer.prototype.update = function (dt, now) {
    var t1 = this._t1 || now, t0 = this._t0 || now;
    var alpha = t1 > t0 ? Math.min(1, (now - t0) / (t1 - t0)) : 1;
    var extr = Math.max(0, now - t1);
    var tx = this._tx + this._tvx * extr, ty = this._ty + this._tvy * extr;
    this._renderX = this._ox + (tx - this._ox) * alpha;
    this._renderY = this._oy + (ty - this._oy) * alpha;
    var ad = this._tangle - this._oangle;
    while (ad > Math.PI) ad -= Math.PI * 2;
    while (ad < -Math.PI) ad += Math.PI * 2;
    this._renderAngle = this._oangle + ad * alpha;
    this.x = this._renderX; this.y = this._renderY; this.angle = this._renderAngle;
  };
  RemotePlayer.prototype.draw = function (ctx, cam, localTeam) {
    if (!this.alive || this.stealthed) return;
    var sx = this.x - cam.x + cam.w / 2, sy = this.y - cam.y + cam.h / 2;
    if (sx < -40 || sx > cam.w + 40 || sy < -40 || sy > cam.h + 40) return;
    var ally = localTeam && localTeam !== "NONE" && this.team === localTeam;
    var col = ally ? "#00f5ff" : "#ff2d95";
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.angle);
    ctx.shadowColor = col; ctx.shadowBlur = this.boosting ? 14 : 6;
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-12, 10); ctx.lineTo(-6, 0); ctx.lineTo(-12, -10); ctx.closePath();
    ctx.fillStyle = ally ? "#c8f7ff" : "#ffe0ec"; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke(); ctx.shadowBlur = 0; ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(this.username, sx, sy - 22);
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(sx - 16, sy - 18, 32, 3);
    ctx.fillStyle = ally ? "#00f5ff" : "#ff2d95"; ctx.fillRect(sx - 16, sy - 18, 32 * (this.hp / 100), 3);
  };
  global.WWNRemotePlayer = RemotePlayer;
})(typeof window !== "undefined" ? window : globalThis);
