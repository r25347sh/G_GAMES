(function (global) {
  "use strict";
  function RemotePlayer(id, username) {
    this.netId = id; this.id = id; this.username = username || "Pilot";
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.angle = -Math.PI / 2;
    this.hp = 100; this.hpMax = 100; this.boosting = false; this.team = "NONE"; this.stealthed = false;
    this.alive = true; this.radius = 18; this.lastHitBy = null; this.respawnTimer = 0;
    this._tx = 0; this._ty = 0; this._tvx = 0; this._tvy = 0; this._tangle = 0;
    this._ox = 0; this._oy = 0; this._oangle = 0; this._t0 = 0; this._t1 = 0;
    this._renderX = 0; this._renderY = 0; this._renderAngle = 0; this._lastSnapshot = 0;
  }
  RemotePlayer.prototype.applySnapshot = function (snap, now) {
    var first = !this._lastSnapshot;
    this._ox = first ? snap.x : (this._renderX || snap.x); this._oy = first ? snap.y : (this._renderY || snap.y);
    this._oangle = first ? snap.angle : (this._renderAngle || snap.angle);
    this._tx = snap.x; this._ty = snap.y; this._tvx = snap.vx || 0; this._tvy = snap.vy || 0;
    this._tangle = snap.angle; this._t0 = now; this._t1 = now + 0.09; this._lastSnapshot = now;
    this.vx = snap.vx || 0; this.vy = snap.vy || 0; this.hp = snap.hp != null ? snap.hp : this.hp;
    this.boosting = !!snap.boosting; this.team = snap.team || this.team; this.stealthed = !!snap.stealthed;
    this.alive = this.hp > 0; if (snap.username) this.username = snap.username;
  };
  RemotePlayer.prototype.update = function (dt, now) {
    var alpha = this._t1 > this._t0 ? Math.min(1, (now - this._t0) / (this._t1 - this._t0)) : 1;
    var extra = Math.max(0, now - this._t1), tx = this._tx + this._tvx * extra, ty = this._ty + this._tvy * extra;
    this._renderX = this._ox + (tx - this._ox) * alpha; this._renderY = this._oy + (ty - this._oy) * alpha;
    var ad = this._tangle - this._oangle; while (ad > Math.PI) ad -= Math.PI * 2; while (ad < -Math.PI) ad += Math.PI * 2;
    this._renderAngle = this._oangle + ad * alpha; this.x = this._renderX; this.y = this._renderY; this.angle = this._renderAngle;
  };
  RemotePlayer.prototype.draw = function (ctx, cam, localTeam) {
    if (!this.alive || this.stealthed) return;
    var sx = this.x - cam.x + cam.w / 2, sy = this.y - cam.y + cam.h / 2;
    if (sx < -60 || sx > cam.w + 60 || sy < -60 || sy > cam.h + 60) return;
    var ally = localTeam && localTeam !== "NONE" && this.team === localTeam, color = ally ? "#00f5ff" : "#ff2d95";
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.angle); ctx.shadowColor = color; ctx.shadowBlur = this.boosting ? 16 : 8;
    ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(-13, 11); ctx.lineTo(-7, 0); ctx.lineTo(-13, -11); ctx.closePath(); ctx.fillStyle = ally ? "#c8f7ff" : "#ffe0ec"; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = "11px sans-serif"; ctx.textAlign = "center"; ctx.fillText(this.username, sx, sy - 24);
    ctx.fillStyle = "rgba(0,0,0,.65)"; ctx.fillRect(sx - 18, sy - 20, 36, 4); ctx.fillStyle = color; ctx.fillRect(sx - 18, sy - 20, 36 * Math.max(0, this.hp / this.hpMax), 4);
  };
  global.WWNRemotePlayer = RemotePlayer;
})(typeof window !== "undefined" ? window : globalThis);
