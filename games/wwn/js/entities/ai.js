(function (global) {
  "use strict";
  var GROUPS = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"];
  var COLORS = [
    { fill: "#ff6b9d", stroke: "#ff2d6f" }, { fill: "#5ad0ff", stroke: "#00a8e8" },
    { fill: "#9be86c", stroke: "#5cb82e" }, { fill: "#ffb84d", stroke: "#e08900" },
    { fill: "#c49bff", stroke: "#8b5cf6" }, { fill: "#ffe66d", stroke: "#d4b000" },
    { fill: "#ff8fab", stroke: "#e83e6e" }
  ];
  var ROLES = {
    guardian: { label: "GUARDIAN", color: "#5dffb0", stroke: "#1aff8c", damage: 1.25, fireRate: 0.32, speed: 0.92, range: 780, preferDist: 160, leash: 420, threatR: 900, hpMul: 1.45, radiusMul: 1.2 },
    striker: { label: "STRIKER", color: "#ff5a72", stroke: "#ff2040", damage: 2.1, fireRate: 0.16, speed: 1.18, range: 980, preferDist: 240, leash: 900, threatR: 1200, hpMul: 0.95, radiusMul: 0.95 },
    phantom: { label: "PHANTOM", color: "#b388ff", stroke: "#7c4dff", damage: 1.55, fireRate: 0.22, speed: 1.22, range: 900, preferDist: 300, leash: 1000, threatR: 1100, hpMul: 0.85, radiusMul: 0.88 },
    medic: { label: "MEDIC", color: "#40e0d0", stroke: "#00c4b4", damage: 0.85, fireRate: 0.42, speed: 1.05, range: 700, preferDist: 140, leash: 380, threatR: 700, hpMul: 1.1, radiusMul: 1.0 },
    vanguard: { label: "VANGUARD", color: "#ffd166", stroke: "#ff9f1c", damage: 1.65, fireRate: 0.2, speed: 1.08, range: 920, preferDist: 210, leash: 750, threatR: 1050, hpMul: 1.15, radiusMul: 1.05 }
  };
  var ROLE_ORDER = ["guardian", "striker", "phantom", "medic", "vanguard"];
  var DIFFICULTY = {
    easy: { damage: 0.32, speed: 0.62, rate: 0.85, accuracy: 0.22, retarget: 0.9 },
    normal: { damage: 0.42, speed: 0.72, rate: 0.7, accuracy: 0.14, retarget: 0.75 },
    hard: { damage: 0.55, speed: 0.82, rate: 0.55, accuracy: 0.08, retarget: 0.55 }
  };
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function dist(a, b) { if (!a || !b) return 1e9; return Math.hypot((b.x || 0) - (a.x || 0), (b.y || 0) - (a.y || 0)); }
  function angleDiff(a, b) { var d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
  function AiPilot(id, difficulty, styleIndex, group, allyType) {
    var C = global.WWNConfig || {};
    var ally = group === "ALLY";
    var role = ally ? (allyType || ROLE_ORDER[(styleIndex || 0) % 5]) : null;
    var cfg = ally ? ROLES[role] : (DIFFICULTY[difficulty] || DIFFICULTY.normal);
    var groupNum = Math.max(0, GROUPS.indexOf(group));
    this.netId = id; this.id = id; this.group = group || "G1"; this.team = ally ? "BLUE" : this.group;
    this.isAlly = ally; this.allyType = role; this.leaderId = null; this.roleIndex = styleIndex || 0;
    this.username = ally ? cfg.label : ("S" + (groupNum + 1) + "-" + String(id).replace(/\D/g, "").slice(-2));
    this.colorFill = ally ? cfg.color : COLORS[groupNum % COLORS.length].fill;
    this.colorStroke = ally ? cfg.stroke : COLORS[groupNum % COLORS.length].stroke;
    this.hpMax = (C.HP_MAX || 100) * (ally ? (cfg.hpMul || 1) : 0.7);
    this.hp = this.hpMax;
    this.radius = (C.SHIP_RADIUS || 16) * (cfg.radiusMul || 1);
    this.dmgMul = cfg.damage; this.speedMul = cfg.speed; this.fireRate = cfg.fireRate || cfg.rate || 0.7;
    this.accuracy = cfg.accuracy != null ? cfg.accuracy : 0.12;
    this.attackRange = cfg.range || 720;
    this.preferDist = cfg.preferDist || (ally ? 220 : 340);
    this.leash = cfg.leash || (ally ? 700 : 9999);
    this.threatR = cfg.threatR || 1000;
    this.retargetSec = cfg.retarget || (ally ? 0.28 : 0.85);
    this.alive = true; this.respawnTimer = 0; this.empUntil = 0; this.stealthed = false; this.boosting = false;
    this.boost = C.BOOST_MAX || 100; this.fireCd = Math.random() * 0.5;
    this._retarget = Math.random() * this.retargetSec; this._target = null;
    this._orbit = Math.random() * Math.PI * 2; this._roleBeat = 0; this._seed = Math.random() * 10000;
    this._strafe = Math.random() < 0.5 ? 1 : -1; this._strafeT = 2 + Math.random() * 3;
    var half = (C.WORLD_SIZE || 9000) * 0.4;
    this.x = (Math.random() - 0.5) * half * 2; this.y = (Math.random() - 0.5) * half * 2;
    this.vx = 0; this.vy = 0; this.angle = Math.random() * Math.PI * 2; this.speed = 0;
  }
  AiPilot.prototype._pickTarget = function (player, entities) {
    var best = null, bestScore = Infinity, self = this, list = entities || [];
    if (this._target && this._target.alive !== false && (this._target.hp || 0) > 0 && !this._target.stealthed) {
      var still = this._target === player;
      for (var i = 0; i < list.length && !still; i++) if (list[i] === this._target) still = true;
      if (still && dist(this, this._target) < this.attackRange * 1.35) return this._target;
    }
    function consider(e) {
      if (!e || e === self || e.alive === false || (e.hp != null && e.hp <= 0) || e.stealthed) return;
      if (self.isAlly) {
        if (e === player || e.isAlly) return;
        if (e.team && player && e.team === player.team && e.team !== "NONE") return;
      } else {
        if (e !== player && e.group && e.group === self.group) return;
      }
      var d = dist(self, e); if (d > self.threatR * 1.2) return;
      var score = d;
      if (self.isAlly && player) score = dist(player, e) * 0.55 + d * 0.45;
      else if (!self.isAlly) { if (e === player) score *= 0.45; else score *= 1.25; }
      score += (e.hp || 50) * 0.12;
      if (score < bestScore) { bestScore = score; best = e; }
    }
    if (player) consider(player);
    for (var j = 0; j < list.length; j++) consider(list[j]);
    return best;
  };
  AiPilot.prototype._formationPoint = function (player, now) {
    if (!player) return { x: this.x, y: this.y };
    var idx = this.roleIndex % 5, baseAng = player.angle || 0;
    var slots = [
      { ang: baseAng + Math.PI * 0.85, dist: 95 },
      { ang: baseAng + 0.15, dist: 150 },
      { ang: baseAng - Math.PI * 0.55, dist: 175 },
      { ang: baseAng + Math.PI, dist: 80 },
      { ang: baseAng + Math.PI * 0.4, dist: 130 }
    ];
    var s = slots[idx] || slots[0], wobble = Math.sin(now * 1.2 + this._seed) * 8;
    return { x: player.x + Math.cos(s.ang) * (s.dist + wobble), y: player.y + Math.sin(s.ang) * (s.dist + wobble) };
  };
  AiPilot.prototype._turnToward = function (desired, rate, dt) {
    var diff = angleDiff(desired, this.angle), maxStep = rate * dt;
    this.angle += clamp(diff, -maxStep, maxStep);
  };
  AiPilot.prototype.update = function (dt, player, combat, now, entities) {
    var C = global.WWNConfig || {};
    if (!this.alive) { this.respawnTimer -= dt; return; }
    if ((this.hp || 0) <= 0) {
      this.alive = false;
      this.respawnTimer = (C.RESPAWN_SEC || 4) * (this.isAlly ? 0.55 : 1);
      this.vx = 0; this.vy = 0;
      return;
    }
    if (this.empUntil && now < this.empUntil) {
      this.vx *= Math.exp(-3 * dt); this.vy *= Math.exp(-3 * dt);
      this.x += this.vx * dt; this.y += this.vy * dt; return;
    }
    this.fireCd = Math.max(0, this.fireCd - dt); this._retarget -= dt; this._roleBeat -= dt; this._strafeT -= dt;
    if (this._strafeT <= 0) { this._strafe *= -1; this._strafeT = 2.2 + Math.random() * 2.5; }
    this._orbit += dt * (this.isAlly ? 0.9 : 0.55);
    if (this._retarget <= 0) {
      this._target = this._pickTarget(player, entities || []);
      this._retarget = this.retargetSec + Math.random() * 0.2;
    }
    var target = this._target, aimX = this.x, aimY = this.y, desiredAngle = this.angle;
    var turnRate = (C.TURN_RATE || 3.2) * (this.isAlly ? 1.2 : 0.85);
    if (this.isAlly && player) {
      var formation = this._formationPoint(player, now), dLeader = dist(this, player);
      aimX = formation.x; aimY = formation.y;
      if (target && target.alive !== false && (target.hp || 0) > 0) {
        var ta = Math.atan2(target.y - player.y, target.x - player.x);
        if (this.allyType === "striker") { aimX = target.x - Math.cos(ta) * 80; aimY = target.y - Math.sin(ta) * 80; desiredAngle = Math.atan2(target.y - this.y, target.x - this.x); }
        else if (this.allyType === "guardian") { aimX = player.x + Math.cos(ta) * 70; aimY = player.y + Math.sin(ta) * 70; desiredAngle = Math.atan2(target.y - this.y, target.x - this.x); }
        else if (this.allyType === "phantom") { var oa = ta + this._orbit; aimX = target.x + Math.cos(oa) * 150; aimY = target.y + Math.sin(oa) * 150; desiredAngle = Math.atan2(target.y - this.y, target.x - this.x); }
        else if (this.allyType === "medic") {
          aimX = formation.x; aimY = formation.y; desiredAngle = player.angle || desiredAngle;
          if (this._roleBeat <= 0) {
            this._roleBeat = 0.5;
            if (dLeader < 340) {
              if (player.hp < (C.HP_MAX || 100)) player.hp = Math.min(C.HP_MAX || 100, player.hp + 2.4);
              (entities || []).forEach(function (e) {
                if (e && e.isAlly && e.alive && e.hp < e.hpMax && dist(player, e) < 300) e.hp = Math.min(e.hpMax, e.hp + 1.0);
              });
            }
          }
        } else if (this.allyType === "vanguard") {
          aimX = target.x - Math.cos(ta) * 130; aimY = target.y - Math.sin(ta) * 130;
          desiredAngle = Math.atan2(target.y - this.y, target.x - this.x);
        }
      } else desiredAngle = Math.atan2(aimY - this.y, aimX - this.x);
      if (dLeader > this.leash) { aimX = player.x; aimY = player.y; desiredAngle = Math.atan2(player.y - this.y, player.x - this.x); }
    } else if (target) {
      var td0 = dist(this, target), angTo = Math.atan2(target.y - this.y, target.x - this.x);
      var orbitAng = angTo + this._strafe * Math.PI * 0.5;
      if (td0 > this.preferDist * 1.15) { aimX = target.x; aimY = target.y; }
      else if (td0 < this.preferDist * 0.7) { aimX = this.x - Math.cos(angTo) * 120; aimY = this.y - Math.sin(angTo) * 120; }
      else { aimX = target.x + Math.cos(orbitAng) * this.preferDist; aimY = target.y + Math.sin(orbitAng) * this.preferDist; }
      desiredAngle = angTo;
    } else {
      desiredAngle = this.angle + Math.sin(now * 0.4 + this._seed) * 0.4;
      aimX = this.x + Math.cos(desiredAngle) * 180; aimY = this.y + Math.sin(desiredAngle) * 180;
    }
    this._turnToward(desiredAngle, turnRate, dt);
    var mdx = aimX - this.x, mdy = aimY - this.y, md = Math.hypot(mdx, mdy) || 1;
    var thrust = md > 110 ? 1 : (md > 50 ? 0.4 : (md < 35 ? -0.25 : 0.1));
    var accel = (C.ACCEL || 520) * thrust * this.speedMul;
    this.vx += Math.cos(this.angle) * accel * dt; this.vy += Math.sin(this.angle) * accel * dt;
    var drag = C.DRAG || 1.8; this.vx *= Math.exp(-drag * dt); this.vy *= Math.exp(-drag * dt);
    var sp = Math.hypot(this.vx, this.vy), maxSp = (C.MAX_SPEED || 420) * this.speedMul;
    if (sp > maxSp) { this.vx *= maxSp / sp; this.vy *= maxSp / sp; }
    this.speed = Math.hypot(this.vx, this.vy); this.x += this.vx * dt; this.y += this.vy * dt;
    var edge = (C.WORLD_SIZE || 9000) * 0.48;
    if (this.x < -edge || this.x > edge || this.y < -edge || this.y > edge) {
      this.x = clamp(this.x, -edge, edge); this.y = clamp(this.y, -edge, edge); this.vx *= -0.35; this.vy *= -0.35;
    }
    if (!target || !combat || this.fireCd > 0) return;
    var td = dist(this, target); if (td > this.attackRange) return;
    var lead = Math.min(0.5, td / 1100);
    var shot = Math.atan2(target.y + (target.vy || 0) * lead - this.y, target.x + (target.vx || 0) * lead - this.x);
    if (Math.abs(angleDiff(shot, this.angle)) > (this.isAlly ? 0.95 : 0.42)) return;
    var a = shot + (Math.random() - 0.5) * this.accuracy;
    var w = (global.WWNWeapons && global.WWNWeapons.vulcan) || { speed: 780, life: 0.85, dmg: 5, radius: 3 };
    if (!combat.projectiles || !combat.projectiles.acquire) return;
    var p = combat.projectiles.acquire();
    p.alive = true; p.type = "vulcan"; p.x = this.x + Math.cos(a) * 20; p.y = this.y + Math.sin(a) * 20; p.angle = a;
    p.vx = Math.cos(a) * w.speed; p.vy = Math.sin(a) * w.speed; p.life = w.life; p.maxLife = w.life;
    p.dmg = (w.dmg || 5) * this.dmgMul; p.ownerId = this.netId; p.team = this.team; p.radius = w.radius || 3;
    p.aoe = 0; p.color = this.colorStroke; p.targetId = null; p.turn = 0; p.split = 0;
    this.fireCd = this.fireRate + Math.random() * (this.isAlly ? 0.04 : 0.18);
  };
  AiPilot.prototype.draw = function (ctx, cam) {
    if (!this.alive || !cam) return;
    var z = cam.zoom || 1;
    var sx = typeof cam.sx === "function" ? cam.sx(this.x) : (this.x - cam.x) * z + cam.w / 2;
    var sy = typeof cam.sy === "function" ? cam.sy(this.y) : (this.y - cam.y) * z + cam.h / 2;
    if (sx < -90 || sx > cam.w + 90 || sy < -90 || sy > cam.h + 90) return;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.angle);
    var role = this.allyType;
    if (this.isAlly) {
      ctx.globalAlpha = 0.55;
      var eg = ctx.createRadialGradient(-16, 0, 0, -16, 0, 18);
      eg.addColorStop(0, this.colorStroke); eg.addColorStop(1, "transparent");
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(-14, 0, 16, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      if (role === "guardian") {
        ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(4, 12); ctx.lineTo(-14, 14); ctx.lineTo(-8, 0); ctx.lineTo(-14, -14); ctx.lineTo(4, -12); ctx.closePath();
        ctx.fillStyle = this.colorFill; ctx.fill(); ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 2.4; ctx.stroke();
        ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(10, 0, 20, -1.0, 1.0); ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 3.5; ctx.stroke();
        ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(10, 0, 26, -0.9, 0.9); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1;
      } else if (role === "striker") {
        ctx.beginPath(); ctx.moveTo(28, 0); ctx.lineTo(8, 5); ctx.lineTo(-18, 11); ctx.lineTo(-10, 0); ctx.lineTo(-18, -11); ctx.lineTo(8, -5); ctx.closePath();
        ctx.fillStyle = this.colorFill; ctx.fill(); ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "#fff8"; ctx.fillRect(0, -2.5, 16, 5);
      } else if (role === "phantom") {
        ctx.globalAlpha = 0.82; ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-4, 9); ctx.lineTo(-18, 4); ctx.lineTo(-12, 0); ctx.lineTo(-18, -4); ctx.lineTo(-4, -9); ctx.closePath();
        ctx.fillStyle = this.colorFill; ctx.fill(); ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.ellipse(0, 0, 24, 14, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      } else if (role === "medic") {
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fillStyle = this.colorFill; ctx.fill(); ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 2.2; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.fillRect(-3, -8, 6, 16); ctx.fillRect(-8, -3, 16, 6);
      } else if (role === "vanguard") {
        ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(2, 13); ctx.lineTo(-18, 0); ctx.lineTo(2, -13); ctx.closePath();
        ctx.fillStyle = this.colorFill; ctx.fill(); ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 2.4; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(1, 6); ctx.lineTo(-8, 0); ctx.lineTo(1, -6); ctx.closePath(); ctx.fillStyle = "#fff9"; ctx.fill();
      } else {
        ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-14, 11); ctx.lineTo(-7, 0); ctx.lineTo(-14, -11); ctx.closePath();
        ctx.fillStyle = this.colorFill; ctx.fill(); ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.95;
      ctx.beginPath(); ctx.moveTo(-20, -9); ctx.lineTo(-26, 0); ctx.lineTo(-20, 9); ctx.stroke(); ctx.globalAlpha = 1;
    } else {
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-12, 10); ctx.lineTo(-6, 0); ctx.lineTo(-12, -10); ctx.closePath();
      ctx.fillStyle = this.colorFill; ctx.fill(); ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 1.4; ctx.stroke();
    }
    var ratio = Math.max(0, this.hp / (this.hpMax || 1));
    if (ratio < 0.999) {
      ctx.rotate(-this.angle);
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(-14, -24, 28, 3.5);
      ctx.fillStyle = ratio > 0.35 ? this.colorStroke : "#ff4466"; ctx.fillRect(-14, -24, 28 * ratio, 3.5);
      if (this.isAlly) {
        ctx.fillStyle = this.colorStroke; ctx.font = "bold 8px sans-serif"; ctx.textAlign = "center"; ctx.globalAlpha = 0.9;
        ctx.fillText(this.username || role || "ALLY", 0, -28); ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  };
  global.WWNAiPilot = AiPilot;
  global.WWNAllyTypes = ROLES;
  global.WWNAllyRoleOrder = ROLE_ORDER;
})(typeof window !== "undefined" ? window : globalThis);
