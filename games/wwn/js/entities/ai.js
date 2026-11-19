(function (global) {
  "use strict";

  var STYLES = ["aggressor", "flanker", "sniper", "brawler", "skirmisher"];

  function AiPilot(id, difficulty, styleIndex) {
    var C = global.WWNConfig;
    this.netId = id;
    this.id = id;
    this.username = "CPU-" + String(id).replace(/^cpu-?(auto-)?/, "") || "X";
    var ring = 400 + (styleIndex || 0) * 180 + Math.random() * 200;
    var ang0 = ((styleIndex || 0) * 2.399) + Math.random() * 0.8;
    this.x = Math.cos(ang0) * ring;
    this.y = Math.sin(ang0) * ring;
    this.vx = 0; this.vy = 0;
    this.angle = ang0 + Math.PI;
    this.hp = C.HP_MAX;
    this.boost = C.BOOST_MAX;
    this.boosting = false;
    this.team = "RED";
    this.alive = true;
    this.radius = C.SHIP_RADIUS;
    this.stealthed = false;
    this.empUntil = 0;
    this.lastHitBy = null;
    this.difficulty = difficulty || "normal";
    this.style = STYLES[(styleIndex || 0) % STYLES.length];
    this._seed = (styleIndex || 0) * 9973 + Math.floor(Math.random() * 999);
    this._think = Math.random() * 0.8;
    this._strafe = Math.random() < 0.5 ? 1 : -1;
    this._orbitDir = Math.random() < 0.5 ? 1 : -1;
    this._mainCd = 0;
    this._subCd = 0;
    this._gadCd = 0;
    this.loadout = new global.WWNWeaponLoadout();
    if (this.style === "sniper") { this.loadout.mainIdx = 1; this.loadout.subIdx = 0; }
    else if (this.style === "brawler") { this.loadout.mainIdx = 0; this.loadout.subIdx = 1; this.loadout.gadgetIdx = 0; }
    else if (this.style === "aggressor") { this.loadout.mainIdx = 2; this.loadout.subIdx = 0; }
    else if (this.style === "flanker") { this.loadout.mainIdx = 0; this.loadout.gadgetIdx = 1; }
    else { this.loadout.mainIdx = 1; this.loadout.subIdx = 2; }
  }

  AiPilot.prototype._preferDist = function () {
    if (this.style === "sniper") return 520;
    if (this.style === "brawler") return 220;
    if (this.style === "aggressor") return 300;
    if (this.style === "flanker") return 380;
    return 340;
  };

  AiPilot.prototype._pickTarget = function (player, allies, now) {
    var candidates = [];
    if (player && player.alive) candidates.push(player);
    if (allies) {
      for (var i = 0; i < allies.length; i++) {
        var a = allies[i];
        if (a && a.alive && a !== this && a.team !== this.team) candidates.push(a);
      }
    }
    if (!candidates.length) return player;
    var idx = Math.floor((this._seed + Math.floor(now * 0.3)) % candidates.length);
    if (this.style === "aggressor") return candidates[0] || player;
    if (this.style === "skirmisher" && candidates.length > 1) return candidates[idx];
    return candidates[idx % candidates.length];
  };

  AiPilot.prototype.update = function (dt, player, combat, now, allies) {
    var C = global.WWNConfig;
    if (!this.alive) return;
    if (now < this.empUntil) {
      this.vx *= 0.94; this.vy *= 0.94;
      this.x += this.vx * dt; this.y += this.vy * dt;
      return;
    }

    this.loadout.update(dt);
    this._mainCd = Math.max(0, this._mainCd - dt);
    this._subCd = Math.max(0, this._subCd - dt);
    this._gadCd = Math.max(0, this._gadCd - dt);
    this._think -= dt;

    var target = this._pickTarget(player, allies, now);
    var tx = target && target.alive ? target.x : 0;
    var ty = target && target.alive ? target.y : 0;

    if (combat && combat.decoys) {
      var bestDecoy = null, bestD = 1e9;
      combat.decoys.forEach(function (d) {
        if (!d.alive || d.team === this.team) return;
        var dd = Math.hypot(d.x - this.x, d.y - this.y);
        if (dd < 700 && dd < bestD) { bestD = dd; bestDecoy = d; }
      }.bind(this));
      if (bestDecoy && target) {
        var realD = Math.hypot(tx - this.x, ty - this.y);
        if (bestD < realD * 0.85 && (this._seed + Math.floor(now * 2)) % 10 < 6) {
          tx = bestDecoy.x; ty = bestDecoy.y;
        }
      }
    }

    var dx = tx - this.x, dy = ty - this.y;
    var dist = Math.hypot(dx, dy) || 1;
    var desired = Math.atan2(dy, dx);

    if (this.difficulty === "hard" && target && target.vx != null) {
      var lead = dist / (this.style === "sniper" ? 900 : 650);
      desired = Math.atan2(ty + (target.vy || 0) * lead - this.y, tx + (target.vx || 0) * lead - this.x);
    }

    var want = this._preferDist();
    if (this.style === "flanker" || this.style === "skirmisher") {
      desired += this._orbitDir * 0.9;
    }
    if (this._think <= 0) {
      this._strafe = Math.random() < 0.5 ? 1 : -1;
      this._orbitDir = Math.random() < 0.5 ? 1 : -1;
      this._think = 0.4 + (this._seed % 7) * 0.15 + Math.random() * 0.9;
      if (Math.random() < 0.25) this.loadout.cycleMain();
      if (Math.random() < 0.2) this.loadout.cycleSub();
      if (Math.random() < 0.15) this.loadout.cycleGadget();
    }
    if (dist < want + 80) desired += this._strafe * 0.55;

    var diff = desired - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    var turnSp = C.TURN_RATE * (this.difficulty === "easy" ? 0.65 : this.difficulty === "hard" ? 1.15 : 0.95);
    turnSp *= 0.9 + (this._seed % 5) * 0.04;
    var maxT = turnSp * dt;
    if (Math.abs(diff) <= maxT) this.angle = desired;
    else this.angle += Math.sign(diff) * maxT;

    var thrust = 1;
    if (dist < want * 0.5) thrust = -0.5;
    else if (dist < want * 0.85) thrust = 0.25;
    else if (dist > want * 1.6) thrust = 1;

    var accel = C.ACCEL * thrust * (this.difficulty === "easy" ? 0.7 : 1);
    this.boosting = false;
    if (thrust > 0.6 && this.boost > 25 && dist > want && Math.random() < 0.03 + (this.style === "aggressor" ? 0.03 : 0)) {
      this.boosting = true;
      accel *= C.BOOST_MULT;
      this.boost = Math.max(0, this.boost - C.BOOST_DRAIN * dt);
    } else {
      this.boost = Math.min(C.BOOST_MAX, this.boost + C.BOOST_REGEN * dt);
    }

    this.vx += Math.cos(this.angle) * accel * dt;
    this.vy += Math.sin(this.angle) * accel * dt;
    this.vx *= Math.exp(-C.DRAG * dt);
    this.vy *= Math.exp(-C.DRAG * dt);
    var sp = Math.hypot(this.vx, this.vy);
    var maxSp = C.MAX_SPEED * (this.boosting ? 1.35 : 0.92);
    if (sp > maxSp) { this.vx = (this.vx / sp) * maxSp; this.vy = (this.vy / sp) * maxSp; }
    this.x += this.vx * dt; this.y += this.vy * dt;

    var half = C.WORLD_SIZE / 2, margin = 50;
    if (this.x < -half + margin) { this.x = -half + margin; this.angle += 0.8; }
    if (this.x > half - margin) { this.x = half - margin; this.angle += 0.8; }
    if (this.y < -half + margin) { this.y = -half + margin; this.angle += 0.8; }
    if (this.y > half - margin) { this.y = half - margin; this.angle += 0.8; }

    if (!combat || !target || !target.alive) return;
    var aimOk = Math.abs(diff) < (this.style === "sniper" ? 0.2 : 0.4);

    if (this._mainCd <= 0 && dist < 950 && aimOk) {
      var mainId = this.loadout.mainId();
      var mw = global.WWNWeapons[mainId];
      if (combat.fireMain(this, this.loadout, now)) {
        this._mainCd = 1 / ((mw && mw.rate) || 5) * (this.difficulty === "easy" ? 1.4 : 1);
      }
    }

    if (this._subCd <= 0 && dist < 900 && Math.random() < 0.4) {
      var remotes = [player].concat(allies || []).filter(function (t) { return t && t !== this; }.bind(this));
      if (combat.fireSub(this, this.loadout, now, remotes)) {
        this._subCd = 1.2 + Math.random() * 0.8;
      }
    }

    if (this._gadCd <= 0) {
      var gid = this.loadout.gadgetId();
      var use = false;
      if (gid === "stealth" && dist < 400 && this.hp < 55) use = true;
      if (gid === "chaff" && dist < 500 && Math.random() < 0.3) use = true;
      if (gid === "mine" && dist < 280 && Math.random() < 0.25) use = true;
      if (gid === "decoy" && (this.hp < 70 || dist < 450) && Math.random() < 0.35) use = true;
      if (use && combat.useGadget(this, this.loadout, now)) {
        this._gadCd = 2 + Math.random() * 2;
        if (gid === "stealth") this.stealthed = true;
      }
    }
    if (this.loadout.isStealthed(now)) this.stealthed = true;
    else this.stealthed = false;
  };

  AiPilot.prototype.draw = function (ctx, cam) {
    if (!this.alive) return;
    var sx = this.x - cam.x + cam.w / 2;
    var sy = this.y - cam.y + cam.h / 2;
    if (sx < -40 || sx > cam.w + 40 || sy < -40 || sy > cam.h + 40) return;
    ctx.save();
    ctx.translate(sx, sy); ctx.rotate(this.angle);
    ctx.globalAlpha = this.stealthed ? 0.25 : 1;
    ctx.shadowColor = "#ff2d95"; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(16, 0); ctx.lineTo(-12, 10); ctx.lineTo(-6, 0); ctx.lineTo(-12, -10);
    ctx.closePath();
    ctx.fillStyle = "#ffc8d8"; ctx.fill();
    ctx.strokeStyle = "#ff2d95"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "#ff8cba";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.username, sx, sy - 22);
    ctx.globalAlpha = 1;
  };

  global.WWNAiPilot = AiPilot;
})(typeof window !== "undefined" ? window : globalThis);
