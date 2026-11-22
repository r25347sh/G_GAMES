(function () {
  "use strict";

  var PHASES = [
    {
      id: "calm", name: "停戦空域", sub: "相対的に穏やか — 補給と再編の時間",
      dur: 28, enemySpeed: 0.75, enemyFire: 0.6, playerMul: 1.0,
      tint: [20, 40, 70], spawnBias: 0.3,
    },
    {
      id: "escalation", name: "戦線拡大", sub: "敵が活発化 — ストリークが伸びやすい",
      dur: 35, enemySpeed: 1.05, enemyFire: 1.1, playerMul: 1.15,
      tint: [50, 30, 20], spawnBias: 0.8,
    },
    {
      id: "totalwar", name: "◆ 総力戦 ◆", sub: "全機が殺し合いに突入 — 撃破報酬2倍",
      dur: 22, enemySpeed: 1.35, enemyFire: 1.45, playerMul: 1.35,
      tint: [90, 10, 20], spawnBias: 1.4, scoreMul: 2,
    },
    {
      id: "break", name: "戦線崩壊", sub: "混乱 — 回収と再配置のチャンス",
      dur: 18, enemySpeed: 1.15, enemyFire: 0.85, playerMul: 1.25,
      tint: [40, 10, 60], spawnBias: 0.5, scoreMul: 1.4,
    },
  ];

  var st = {
    phaseIdx: 0, phaseT: 0, phase: null,
    flash: 0, shake: 0, letterbox: 0,
    bigText: "", bigSub: "", bigT: 0,
    lastStand: false, lastStandT: 0,
    duel: null, duelT: 0,
    extract: null, extractT: 0,
    judgmentT: 0, scoreMul: 1, playerMul: 1,
    ready: false, nextSpecial: 40, killInPhase: 0,
  };

  function P() { return window.__wwnPlayer; }
  function L() { return window.__wwnAiList || []; }

  function announce(title, sub, sec) {
    st.bigText = title;
    st.bigSub = sub || "";
    st.bigT = sec || 3.2;
    st.letterbox = 1;
    st.flash = 0.35;
    st.shake = 14;
    try {
      var t = document.getElementById("toast");
      if (t) {
        t.textContent = title;
        t.classList.add("show");
        setTimeout(function () { t.classList.remove("show"); }, (sec || 3.2) * 1000);
      }
    } catch (e) {}
  }

  function setPhase(idx) {
    st.phaseIdx = ((idx % PHASES.length) + PHASES.length) % PHASES.length;
    st.phase = PHASES[st.phaseIdx];
    st.phaseT = st.phase.dur;
    st.scoreMul = st.phase.scoreMul || 1;
    st.playerMul = st.phase.playerMul || 1;
    window.__wwnDmgMul = Math.max(window.__wwnDmgMul || 1, st.playerMul);
    window.__wwnWarPhase = st.phase.id;
    window.__wwnScoreMul = st.scoreMul;
    st.killInPhase = 0;
    announce(st.phase.name, st.phase.sub, 3.5);
    if (st.phase.id === "totalwar") {
      var list = L();
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
        if (!b || !b.alive || b.isAlly) continue;
        b._warRage = true;
        b.vx = (b.vx || 0) * 1.2;
        b.vy = (b.vy || 0) * 1.2;
      }
    }
  }

  function nextPhase() { setPhase(st.phaseIdx + 1); }

  function triggerLastStand() {
    if (st.lastStand) return;
    var p = P();
    if (!p || !p.alive) return;
    st.lastStand = true;
    st.lastStandT = 8;
    p.hp = Math.max(p.hp, Math.min(p.hpMax || 560, (p.hpMax || 560) * 0.25));
    st.playerMul = 2.2;
    window.__wwnDmgMul = 2.2;
    p.boost = 100;
    announce("LAST STAND", "8秒間 — 火力と機動が限界突破", 3);
    st.letterbox = 1.2;
  }

  function triggerDuel() {
    var list = L(), p = P();
    if (!list || !p) return;
    var target = null, best = 0;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || !b.alive || b.isAlly || b._remoteAlly || b._boss) continue;
      var d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d > 200 && d < 1600 && d > best) { best = d; target = b; }
    }
    if (!target) return;
    target._duel = true;
    target._elite = true;
    target.hpMax = Math.max(target.hpMax || 100, 350);
    target.hp = target.hpMax;
    target.radius = Math.max(target.radius || 18, 30);
    st.duel = target;
    st.duelT = 20;
    for (var j = 0; j < list.length; j++) {
      var o = list[j];
      if (!o || o === target || o.isAlly) continue;
      o._frozen = true;
      o.vx = 0; o.vy = 0;
    }
    announce("一騎打ち", "標的以外は静止 — 20秒で決着を", 3.2);
  }

  function endDuel(won) {
    var list = L();
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (!o) continue;
      o._frozen = false;
      o._duel = false;
    }
    if (won) {
      announce("DUEL VICTORY", "+600 PT — 戦場が再開する", 2.8);
      try { if (window.__wwnScore && window.__wwnScore.add) window.__wwnScore.add(600, "duel"); } catch (e) {}
      st.playerMul = Math.max(st.playerMul, 1.4);
      window.__wwnDmgMul = Math.max(window.__wwnDmgMul || 1, 1.4);
    } else {
      announce("DUEL FAILED", "標的を逃した…", 2);
    }
    st.duel = null;
    st.duelT = 0;
  }

  function triggerExtraction() {
    var p = P();
    if (!p) return;
    var a = Math.random() * Math.PI * 2;
    st.extract = {
      x: p.x + Math.cos(a) * (900 + Math.random() * 500),
      y: p.y + Math.sin(a) * (900 + Math.random() * 500),
      r: 110, prog: 0,
    };
    st.extractT = 45;
    announce("緊急退避", "ゲートへ到達して確保せよ", 3);
    var list = L();
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || !b.alive || b.isAlly) continue;
      b._warRage = true;
    }
  }

  function triggerJudgment() {
    var p = P();
    if (!p) return;
    st.judgmentT = 1.2;
    announce("JUDGMENT", "全域制圧パルス", 2.5);
    var list = L();
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || !b.alive || b.isAlly || b._remoteAlly) continue;
      if (Math.hypot(b.x - p.x, b.y - p.y) < 2000) {
        b.hp = Math.max(0, (b.hp || 0) - 80);
        if (b.hp <= 0) b.alive = false;
      }
    }
    st.flash = 0.6;
    st.shake = 20;
    try { if (window.__wwnScore && window.__wwnScore.add) window.__wwnScore.add(300, "judgment"); } catch (e) {}
  }

  function applyPhaseRules(dt) {
    var ph = st.phase;
    if (!ph) return;
    var list = L();
    var p = P();
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || !b.alive) continue;
      if (b.isAlly || b._remoteAlly) continue;
      if (b._frozen) { b.vx = 0; b.vy = 0; continue; }
      var spd = ph.enemySpeed || 1;
      if (b._warRage) spd *= 1.15;
      b.vx = (b.vx || 0) * (0.98 + (spd - 1) * 0.02);
      b.vy = (b.vy || 0) * (0.98 + (spd - 1) * 0.02);
      if (ph.id === "totalwar" && p && !b._boss) {
        var dx = p.x - b.x, dy = p.y - b.y;
        var d = Math.hypot(dx, dy) || 1;
        if (d < 1400) {
          b.vx += (dx / d) * 40 * dt;
          b.vy += (dy / d) * 40 * dt;
        }
      }
      if (ph.id === "break" && Math.random() < 0.002) {
        b.vx += (Math.random() - 0.5) * 120;
        b.vy += (Math.random() - 0.5) * 120;
      }
    }
  }

  function patchScore() {
    if (!window.WWNScoreBoard || !WWNScoreBoard.prototype || WWNScoreBoard.prototype.__drama) return;
    var o = WWNScoreBoard.prototype.add;
    WWNScoreBoard.prototype.add = function (n, reason) {
      var mul = window.__wwnScoreMul || 1;
      if (st.lastStand) mul *= 1.5;
      return o.call(this, Math.round(n * mul), reason);
    };
    WWNScoreBoard.prototype.__drama = true;
  }

  function patchPlayerDmg() {
    if (!window.WWNCombat || !WWNCombat.prototype || WWNCombat.prototype.__dramaDmg) return;
    var o = WWNCombat.prototype._spawnBullet;
    if (!o) return;
    WWNCombat.prototype._spawnBullet = function (pl, w, type) {
      var pr = o.call(this, pl, w, type);
      if (pr) {
        var m = window.__wwnDmgMul || 1;
        if (st.lastStand) m = Math.max(m, 2.2);
        if (m > 1) pr.dmg = (pr.dmg || 10) * m;
      }
      return pr;
    };
    WWNCombat.prototype.__dramaDmg = true;
  }

  var seen = {};
  function watchKills() {
    var list = L();
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || b.isAlly || b._remoteAlly) continue;
      var id = String(b.netId || b.id || i);
      if ((!b.alive || (b.hp || 0) <= 0) && !seen[id]) {
        seen[id] = true;
        st.killInPhase++;
        if (st.duel && b === st.duel) endDuel(true);
        if (st.phase && st.phase.id === "totalwar" && st.killInPhase === 8) triggerJudgment();
      }
      if (b.alive && (b.hp || 0) > 0) delete seen[id];
    }
  }

  function ensureUI() {
    if (document.getElementById("wwn-drama")) return;
    var layer = document.getElementById("game-layer");
    if (!layer) return;
    var style = document.createElement("style");
    style.textContent = [
      "#wwn-drama{position:absolute;inset:0;pointer-events:none;z-index:40;font-family:Segoe UI,Helvetica,sans-serif}",
      "#wwn-drama .lb{position:absolute;left:0;right:0;height:0;background:#000;transition:height .35s ease;opacity:.88}",
      "#wwn-drama .lb.top{top:0} #wwn-drama .lb.bot{bottom:0}",
      "#wwn-drama .lb.on{height:9vh}",
      "#wwn-drama .title{position:absolute;top:42%;left:50%;transform:translate(-50%,-50%);text-align:center;opacity:0;transition:opacity .2s}",
      "#wwn-drama .title.on{opacity:1}",
      "#wwn-drama .title h1{margin:0;font-size:clamp(28px,5vw,52px);font-weight:900;color:#fff;letter-spacing:.12em;text-shadow:0 0 24px #ff1744,0 0 48px #0ff}",
      "#wwn-drama .title p{margin:10px 0 0;font-size:14px;color:#b3e5fc;letter-spacing:.08em}",
      "#wwn-drama .phase{position:absolute;top:10px;right:12px;padding:6px 12px;border-radius:6px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.2);color:#fff;font-size:12px;font-weight:700;letter-spacing:.06em}",
      "#wwn-drama .phase em{display:block;font-style:normal;font-weight:500;font-size:10px;opacity:.75;margin-top:2px}",
      "#wwn-drama .bar{position:absolute;top:0;left:0;right:0;height:3px;background:rgba(255,255,255,.12)}",
      "#wwn-drama .bar>i{display:block;height:100%;width:0%;background:linear-gradient(90deg,#00f5ff,#ff1744);transition:width .2s}",
      "#wwn-drama .tint{position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;opacity:0.35;transition:background .8s}",
    ].join("");
    document.head.appendChild(style);
    var el = document.createElement("div");
    el.id = "wwn-drama";
    el.innerHTML = [
      '<div class="bar"><i id="drama-bar"></i></div>',
      '<div class="tint" id="drama-tint"></div>',
      '<div class="lb top" id="drama-lb-t"></div>',
      '<div class="lb bot" id="drama-lb-b"></div>',
      '<div class="title" id="drama-title"><h1 id="drama-h"></h1><p id="drama-p"></p></div>',
      '<div class="phase" id="drama-phase">—<em id="drama-phase-sub"></em></div>',
    ].join("");
    layer.appendChild(el);
  }

  function updateUI() {
    ensureUI();
    var ph = st.phase;
    var phaseEl = document.getElementById("drama-phase");
    var phaseSub = document.getElementById("drama-phase-sub");
    var bar = document.getElementById("drama-bar");
    var tint = document.getElementById("drama-tint");
    var title = document.getElementById("drama-title");
    var h = document.getElementById("drama-h");
    var p = document.getElementById("drama-p");
    var lbT = document.getElementById("drama-lb-t");
    var lbB = document.getElementById("drama-lb-b");
    if (ph && phaseEl) {
      phaseEl.childNodes[0].nodeValue = ph.name + "  " + Math.ceil(st.phaseT) + "s";
      if (phaseSub) phaseSub.textContent = ph.sub;
    }
    if (ph && bar) bar.style.width = Math.max(0, Math.min(100, (st.phaseT / ph.dur) * 100)) + "%";
    if (ph && tint) {
      var t = ph.tint;
      tint.style.background = "rgb(" + t[0] + "," + t[1] + "," + t[2] + ")";
      tint.style.opacity = ph.id === "totalwar" ? "0.5" : ph.id === "calm" ? "0.2" : "0.35";
    }
    if (title && h) {
      if (st.bigT > 0) {
        h.textContent = st.bigText;
        if (p) p.textContent = st.bigSub;
        title.classList.add("on");
      } else title.classList.remove("on");
    }
    if (lbT && lbB) {
      var on = st.letterbox > 0.05 || st.bigT > 0.4 || st.lastStand;
      lbT.classList.toggle("on", on);
      lbB.classList.toggle("on", on);
    }
  }

  function drawWorld(ctx, cam) {
    if (!ctx || !cam) return;
    var z = cam.zoom || 1;
    function sx(x) { return cam.sx ? cam.sx(x) : (x - cam.x) * z + cam.w / 2; }
    function sy(y) { return cam.sy ? cam.sy(y) : (y - cam.y) * z + cam.h / 2; }

    if (st.extract) {
      var e = st.extract;
      var x = sx(e.x), y = sy(e.y);
      var rr = e.r * z;
      ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,255,180,0.85)"; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, rr * 0.55, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.stroke();
      ctx.fillStyle = "#69f0ae"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("EXTRACT", x, y - rr - 8);
      if (e.prog > 0 && e.prog < 1) {
        ctx.beginPath();
        ctx.arc(x, y, rr * 0.75, -Math.PI / 2, -Math.PI / 2 + e.prog * Math.PI * 2);
        ctx.strokeStyle = "#ffe066"; ctx.lineWidth = 5; ctx.stroke();
      }
    }

    if (st.duel && st.duel.alive) {
      var d = st.duel;
      var dx = sx(d.x), dy = sy(d.y);
      ctx.beginPath();
      ctx.arc(dx, dy, (d.radius || 24) * z + 18, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffea00"; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = "#ffea00"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("DUEL", dx, dy - 40);
    }

    if (st.judgmentT > 0) {
      var pl = P();
      if (pl) {
        var pr = (1.2 - st.judgmentT) * 2200 * z;
        ctx.beginPath();
        ctx.arc(sx(pl.x), sy(pl.y), Math.max(0, pr), 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,23,68," + st.judgmentT + ")";
        ctx.lineWidth = 8; ctx.stroke();
      }
    }

    if (st.lastStand) {
      var p2 = P();
      if (p2) {
        ctx.beginPath();
        ctx.arc(sx(p2.x), sy(p2.y), 40 * z + Math.sin(performance.now() / 80) * 6, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,80,80,0.8)"; ctx.lineWidth = 3; ctx.stroke();
      }
    }
  }

  var last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    var p = P();
    if (!p) return;

    if (!st.ready) {
      st.ready = true;
      setTimeout(function () {
        setPhase(0);
        announce("戦局システム起動", "停戦から総力戦へ — 戦場のルールが変わる", 3.5);
      }, 1800);
    }

    patchScore();
    patchPlayerDmg();

    if (st.bigT > 0) st.bigT -= dt;
    if (st.flash > 0) st.flash -= dt;
    if (st.shake > 0) st.shake = Math.max(0, st.shake - dt * 16);
    if (st.letterbox > 0) st.letterbox = Math.max(0, st.letterbox - dt * 0.35);
    if (st.judgmentT > 0) st.judgmentT -= dt;

    if (st.phase) {
      st.phaseT -= dt;
      if (st.phaseT <= 0) nextPhase();
    }

    if (p.alive && !st.lastStand && (p.hp || 0) > 0 && (p.hp / (p.hpMax || 560)) < 0.18) {
      triggerLastStand();
    }
    if (st.lastStand) {
      st.lastStandT -= dt;
      p.boost = Math.min(100, (p.boost || 0) + 20 * dt);
      if (st.lastStandT <= 0) {
        st.lastStand = false;
        st.playerMul = st.phase ? st.phase.playerMul : 1;
        window.__wwnDmgMul = st.playerMul;
        announce("LAST STAND 終了", "通常戦闘に戻る", 2);
      }
    }

    if (st.duel) {
      st.duelT -= dt;
      if (!st.duel.alive || (st.duel.hp || 0) <= 0) endDuel(true);
      else if (st.duelT <= 0) endDuel(false);
    }

    if (st.extract) {
      st.extractT -= dt;
      var d = Math.hypot(p.x - st.extract.x, p.y - st.extract.y);
      if (d < st.extract.r) {
        st.extract.prog = Math.min(1, st.extract.prog + dt * 0.35);
        if (st.extract.prog >= 1) {
          announce("EXTRACTION SUCCESS", "+800 PT  /  全回復", 3);
          try { if (window.__wwnScore && window.__wwnScore.add) window.__wwnScore.add(800, "extract"); } catch (e) {}
          p.hp = p.hpMax || 560;
          p.boost = 100;
          st.extract = null;
          st.flash = 0.5;
        }
      } else {
        st.extract.prog = Math.max(0, st.extract.prog - dt * 0.2);
      }
      if (st.extractT <= 0 && st.extract) {
        announce("EXTRACTION FAILED", "ゲートが閉じた", 2);
        st.extract = null;
      }
    }

    st.nextSpecial -= dt;
    if (st.nextSpecial <= 0) {
      st.nextSpecial = 35 + Math.random() * 25;
      var roll = Math.random();
      if (roll < 0.34 && !st.duel) triggerDuel();
      else if (roll < 0.67 && !st.extract) triggerExtraction();
      else if (st.phase && st.phase.id === "totalwar") triggerJudgment();
      else if (!st.duel) triggerDuel();
      else triggerExtraction();
    }

    applyPhaseRules(dt);
    watchKills();
    updateUI();

    var canvas = document.getElementById("game-canvas");
    var cam = window.__wwnCamera;
    if (canvas && cam) {
      if (st.shake > 0) {
        cam.x += (Math.random() - 0.5) * st.shake * 2.5;
        cam.y += (Math.random() - 0.5) * st.shake * 2.5;
      }
      var ctx = canvas.getContext("2d");
      if (ctx) {
        drawWorld(ctx, cam);
        if (st.flash > 0) {
          ctx.fillStyle = "rgba(255,255,255," + (st.flash * 0.55) + ")";
          ctx.fillRect(0, 0, cam.w || innerWidth, cam.h || innerHeight);
        }
      }
    }

    if (!st.lastStand && st.phase) {
      window.__wwnDmgMul = Math.max(window.__wwnDmgMul || 1, st.phase.playerMul || 1);
    }
  }

  requestAnimationFrame(frame);
  console.log("[WWN] dramatic war-phase system online");
})();
