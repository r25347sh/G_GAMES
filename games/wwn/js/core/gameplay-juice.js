(function () {
  "use strict";

  var state = {
    streak: 0,
    bestStreak: 0,
    lastKillT: 0,
    event: null,
    eventT: 0,
    beacons: [],
    floaters: [],
    shake: 0,
    flash: 0,
    banner: "",
    bannerT: 0,
    powerMul: 1,
    powerT: 0,
    started: false,
  };

  function player() { return window.__wwnPlayer; }
  function list() { return window.__wwnAiList || []; }
  function combat() { return window.__wwnCombat; }

  function toast(msg, sec) {
    state.banner = msg;
    state.bannerT = sec || 2.5;
    try {
      var t = document.getElementById("toast");
      if (t) {
        t.textContent = msg;
        t.classList.add("show");
        setTimeout(function () { t.classList.remove("show"); }, (sec || 2.5) * 1000);
      }
    } catch (e) {}
  }

  function addScore(n, reason) {
    try {
      if (window.__wwnScore && window.__wwnScore.add) window.__wwnScore.add(n, reason || "event");
    } catch (e) {}
  }

  function onKill(bot) {
    var now = performance.now() / 1000;
    if (now - state.lastKillT < 4.5) state.streak++;
    else state.streak = 1;
    state.lastKillT = now;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    state.shake = Math.min(14, 4 + state.streak * 0.8);
    state.flash = 0.12;

    var bonus = 0;
    if (state.streak === 3) { toast("TRIPLE DOWN!", 1.6); bonus = 50; }
    if (state.streak === 5) { toast("KILLSTREAK ×5 — OVERDRIVE", 2); bonus = 120; state.powerMul = 1.35; state.powerT = 8; }
    if (state.streak === 8) { toast("UNSTOPPABLE ×8", 2); bonus = 200; state.powerMul = 1.5; state.powerT = 10; }
    if (state.streak === 12) { toast("GODLIKE ×12", 2.4); bonus = 400; state.powerMul = 1.7; state.powerT = 12; }
    if (bot && bot._elite) { toast("ELITE DOWN +250", 1.8); bonus += 250; }
    if (bot && bot._bounty) { toast("BOUNTY CLAIMED +500", 2); bonus += 500; bot._bounty = false; }
    if (bonus) addScore(bonus, "streak");

    var p = player();
    if (p) {
      state.floaters.push({
        x: (bot && bot.x) || p.x, y: (bot && bot.y) || p.y,
        text: "+" + (120 + bonus), life: 1.1, vy: -40, color: bonus ? "#ffe066" : "#fff"
      });
    }
  }

  var seen = {};
  function watchKills() {
    var L = list();
    for (var i = 0; i < L.length; i++) {
      var b = L[i];
      if (!b || b.isAlly || b._remoteAlly) continue;
      var id = String(b.netId || b.id || i);
      if ((!b.alive || (b.hp || 0) <= 0) && !seen[id]) {
        seen[id] = true;
        onKill(b);
      }
      if (b.alive && (b.hp || 0) > 0) delete seen[id];
    }
  }

  function promoteElites() {
    var L = list();
    var p = player();
    if (!L || !p) return;
    var elites = 0;
    for (var i = 0; i < L.length; i++) if (L[i] && L[i]._elite && L[i].alive) elites++;
    if (elites >= 3) return;
    for (var j = 0; j < L.length; j++) {
      var b = L[j];
      if (!b || !b.alive || b.isAlly || b._remoteAlly || b._elite) continue;
      if ((b.hp || 0) < 40) continue;
      if (Math.hypot(b.x - p.x, b.y - p.y) < 500) continue;
      b._elite = true;
      b.hpMax = (b.hpMax || 120) * 2.2;
      b.hp = b.hpMax;
      b.radius = Math.max(b.radius || 18, 26);
      b.colorFill = "#ff3d71";
      b.colorStroke = "#ffd700";
      toast("ELITE SIGNAL DETECTED", 2);
      break;
    }
  }

  function setBounty() {
    var L = list();
    var p = player();
    if (!L || !p) return;
    for (var i = 0; i < L.length; i++) if (L[i]) L[i]._bounty = false;
    var best = null, bd = 0;
    for (var j = 0; j < L.length; j++) {
      var b = L[j];
      if (!b || !b.alive || b.isAlly || b._remoteAlly) continue;
      var d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d > 400 && d < 2000 && d > bd) { bd = d; best = b; }
    }
    if (best) {
      best._bounty = true;
      best.hpMax = Math.max(best.hpMax || 100, 180);
      best.hp = best.hpMax;
      toast("BOUNTY TARGET LOCKED — +500", 2.5);
    }
  }

  function spawnBeacons() {
    var p = player();
    if (!p) return;
    state.beacons = [];
    for (var i = 0; i < 3; i++) {
      var a = Math.random() * Math.PI * 2;
      var r = 600 + Math.random() * 1200;
      state.beacons.push({
        x: p.x + Math.cos(a) * r,
        y: p.y + Math.sin(a) * r,
        r: 90, prog: 0, owner: null, pulse: Math.random() * 6
      });
    }
    toast("CAPTURE BEACONS ONLINE", 2);
  }

  function updateBeacons(dt) {
    var p = player();
    if (!p || !p.alive) return;
    for (var i = 0; i < state.beacons.length; i++) {
      var b = state.beacons[i];
      b.pulse += dt * 3;
      var d = Math.hypot(p.x - b.x, p.y - b.y);
      if (d < b.r) {
        b.prog = Math.min(1, b.prog + dt * 0.35);
        if (b.prog >= 1 && b.owner !== "player") {
          b.owner = "player";
          toast("BEACON SECURED +150", 1.8);
          addScore(150, "beacon");
          state.powerMul = Math.max(state.powerMul, 1.25);
          state.powerT = Math.max(state.powerT, 6);
          p.hp = Math.min(p.hpMax || 560, (p.hp || 0) + 40);
        }
      } else if (b.owner !== "player") {
        b.prog = Math.max(0, b.prog - dt * 0.15);
      }
    }
  }

  var EVENT_POOL = [
    { id: "storm", name: "ION STORM", dur: 12 },
    { id: "supply", name: "SUPPLY DROP", dur: 10 },
    { id: "hunt", name: "HUNT PROTOCOL", dur: 15 },
    { id: "frenzy", name: "BLOOD FRENZY", dur: 10 },
    { id: "bounty", name: "BOUNTY WINDOW", dur: 20 },
  ];

  function startEvent() {
    var ev = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
    state.event = ev.id;
    state.eventT = ev.dur;
    toast("◆ EVENT: " + ev.name + " ◆", 2.5);
    if (ev.id === "bounty") setBounty();
    if (ev.id === "supply") {
      var p = player();
      if (p) {
        p.hp = Math.min(p.hpMax || 560, (p.hp || 0) + 80);
        p.boost = Math.min(100, (p.boost || 0) + 50);
        addScore(40, "supply");
        var c = combat();
        if (c && c.spawnParticle) c.spawnParticle(p.x, p.y, "#69f0ae", 16, 120);
      }
    }
    if (ev.id === "frenzy") { state.powerMul = 1.4; state.powerT = ev.dur; }
    if (ev.id === "hunt") promoteElites();
  }

  function pressureAI() {
    var p = player();
    var L = list();
    if (!p || !L) return;
    if ((p.hp || 0) / (p.hpMax || 560) > 0.35) return;
    for (var i = 0; i < L.length; i++) {
      var b = L[i];
      if (!b || !b.alive || b.isAlly || b._remoteAlly) continue;
      if (Math.hypot(b.x - p.x, b.y - p.y) < 500) {
        b.vx = (b.vx || 0) * 1.02;
        b.vy = (b.vy || 0) * 1.02;
      }
    }
  }

  function applyPower(dt) {
    if (state.powerT > 0) {
      state.powerT -= dt;
      if (state.powerT <= 0) state.powerMul = 1;
    }
    window.__wwnDmgMul = state.powerMul;
  }

  function ensureOverlay() {
    var layer = document.getElementById("game-layer");
    if (!layer) return;
    if (document.getElementById("wwn-juice-hud")) return;
    var el = document.createElement("div");
    el.id = "wwn-juice-hud";
    el.style.cssText = "position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;z-index:30;font-family:Segoe UI,sans-serif;";
    var style = document.createElement("style");
    style.textContent = [
      "#wwn-juice-hud .banner{position:absolute;top:12%;left:50%;transform:translateX(-50%);font-size:22px;font-weight:700;color:#fff;text-shadow:0 0 12px #0ff,0 0 24px #f0f;letter-spacing:2px;opacity:0;transition:opacity .2s}",
      "#wwn-juice-hud .banner.on{opacity:1}",
      "#wwn-juice-hud .streak{position:absolute;top:18%;right:18px;font-size:16px;color:#ffe066;text-shadow:0 0 8px #f80}",
      "#wwn-juice-hud .event{position:absolute;top:8px;left:50%;transform:translateX(-50%);font-size:13px;color:#7df9ff;background:rgba(0,20,40,.55);padding:4px 12px;border-radius:6px;border:1px solid rgba(0,245,255,.35);display:none}",
      "#wwn-juice-hud .power{position:absolute;bottom:70px;left:50%;transform:translateX(-50%);font-size:13px;color:#ff8a65}",
    ].join("");
    document.head.appendChild(style);
    el.innerHTML = '<div class="banner" id="wwn-banner"></div><div class="streak" id="wwn-streak"></div><div class="event" id="wwn-event"></div><div class="power" id="wwn-power"></div>';
    layer.appendChild(el);
  }

  function updateHud() {
    ensureOverlay();
    var ban = document.getElementById("wwn-banner");
    var st = document.getElementById("wwn-streak");
    var ev = document.getElementById("wwn-event");
    var pw = document.getElementById("wwn-power");
    if (ban) {
      if (state.bannerT > 0) { ban.textContent = state.banner; ban.classList.add("on"); }
      else ban.classList.remove("on");
    }
    if (st) st.textContent = state.streak >= 2 ? ("STREAK ×" + state.streak) : "";
    if (ev) {
      if (state.event && state.eventT > 0) {
        ev.style.display = "block";
        ev.textContent = "EVENT: " + state.event.toUpperCase() + "  " + Math.ceil(state.eventT) + "s";
      } else ev.style.display = "none";
    }
    if (pw) {
      pw.textContent = (state.powerT > 0 && state.powerMul > 1)
        ? ("POWER ×" + state.powerMul.toFixed(2) + "  (" + Math.ceil(state.powerT) + "s)")
        : "";
    }
  }

  function drawWorldFx(ctx, cam) {
    if (!ctx || !cam) return;
    var z = cam.zoom || 1;
    function sx(x) { return cam.sx ? cam.sx(x) : (x - cam.x) * z + cam.w / 2; }
    function sy(y) { return cam.sy ? cam.sy(y) : (y - cam.y) * z + cam.h / 2; }

    for (var i = 0; i < state.beacons.length; i++) {
      var b = state.beacons[i];
      var x = sx(b.x), y = sy(b.y);
      if (x < -120 || x > cam.w + 120 || y < -120 || y > cam.h + 120) continue;
      var rr = b.r * z;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.strokeStyle = b.owner === "player" ? "rgba(105,240,174,0.7)" : "rgba(0,245,255,0.45)";
      ctx.lineWidth = 2 + Math.sin(b.pulse) * 1.2;
      ctx.stroke();
      if (b.prog > 0 && b.prog < 1) {
        ctx.beginPath();
        ctx.arc(x, y, rr * 0.7, -Math.PI / 2, -Math.PI / 2 + b.prog * Math.PI * 2);
        ctx.strokeStyle = "#ffe066";
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.fillStyle = b.owner === "player" ? "rgba(105,240,174,0.15)" : "rgba(0,245,255,0.08)";
      ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#b2ebf2";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(b.owner === "player" ? "SECURED" : "CAPTURE", x, y + 4);
    }

    var L = list();
    for (var j = 0; j < L.length; j++) {
      var e = L[j];
      if (!e || !e.alive) continue;
      if (!e._elite && !e._bounty) continue;
      var ex = sx(e.x), ey = sy(e.y);
      if (ex < -50 || ex > cam.w + 50) continue;
      ctx.beginPath();
      ctx.arc(ex, ey, (e.radius || 20) * z + 8 + Math.sin(performance.now() / 200) * 3, 0, Math.PI * 2);
      ctx.strokeStyle = e._bounty ? "#ffd700" : "#ff3d71";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = e._bounty ? "#ffd700" : "#ff8a80";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(e._bounty ? "BOUNTY" : "ELITE", ex, ey - 28);
    }

    for (var f = state.floaters.length - 1; f >= 0; f--) {
      var ft = state.floaters[f];
      ft.life -= 0.016;
      ft.y += (ft.vy || -40) * 0.016;
      if (ft.life <= 0) { state.floaters.splice(f, 1); continue; }
      var fx = sx(ft.x), fy = sy(ft.y);
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.fillStyle = ft.color || "#fff";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(ft.text, fx, fy);
      ctx.globalAlpha = 1;
    }

    if (state.flash > 0) {
      ctx.fillStyle = "rgba(255,255,255," + (state.flash * 0.35) + ")";
      ctx.fillRect(0, 0, cam.w || window.innerWidth, cam.h || window.innerHeight);
    }
  }

  function applyShake(cam, dt) {
    if (!cam || state.shake <= 0) return;
    cam.x += (Math.random() - 0.5) * state.shake * 2;
    cam.y += (Math.random() - 0.5) * state.shake * 2;
    state.shake = Math.max(0, state.shake - dt * 18);
  }

  function patchDmg() {
    if (!window.WWNCombat || !WWNCombat.prototype || WWNCombat.prototype.__juiceDmg) return;
    var o = WWNCombat.prototype._spawnBullet;
    if (o) {
      WWNCombat.prototype._spawnBullet = function (pl, w, type) {
        var p = o.call(this, pl, w, type);
        if (p && window.__wwnDmgMul > 1) p.dmg = (p.dmg || 10) * window.__wwnDmgMul;
        return p;
      };
    }
    WWNCombat.prototype.__juiceDmg = true;
  }

  var accEvent = 18 + Math.random() * 10;
  var accElite = 12;
  var last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    var p = player();
    if (!p) return;

    if (!state.started) {
      state.started = true;
      setTimeout(function () {
        spawnBeacons();
        toast("ミッション: ビーコン確保 / エリート撃破 / ストリークを伸ばせ", 3.5);
      }, 1500);
    }

    if (state.bannerT > 0) state.bannerT -= dt;
    if (state.flash > 0) state.flash -= dt;
    if (state.eventT > 0) {
      state.eventT -= dt;
      if (state.eventT <= 0) { state.event = null; toast("EVENT CLEAR", 1.2); }
    }
    accEvent -= dt;
    if (accEvent <= 0) {
      accEvent = 22 + Math.random() * 16;
      startEvent();
    }
    accElite -= dt;
    if (accElite <= 0) {
      accElite = 18 + Math.random() * 10;
      promoteElites();
    }

    watchKills();
    updateBeacons(dt);
    applyPower(dt);
    pressureAI();
    patchDmg();
    updateHud();

    var canvas = document.getElementById("game-canvas");
    var cam = window.__wwnCamera;
    if (canvas && cam) {
      var ctx = canvas.getContext("2d");
      if (ctx) {
        applyShake(cam, dt);
        drawWorldFx(ctx, cam);
      }
    }
  }

  setInterval(function () {
    var p = player();
    var canvas = document.getElementById("game-canvas");
    if (!p) return;
    if (!window.__wwnCamera) {
      window.__wwnCamera = {
        x: p.x, y: p.y,
        w: canvas ? canvas.width : window.innerWidth,
        h: canvas ? canvas.height : window.innerHeight,
        zoom: 1,
        sx: function (x) { return (x - this.x) * (this.zoom || 1) + this.w / 2; },
        sy: function (y) { return (y - this.y) * (this.zoom || 1) + this.h / 2; }
      };
    } else if (canvas) {
      window.__wwnCamera.w = canvas.width;
      window.__wwnCamera.h = canvas.height;
    }
  }, 200);

  setInterval(function () {
    var now = performance.now() / 1000;
    if (state.streak > 0 && now - state.lastKillT > 4.5) state.streak = 0;
  }, 400);

  requestAnimationFrame(frame);
  console.log("[WWN] gameplay juice loaded");
})();
