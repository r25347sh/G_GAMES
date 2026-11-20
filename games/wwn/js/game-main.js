(function () {
  "use strict";
  var canvas, ctx, loop, player, camera, world, combat, loadout, netSync, minimapCanvas;
  var mapHazards, scoreBoard;
  var active = false;
  var fireMainCd = 0, fireSubCd = 0, fireGadgetCd = 0, secretCd = 0, cyberTint = 0, secretIdx = 0;
  var aiList = [];
  var gameMode = "solo";
  var els = {};
  function $(id) { return document.getElementById(id); }
  function initDom() {
    els.gameLayer = $("game-layer"); canvas = $("game-canvas"); minimapCanvas = $("minimap-canvas");
    els.hudHp = $("hud-hp"); els.hudHpText = $("hud-hp-text"); els.hudBoost = $("hud-boost"); els.hudSpeed = $("hud-speed");
    els.secretSlot = $("secret-slot"); els.hudCoord = $("hud-coord"); els.hudFps = $("hud-fps"); els.btnExit = $("btn-exit-game");
    els.borderWarn = $("border-warn"); els.weaponMain = $("weapon-main"); els.weaponSub = $("weapon-sub");
    els.weaponGadget = $("weapon-gadget"); els.hudHeat = $("hud-heat"); els.hudEnergy = $("hud-energy");
    els.hudAmmo = $("hud-ammo"); els.respawnOverlay = $("respawn-overlay"); els.killFeed = $("kill-feed");
    els.gadgetHint = $("gadget-hint"); els.hudScore = $("hud-score"); els.hudCombo = $("hud-combo");
    els.lobbyWrap = $("lobby-wrap");
    if (!canvas || !els.gameLayer) return false;
    ctx = canvas.getContext("2d"); if (!ctx) return false;
    if (minimapCanvas) { minimapCanvas.width = 120; minimapCanvas.height = 120; }
    return true;
  }
  function resize() {
    if (!canvas || !ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, window.innerWidth || 800);
    var h = Math.max(1, window.innerHeight || 600);
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (camera) camera.resize(w, h);
  }
  function roomState() { return window.WWNRoom && WWNRoom.getState && WWNRoom.getState(); }
  function spawnFillerBots() {
    var groups = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"], idx = 0;
    for (var g = 0; g < groups.length; g++) {
      for (var n = 0; n < 3; n++) {
        try {
          var bot = new WWNAiPilot("cpu-auto-" + (++idx), "easy", idx, groups[g]);
          bot.openWeak = true; aiList.push(bot);
        } catch (e) { console.error("spawn bot", e); }
      }
    }
  }
  function spawnAllyBots(count) {
    count = Math.max(1, Math.min(5, count || 1));
    for (var i = 0; i < count; i++) {
      try {
        var bot = new WWNAiPilot("cpu-ally-" + (aiList.length + 1), "normal", aiList.length + i, "ALLY");
        bot.team = player ? player.team : "BLUE";
        bot.group = "ALLY"; bot.isAlly = true; bot.openWeak = false;
        if (player) {
          bot.x = player.x - Math.cos(player.angle) * (60 + i * 30);
          bot.y = player.y - Math.sin(player.angle) * (60 + i * 30);
          bot.angle = player.angle;
        }
        aiList.push(bot);
      } catch (e) { console.error("spawn ally", e); }
    }
  }
  function startGame(options) {
    options = options || {};
    if (!initDom()) { console.error("WWN: DOM init failed"); return; }
    if (active) stopGame();
    active = true; gameMode = options.mode || "solo"; aiList = [];
    fireMainCd = fireSubCd = fireGadgetCd = secretCd = 0; cyberTint = 0; secretIdx = 0;
    if (els.lobbyWrap) els.lobbyWrap.style.display = "none";
    els.gameLayer.classList.remove("hidden");
    document.body.classList.add("in-game");
    if (els.respawnOverlay) els.respawnOverlay.classList.add("hidden");
    player = new WWNPlayer(0, 0);
    player.team = "BLUE"; player.netId = "local-" + Math.random().toString(36).slice(2, 8);
    player.alive = true; player.hp = WWNConfig.HP_MAX;
    var st = roomState();
    if (st && gameMode === "online") {
      player.netId = st.peerId || player.netId;
      player.username = st.username || "You";
      player.team = st.team && st.team !== "NONE" ? st.team : "BLUE";
    }
    camera = new WWNCamera();
    camera.x = player.x; camera.y = player.y; camera.zoom = 1;
    world = new WWNWorld(); combat = new WWNCombat(); loadout = new WWNWeaponLoadout();
    try { mapHazards = new WWNMapHazards(); }
    catch (e) { console.error("mapHazards", e); mapHazards = { update: function () {}, draw: function () {} }; }
    scoreBoard = new WWNScoreBoard(); netSync = new WWNNetSync();
    netSync.setLocalId(player.netId);
    netSync.onCombatEvent = function (ev) {
      try {
        if (combat) combat.ingestRemoteEvent(ev);
        if (ev.t === "emp" && ev.ownerId !== player.netId) {
          var d = Math.hypot(player.x - ev.x, player.y - ev.y);
          if (d < (ev.aoe || 280) && window.WWNCombatUpdate && !WWNCombatUpdate.friendly(ev.team, player.team)) {
            loadout.empUntil = performance.now() / 1000 + (ev.duration || 3.5);
            player.hp = Math.max(0, player.hp - (ev.dmg || 8));
          }
        }
      } catch (e) {}
    };
    if (gameMode === "online") {
      try {
        netSync.bind();
        var plist = (window.WWNRoom && WWNRoom.getPlayerList) ? WWNRoom.getPlayerList() : [];
        for (var pi = 0; pi < plist.length; pi++) {
          var p = plist[pi];
          if (!p.peerId || p.peerId === player.netId) continue;
          if (String(p.peerId).indexOf("_MASTER") >= 0) continue;
          netSync._onState({ t: "st", id: p.peerId, x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 400, vx: 0, vy: 0, a: 0, hp: 100, b: 0, team: p.team || "NONE", st: 0, u: p.username || "Pilot" });
        }
        if (window.WWNRoom && WWNRoom.ensureMesh) WWNRoom.ensureMesh();
      } catch (e) { console.error("online seed", e); }
    }
    if (gameMode === "cpu") {
      var n = Math.max(1, Math.min(8, options.cpuCount || 1));
      var diff = options.difficulty || "normal";
      var groups = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"];
      for (var i = 0; i < n; i++) {
        try { aiList.push(new WWNAiPilot("cpu-" + (i + 1), diff, i, groups[i % groups.length])); }
        catch (e) { console.error(e); }
      }
    } else spawnFillerBots();
    resize(); WWNInput.bind(canvas);
    try { canvas.focus(); } catch (_) {}
    try { window.focus(); } catch (_) {}
    loop = new WWNGameLoop(update, render); loop.start();
    if (els.btnExit) els.btnExit.onclick = stopGame;
    window.addEventListener("resize", resize);
    updateWeaponHud(); updateSecretHud();
  }
  function stopGame() {
    active = false; if (loop) loop.stop();
    try { WWNInput.unbind(); } catch (_) {}
    window.removeEventListener("resize", resize);
    if (els.gameLayer) els.gameLayer.classList.add("hidden");
    if (els.lobbyWrap) els.lobbyWrap.style.display = "";
    document.body.classList.remove("in-game"); aiList = [];
  }
  function updateSecretHud() {
    if (!els.secretSlot || !window.WWNSecret) return;
    var ul = WWNSecret.getUnlockedList();
    if (!ul.length) { els.secretSlot.textContent = "—"; els.secretSlot.style.opacity = "0.35"; return; }
    if (secretIdx >= ul.length) secretIdx = 0;
    els.secretSlot.textContent = WWNSecret.getMeta(ul[secretIdx]).name;
    els.secretSlot.style.opacity = "1";
  }
  function updateWeaponHud() {
    if (!loadout || !window.WWNWeapons) return;
    var W = WWNWeapons;
    try {
      if (els.weaponMain) els.weaponMain.textContent = W[loadout.mainId()].name;
      if (els.weaponSub) els.weaponSub.textContent = W[loadout.subId()].name;
      if (els.weaponGadget) els.weaponGadget.textContent = W[loadout.gadgetId()].name;
    } catch (_) {}
  }
  function pushKillFeed(text) {
    if (!els.killFeed) return;
    var div = document.createElement("div"); div.className = "kill-line"; div.textContent = text;
    els.killFeed.appendChild(div);
    setTimeout(function () { try { div.remove(); } catch (_) {} }, 4000);
    while (els.killFeed.children.length > 5) els.killFeed.firstChild.remove();
  }
  function scoreApi() {
    return {
      add: function (n, r) { return scoreBoard ? scoreBoard.add(n, r) : 0; },
      refillAmmo: function () { if (loadout) loadout.refillAmmo(); },
    };
  }
  function update(dt) {
    if (!player || !camera || !loadout) return;
    var now = performance.now() / 1000;
    var flight = WWNInput.getFlight();
    var boost = WWNInput.isBoost();
    var empBlocked = loadout.isEmped ? loadout.isEmped(now) : false;
    if (WWNInput.consumeCycleMain()) { loadout.cycleMain(); updateWeaponHud(); }
    if (WWNInput.consumeCycleSub()) { loadout.cycleSub(); updateWeaponHud(); }
    if (WWNInput.consumeCycleGadget()) { loadout.cycleGadget(); updateWeaponHud(); }
    if (WWNInput.consumeCycleSecret && WWNInput.consumeCycleSecret()) {
      var ul0 = window.WWNSecret ? WWNSecret.getUnlockedList() : [];
      if (ul0.length) { secretIdx = (secretIdx + 1) % ul0.length; updateSecretHud(); }
    }
    if (window.WWNSecret) {
      WWNSecret.tryResolve().then(function (effect) {
        if (!effect) return;
        cyberTint = 1.2;
        if (scoreBoard) scoreBoard.add(15, "unlock");
        updateSecretHud(); pushKillFeed("特殊武装を解放");
      }).catch(function () {});
    }
    fireMainCd = Math.max(0, fireMainCd - dt);
    fireSubCd = Math.max(0, fireSubCd - dt);
    fireGadgetCd = Math.max(0, fireGadgetCd - dt);
    secretCd = Math.max(0, secretCd - dt);
    loadout.update(dt);
    if (player.alive) {
      var mainW = WWNWeapons[loadout.mainId()];
      if (WWNInput.consumeFireMain() && fireMainCd <= 0) {
        if (combat.fireMain(player, loadout, now)) {
          fireMainCd = 1 / (mainW.rate || 5);
          if (loadout.mainId() === "vulcan" && scoreBoard) scoreBoard.add(1, "shot");
        }
      }
      if (WWNInput.consumeFireSub() && fireSubCd <= 0) {
        combat.fireSub(player, loadout, now, aiList.concat(netSync.getRemotes())); fireSubCd = 0.2;
      }
      if (WWNInput.consumeFireGadget() && fireGadgetCd <= 0) {
        combat.useGadget(player, loadout, now); fireGadgetCd = 0.25;
      }
      if (WWNInput.consumeFireSecret && WWNInput.consumeFireSecret() && secretCd <= 0 && window.WWNSecret) {
        var ul = WWNSecret.getUnlockedList();
        if (ul.length) {
          var sid = ul[secretIdx % ul.length];
          var api = { spawnAlly: function (n) { spawnAllyBots(n); } };
          if (WWNSecret.applyEffect(sid, player, combat, api)) {
            secretCd = 3.5; cyberTint = 1.5;
            pushKillFeed("特殊: " + (WWNSecret.getMeta(sid).name || sid));
          }
        }
      }
    }
    player.stealthed = loadout.isStealthed ? loadout.isStealthed(now) : false;
    player.update(dt, flight, boost, empBlocked);
    var allEntities = aiList.concat(netSync.getRemotes());
    for (var i = 0; i < aiList.length; i++) {
      try { aiList[i].update(dt, player, combat, now, allEntities); } catch (e) {}
    }
    try { if (mapHazards) mapHazards.update(dt, player, combat, scoreApi()); } catch (e) {}
    if (scoreBoard) scoreBoard.update(dt);
    if (player.alive && player.hp <= 0) {
      player.kill();
      if (combat) combat.spawnParticle(player.x, player.y, "#ff2d95", 30, 200);
      camera.shake = 10; pushKillFeed("撃破された");
      if (els.respawnOverlay) els.respawnOverlay.classList.remove("hidden");
    }
    if (!player.alive) {
      if (els.respawnOverlay) els.respawnOverlay.textContent = "リスポーンまで " + Math.max(0, player.respawnTimer).toFixed(1) + "s";
      if (player.tryRespawn() && els.respawnOverlay) els.respawnOverlay.classList.add("hidden");
    }
    aiList.forEach(function (bot) {
      if (bot.alive && bot.hp <= 0) {
        bot.alive = false;
        if (combat) combat.spawnParticle(bot.x, bot.y, "#ff2d95", 24, 180);
        camera.shake = Math.max(camera.shake, 5);
        pushKillFeed(bot.username + " 撃墜 +100");
        if (scoreBoard) scoreBoard.onKill();
        setTimeout(function () {
          if (!active) return;
          bot.alive = true; bot.hp = WWNConfig.HP_MAX * 0.7;
          var half = WWNConfig.WORLD_SIZE * 0.35;
          bot.x = (Math.random() - 0.5) * half; bot.y = (Math.random() - 0.5) * half;
        }, 3500);
      }
    });
    camera.follow(player, dt);
    try { netSync.updateRemotes(dt); } catch (e) {}
    try {
      if (window.WWNCombatUpdate) WWNCombatUpdate.update(combat, dt, player, aiList.concat(netSync.getRemotes()), loadout, now);
    } catch (e) { console.error("combatupd", e); }
    if (gameMode === "online") {
      try {
        netSync.update(dt, player, loadout, combat);
        if (window.WWNRoom && WWNRoom.ensureMesh && Math.random() < 0.02) WWNRoom.ensureMesh();
      } catch (e) {}
    }
    if (cyberTint > 0) cyberTint = Math.max(0, cyberTint - dt);
    if (els.gadgetHint) {
      try {
        var gid = loadout.gadgetId(), wpn = WWNWeapons[gid], lines = [];
        if (loadout.cd[gid] > 0) lines.push("CD " + loadout.cd[gid].toFixed(1) + "s");
        if (wpn && wpn.ammoMax != null) lines.push("残" + (loadout.ammo[gid] || 0) + "/" + wpn.ammoMax);
        if (loadout.isStealthed(now)) lines.push("STEALTH");
        if (loadout.isEmped(now)) lines.push("EMP!");
        els.gadgetHint.textContent = lines.join(" · ") || "Ready";
      } catch (_) {}
    }
    var C = WWNConfig, halfW = C.WORLD_SIZE / 2;
    var distEdge = Math.min(halfW - Math.abs(player.x), halfW - Math.abs(player.y));
    if (els.borderWarn) {
      if (distEdge < C.BORDER_WARN) {
        els.borderWarn.classList.add("show");
        els.borderWarn.textContent = "境界接近 · あと " + Math.max(0, Math.round(distEdge)) + " m";
      } else els.borderWarn.classList.remove("show");
    }
    if (els.hudHp) els.hudHp.style.width = (player.hp / C.HP_MAX) * 100 + "%";
    if (els.hudHpText) els.hudHpText.textContent = Math.round(player.hp) + " / " + C.HP_MAX;
    if (els.hudBoost) {
      els.hudBoost.style.width = (player.boost / C.BOOST_MAX) * 100 + "%";
      els.hudBoost.classList.toggle("draining", !!player.boosting);
    }
    if (els.hudSpeed) els.hudSpeed.textContent = Math.round(player.speed || 0) + " u/s";
    if (els.hudCoord) els.hudCoord.textContent = Math.round(player.x) + " , " + Math.round(player.y);
    if (els.hudFps && loop) els.hudFps.textContent = loop.fps + " fps";
    if (els.hudHeat) els.hudHeat.style.width = Math.min(100, loadout.heat || 0) + "%";
    if (els.hudEnergy) els.hudEnergy.style.width = Math.min(100, loadout.energy || 0) + "%";
    if (els.hudAmmo) {
      var sid2 = loadout.subId(), am = loadout.ammo[sid2];
      els.hudAmmo.textContent = am != null ? "サブ残弾: " + am : "";
    }
    if (els.hudScore && scoreBoard) els.hudScore.textContent = "PT " + scoreBoard.points;
    if (els.hudCombo && scoreBoard) els.hudCombo.textContent = scoreBoard.combo > 1 ? "COMBO x" + scoreBoard.combo : "";
    try {
      if (minimapCanvas && window.WWNMinimap) {
        WWNMinimap.draw(null, minimapCanvas, player, aiList.concat(netSync.getRemotes()), combat, player.team);
      }
    } catch (e) {}
    WWNInput.endFrame();
  }
  function render() {
    if (!ctx || !camera || !player) return;
    var w = camera.w || window.innerWidth || 800;
    var h = camera.h || window.innerHeight || 600;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a0820"; ctx.fillRect(0, 0, w, h);
    try { if (world) world.draw(ctx, camera); } catch (e) { console.error("world.draw", e); }
    try { if (mapHazards && mapHazards.draw) mapHazards.draw(ctx, camera); } catch (e) { console.error("hazards.draw", e); }
    try { if (combat && window.WWNCombatDraw) WWNCombatDraw.draw(ctx, camera, combat); } catch (e) {}
    for (var i = 0; i < aiList.length; i++) {
      try { if (aiList[i]) aiList[i].draw(ctx, camera); } catch (e) {}
    }
    try {
      var rems = netSync ? netSync.getRemotes() : [];
      for (var j = 0; j < rems.length; j++) {
        if (rems[j]) rems[j].draw(ctx, camera, player.team);
      }
    } catch (e) {}
    try {
      var now = performance.now() / 1000;
      var stl = loadout && loadout.isStealthed ? loadout.isStealthed(now) : false;
      player.draw(ctx, camera, stl);
    } catch (e) {
      console.error("player.draw", e);
      ctx.fillStyle = "#00f5ff";
      ctx.beginPath(); ctx.arc(w / 2, h / 2, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
    }
    try {
      var stick = WWNInput.getStick();
      if (stick && stick.active) {
        ctx.beginPath(); ctx.arc(stick.ox, stick.oy, stick.maxR, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,245,255,0.28)"; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath();
        ctx.arc(stick.ox + stick.dx * stick.maxR, stick.oy + stick.dy * stick.maxR, 18, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,245,255,0.38)"; ctx.fill();
      }
    } catch (e) {}
    if (cyberTint > 0) {
      ctx.fillStyle = "rgba(0,245,255," + (0.08 * Math.min(1, cyberTint)) + ")";
      ctx.fillRect(0, 0, w, h);
    }
    if (scoreBoard && scoreBoard.log) {
      var ly = 80;
      for (var k = 0; k < scoreBoard.log.length; k++) {
        var e = scoreBoard.log[k];
        ctx.globalAlpha = Math.min(1, e.t);
        ctx.fillStyle = "#ffd700"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("+" + e.n, w / 2, ly); ly += 18; ctx.globalAlpha = 1;
      }
    }
  }
  window.WWNGame = {
    start: startGame,
    stop: stopGame,
    isActive: function () { return active; },
  };
})();
