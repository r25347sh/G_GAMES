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
    guardian: { label: "GUARDIAN", color: "#6effc0", stroke: "#00ff9c", damage: 1.35, fireRate: 0.3, speed: 0.95, range: 800, preferDist: 120, leash: 280, threatR: 950, hpMul: 1.55, radiusMul: 1.22 },
    striker:  { label: "STRIKER",  color: "#ff4d6a", stroke: "#ff1744", damage: 2.25, fireRate: 0.14, speed: 1.2,  range: 1000, preferDist: 220, leash: 520, threatR: 1200, hpMul: 1.0, radiusMul: 0.95 },
    phantom:  { label: "PHANTOM",  color: "#c77dff", stroke: "#9b5de5", damage: 1.7,  fireRate: 0.2,  speed: 1.28, range: 920, preferDist: 260, leash: 560, threatR: 1100, hpMul: 0.9, radiusMul: 0.9 },
    medic:    { label: "MEDIC",    color: "#40e0d0", stroke: "#00e5c0", damage: 0.9,  fireRate: 0.4,  speed: 1.08, range: 720, preferDist: 100, leash: 240, threatR: 720, hpMul: 1.2, radiusMul: 1.0 },
    vanguard: { label: "VANGUARD", color: "#ffd166", stroke: "#ff9f1c", damage: 1.8,  fireRate: 0.18, speed: 1.12, range: 940, preferDist: 180, leash: 480, threatR: 1080, hpMul: 1.25, radiusMul: 1.08 }
  };
  var ROLE_ORDER = ["guardian", "striker", "phantom", "medic", "vanguard"];
  var DIFFICULTY = {
    easy:   { damage: 0.34, speed: 0.64, rate: 0.82, accuracy: 0.2,  retarget: 0.85 },
    normal: { damage: 0.45, speed: 0.74, rate: 0.68, accuracy: 0.13, retarget: 0.7 },
    hard:   { damage: 0.58, speed: 0.84, rate: 0.52, accuracy: 0.08, retarget: 0.5 }
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
    this.netId = id; this.id = id; this.group = group || "G1";
    this.team = ally ? "BLUE" : this.group;
    this.isAlly = ally; this.allyType = role; this.leaderId = null; this.roleIndex = styleIndex || 0;
    this.username = ally ? cfg.label : ("S" + (groupNum + 1) + "-" + String(id).replace(/\D/g, "").slice(-2));
    this.colorFill = ally ? cfg.color : COLORS[groupNum % COLORS.length].fill;
    this.colorStroke = ally ? cfg.stroke : COLORS[groupNum % COLORS.length].stroke;
    this.hpMax = (C.HP_MAX || 320) * (ally ? (cfg.hpMul || 1) : 0.75);
    this.hp = this.hpMax;
    this.radius = (C.SHIP_RADIUS || 18) * (cfg.radiusMul || 1);
    this.dmgMul = cfg.damage; this.speedMul = cfg.speed;
    this.fireRate = cfg.fireRate || cfg.rate || 0.7;
    this.accuracy = cfg.accuracy != null ? cfg.accuracy : 0.12;
    this.attackRange = cfg.range || 720;
    this.preferDist = cfg.preferDist || (ally ? 180 : 340);
    this.leash = cfg.leash || (ally ? 300 : 9999);
    this.threatR = cfg.threatR || 1000;
    this.retargetSec = cfg.retarget || (ally ? 0.25 : 0.65);
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
      if (still && dist(this, this._target) < this.attackRange * 1.4) return this._target;
    }
    function isEnemy(e) {
      if (!e || e === self || e.alive === false || (e.hp != null && e.hp <= 0) || e.stealthed) return false;
      if (self.isAlly) {
        if (e === player || e.isAlly) return false;
        if (e.team && player && e.team === player.team && e.team !== "NONE") return false;
        return true;
      }
      if (e.isAlly) return true;
      if (e === player) return true;
      if (e.group && e.group === self.group) return false;
      if (e.team && e.team === self.team && e.team !== "NONE") return false;
      return true;
    }
    function consider(e) {
      if (!isEnemy(e)) return;
      var d = dist(self, e);
      if (d > self.threatR * 1.25) return;
      var score = d;
      if (self.isAlly && player) score = dist(player, e) * 0.7 + d * 0.3;
      else score = (e === player) ? d * 0.92 : d * 0.88;
      score += (e.hp || 80) * 0.04;
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
      { ang: baseAng + Math.PI * 0.9, dist: 70 },
      { ang: baseAng + 0.2, dist: 110 },
      { ang: baseAng - Math.PI * 0.55, dist: 125 },
      { ang: baseAng + Math.PI, dist: 55 },
      { ang: baseAng + Math.PI * 0.45, dist: 95 }
    ];
    var s = slots[idx] || slots[0], wobble = Math.sin(now * 1.4 + this._seed) * 5;
    return { x: player.x + Math.cos(s.ang) * (s.dist + wobble), y: player.y + Math.sin(s.ang) * (s.dist + wobble) };
  };
  AiPilot.prototype._turnToward = function (desired, rate, dt) {
    var diff = angleDiff(desired, this.angle);
    this.angle += clamp(diff, -rate * dt, rate * dt);
  };
  AiPilot.prototype.update = function (dt, player, combat, now, entities) {
    var C = global.WWNConfig || {};
    if (!this.alive) { this.respawnTimer = (this.respawnTimer || 0) - dt; return; }
    if ((this.hp || 0) <= 0) {
      this.alive = false;
      this.respawnTimer = (C.RESPAWN_SEC || 3.2) * (this.isAlly ? 0.5 : 1);
      this.vx = 0; this.vy = 0; return;
    }
    if (this.empUntil && now < this.empUntil) {
      this.vx *= Math.exp(-3 * dt); this.vy *= Math.exp(-3 * dt);
      this.x += this.vx * dt; this.y += this.vy * dt; return;
    }
    this.fireCd = Math.max(0, this.fireCd - dt);
    this._retarget -= dt; this._roleBeat -= dt; this._strafeT -= dt;
    if (this._strafeT <= 0) { this._strafe *= -1; this._strafeT = 2 + Math.random() * 2.5; }
    this._orbit += dt * (this.isAlly ? 1.0 : 0.55);
    if (this._retarget <= 0) {
      this._target = this._pickTarget(player, entities || []);
      this._retarget = this.retargetSec + Math.random() * 0.15;
    }
    var target = this._target, aimX = this.x, aimY = this.y, desiredAngle = this.angle;
    var turnRate = (C.TURN_RATE || 3.2) * (this.isAlly ? 1.25 : 0.88);
    if (this.isAlly && player) {
      var formation = this._formationPoint(player, now), dLeader = dist(this, player);
      aimX = formation.x; aimY = formation.y;
      if (dLeader > this.leash) {
        aimX = player.x; aimY = player.y;
        desiredAngle = Math.atan2(player.y - this.y, player.x - this.x);
      } else if (target && target.alive !== false && (target.hp || 0) > 0) {
        var ta = Math.atan2(target.y - player.y, target.x - player.x);
        if (this.allyType === "striker") {
          if (dist(player, target) < 700) { aimX = target.x - Math.cos(ta) * 70; aimY = target.y - Math.sin(ta) * 70; }
          desiredAngle = Math.atan2(target.y - this.y, target.x - this.x);
        } else if (this.allyType === "guardian") {
          aimX = player.x + Math.cos(ta) * 55; aimY = player.y + Math.sin(ta) * 55;
          desiredAngle = Math.atan2(target.y - this.y, target.x - this.x);
        } else if (this.allyType === "phantom") {
          if (dist(player, target) < 850) {
            var oa = ta + this._orbit;
            aimX = target.x + Math.cos(oa) * 130; aimY = target.y + Math.sin(oa) * 130;
          }
          desiredAngle = Math.atan2(target.y - this.y, target.x - this.x);
        } else if (this.allyType === "medic") {
          aimX = formation.x; aimY = formation.y;
          desiredAngle = target ? Math.atan2(target.y - this.y, target.x - this.x) : (player.angle || desiredAngle);
          if (this._roleBeat <= 0) {
            this._roleBeat = 0.45;
            if (dLeader < 260) {
              if (player.hp < (C.HP_MAX || 320)) player.hp = Math.min(C.HP_MAX || 320, player.hp + 3.2);
              (entities || []).forEach(function (e) {
                if (e && e.isAlly && e.alive && e.hp < e.hpMax && dist(player, e) < 260)
                  e.hp = Math.min(e.hpMax, e.hp + 1.4);
              });
            }
          }
        } else if (this.allyType === "vanguard") {
          if (dist(player, target) < 750) {
            aimX = target.x - Math.cos(ta) * 110; aimY = target.y - Math.sin(ta) * 110;
          }
          desiredAngle = Math.atan2(target.y - this.y, target.x - this.x);
        }
      } else desiredAngle = Math.atan2(aimY - this.y, aimX - this.x);
    } else if (target) {
      var td0 = dist(this, target), angTo = Math.atan2(target.y - this.y, target.x - this.x);
      var orbitAng = angTo + this._strafe * Math.PI * 0.5;
      if (td0 > this.preferDist * 1.15) { aimX = target.x; aimY = target.y; }
      else if (td0 < this.preferDist * 0.7) { aimX = this.x - Math.cos(angTo) * 120; aimY = this.y - Math.sin(angTo) * 120; }
      else { aimX = target.x + Math.cos(orbitAng) * this.preferDist; aimY = target.y + Math.sin(orbitAng) * this.preferDist; }
      desiredAngle = angTo;
    } else {
      desiredAngle = this.angle + Math.sin(now * 0.35 + this._seed) * 0.35;
      aimX = this.x + Math.cos(desiredAngle) * 160; aimY = this.y + Math.sin(desiredAngle) * 160;
    }
    this._turnToward(desiredAngle, turnRate, dt);
    var mdx = aimX - this.x, mdy = aimY - this.y, md = Math.hypot(mdx, mdy) || 1;
    var thrust = md > 90 ? 1 : (md > 40 ? 0.4 : (md < 28 ? -0.2 : 0.08));
    if (this.isAlly && player && dist(this, player) > this.leash * 0.85) thrust = 1.15;
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
    if (Math.abs(angleDiff(shot, this.angle)) > (this.isAlly ? 0.9 : 0.4)) return;
    var a = shot + (Math.random() - 0.5) * this.accuracy;
    var w = (global.WWNWeapons && global.WWNWeapons.vulcan) || { speed: 780, life: 0.85, dmg: 5, radius: 3 };
    if (!combat.projectiles || !combat.projectiles.acquire) return;
    var p = combat.projectiles.acquire();
    p.alive = true; p.type = "vulcan"; p.x = this.x + Math.cos(a) * 20; p.y = this.y + Math.sin(a) * 20; p.angle = a;
    p.vx = Math.cos(a) * w.speed; p.vy = Math.sin(a) * w.speed; p.life = w.life; p.maxLife = w.life;
    p.dmg = (w.dmg || 5) * this.dmgMul; p.ownerId = this.netId; p.team = this.team; p.radius = w.radius || 3;
    p.aoe = 0; p.color = this.colorStroke; p.targetId = null; p.turn = 0; p.split = 0;
    this.fireCd = this.fireRate + Math.random() * (this.isAlly ? 0.04 : 0.16);
  };
  AiPilot.prototype.draw = function (ctx, cam) {
    if (!this.alive || !cam) return;
    var z = cam.zoom || 1;
    var sx = cam.sx ? cam.sx(this.x) : (this.x - cam.x) * z + cam.w / 2;
    var sy = cam.sy ? cam.sy(this.y) : (this.y - cam.y) * z + cam.h / 2;
    if (sx < -100 || sx > cam.w + 100 || sy < -100 || sy > cam.h + 100) return;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.angle);
    var role = this.allyType;
    if (this.isAlly) {
      ctx.globalAlpha = 0.22;
      var aura = ctx.createRadialGradient(0, 0, 4, 0, 0, 28);
      aura.addColorStop(0, this.colorStroke); aura.addColorStop(1, "transparent");
      ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.globalAlpha = 0.7;
      var plume = ctx.createLinearGradient(-8, 0, -30, 0);
      plume.addColorStop(0, this.colorStroke); plume.addColorStop(0.5, this.colorFill); plume.addColorStop(1, "transparent");
      ctx.fillStyle = plume;
      ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(-28 - Math.sin(performance.now() / 40 + this._seed) * 4, 0); ctx.lineTo(-6, 5); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      if (role === "guardian") {
        ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(6, 11); ctx.lineTo(-12, 15); ctx.lineTo(-16, 6); ctx.lineTo(-10, 0); ctx.lineTo(-16, -6); ctx.lineTo(-12, -15); ctx.lineTo(6, -11); ctx.closePath();
        ctx.fillStyle = this.colorFill; ctx.fill(); ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 2.6; ctx.stroke();
        ctx.globalAlpha = 0.85;
        for (var s = 0; s < 3; s++) {
          ctx.beginPath(); ctx.arc(8, 0, 16 + s * 5, -1.05, 1.05);
          ctx.strokeStyle = s === 0 ? this.colorStroke : "rgba(255,255,255," + (0.35 - s * 0.1) + ")";
          ctx.lineWidth = 2.5 - s * 0.5; ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (role === "striker") {
        ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(10, 5); ctx.lineTo(-16, 12); ctx.lineTo(-8, 0); ctx.lineTo(-16, -12); ctx.lineTo(10, -5); ctx.closePath();
        ctx.fillStyle = this.colorFill; ctx.fill(); ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 2.2; ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(28, 0); ctx.lineTo(4, 2.5); ctx.lineTo(4, -2.5); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      } else if (role === "phantom") {
        ctx.globalAlpha = 0.75;
        ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-2, 11); ctx.lineTo(-20, 5); ctx.lineTo(-14, 0); ctx.lineTo(-20, -5); ctx.lineTo(-2, -11); ctx.closePath();
        ctx.fillStyle = this.colorFill; ctx.fill(); ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 1.8; ctx.stroke();
        ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.ellipse(2, 0, 26, 15, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      } else if (role === "medic") {
        var spin = performance.now() / 500;
        ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fillStyle = this.colorFill; ctx.fill(); ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 2.4; ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.beginPath(); ctx.arc(0, 0, 19, spin, spin + Math.PI * 1.2); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.fillRect(-2.8, -9, 5.6, 18); ctx.fillRect(-9, -2.8, 18, 5.6);
      } else if (role === "vanguard") {
        ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(4, 12); ctx.lineTo(-18, 0); ctx.lineTo(4, -12); ctx.closePath();
        ctx.fillStyle = this.colorFill; ctx.fill(); ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(2, 6); ctx.lineTo(-8, 0); ctx.lineTo(2, -6); ctx.closePath(); ctx.fillStyle = "#fff9"; ctx.fill();
      } else {
        ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-14, 11); ctx.lineTo(-7, 0); ctx.lineTo(-14, -11); ctx.closePath();
        ctx.fillStyle = this.colorFill; ctx.fill(); ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-20, -10); ctx.lineTo(-28, 0); ctx.lineTo(-20, 10); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-12, 10); ctx.lineTo(-6, 0); ctx.lineTo(-12, -10); ctx.closePath();
      ctx.fillStyle = this.colorFill; ctx.fill(); ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 1.4; ctx.stroke();
    }
    var ratio = Math.max(0, this.hp / (this.hpMax || 1));
    ctx.rotate(-this.angle);
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(-15, -26, 30, 4);
    ctx.fillStyle = ratio > 0.35 ? this.colorStroke : "#ff4466"; ctx.fillRect(-15, -26, 30 * ratio, 4);
    if (this.isAlly) {
      ctx.fillStyle = this.colorStroke; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(this.username || role || "ALLY", 0, -30);
    }
    ctx.restore();
  };
  global.WWNAiPilot = AiPilot;
  global.WWNAllyTypes = ROLES;
  global.WWNAllyRoleOrder = ROLE_ORDER;
})(typeof window !== "undefined" ? window : globalThis);
