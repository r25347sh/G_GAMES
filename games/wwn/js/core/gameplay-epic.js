(function () {
  "use strict";

  var S = {
    ready: false, t: 0, rank: 0, rankXp: 0, streak: 0, lastKill: 0, totalKills: 0,
    mission: null, missionT: 0, missionProg: 0, missionNeed: 0,
    boss: null, crates: [], zones: [], floaters: [],
    banner: "", bannerT: 0, sub: "", subT: 0,
    shake: 0, flash: 0, powerMul: 1, powerT: 0,
    shieldT: 0, magnetT: 0, timeSlowT: 0, intensity: 0,
    nextMission: 8, nextCrate: 15, nextBoss: 55, nextChallenge: 25,
    challenge: null, challengeT: 0, beacons: [], wave: 0, title: "ROOKIE",
  };

  var RANKS = [
    { xp: 0, title: "ROOKIE" }, { xp: 400, title: "PILOT" }, { xp: 1000, title: "ACE" },
    { xp: 2200, title: "VETERAN" }, { xp: 4000, title: "COMMANDER" },
    { xp: 6500, title: "LEGEND" }, { xp: 10000, title: "WAR GOD" },
  ];

  var MISSIONS = [
    { id: "kills", name: "掃討指令", desc: "敵を撃破せよ", need: 6, type: "kill", reward: 200 },
    { id: "elite", name: "エリート排除", desc: "エリートを撃墜", need: 1, type: "elite", reward: 300 },
    { id: "beacon", name: "ビーコン制圧", desc: "ビーコンを確保", need: 2, type: "beacon", reward: 250 },
    { id: "streak", name: "連続攻撃", desc: "ストリーク×5達成", need: 5, type: "streak", reward: 280 },
    { id: "survive", name: "生存訓練", desc: "生き残れ", need: 25, type: "time", reward: 180 },
    { id: "crate", name: "補給回収", desc: "クレートを回収", need: 2, type: "crate", reward: 220 },
    { id: "close", name: "近接撃墜", desc: "近距離で撃墜", need: 3, type: "closekill", reward: 260 },
  ];

  function P() { return window.__wwnPlayer; }
  function L() { return window.__wwnAiList || []; }
  function C() { return window.__wwnCombat; }

  function toast(msg, sec, sub) {
    S.banner = msg; S.bannerT = sec || 2.4;
    if (sub) { S.sub = sub; S.subT = sec || 2.4; }
    try {
      var t = document.getElementById("toast");
      if (t) {
        t.textContent = msg;
        t.classList.add("show");
        setTimeout(function () { t.classList.remove("show"); }, (sec || 2.4) * 1000);
      }
    } catch (e) {}
  }

  function score(n, why) {
    try { if (window.__wwnScore && window.__wwnScore.add) window.__wwnScore.add(n, why || "epic"); } catch (e) {}
    S.rankXp += Math.round(n);
    updateRank();
  }

  function updateRank() {
    var prev = S.title;
    for (var i = RANKS.length - 1; i >= 0; i--) {
      if (S.rankXp >= RANKS[i].xp) { S.rank = i; S.title = RANKS[i].title; break; }
    }
    if (S.title !== prev) {
      toast("RANK UP — " + S.title, 3, "次の称号を目指せ");
      S.powerMul = Math.max(S.powerMul, 1.2);
      S.powerT = Math.max(S.powerT, 5);
      S.shake = 10;
    }
  }

  function floater(x, y, text, color) {
    S.floaters.push({ x: x, y: y, text: text, color: color || "#fff", life: 1.2, vy: -50 });
  }

  function startMission() {
    var m = MISSIONS[Math.floor(Math.random() * MISSIONS.length)];
    S.mission = m; S.missionProg = 0; S.missionNeed = m.need;
    S.missionT = m.type === "time" ? m.need : 90;
    toast("MISSION: " + m.name, 3, m.desc + "  ×" + m.need);
    if (m.type === "beacon" && S.beacons.length < 2) spawnBeacons(3);
    if (m.type === "elite") promoteElite(true);
  }

  function missionAdd(type, amt) {
    if (!S.mission) return;
    var m = S.mission, ok = false;
    if (m.type === "kill" && type === "kill") ok = true;
    if (m.type === "elite" && type === "elite") ok = true;
    if (m.type === "beacon" && type === "beacon") ok = true;
    if (m.type === "streak" && type === "streak") ok = true;
    if (m.type === "crate" && type === "crate") ok = true;
    if (m.type === "closekill" && type === "closekill") ok = true;
    if (!ok) return;
    S.missionProg += amt || 1;
    if (m.type === "streak") S.missionProg = Math.max(S.missionProg, S.streak);
    if (S.missionProg >= S.missionNeed) completeMission();
  }

  function completeMission() {
    if (!S.mission) return;
    var r = S.mission.reward || 200;
    score(r, "mission");
    toast("MISSION CLEAR +" + r, 2.5, S.mission.name);
    S.powerMul = Math.max(S.powerMul, 1.3);
    S.powerT = Math.max(S.powerT, 7);
    S.flash = 0.2; S.shake = 8;
    if (Math.random() < 0.55) spawnCrateNearPlayer();
    S.mission = null;
    S.nextMission = 10 + Math.random() * 8;
  }

  function spawnBeacons(n) {
    var p = P(); if (!p) return;
    for (var i = 0; i < (n || 3); i++) {
      var a = Math.random() * Math.PI * 2, r = 500 + Math.random() * 1400;
      S.beacons.push({
        x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r,
        r: 95, prog: 0, owner: null, pulse: Math.random() * 5
      });
    }
  }

  function updateBeacons(dt) {
    var p = P(); if (!p || !p.alive) return;
    for (var i = 0; i < S.beacons.length; i++) {
      var b = S.beacons[i];
      b.pulse += dt * 3;
      var d = Math.hypot(p.x - b.x, p.y - b.y);
      if (d < b.r) {
        b.prog = Math.min(1, b.prog + dt * 0.4);
        if (b.prog >= 1 && b.owner !== "player") {
          b.owner = "player";
          toast("BEACON SECURED", 1.6);
          score(150, "beacon");
          missionAdd("beacon", 1);
          p.hp = Math.min(p.hpMax || 560, (p.hp || 0) + 35);
          floater(b.x, b.y, "+150", "#69f0ae");
        }
      } else if (b.owner !== "player") b.prog = Math.max(0, b.prog - dt * 0.12);
    }
  }

  var CRATE_LOOT = [
    { id: "overdrive", name: "OVERDRIVE", apply: function () { S.powerMul = 1.55; S.powerT = 12; } },
    { id: "repair", name: "REPAIR KIT", apply: function () { var p = P(); if (p) p.hp = Math.min(p.hpMax || 560, p.hp + 120); } },
    { id: "boost", name: "BOOST TANK", apply: function () { var p = P(); if (p) p.boost = 100; } },
    { id: "shield", name: "SHIELD", apply: function () { S.shieldT = 10; } },
    { id: "magnet", name: "SCORE MAGNET", apply: function () { S.magnetT = 15; } },
    { id: "slow", name: "CHRONO FIELD", apply: function () { S.timeSlowT = 6; } },
    { id: "ally", name: "REINFORCE", apply: function () {
      try {
        var list = L(), p = P();
        if (list && p && window.WWNAiPilot) {
          var bot = new WWNAiPilot("ally-loot-" + Date.now(), "normal", list.length, "ALLY", "striker");
          bot.isAlly = true; bot.group = "ALLY"; bot.ownerId = p.netId;
          bot.x = p.x + 80; bot.y = p.y; bot.hpMax = 220; bot.hp = 220;
          list.push(bot);
        }
      } catch (e) {}
    }},
  ];

  function spawnCrateNearPlayer() {
    var p = P(); if (!p) return;
    var a = Math.random() * Math.PI * 2, r = 280 + Math.random() * 420;
    S.crates.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, life: 40, pulse: 0 });
    toast("SUPPLY CRATE DROPPED", 1.8, "近づけて回収");
  }

  function updateCrates(dt) {
    var p = P(); if (!p) return;
    for (var i = S.crates.length - 1; i >= 0; i--) {
      var c = S.crates[i];
      c.life -= dt; c.pulse += dt * 4;
      if (c.life <= 0) { S.crates.splice(i, 1); continue; }
      if (Math.hypot(p.x - c.x, p.y - c.y) < 42) {
        var loot = CRATE_LOOT[Math.floor(Math.random() * CRATE_LOOT.length)];
        loot.apply();
        toast("LOOT: " + loot.name, 2.2);
        score(80, "crate");
        missionAdd("crate", 1);
        floater(c.x, c.y, loot.name, "#ffd54f");
        S.crates.splice(i, 1);
        S.flash = 0.15;
      }
    }
  }

  function promoteElite(force) {
    var list = L(), p = P();
    if (!list || !p) return null;
    var n = 0;
    for (var i = 0; i < list.length; i++) if (list[i] && list[i]._elite && list[i].alive) n++;
    if (!force && n >= 4) return null;
    for (var j = 0; j < list.length; j++) {
      var b = list[j];
      if (!b || !b.alive || b.isAlly || b._remoteAlly || b._elite || b._boss) continue;
      if (Math.hypot(b.x - p.x, b.y - p.y) < 450) continue;
      b._elite = true;
      b.hpMax = (b.hpMax || 120) * 2.4;
      b.hp = b.hpMax;
      b.radius = Math.max(b.radius || 18, 28);
      b.colorFill = "#ff3d71"; b.colorStroke = "#ffd700";
      toast("ELITE DETECTED", 1.8);
      return b;
    }
    return null;
  }

  function spawnBoss() {
    var list = L(), p = P();
    if (!list || !p || !window.WWNAiPilot) return;
    var boss = null;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b && b.alive && !b.isAlly && !b._remoteAlly && !b._boss) { boss = b; break; }
    }
    if (!boss) {
      try {
        boss = new WWNAiPilot("boss-" + Date.now(), "hard", list.length, "G1");
        list.push(boss);
      } catch (e) { return; }
    }
    boss._boss = true; boss._elite = true;
    boss.hpMax = 900; boss.hp = 900;
    boss.radius = 42;
    boss.colorFill = "#7c4dff"; boss.colorStroke = "#ffd700";
    var a = Math.random() * Math.PI * 2;
    boss.x = p.x + Math.cos(a) * 900;
    boss.y = p.y + Math.sin(a) * 900;
    S.boss = boss;
    S.wave++;
    toast("⚠ BOSS APPROACHING ⚠", 3.5, "大型機を撃墜せよ");
    S.shake = 12;
  }

  function startChallenge() {
    var kinds = [
      { id: "nofire", name: "STEALTH RUN", desc: "8秒ダメージを受けるな", t: 8 },
      { id: "speed", name: "SPEED DEMON", desc: "ブーストで飛び続けろ", t: 6 },
      { id: "multikill", name: "RAMPAGE", desc: "10秒で3機撃墜", t: 10, need: 3 },
    ];
    var ch = kinds[Math.floor(Math.random() * kinds.length)];
    S.challenge = { id: ch.id, name: ch.name, need: ch.need || 1, prog: 0, dmg0: (P() && P().hp) || 0 };
    S.challengeT = ch.t;
    toast("CHALLENGE: " + ch.name, 2.5, ch.desc);
  }

  function updateChallenge(dt) {
    if (!S.challenge) return;
    S.challengeT -= dt;
    var p = P(), ch = S.challenge;
    if (ch.id === "nofire" && p && p.hp < ch.dmg0 - 1) {
      toast("CHALLENGE FAILED", 1.5); S.challenge = null; return;
    }
    if (ch.id === "speed" && p && p.boosting) ch.prog += dt;
    if (S.challengeT <= 0) {
      var ok = false;
      if (ch.id === "nofire") ok = true;
      if (ch.id === "speed" && ch.prog >= 3) ok = true;
      if (ch.id === "multikill" && ch.prog >= (ch.need || 3)) ok = true;
      if (ok) {
        toast("CHALLENGE CLEAR +180", 2);
        score(180, "challenge");
        S.powerMul = Math.max(S.powerMul, 1.25);
        S.powerT = Math.max(S.powerT, 5);
      } else toast("CHALLENGE FAILED", 1.5);
      S.challenge = null;
    }
  }

  var seenDead = {};
  function watchKills() {
    var list = L(), p = P();
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || b.isAlly || b._remoteAlly) continue;
      var id = String(b.netId || b.id || i);
      if ((!b.alive || (b.hp || 0) <= 0) && !seenDead[id]) {
        seenDead[id] = true;
        onKill(b, p);
      }
      if (b.alive && (b.hp || 0) > 0) delete seenDead[id];
    }
  }

  function onKill(bot, p) {
    var now = performance.now() / 1000;
    if (now - S.lastKill < 4.8) S.streak++; else S.streak = 1;
    S.lastKill = now;
    S.totalKills++;
    S.shake = Math.min(16, 3 + S.streak);
    S.flash = 0.1;

    var bonus = 0;
    var close = p && bot && Math.hypot(p.x - bot.x, p.y - bot.y) < 160;
    if (close) { bonus += 40; missionAdd("closekill", 1); floater(bot.x, bot.y, "CLOSE +40", "#ff8a65"); }

    if (S.streak === 3) { toast("TRIPLE!", 1.4); bonus += 60; }
    if (S.streak === 5) { toast("RAMPAGE ×5", 2); bonus += 120; S.powerMul = 1.4; S.powerT = 9; missionAdd("streak", 5); }
    if (S.streak === 8) { toast("UNSTOPPABLE ×8", 2); bonus += 220; S.powerMul = 1.55; S.powerT = 11; }
    if (S.streak === 12) { toast("GODLIKE ×12", 2.5); bonus += 400; S.powerMul = 1.75; S.powerT = 14; spawnCrateNearPlayer(); }
    if (S.streak === 20) { toast("BEYOND GODLIKE", 3); bonus += 800; }

    if (bot._elite && !bot._boss) { bonus += 250; missionAdd("elite", 1); toast("ELITE DOWN", 1.6); }
    if (bot._boss) {
      bonus += 1000;
      toast("BOSS DESTROYED +1000", 3.5);
      S.boss = null; S.shieldT = 8;
      spawnCrateNearPlayer(); spawnCrateNearPlayer();
      S.nextBoss = 50 + Math.random() * 30;
    }

    if (S.magnetT > 0) bonus = Math.round(bonus * 1.5) + 30;
    if (bonus) score(bonus, "streak");
    missionAdd("kill", 1);
    if (S.challenge && S.challenge.id === "multikill") S.challenge.prog++;
    if (bot) floater(bot.x, bot.y, "+" + (120 + bonus), bonus > 100 ? "#ffe066" : "#fff");
  }

  function spawnZone() {
    var p = P(); if (!p) return;
    var a = Math.random() * Math.PI * 2, r = 400 + Math.random() * 900;
    var gold = Math.random() < 0.5;
    S.zones.push({
      x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r,
      r: 140 + Math.random() * 80,
      kind: gold ? "gold" : "danger",
      life: 18 + Math.random() * 10, pulse: 0
    });
    toast(gold ? "GOLD ZONE APPEARED" : "DANGER ZONE", 2);
  }

  function updateZones(dt) {
    var p = P(); if (!p) return;
    for (var i = S.zones.length - 1; i >= 0; i--) {
      var z = S.zones[i];
      z.life -= dt; z.pulse += dt * 3;
      if (z.life <= 0) { S.zones.splice(i, 1); continue; }
      if (Math.hypot(p.x - z.x, p.y - z.y) < z.r) {
        if (z.kind === "gold") score(12 * dt, "zone");
        else p.hp = Math.max(0, (p.hp || 0) - 8 * dt);
      }
    }
  }

  function tickPower(dt) {
    if (S.powerT > 0) { S.powerT -= dt; if (S.powerT <= 0) S.powerMul = 1; }
    if (S.shieldT > 0) S.shieldT -= dt;
    if (S.magnetT > 0) S.magnetT -= dt;
    if (S.timeSlowT > 0) {
      S.timeSlowT -= dt;
      var list = L();
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
        if (!b || b.isAlly || b._remoteAlly) continue;
        b.vx *= 0.85; b.vy *= 0.85;
      }
    }
    window.__wwnDmgMul = S.powerMul;
    var p = P();
    if (p && S.shieldT > 0 && p._lastHp != null && p.hp < p._lastHp) {
      var dmg = p._lastHp - p.hp;
      p.hp = Math.min(p.hpMax || 560, p.hp + dmg * 0.7);
    }
    if (p) p._lastHp = p.hp;
  }

  function patchDmg() {
    if (!window.WWNCombat || !WWNCombat.prototype || WWNCombat.prototype.__epicDmg) return;
    var o = WWNCombat.prototype._spawnBullet;
    if (o) {
      WWNCombat.prototype._spawnBullet = function (pl, w, type) {
        var pr = o.call(this, pl, w, type);
        if (pr && window.__wwnDmgMul > 1) pr.dmg = (pr.dmg || 10) * window.__wwnDmgMul;
        return pr;
      };
    }
    WWNCombat.prototype.__epicDmg = true;
  }

  function ensureHud() {
    if (document.getElementById("wwn-epic-hud")) return;
    var layer = document.getElementById("game-layer");
    if (!layer) return;
    var style = document.createElement("style");
    style.textContent = [
      "#wwn-epic-hud{position:absolute;inset:0;pointer-events:none;z-index:32;font-family:Segoe UI,sans-serif}",
      "#wwn-epic-hud .ban{position:absolute;top:11%;left:50%;transform:translateX(-50%);font-size:24px;font-weight:800;color:#fff;text-shadow:0 0 14px #0ff,0 0 28px #f0f;letter-spacing:1px;opacity:0;transition:opacity .15s;text-align:center}",
      "#wwn-epic-hud .ban.on{opacity:1}",
      "#wwn-epic-hud .sub{display:block;font-size:13px;font-weight:500;color:#b2ebf2;margin-top:4px;text-shadow:none}",
      "#wwn-epic-hud .panel{position:absolute;top:56px;left:12px;background:rgba(0,12,28,.62);border:1px solid rgba(0,245,255,.3);border-radius:8px;padding:8px 10px;min-width:180px;color:#d7f7ff;font-size:12px;line-height:1.45}",
      "#wwn-epic-hud .panel b{color:#7df9ff}",
      "#wwn-epic-hud .streak{position:absolute;top:16%;right:14px;font-size:18px;color:#ffe066;text-shadow:0 0 10px #f80;font-weight:700}",
      "#wwn-epic-hud .boss{position:absolute;top:48px;left:50%;transform:translateX(-50%);width:min(420px,70%);height:10px;background:rgba(0,0,0,.45);border:1px solid #7c4dff;border-radius:6px;overflow:hidden;display:none}",
      "#wwn-epic-hud .boss>i{display:block;height:100%;background:linear-gradient(90deg,#7c4dff,#ff3d71);width:100%}",
    ].join("");
    document.head.appendChild(style);
    var el = document.createElement("div");
    el.id = "wwn-epic-hud";
    el.innerHTML = '<div class="ban" id="epic-ban"><span id="epic-ban-t"></span><span class="sub" id="epic-sub"></span></div><div class="panel" id="epic-panel"></div><div class="streak" id="epic-streak"></div><div class="boss" id="epic-boss"><i id="epic-boss-hp"></i></div>';
    layer.appendChild(el);
  }

  function updateHud() {
    ensureHud();
    var ban = document.getElementById("epic-ban");
    var bt = document.getElementById("epic-ban-t");
    var sub = document.getElementById("epic-sub");
    var panel = document.getElementById("epic-panel");
    var st = document.getElementById("epic-streak");
    var bossEl = document.getElementById("epic-boss");
    var bossHp = document.getElementById("epic-boss-hp");
    if (bt) bt.textContent = S.bannerT > 0 ? S.banner : "";
    if (sub) sub.textContent = S.subT > 0 ? S.sub : "";
    if (ban) ban.classList.toggle("on", S.bannerT > 0);
    if (st) st.textContent = S.streak >= 2 ? ("STREAK ×" + S.streak) : "";
    if (panel) {
      var mline = S.mission
        ? ("<b>MISSION</b> " + S.mission.name + "<br>" + S.mission.desc + "  <b>" + Math.min(S.missionProg, S.missionNeed) + "/" + S.missionNeed + "</b>")
        : "<b>MISSION</b> 待機中…";
      var chline = S.challenge ? ("<br><b>CHALLENGE</b> " + S.challenge.name + "  " + Math.ceil(S.challengeT) + "s") : "";
      var buff = [];
      if (S.powerT > 0) buff.push("PWR×" + S.powerMul.toFixed(2));
      if (S.shieldT > 0) buff.push("SHD " + Math.ceil(S.shieldT) + "s");
      if (S.magnetT > 0) buff.push("MAG");
      if (S.timeSlowT > 0) buff.push("CHRONO");
      panel.innerHTML = "<b>" + S.title + "</b>  XP " + S.rankXp + "<br>" + mline + chline +
        (buff.length ? "<br><b>BUFF</b> " + buff.join(" · ") : "") +
        "<br>Kills " + S.totalKills + "  Wave " + S.wave;
    }
    if (bossEl && bossHp) {
      if (S.boss && S.boss.alive && (S.boss.hp || 0) > 0) {
        bossEl.style.display = "block";
        bossHp.style.width = Math.max(0, Math.min(100, (S.boss.hp / (S.boss.hpMax || 900)) * 100)) + "%";
      } else bossEl.style.display = "none";
    }
  }

  function draw(ctx, cam) {
    if (!ctx || !cam) return;
    var z = cam.zoom || 1;
    function sx(x) { return cam.sx ? cam.sx(x) : (x - cam.x) * z + cam.w / 2; }
    function sy(y) { return cam.sy ? cam.sy(y) : (y - cam.y) * z + cam.h / 2; }

    for (var zi = 0; zi < S.zones.length; zi++) {
      var zz = S.zones[zi];
      var zx = sx(zz.x), zy = sy(zz.y);
      ctx.beginPath(); ctx.arc(zx, zy, zz.r * z, 0, Math.PI * 2);
      ctx.strokeStyle = zz.kind === "gold" ? "rgba(255,213,79,0.55)" : "rgba(255,61,113,0.5)";
      ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = zz.kind === "gold" ? "rgba(255,213,79,0.08)" : "rgba(255,61,113,0.07)";
      ctx.fill();
    }

    for (var i = 0; i < S.beacons.length; i++) {
      var b = S.beacons[i];
      var x = sx(b.x), y = sy(b.y);
      if (x < -130 || x > cam.w + 130) continue;
      var rr = b.r * z;
      ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.strokeStyle = b.owner === "player" ? "rgba(105,240,174,0.75)" : "rgba(0,245,255,0.5)";
      ctx.lineWidth = 2 + Math.sin(b.pulse) * 1.5; ctx.stroke();
      if (b.prog > 0 && b.prog < 1) {
        ctx.beginPath();
        ctx.arc(x, y, rr * 0.72, -Math.PI / 2, -Math.PI / 2 + b.prog * Math.PI * 2);
        ctx.strokeStyle = "#ffe066"; ctx.lineWidth = 4; ctx.stroke();
      }
      ctx.fillStyle = "#b2ebf2"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(b.owner === "player" ? "SECURED" : "CAPTURE", x, y + 4);
    }

    for (var ci = 0; ci < S.crates.length; ci++) {
      var cr = S.crates[ci];
      var cx = sx(cr.x), cy = sy(cr.y);
      var s = 10 + Math.sin(cr.pulse) * 3;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(cr.pulse * 0.3);
      ctx.fillStyle = "#ffd54f"; ctx.fillRect(-s, -s, s * 2, s * 2);
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(-s, -s, s * 2, s * 2);
      ctx.restore();
      ctx.fillStyle = "#ffe082"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("CRATE", cx, cy - 16);
    }

    var list = L();
    for (var j = 0; j < list.length; j++) {
      var e = list[j];
      if (!e || !e.alive) continue;
      if (!e._elite && !e._boss) continue;
      var ex = sx(e.x), ey = sy(e.y);
      ctx.beginPath();
      ctx.arc(ex, ey, ((e.radius || 20) + (e._boss ? 16 : 8)) * z + Math.sin(performance.now() / 180) * 3, 0, Math.PI * 2);
      ctx.strokeStyle = e._boss ? "#b388ff" : "#ff3d71";
      ctx.lineWidth = e._boss ? 3 : 2; ctx.stroke();
      ctx.fillStyle = e._boss ? "#e1bee7" : "#ff8a80";
      ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(e._boss ? "BOSS" : "ELITE", ex, ey - (e._boss ? 40 : 28));
    }

    for (var f = S.floaters.length - 1; f >= 0; f--) {
      var ft = S.floaters[f];
      ft.life -= 0.016; ft.y += (ft.vy || -50) * 0.016;
      if (ft.life <= 0) { S.floaters.splice(f, 1); continue; }
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.fillStyle = ft.color || "#fff";
      ctx.font = "bold 15px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(ft.text, sx(ft.x), sy(ft.y));
      ctx.globalAlpha = 1;
    }

    if (S.flash > 0) {
      ctx.fillStyle = "rgba(255,255,255," + (S.flash * 0.4) + ")";
      ctx.fillRect(0, 0, cam.w || innerWidth, cam.h || innerHeight);
    }

    var p = P();
    if (p && S.shieldT > 0) {
      ctx.beginPath();
      ctx.arc(sx(p.x), sy(p.y), 34 * z, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(128,216,255," + (0.4 + Math.sin(performance.now() / 150) * 0.2) + ")";
      ctx.lineWidth = 3; ctx.stroke();
    }
  }

  var last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    var p = P();
    if (!p) return;

    if (!S.ready) {
      S.ready = true;
      setTimeout(function () {
        spawnBeacons(3);
        startMission();
        toast("第n次世界大戦 — 作戦開始", 3, "ミッションを達成し、ランクを上げよ");
      }, 1200);
    }

    S.t += dt;
    if (S.bannerT > 0) S.bannerT -= dt;
    if (S.subT > 0) S.subT -= dt;
    if (S.flash > 0) S.flash -= dt;
    if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 18);

    if (S.mission && S.mission.type === "time") {
      S.missionProg += dt;
      if (S.missionProg >= S.missionNeed) completeMission();
    }
    if (S.mission && S.mission.type !== "time") {
      S.missionT -= dt;
      if (S.missionT <= 0) { toast("MISSION FAILED", 2); S.mission = null; S.nextMission = 8; }
    }

    S.nextMission -= dt;
    if (S.nextMission <= 0 && !S.mission) startMission();

    S.nextCrate -= dt;
    if (S.nextCrate <= 0) { S.nextCrate = 18 + Math.random() * 14; spawnCrateNearPlayer(); }

    S.nextBoss -= dt;
    if (S.nextBoss <= 0) { S.nextBoss = 70 + Math.random() * 40; spawnBoss(); }

    S.nextChallenge -= dt;
    if (S.nextChallenge <= 0 && !S.challenge) { S.nextChallenge = 28 + Math.random() * 20; startChallenge(); }

    if (Math.random() < dt * 0.04) spawnZone();
    if (Math.random() < dt * 0.03) promoteElite(false);

    watchKills();
    updateBeacons(dt);
    updateCrates(dt);
    updateZones(dt);
    updateChallenge(dt);
    tickPower(dt);
    patchDmg();
    updateHud();

    if (S.boss && (!S.boss.alive || (S.boss.hp || 0) <= 0)) S.boss = null;

    var canvas = document.getElementById("game-canvas");
    var cam = window.__wwnCamera;
    if (canvas && cam) {
      if (S.shake > 0) {
        cam.x += (Math.random() - 0.5) * S.shake * 2;
        cam.y += (Math.random() - 0.5) * S.shake * 2;
      }
      var ctx = canvas.getContext("2d");
      if (ctx) draw(ctx, cam);
    }

    if (S.streak > 0 && performance.now() / 1000 - S.lastKill > 4.8) S.streak = 0;
  }

  setInterval(function () {
    var p = P();
    var canvas = document.getElementById("game-canvas");
    if (!p) return;
    if (!window.__wwnCamera) {
      window.__wwnCamera = {
        x: p.x, y: p.y,
        w: canvas ? canvas.width : innerWidth,
        h: canvas ? canvas.height : innerHeight,
        zoom: 1,
        sx: function (x) { return (x - this.x) * this.zoom + this.w / 2; },
        sy: function (y) { return (y - this.y) * this.zoom + this.h / 2; }
      };
    } else if (canvas) {
      window.__wwnCamera.w = canvas.width;
      window.__wwnCamera.h = canvas.height;
    }
  }, 200);

  requestAnimationFrame(frame);
  console.log("[WWN] epic gameplay layer online");
})();
