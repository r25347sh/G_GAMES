(function (global) {
  "use strict";
  var GROUPS = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"];
  var COLORS = ["#ff4d91", "#41c8ff", "#93df58", "#ffab45", "#ad76ff", "#ffe05b", "#ff6682"];
  var ROLES = {
    guardian: { label: "GUARDIAN", color: "#70e39a", damage: 1.45, fireRate: 0.34, speed: 0.92, range: 760 },
    striker: { label: "STRIKER", color: "#ff657a", damage: 2.45, fireRate: 0.19, speed: 1.22, range: 1050 },
    phantom: { label: "PHANTOM", color: "#be82ff", damage: 1.85, fireRate: 0.24, speed: 1.18, range: 900 },
    medic: { label: "MEDIC", color: "#48e6d0", damage: 1.35, fireRate: 0.32, speed: 1.12, range: 820 },
    tactician: { label: "TACTICIAN", color: "#ffcf5a", damage: 1.8, fireRate: 0.25, speed: 1.05, range: 1000 },
  };
  var DIFFICULTY = {
    easy: { damage: 0.42, speed: 0.72, rate: 0.74, accuracy: 0.24 },
    normal: { damage: 0.56, speed: 0.82, rate: 0.61, accuracy: 0.16 },
    hard: { damage: 0.72, speed: 0.92, rate: 0.52, accuracy: 0.10 },
  };
  var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
  var distance = function (a, b) { return Math.hypot((b.x || 0) - (a.x || 0), (b.y || 0) - (a.y || 0)); };
  function angleDiff(a, b) { var d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
  function AiPilot(id, difficulty, styleIndex, group, allyType) {
    var C = global.WWNConfig, ally = group === "ALLY", role = ally ? (allyType || ["guardian", "striker", "phantom", "medic", "tactician"][(styleIndex || 0) % 5]) : null;
    var cfg = ally ? ROLES[role] : DIFFICULTY[difficulty] || DIFFICULTY.normal;
    var groupNum = Math.max(0, GROUPS.indexOf(group));
    this.netId = id; this.id = id; this.group = group || "G1"; this.team = ally ? "BLUE" : this.group;
    this.isAlly = ally; this.allyType = role; this.leaderId = null; this.roleIndex = styleIndex || 0;
    this.username = ally ? cfg.label : "SQUAD " + (groupNum + 1) + " · " + String(id).slice(-1);
    this.colorFill = ally ? cfg.color : COLORS[groupNum % COLORS.length];
    this.colorStroke = ally ? cfg.color : COLORS[groupNum % COLORS.length];
    this.hpMax = C.HP_MAX; this.hp = C.HP_MAX; this.radius = C.SHIP_RADIUS * (ally && role === "guardian" ? 1.12 : 1);
    this.dmgMul = cfg.damage; this.speedMul = cfg.speed; this.fireRate = cfg.fireRate || cfg.rate;
    this.accuracy = cfg.accuracy || 0.045; this.attackRange = cfg.range || 720;
    this.alive = true; this.respawnTimer = 0; this.empUntil = 0; this.stealthed = false; this.boosting = false;
    this.boost = C.BOOST_MAX; this.fireCd = Math.random() * 0.45; this._retarget = Math.random() * 0.2; this._target = null;
    this._orbit = Math.random() * Math.PI * 2; this._roleBeat = 0; this._seed = Math.random() * 10000;
    this.preferDist = ally ? (role === "striker" ? 180 : 260) : 360;
    this.leash = 1400; this.threatR = 1100;
    var half = C.WORLD_SIZE * 0.4;
    this.x = (Math.random() - 0.5) * half * 2; this.y = (Math.random() - 0.5) * half * 2;
    this.vx = 0; this.vy = 0; this.angle = Math.random() * Math.PI * 2;
  }
  AiPilot.prototype._pickTarget = function (player, entities) {
    var best = null, scoreBest = Infinity, self = this;
    for (var i = 0; i < entities.length; i++) {
      var e = entities[i];
      if (!e || e === self || e.alive === false || e.hp <= 0 || e.stealthed) continue;
      if (self.isAlly) {
        if (e === player || e.isAlly || (e.team && player && e.team === player.team && e.team !== "NONE")) continue;
      } else {
        if (e.isAlly) continue;
        if (e === player) {
          if (self.team && e.team && self.team === e.team && e.team !== "NONE") continue;
        } else {
          // Distinct CPU squads are rivals; same-squad units cooperate.
          if (e.group && e.group === self.group) continue;
          if (self.team && e.team && self.team === e.team && e.team !== "NONE") continue;
        }
      }
      var d = distance(self, e);
      if (d > (self.isAlly ? self.threatR : 1250)) continue;
      var s = d + (e.hp || 100) * (self.isAlly ? 0.12 : 0.07);
      if (e === player && self.isAlly) s += 100000;
      if (self.isAlly && player) {
        var danger = distance(player, e);
        if (danger < 420) s -= (420 - danger) * (self.allyType === "guardian" ? 0.65 : 0.25);
      }
      if (s < scoreBest) { scoreBest = s; best = e; }
    }
    return best;
  };
  AiPilot.prototype.respawn = function (player) {
    var C = global.WWNConfig, half = C.WORLD_SIZE * 0.39;
    this.alive = true; this.hp = this.hpMax = C.HP_MAX; this.respawnTimer = 0;
    this.x = (Math.random() * 2 - 1) * half; this.y = (Math.random() * 2 - 1) * half;
    // Wingmen rejoin from a random nearby vector; enemy spawn points vary across the map.
    if (this.isAlly && player) {
      var a = Math.random() * Math.PI * 2, d = 180 + Math.random() * 280;
      this.x = player.x + Math.cos(a) * d; this.y = player.y + Math.sin(a) * d;
    }
    this.vx = 0; this.vy = 0; this.fireCd = 0.4; this._target = null; this._retarget = 0;
  };
  AiPilot.prototype._formationPoint = function (player, now) {
    var slot = this.roleIndex || 0, angle = player.angle + Math.PI + (slot - 2) * 0.48;
    var radius = this.allyType === "guardian" ? 115 : (this.allyType === "striker" ? 210 : 155);
    if (this.allyType === "phantom") angle += Math.sin(now * 1.2 + this._seed) * 0.45;
    if (this.allyType === "medic") { angle = player.angle + Math.PI; radius = 85; }
    if (this.allyType === "tactician") { angle += Math.sin(now * 0.7 + slot) * 0.28; radius = 245; }
    return { x: player.x + Math.cos(angle) * radius, y: player.y + Math.sin(angle) * radius };
  };
  AiPilot.prototype._turnToward = function (desired, rate, dt) {
    this.angle += clamp(angleDiff(desired, this.angle), -rate * dt, rate * dt);
  };
  AiPilot.prototype.update = function (dt, player, combat, now, entities) {
    var C = global.WWNConfig;
    if (!this.alive) { this.respawnTimer = Math.max(0, this.respawnTimer - dt); if (this.respawnTimer <= 0) this.respawn(player); return; }
    if (this.hp <= 0) { this.alive = false; this.respawnTimer = C.RESPAWN_SEC; return; }
    if (now < this.empUntil) { this.vx *= 0.9; this.vy *= 0.9; this.x += this.vx * dt; this.y += this.vy * dt; return; }
    this.fireCd = Math.max(0, this.fireCd - dt); this._retarget -= dt; this._roleBeat -= dt;
    if (this._retarget <= 0 || !this._target || !this._target.alive || this._target.hp <= 0) {
      this._target = this._pickTarget(player, entities || []);
      this._retarget = this.isAlly ? 0.22 : 0.4;
    }
    var target = this._target, aimX, aimY, desiredAngle;
    if (this.isAlly && player) {
      var dLeader = distance(this, player), formation = this._formationPoint(player, now);
      aimX = formation.x; aimY = formation.y;
      if (target) {
        var targetAngle = Math.atan2(target.y - player.y, target.x - player.x);
        if (this.allyType === "striker") { aimX = target.x; aimY = target.y; }
        else if (this.allyType === "guardian") {
          aimX = player.x + Math.cos(targetAngle) * 80; aimY = player.y + Math.sin(targetAngle) * 80;
        } else if (this.allyType === "phantom") {
          var orbit = targetAngle + this._orbit + now * 0.8;
          aimX = target.x + Math.cos(orbit) * 150; aimY = target.y + Math.sin(orbit) * 150;
        } else if (this.allyType === "medic") {
          aimX = formation.x; aimY = formation.y;
          if (this._roleBeat <= 0) { this._roleBeat = 0.35; if (dLeader < 260 && player.hp < C.HP_MAX) player.hp = Math.min(C.HP_MAX, player.hp + 1.35); }
        } else if (this.allyType === "tactician") {
          var side = Math.atan2(target.y - this.y, target.x - this.x) + Math.PI / 2 * (this.roleIndex % 2 ? 1 : -1);
          aimX = target.x + Math.cos(side) * 230; aimY = target.y + Math.sin(side) * 230;
        }
        desiredAngle = Math.atan2(target.y - this.y, target.x - this.x);
      } else desiredAngle = Math.atan2(player.y - this.y, player.x - this.x);
      if (dLeader > this.leash) { aimX = player.x; aimY = player.y; }
    } else if (target) {
      aimX = target.x; aimY = target.y; desiredAngle = Math.atan2(aimY - this.y, aimX - this.x);
    } else {
      desiredAngle = this.angle + Math.sin(now + this._seed) * 0.3;
      aimX = this.x + Math.cos(desiredAngle) * 160; aimY = this.y + Math.sin(desiredAngle) * 160;
    }
    var moveDx = aimX - this.x, moveDy = aimY - this.y, moveD = Math.hypot(moveDx, moveDy) || 1;
    if (target && desiredAngle != null) this._turnToward(desiredAngle, C.TURN_RATE * (this.isAlly ? 1.18 : 0.84), dt);
    else this._turnToward(Math.atan2(moveDy, moveDx), C.TURN_RATE * 0.85, dt);
    var thrust = moveD > (this.isAlly ? 75 : this.preferDist * 0.9) ? 1 : (moveD < 52 ? -0.28 : 0.08);
    if (this.isAlly && target && this.allyType !== "striker" && moveD < 100) thrust = 0.12;
    this.vx += Math.cos(this.angle) * C.ACCEL * thrust * this.speedMul * dt;
    this.vy += Math.sin(this.angle) * C.ACCEL * thrust * this.speedMul * dt;
    this.vx *= Math.exp(-C.DRAG * dt); this.vy *= Math.exp(-C.DRAG * dt);
    var speed = Math.hypot(this.vx, this.vy), maxSpeed = C.MAX_SPEED * this.speedMul;
    if (speed > maxSpeed) { this.vx *= maxSpeed / speed; this.vy *= maxSpeed / speed; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    var edge = C.WORLD_SIZE * 0.48;
    if (this.x < -edge || this.x > edge || this.y < -edge || this.y > edge) {
      this.x = clamp(this.x, -edge, edge); this.y = clamp(this.y, -edge, edge); this.vx *= -0.45; this.vy *= -0.45;
    }
    if (!target || !combat || this.fireCd > 0) return;
    var shotDist = distance(this, target); if (shotDist > this.attackRange) return;
    var lead = Math.min(0.7, shotDist / 900);
    var shotAngle = Math.atan2(target.y + (target.vy || 0) * lead - this.y, target.x + (target.vx || 0) * lead - this.x);
    var error = angleDiff(shotAngle, this.angle);
    if (Math.abs(error) > (this.isAlly ? 0.72 : 0.58)) return;
    var spread = (Math.random() - 0.5) * this.accuracy;
    var angle = shotAngle + spread, w = global.WWNWeapons.vulcan;
    var projectile = combat.projectiles.acquire();
    projectile.alive = true; projectile.type = "vulcan";
    projectile.x = this.x + Math.cos(angle) * 20; projectile.y = this.y + Math.sin(angle) * 20; projectile.angle = angle;
    projectile.vx = Math.cos(angle) * w.speed; projectile.vy = Math.sin(angle) * w.speed;
    projectile.life = w.life; projectile.maxLife = w.life; projectile.dmg = w.dmg * this.dmgMul;
    projectile.ownerId = this.netId; projectile.team = this.team; projectile.radius = w.radius; projectile.aoe = 0;
    projectile.color = this.colorStroke; projectile.targetId = null; projectile.turn = 0; projectile.split = 0;
    this.fireCd = this.fireRate + Math.random() * (this.isAlly ? 0.035 : 0.12);
  };
  AiPilot.prototype.draw = function (ctx, cam) {
    if (!this.alive) return;
    var sx = this.x - cam.x + cam.w / 2, sy = this.y - cam.y + cam.h / 2;
    if (sx < -56 || sx > cam.w + 56 || sy < -56 || sy > cam.h + 56) return;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.angle);
    ctx.shadowColor = this.colorStroke; ctx.shadowBlur = this.isAlly ? 17 : 7;
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-14, 11); ctx.lineTo(-7, 0); ctx.lineTo(-14, -11); ctx.closePath();
    ctx.fillStyle = this.colorFill; ctx.fill(); ctx.strokeStyle = this.colorStroke; ctx.lineWidth = this.isAlly ? 2 : 1.3; ctx.stroke();
    if (this.isAlly) { ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(0, 0, 23 + Math.sin(performance.now() * 0.005 + this.roleIndex) * 2, 0, Math.PI * 2); ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 1.2; ctx.stroke(); }
    ctx.restore();
    ctx.globalAlpha = 0.9; ctx.fillStyle = this.colorStroke; ctx.font = this.isAlly ? "bold 9px sans-serif" : "9px sans-serif"; ctx.textAlign = "center"; ctx.fillText(this.username, sx, sy - 23);
    if (this.isAlly) { ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(sx - 18, sy + 17, 36, 3); ctx.fillStyle = this.colorStroke; ctx.fillRect(sx - 18, sy + 17, 36 * clamp(this.hp / this.hpMax, 0, 1), 3); }
    ctx.globalAlpha = 1;
  };
  AiPilot.__wwnTuned = true; // runtime-fixes should not wrap and multiply damage again
  global.WWNAiPilot = AiPilot;
  global.WWNAiGroups = GROUPS.reduce(function (out, id, i) { out[id] = { fill: COLORS[i], stroke: COLORS[i], name: "SQUAD " + (i + 1) }; return out; }, { ALLY: { fill: "#70e39a", stroke: "#70e39a", name: "WING" } });
  global.WWNAllyTypes = ROLES;
})(typeof window !== "undefined" ? window : globalThis);
