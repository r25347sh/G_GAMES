(function () {
  "use strict";
  var W = {
    ready: false, mode: null, modeT: 0, next: 22,
    flash: 0, shake: 0, big: "", bigSub: "", bigT: 0, letter: 0,
    beatT: 0, beatI: 0, rhythmScore: 0,
    pellet: null, scaredT: 0,
    rings: [], ringI: 0,
    bumpers: [],
    ball: null,
    mirror: false,
    cardOffer: null,
    mechaT: 0,
    portals: null,
  };

  function P() { return window.__wwnPlayer; }
  function L() { return window.__wwnAiList || []; }

  function announce(t, s, sec) {
    W.big = t; W.bigSub = s || ""; W.bigT = sec || 3;
    W.letter = 1; W.flash = 0.3; W.shake = 12;
    try {
      var el = document.getElementById("toast");
      if (el) {
        el.textContent = t;
        el.classList.add("show");
        setTimeout(function () { el.classList.remove("show"); }, (sec || 3) * 1000);
      }
    } catch (e) {}
  }

  function score(n, why) {
    try { if (window.__wwnScore && window.__wwnScore.add) window.__wwnScore.add(n, why || "wild"); } catch (e) {}
  }

  function clearMode() {
    var list = L();
    for (var i = 0; i < list.length; i++) {
      if (!list[i]) continue;
      list[i]._scared = false;
      list[i]._baitTarget = false;
    }
    W.mode = null; W.modeT = 0; W.pellet = null; W.rings = [];
    W.bumpers = []; W.ball = null; W.mirror = false; W.cardOffer = null; W.portals = null;
    window.__wwnMirrorControls = false;
  }

  function startRhythm() {
    clearMode(); W.mode = "rhythm"; W.modeT = 20; W.beatT = 0; W.beatI = 0; W.rhythmScore = 0;
    announce("♪ RHYTHM FIRE ♪", "ビートに合わせて撃て — タイミングで火力爆増", 3);
  }
  function updateRhythm(dt) {
    W.beatT += dt;
    var bpm = 0.45;
    if (W.beatT >= bpm) { W.beatT -= bpm; W.beatI++; W.flash = 0.08; W.shake = Math.max(W.shake, 3); }
    var phase = W.beatT / bpm;
    var onBeat = phase < 0.18 || phase > 0.82;
    window.__wwnDmgMul = Math.max(window.__wwnDmgMul || 1, onBeat ? 2.4 : 0.7);
    if (onBeat) W.rhythmScore += dt * 10;
  }

  function startPac() {
    clearMode(); W.mode = "pac"; W.modeT = 18;
    var p = P(); if (!p) return;
    var a = Math.random() * Math.PI * 2, r = 350 + Math.random() * 400;
    W.pellet = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
    W.scaredT = 0;
    announce("PAC PROTOCOL", "金色のペレットを取れ — 敵が逃げる＆触れれば撃破", 3.2);
  }
  function updatePac(dt, p) {
    if (W.pellet && Math.hypot(p.x - W.pellet.x, p.y - W.pellet.y) < 40) {
      W.pellet = null; W.scaredT = 10;
      announce("POWER!", "敵に体当たりで撃破", 2); score(100, "pac");
      var list = L();
      for (var i = 0; i < list.length; i++) if (list[i] && !list[i].isAlly) list[i]._scared = true;
    }
    if (W.scaredT > 0) {
      W.scaredT -= dt;
      var list2 = L();
      for (var j = 0; j < list2.length; j++) {
        var b = list2[j];
        if (!b || !b.alive || b.isAlly || b._remoteAlly) continue;
        var dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1;
        b.vx += (dx / d) * 280 * dt; b.vy += (dy / d) * 280 * dt;
        if (d < 36) { b.hp = 0; b.alive = false; score(80, "pac-eat"); W.flash = 0.15; }
      }
      if (W.scaredT <= 0) for (var k = 0; k < list2.length; k++) if (list2[k]) list2[k]._scared = false;
    }
  }

  function startRace() {
    clearMode(); W.mode = "race"; W.modeT = 35; W.rings = []; W.ringI = 0;
    var p = P(); if (!p) return;
    var ang = p.angle || 0;
    for (var i = 0; i < 8; i++) {
      ang += (Math.random() - 0.5) * 0.8;
      var dist = 280 + i * 180;
      W.rings.push({ x: p.x + Math.cos(ang) * dist, y: p.y + Math.sin(ang) * dist, r: 70, done: false });
    }
    announce("AERIAL CIRCUIT", "リングを順番に通過せよ — シューティング×レース", 3.2);
  }
  function updateRace(dt, p) {
    if (W.ringI >= W.rings.length) { announce("CIRCUIT CLEAR", "+700 PT", 2.5); score(700, "race"); clearMode(); return; }
    var ring = W.rings[W.ringI];
    if (Math.hypot(p.x - ring.x, p.y - ring.y) < ring.r) {
      ring.done = true; W.ringI++; score(60, "ring"); W.flash = 0.12;
    }
  }

  function startPinball() {
    clearMode(); W.mode = "pinball"; W.modeT = 22; W.bumpers = [];
    var p = P(); if (!p) return;
    for (var i = 0; i < 10; i++) {
      var a = Math.random() * Math.PI * 2, r = 200 + Math.random() * 700;
      W.bumpers.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, r: 40 + Math.random() * 30, pulse: Math.random() * 5 });
    }
    announce("PINBALL SKY", "バンパーに突っ込め — 弾かれながらコンボ", 3);
  }
  function updatePinball(dt, p) {
    for (var i = 0; i < W.bumpers.length; i++) {
      var b = W.bumpers[i]; b.pulse += dt * 4;
      var d = Math.hypot(p.x - b.x, p.y - b.y);
      if (d < b.r + 16) {
        var nx = (p.x - b.x) / (d || 1), ny = (p.y - b.y) / (d || 1);
        p.vx = nx * 520; p.vy = ny * 520;
        score(25, "bumper"); W.shake = 8; W.flash = 0.1;
        var list = L();
        for (var j = 0; j < list.length; j++) {
          var e = list[j];
          if (!e || !e.alive || e.isAlly) continue;
          if (Math.hypot(e.x - b.x, e.y - b.y) < 160) {
            e.hp = Math.max(0, (e.hp || 0) - 18);
            e.vx += nx * 200; e.vy += ny * 200;
          }
        }
      }
    }
  }

  function startPayload() {
    clearMode(); W.mode = "payload"; W.modeT = 40;
    var p = P(); if (!p) return;
    var a = Math.random() * Math.PI * 2;
    W.ball = {
      x: p.x + Math.cos(a) * 200, y: p.y + Math.sin(a) * 200,
      vx: 0, vy: 0, r: 36,
      gx: p.x + Math.cos(a + 1) * 1400, gy: p.y + Math.sin(a + 1) * 1400,
    };
    announce("PAYLOAD PUSH", "巨大ボールをゴールへ押せ — もはやサッカー", 3.2);
  }
  function updatePayload(dt, p) {
    var b = W.ball; if (!b) return;
    var d = Math.hypot(p.x - b.x, p.y - b.y);
    if (d < b.r + 20) {
      var nx = (b.x - p.x) / (d || 1), ny = (b.y - p.y) / (d || 1);
      b.vx += nx * 320 * dt * 8; b.vy += ny * 320 * dt * 8;
    }
    var list = L();
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e || !e.alive || e.isAlly) continue;
      var ed = Math.hypot(e.x - b.x, e.y - b.y);
      if (ed < 400) {
        e.vx += ((b.x - e.x) / (ed || 1)) * 30 * dt;
        e.vy += ((b.y - e.y) / (ed || 1)) * 30 * dt;
        if (ed < b.r + 18) {
          b.vx -= ((b.x - e.x) / (ed || 1)) * 200 * dt * 6;
          b.vy -= ((b.y - e.y) / (ed || 1)) * 200 * dt * 6;
        }
      }
    }
    b.vx *= 0.99; b.vy *= 0.99;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (Math.hypot(b.x - b.gx, b.y - b.gy) < 90) {
      announce("GOAL!!!", "+900 PT", 3); score(900, "goal"); clearMode();
    }
  }

  function startMirror() {
    clearMode(); W.mode = "mirror"; W.modeT = 14; W.mirror = true;
    window.__wwnMirrorControls = true;
    announce("MIRROR DIMENSION", "操作が反転する — 適応せよ", 3);
  }

  function startCards() {
    clearMode(); W.mode = "cards"; W.modeT = 12;
    var pool = [
      { id: "nuke", name: "小型核", desc: "周囲大ダメージ", fn: function () {
        var p = P(), list = L(); if (!p) return;
        for (var i = 0; i < list.length; i++) {
          var b = list[i]; if (!b || !b.alive || b.isAlly) continue;
          if (Math.hypot(b.x - p.x, b.y - p.y) < 700) { b.hp = Math.max(0, b.hp - 120); if (b.hp <= 0) b.alive = false; }
        }
        W.flash = 0.5; W.shake = 18;
      }},
      { id: "heal", name: "全回復", desc: "HULLとBOOST満タン", fn: function () {
        var p = P(); if (p) { p.hp = p.hpMax || 560; p.boost = 100; }
      }},
      { id: "army", name: "臨時編隊", desc: "味方を大量展開", fn: function () {
        var p = P(), list = L();
        if (!p || !list || !window.WWNAiPilot) return;
        for (var i = 0; i < 4; i++) {
          try {
            var bot = new WWNAiPilot("wild-ally-" + Date.now() + "-" + i, "normal", list.length, "ALLY", "striker");
            bot.isAlly = true; bot.group = "ALLY"; bot.ownerId = p.netId;
            bot.x = p.x + Math.cos(i) * 90; bot.y = p.y + Math.sin(i) * 90;
            bot.hpMax = 180; bot.hp = 180; list.push(bot);
          } catch (e) {}
        }
      }},
      { id: "mecha", name: "巨大化", desc: "15秒メカ形態", fn: function () { startMecha(); } },
      { id: "gold", name: "黄金律", desc: "PT +500", fn: function () { score(500, "card"); } },
    ];
    W.cardOffer = [];
    var copy = pool.slice();
    for (var k = 0; k < 3 && copy.length; k++) {
      var ix = Math.floor(Math.random() * copy.length);
      W.cardOffer.push(copy.splice(ix, 1)[0]);
    }
    announce("TACTICAL CARDS", "1 / 2 / 3 キーでカードを選べ", 3.5);
  }
  function pickCard(i) {
    if (W.mode !== "cards" || !W.cardOffer || !W.cardOffer[i]) return;
    var c = W.cardOffer[i];
    announce(c.name, c.desc, 2);
    try { c.fn(); } catch (e) {}
    clearMode();
  }

  function startMecha() {
    W.mechaT = 15;
    window.__wwnMecha = true;
    window.__wwnDmgMul = Math.max(window.__wwnDmgMul || 1, 2.5);
    var p = P();
    if (p) { p.radius = 36; p.hp = Math.min(p.hpMax || 560, p.hp + 150); }
    announce("MECHA FORM", "巨大化 — 弾が凶悪／接触でもダメージ", 3);
  }
  function updateMecha(dt, p) {
    if (W.mechaT <= 0) return;
    W.mechaT -= dt;
    window.__wwnDmgMul = Math.max(window.__wwnDmgMul || 1, 2.5);
    var list = L();
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || !b.alive || b.isAlly) continue;
      if (Math.hypot(b.x - p.x, b.y - p.y) < 50) {
        b.hp = Math.max(0, (b.hp || 0) - 40 * dt);
        if (b.hp <= 0) b.alive = false;
      }
    }
    if (W.mechaT <= 0) {
      window.__wwnMecha = false;
      if (p) p.radius = 18;
      announce("MECHA END", "通常サイズに戻った", 1.5);
    }
  }

  function startBait() {
    clearMode(); W.mode = "bait"; W.modeT = 16;
    announce("LIVE BAIT", "全機があなたに殺到 — 生き延びて逆転", 3);
  }
  function updateBait(dt, p) {
    var list = L();
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || !b.alive || b.isAlly) continue;
      var dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1;
      b.vx += (dx / d) * 90 * dt; b.vy += (dy / d) * 90 * dt;
    }
  }

  function startPortals() {
    clearMode(); W.mode = "portals"; W.modeT = 25;
    var p = P(); if (!p) return;
    W.portals = { a: { x: p.x + 400, y: p.y - 200, r: 55 }, b: { x: p.x - 500, y: p.y + 350, r: 55 }, cd: 0 };
    announce("WORMHOLE TENNIS", "ポータルをくぐって高速マニューバ", 3);
  }
  function updatePortals(dt, p) {
    var pr = W.portals; if (!pr) return;
    if (pr.cd > 0) { pr.cd -= dt; return; }
    function hit(port, other) {
      if (Math.hypot(p.x - port.x, p.y - port.y) < port.r) {
        p.x = other.x + 60; p.y = other.y;
        p.vx *= 1.4; p.vy *= 1.4;
        pr.cd = 0.8; score(30, "portal"); W.flash = 0.15;
      }
    }
    hit(pr.a, pr.b); hit(pr.b, pr.a);
  }

  var STARTERS = [startRhythm, startPac, startRace, startPinball, startPayload, startMirror, startCards, startBait, startPortals];
  function startRandom() {
    if (W.mechaT > 0) return;
    STARTERS[Math.floor(Math.random() * STARTERS.length)]();
  }

  document.addEventListener("keydown", function (e) {
    if (W.mode !== "cards") return;
    if (e.key === "1") pickCard(0);
    if (e.key === "2") pickCard(1);
    if (e.key === "3") pickCard(2);
  }, true);

  function patchPlayerTurn() {
    if (!window.WWNPlayer || !WWNPlayer.prototype || WWNPlayer.prototype.__wildTurn) return;
    var o = WWNPlayer.prototype.update;
    if (!o) return;
    WWNPlayer.prototype.update = function (dt, input) {
      if (window.__wwnMirrorControls && input) {
        if (input.left != null || input.right != null) {
          var tmp = input.left; input.left = input.right; input.right = tmp;
        }
        if (typeof input.turn === "number") input.turn = -input.turn;
      }
      return o.apply(this, arguments);
    };
    WWNPlayer.prototype.__wildTurn = true;
  }

  function ensureUI() {
    if (document.getElementById("wwn-wild")) return;
    var layer = document.getElementById("game-layer");
    if (!layer) return;
    var style = document.createElement("style");
    style.textContent = [
      "#wwn-wild{position:absolute;inset:0;pointer-events:none;z-index:45;font-family:Segoe UI,sans-serif}",
      "#wwn-wild .lb{position:absolute;left:0;right:0;height:0;background:#000;opacity:.9;transition:height .3s}",
      "#wwn-wild .lb.t{top:0}#wwn-wild .lb.b{bottom:0}#wwn-wild .lb.on{height:8vh}",
      "#wwn-wild .tt{position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);text-align:center;opacity:0}",
      "#wwn-wild .tt.on{opacity:1}",
      "#wwn-wild .tt h1{margin:0;font-size:clamp(26px,4.5vw,48px);color:#fff;font-weight:900;letter-spacing:.1em;text-shadow:0 0 20px #ff0,0 0 40px #f0f}",
      "#wwn-wild .tt p{color:#ffe082;font-size:13px}",
      "#wwn-wild .tag{position:absolute;bottom:88px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.6);border:1px solid #ffea00;color:#ffea00;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;display:none}",
      "#wwn-wild .cards{position:absolute;bottom:120px;left:50%;transform:translateX(-50%);display:none;gap:10px}",
      "#wwn-wild .cards.on{display:flex}",
      "#wwn-wild .card{width:120px;padding:10px;background:rgba(10,10,30,.85);border:2px solid #7c4dff;border-radius:10px;color:#fff;text-align:center}",
      "#wwn-wild .card b{display:block;color:#ffd54f;font-size:14px;margin-bottom:4px}",
      "#wwn-wild .card span{font-size:11px;opacity:.85}",
      "#wwn-wild .card i{display:block;margin-top:6px;font-style:normal;color:#80d8ff;font-size:10px}",
    ].join("");
    document.head.appendChild(style);
    var el = document.createElement("div");
    el.id = "wwn-wild";
    el.innerHTML = '<div class="lb t" id="wild-lb-t"></div><div class="lb b" id="wild-lb-b"></div><div class="tt" id="wild-tt"><h1 id="wild-h"></h1><p id="wild-p"></p></div><div class="tag" id="wild-tag"></div><div class="cards" id="wild-cards"></div>';
    layer.appendChild(el);
  }

  function updateUI() {
    ensureUI();
    var tt = document.getElementById("wild-tt");
    var h = document.getElementById("wild-h");
    var p = document.getElementById("wild-p");
    var tag = document.getElementById("wild-tag");
    var cards = document.getElementById("wild-cards");
    var lbT = document.getElementById("wild-lb-t");
    var lbB = document.getElementById("wild-lb-b");
    if (h) h.textContent = W.big;
    if (p) p.textContent = W.bigSub;
    if (tt) tt.classList.toggle("on", W.bigT > 0);
    if (lbT) lbT.classList.toggle("on", W.letter > 0.05 || W.bigT > 0.3);
    if (lbB) lbB.classList.toggle("on", W.letter > 0.05 || W.bigT > 0.3);
    if (tag) {
      if (W.mode) { tag.style.display = "block"; tag.textContent = "WILD: " + W.mode.toUpperCase() + "  " + Math.ceil(W.modeT) + "s"; }
      else if (W.mechaT > 0) { tag.style.display = "block"; tag.textContent = "MECHA " + Math.ceil(W.mechaT) + "s"; }
      else tag.style.display = "none";
    }
    if (cards) {
      if (W.mode === "cards" && W.cardOffer) {
        cards.classList.add("on");
        cards.innerHTML = W.cardOffer.map(function (c, i) {
          return '<div class="card"><b>' + c.name + '</b><span>' + c.desc + '</span><i>[' + (i + 1) + ']</i></div>';
        }).join("");
      } else cards.classList.remove("on");
    }
  }

  function draw(ctx, cam) {
    if (!ctx || !cam) return;
    var z = cam.zoom || 1;
    function sx(x) { return cam.sx ? cam.sx(x) : (x - cam.x) * z + cam.w / 2; }
    function sy(y) { return cam.sy ? cam.sy(y) : (y - cam.y) * z + cam.h / 2; }
    var p = P();

    if (W.mode === "rhythm" && p) {
      var bpm = 0.45, phase = W.beatT / bpm;
      var rad = (20 + (1 - phase) * 40) * z;
      ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), rad, 0, Math.PI * 2);
      ctx.strokeStyle = phase < 0.18 || phase > 0.82 ? "rgba(255,255,0,0.9)" : "rgba(255,255,255,0.25)";
      ctx.lineWidth = 3; ctx.stroke();
    }
    if (W.pellet) {
      var px = sx(W.pellet.x), py = sy(W.pellet.y);
      ctx.beginPath(); ctx.arc(px, py, 16 * z, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd600"; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.stroke();
      ctx.fillStyle = "#fff176"; ctx.font = "10px sans-serif"; ctx.textAlign = "center"; ctx.fillText("PELLET", px, py - 20);
    }
    if (W.scaredT > 0) {
      var list = L();
      for (var i = 0; i < list.length; i++) {
        var b = list[i]; if (!b || !b.alive || !b._scared) continue;
        ctx.fillStyle = "#82b1ff"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("!", sx(b.x), sy(b.y) - 26);
      }
    }
    for (var r = 0; r < W.rings.length; r++) {
      var ring = W.rings[r]; if (ring.done) continue;
      var active = r === W.ringI;
      ctx.beginPath(); ctx.arc(sx(ring.x), sy(ring.y), ring.r * z, 0, Math.PI * 2);
      ctx.strokeStyle = active ? "rgba(0,255,200,0.95)" : "rgba(255,255,255,0.25)";
      ctx.lineWidth = active ? 4 : 2; ctx.stroke();
      if (active) {
        ctx.fillStyle = "#69f0ae"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
        ctx.fillText((r + 1) + "/" + W.rings.length, sx(ring.x), sy(ring.y) + 4);
      }
    }
    for (var bi = 0; bi < W.bumpers.length; bi++) {
      var bu = W.bumpers[bi];
      ctx.beginPath(); ctx.arc(sx(bu.x), sy(bu.y), bu.r * z, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,64,129,0.85)"; ctx.lineWidth = 3 + Math.sin(bu.pulse) * 1.5; ctx.stroke();
      ctx.fillStyle = "rgba(255,64,129,0.12)"; ctx.fill();
    }
    if (W.ball) {
      var ba = W.ball;
      ctx.beginPath(); ctx.arc(sx(ba.x), sy(ba.y), ba.r * z, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,235,59,0.85)"; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(sx(ba.gx), sy(ba.gy), 80 * z, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(105,240,174,0.8)"; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = "#69f0ae"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.fillText("GOAL", sx(ba.gx), sy(ba.gy) + 4);
    }
    if (W.portals) {
      function drawPort(port, col) {
        ctx.beginPath(); ctx.arc(sx(port.x), sy(port.y), port.r * z, 0, Math.PI * 2);
        ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = col; ctx.globalAlpha = 0.15; ctx.fill(); ctx.globalAlpha = 1;
      }
      drawPort(W.portals.a, "#7c4dff"); drawPort(W.portals.b, "#00e5ff");
    }
    if (W.mechaT > 0 && p) {
      ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 42 * z, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,145,0,0.8)"; ctx.lineWidth = 4; ctx.stroke();
    }
    if (W.mode === "mirror") {
      ctx.fillStyle = "rgba(180,100,255,0.08)";
      ctx.fillRect(0, 0, cam.w || innerWidth, cam.h || innerHeight);
    }
  }

  var last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    var p = P();
    if (!p) return;

    if (!W.ready) {
      W.ready = true;
      setTimeout(function () {
        announce("WILD PROTOCOL", "これはもう、ただのシューティングではない", 3.5);
        W.next = 8;
      }, 2500);
    }

    if (W.bigT > 0) W.bigT -= dt;
    if (W.flash > 0) W.flash -= dt;
    if (W.shake > 0) W.shake = Math.max(0, W.shake - dt * 16);
    if (W.letter > 0) W.letter = Math.max(0, W.letter - dt * 0.4);

    W.next -= dt;
    if (W.next <= 0 && !W.mode && W.mechaT <= 0) {
      W.next = 28 + Math.random() * 22;
      startRandom();
    }

    if (W.mode) {
      W.modeT -= dt;
      if (W.mode === "rhythm") updateRhythm(dt);
      if (W.mode === "pac") updatePac(dt, p);
      if (W.mode === "race") updateRace(dt, p);
      if (W.mode === "pinball") updatePinball(dt, p);
      if (W.mode === "payload") updatePayload(dt, p);
      if (W.mode === "portals") updatePortals(dt, p);
      if (W.mode === "bait") updateBait(dt, p);
      if (W.modeT <= 0) {
        if (W.mode === "rhythm") score(Math.round(W.rhythmScore), "rhythm");
        clearMode();
        announce("MODE END", "通常空域に復帰", 1.6);
      }
    }

    updateMecha(dt, p);
    patchPlayerTurn();
    updateUI();

    var canvas = document.getElementById("game-canvas");
    var cam = window.__wwnCamera;
    if (canvas && cam) {
      if (W.shake > 0) {
        cam.x += (Math.random() - 0.5) * W.shake * 2;
        cam.y += (Math.random() - 0.5) * W.shake * 2;
      }
      var ctx = canvas.getContext("2d");
      if (ctx) {
        draw(ctx, cam);
        if (W.flash > 0) {
          ctx.fillStyle = "rgba(255,255,255," + W.flash * 0.5 + ")";
          ctx.fillRect(0, 0, cam.w || innerWidth, cam.h || innerHeight);
        }
      }
    }
  }

  requestAnimationFrame(frame);
  console.log("[WWN] WILD genre-break layer online");
})();
