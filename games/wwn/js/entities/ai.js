(function (global) {
  "use strict";
  var GROUPS = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"];
  var COLORS = ["#ff4d91", "#41c8ff", "#93df58", "#ffab45", "#ad76ff", "#ffe05b", "#ff6682"];
  var ROLES = {
    guardian: { label: "GUARDIAN", color: "#70e39a", damage: 1.15, fireRate: 0.4, speed: 0.94, range: 760 },
    striker: { label: "STRIKER", color: "#ff657a", damage: 1.5, fireRate: 0.24, speed: 1.12, range: 950 },
    phantom: { label: "PHANTOM", color: "#be82ff", damage: 1.25, fireRate: 0.3, speed: 1.1, range: 850 },
    medic: { label: "MEDIC", color: "#48e6d0", damage: 0.8, fireRate: 0.46, speed: 1.04, range: 700 },
    tactician: { label: "TACTICIAN", color: "#ffcf5a", damage: 1.15, fireRate: 0.35, speed: 1.02, range: 900 },
  };
  var DIFFICULTY = {
    easy: { damage: 0.36, speed: 0.68, rate: 0.92, accuracy: 0.34 },
    normal: { damage: 0.48, speed: 0.76, rate: 0.76, accuracy: 0.26 },
    hard: { damage: 0.62, speed: 0.86, rate: 0.64, accuracy: 0.18 },
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
    this.colorFill = ally ? cfg.color : COLORS[groupNum % COLORS.length]; this.colorStroke = ally ? cfg.color : COLORS[groupNum % COLORS.length];
    this.hpMax = C.HP_MAX; this.hp = C.HP_MAX; this.radius = C.SHIP_RADIUS * (ally && role === "guardian" ? 1.12 : 1);
    this.dmgMul = cfg.damage; this.speedMul = cfg.speed; this.fireRate = cfg.fireRate || cfg.rate;
    this.accuracy = cfg.accuracy || 0.045; this.attackRange = cfg.range || 720;
    this.alive = true; this.respawnTimer = 0; this.empUntil = 0; this.stealthed = false; this.boosting = false;
    this.boost = C.BOOST_MAX; this.fireCd = Math.random() * 0.45; this._retarget = Math.random() * 0.2; this._target = null;
    this._orbit = Math.random() * Math.PI * 2; this._roleBeat = 0; this._seed = Math.random() * 10000;
    this.preferDist = ally ? (role === "striker" ? 200 : 270) : 360; this.leash = 1400; this.threatR = 1100;
    var half = C.WORLD_SIZE * 0.4; this.x = (Math.random() - 0.5) * half * 2; this.y = (Math.random() - 0.5) * half * 2;
    this.vx = 0; this.vy = 0; this.angle = Math.random() * Math.PI * 2;
  }
  AiPilot.prototype._pickTarget = function (player, entities) {
    var best = null, bestScore = Infinity, self = this;
    for (var i = 0; i < entities.length; i++) {
      var e = entities[i];
      if (!e || e === self || e.alive === false || e.hp <= 0 || e.stealthed) continue;
      if (self.isAlly) {
        if (e === player || e.isAlly || (e.team && player && e.team === player.team && e.team !== "NONE")) continue;
      } else {
        if (e.isAlly) continue;
        if (e === player) { if (self.team && e.team && self.team === e.team && e.team !== "NONE") continue; }
        else if (e.group && e.group === self.group) continue;
      }
      var d = distance(self, e); if (d > (self.isAlly ? self.threatR : 1250)) continue;
      var s = d + (e.hp || 100) * (self.isAlly ? 0.12 : 0.07);
      if (self.isAlly && player) { var danger = distance(player, e); if (danger < 420) s -= (420 - danger) * (self.allyType === "guardian" ? 0.65 : 0.25); }
      if (s < bestScore) { bestScore = s; best = e; }
    }
    return best;
  };
  AiPilot.prototype.respawn = function (player) {
    var C = global.WWNConfig, half = C.WORLD_SIZE * 0.39;
    this.alive = true; this.hp = this.hpMax = C.HP_MAX; this.respawnTimer = 0;
    this.x = (Math.random() * 2 - 1) * half; this.y = (Math.random() * 2 - 1) * half;
    if (this.isAlly && player) { var a = Math.random() * Math.PI * 2, d = 180 + Math.random() * 280; this.x = player.x + Math.cos(a) * d; this.y = player.y + Math.sin(a) * d; }
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
  AiPilot.prototype._turnToward = function (desired, rate, dt) { this.angle += clamp(angleDiff(desired, this.angle), -rate * dt, rate * dt); };
  AiPilot.prototype.update = function (dt, player, combat, now, entities) {
    var C = global.WWNConfig;
    if (!this.alive) { this.respawnTimer = Math.max(0, this.respawnTimer - dt); if (this.respawnTimer <= 0) this.respawn(player); return; }
    if (this.hp <= 0) { this.alive = false; this.respawnTimer = C.RESPAWN_SEC; return; }
    if (now < this.empUntil) { this.vx *= 0.9; this.vy *= 0.9; this.x += this.vx * dt; this.y += this.vy * dt; return; }
    this.fireCd = Math.max(0, this.fireCd - dt); this._retarget -= dt; this._roleBeat -= dt;
    if (this._retarget <= 0 || !this._target || !this._target.alive || this._target.hp <= 0) { this._target = this._pickTarget(player, entities || []); this._retarget = this.isAlly ? 0.32 : 0.6; }
    var target = this._target, aimX, aimY, desiredAngle;
    if (this.isAlly && player) {
      var dLeader = distance(this, player), formation = this._formationPoint(player, now); aimX = formation.x; aimY = formation.y;
      if (target) {
        var ta = Math.atan2(target.y - player.y, target.x - player.x);
        if (this.allyType === "striker") { aimX = target.x; aimY = target.y; }
        else if (this.allyType === "guardian") { aimX = player.x + Math.cos(ta) * 95; aimY = player.y + Math.sin(ta) * 95; }
        else if (this.allyType === "phantom") { var oa = ta + this._orbit + now * 0.75; aimX = target.x + Math.cos(oa) * 175; aimY = target.y + Math.sin(oa) * 175; }
        else if (this.allyType === "medic") {
          aimX = formation.x; aimY = formation.y;
          if (this._roleBeat <= 0) { this._roleBeat = 0.7; if (dLeader < 280 && player.hp < C.HP_MAX) player.hp = Math.min(C.HP_MAX, player.hp + 1.1); }
        } else if (this.allyType === "tactician") { var side = ta + (this.roleIndex % 2 ? 1 : -1) * Math.PI / 2; aimX = target.x + Math.cos(side) * 260; aimY = target.y + Math.sin(side) * 260; }
        desiredAngle = Math.atan2(target.y - this.y, target.x - this.x);
      } else desiredAngle = Math.atan2(player.y - this.y, player.x - this.x);
      if (dLeader > this.leash) { aimX = player.x; aimY = player.y; }
    } else if (target) { aimX = target.x; aimY = target.y; desiredAngle = Math.atan2(aimY - this.y, aimX - this.x); }
    else { desiredAngle = this.angle + Math.sin(now + this._seed) * 0.3; aimX = this.x + Math.cos(desiredAngle) * 160; aimY = this.y + Math.sin(desiredAngle) * 160; }
    var mdx = aimX - this.x, mdy = aimY - this.y, md = Math.hypot(mdx, mdy) || 1;
    this._turnToward(desiredAngle == null ? Math.atan2(mdy, mdx) : desiredAngle, C.TURN_RATE * (this.isAlly ? 1.12 : 0.78), dt);
    var thrust = md > (this.isAlly ? 90 : this.preferDist * 0.9) ? 1 : (md < 65 ? -0.22 : 0.06);
    if (this.isAlly && target && this.allyType !== "striker" && md < 120) thrust = 0.08;
    this.vx += Math.cos(this.angle) * C.ACCEL * thrust * this.speedMul * dt; this.vy += Math.sin(this.angle) * C.ACCEL * thrust * this.speedMul * dt;
    this.vx *= Math.exp(-C.DRAG * dt); this.vy *= Math.exp(-C.DRAG * dt);
    var sp = Math.hypot(this.vx, this.vy), maxSp = C.MAX_SPEED * this.speedMul; if (sp > maxSp) { this.vx *= maxSp / sp; this.vy *= maxSp / sp; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    var edge = C.WORLD_SIZE * 0.48; if (this.x < -edge || this.x > edge || this.y < -edge || this.y > edge) { this.x = clamp(this.x, -edge, edge); this.y = clamp(this.y, -edge, edge); this.vx *= -0.4; this.vy *= -0.4; }
    if (!target || !combat || this.fireCd > 0) return;
    var td = distance(this, target); if (td > this.attackRange) return;
    var lead = Math.min(0.55, td / 1050), shot = Math.atan2(target.y + (target.vy || 0) * lead - this.y, target.x + (target.vx || 0) * lead - this.x);
    if (Math.abs(angleDiff(shot, this.angle)) > (this.isAlly ? 0.7 : 0.46)) return;
    var a = shot + (Math.random() - 0.5) * this.accuracy, w = global.WWNWeapons.vulcan, p = combat.projectiles.acquire();
    p.alive = true; p.type = "vulcan"; p.x = this.x + Math.cos(a) * 20; p.y = this.y + Math.sin(a) * 20; p.angle = a;
    p.vx = Math.cos(a) * w.speed; p.vy = Math.sin(a) * w.speed; p.life = w.life; p.maxLife = w.life;
    p.dmg = w.dmg * this.dmgMul; p.ownerId = this.netId; p.team = this.team; p.radius = w.radius; p.aoe = 0;
    p.color = this.colorStroke; p.targetId = null; p.turn = 0; p.split = 0;
    this.fireCd = this.fireRate + Math.random() * (this.isAlly ? 0.06 : 0.16);
  };
  AiPilot.prototype.draw = function (ctx, cam) {
    var sx = this.x - cam.x + cam.w / 2, sy = this.y - cam.y + cam.h / 2;
    if (!this.alive || sx < -52 || sx > cam.w + 52 || sy < -52 || sy > cam.h + 52) return;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.angle); ctx.shadowColor = this.colorStroke; ctx.shadowBlur = this.isAlly ? 12 : 4;
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-14, 11); ctx.lineTo(-7, 0); ctx.lineTo(-14, -11); ctx.closePath();
    ctx.fillStyle = this.colorFill; ctx.fill(); ctx.strokeStyle = this.colorStroke; ctx.lineWidth = this.isAlly ? 2 : 1; ctx.stroke();
    if (this.isAlly) {
      ctx.beginPath(); ctx.arc(-1, 0, 22, -0.65, 0.65); ctx.strokeStyle = this.colorStroke; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 0.8; ctx.fillStyle = this.colorStroke; ctx.beginPath(); ctx.arc(7, 0, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (this.isAlly) {
      ctx.globalAlpha = 0.86; ctx.fillStyle = this.colorStroke; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center"; ctx.fillText(this.username, sx, sy - 22);
      ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(sx - 15, sy + 15, 30, 2.5); ctx.fillStyle = this.colorStroke; ctx.fillRect(sx - 15, sy + 15, 30 * clamp(this.hp / this.hpMax, 0, 1), 2.5); ctx.globalAlpha = 1;
    }
  };
  AiPilot.__wwnTuned = true;
  global.WWNAiPilot = AiPilot;
  global.WWNAiGroups = GROUPS.reduce(function (out, id, i) { out[id] = { fill: COLORS[i], stroke: COLORS[i], name: "SQUAD " + (i + 1) }; return out; }, { ALLY: { fill: "#70e39a", stroke: "#70e39a", name: "WING" } });
  global.WWNAllyTypes = ROLES;
})(typeof window !== "undefined" ? window : globalThis);
