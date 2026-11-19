(function () {
  "use strict";
  var canvas, ctx, loop, player, camera, world, combat, loadout, netSync, minimapCanvas;
  var mapHazards, scoreBoard;
  var active = false, fireMainCd = 0, fireSubCd = 0, fireGadgetCd = 0, cyberTint = 0;
  var aiList = [], gameMode = "solo", els = {};
  function $(id) { return document.getElementById(id); }
  function initDom() {
    els.gameLayer = $("game-layer"); canvas = $("game-canvas"); minimapCanvas = $("minimap-canvas");
    els.hudHp = $("hud-hp"); els.hudBoost = $("hud-boost"); els.hudSpeed = $("hud-speed");
    els.hudCoord = $("hud-coord"); els.hudFps = $("hud-fps"); els.btnExit = $("btn-exit-game");
    els.borderWarn = $("border-warn"); els.weaponMain = $("weapon-main"); els.weaponSub = $("weapon-sub");
    els.weaponGadget = $("weapon-gadget"); els.hudHeat = $("hud-heat"); els.hudEnergy = $("hud-energy");
    els.hudAmmo = $("hud-ammo"); els.respawnOverlay = $("respawn-overlay"); els.killFeed = $("kill-feed");
    els.gadgetHint = $("gadget-hint"); els.hudScore = $("hud-score"); els.hudCombo = $("hud-combo");
    if (!canvas) return false;
    ctx = canvas.getContext("2d");
    if (minimapCanvas) { minimapCanvas.width = 120; minimapCanvas.height = 120; }
    return true;
  }
  function resize() {
    if (!canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (camera) camera.resize(w, h);
  }
  function roomState() { return window.WWNRoom && WWNRoom.getState && WWNRoom.getState(); }
  function spawnFillerBots(count, diff) {
    for (var i = 0; i < count; i++) {
      var bot = new WWNAiPilot("cpu-auto-" + (aiList.length + 1), diff || "easy");
      bot.team = "RED"; aiList.push(bot);
    }
  }
  function startGame(options) {
    options = options || {};
    if (!initDom() || active) return;
    active = true; gameMode = options.mode || "solo"; aiList = [];
    els.gameLayer.classList.remove("hidden"); document.body.classList.add("in-game");
    if (els.respawnOverlay) els.respawnOverlay.classList.add("hidden");
    player = new WWNPlayer(0, 0); player.team = "BLUE";
    player.netId = "local-" + Math.random().toString(36).slice(2, 8);
    var st = roomState();
    if (st && gameMode === "online") {
      player.netId = st.peerId || player.netId;
      player.username = st.username || "You";
      player.team = st.team && st.team !== "NONE" ? st.team : "BLUE";
    }
    camera = new WWNCamera(); world = new WWNWorld(); combat = new WWNCombat();
    loadout = new WWNWeaponLoadout(); mapHazards = new WWNMapHazards();
    scoreBoard = new WWNScoreBoard(); netSync = new WWNNetSync();
    netSync.setLocalId(player.netId);
    netSync.onCombatEvent = function (ev) {
      if (combat) combat.ingestRemoteEvent(ev);
      if (ev.t === "emp" && ev.ownerId !== player.netId) {
        var d = Math.hypot(player.x - ev.x, player.y - ev.y);
        if (d < (ev.aoe || 280) && !WWNCombatUpdate.friendly(ev.team, player.team)) {
          loadout.empUntil = performance.now() / 1000 + (ev.duration || 3.5);
          player.hp = Math.max(0, player.hp - (ev.dmg || 8));
        }
      }
    };
    if (gameMode === "online") netSync.bind();
    if (gameMode === "cpu") {
      var n = Math.max(1, Math.min(8, options.cpuCount || 1));
      var diff = options.difficulty || "normal";
      for (var i = 0; i < n; i++) aiList.push(new WWNAiPilot("cpu-" + (i + 1), diff));
    } else {
      spawnFillerBots(2, "easy");
    }
    resize(); WWNInput.bind(canvas);
    try { canvas.focus(); } catch (_) {}
    window.focus();
    loop = new WWNGameLoop(update, render); loop.start();
    if (els.btnExit) els.btnExit.onclick = stopGame;
    window.addEventListener("resize", resize); updateWeaponHud();
  }
  function stopGame() {
    active = false; if (loop) loop.stop(); WWNInput.unbind();
    window.removeEventListener("resize", resize);
    if (els.gameLayer) els.gameLayer.classList.add("hidden");
    document.body.classList.remove("in-game"); aiList = [];
  }
  function updateWeaponHud() {
    if (!loadout) return;
    var W = WWNWeapons;
    if (els.weaponMain) els.weaponMain.textContent = W[loadout.mainId()].name;
    if (els.weaponSub) els.weaponSub.textContent = W[loadout.subId()].name;
    if (els.weaponGadget) els.weaponGadget.textContent = W[loadout.gadgetId()].name;
  }
  function pushKillFeed(text) {
    if (!els.killFeed) return;
    var div = document.createElement("div"); div.className = "kill-line"; div.textContent = text;
    els.killFeed.appendChild(div);
    setTimeout(function () { div.remove(); }, 4000);
    while (els.killFeed.children.length > 5) els.killFeed.firstChild.remove();
  }
  function scoreApi() {
    return { add: function (n, r) { return scoreBoard.add(n, r); }, refillAmmo: function () { loadout.refillAmmo(); } };
  }
  function update(dt) {
    var now = performance.now() / 1000;
    var flight = WWNInput.getFlight();
    var boost = WWNInput.isBoost();
    var empBlocked = loadout.isEmped(now);
    if (WWNInput.consumeCycleMain()) { loadout.cycleMain(); updateWeaponHud(); }
    if (WWNInput.consumeCycleSub()) { loadout.cycleSub(); updateWeaponHud(); }
    if (WWNInput.consumeCycleGadget()) { loadout.cycleGadget(); updateWeaponHud(); }
    if (WWNSecret) {
      WWNSecret.tryResolve().then(function (effect) {
        if (effect && player.alive) { WWNSecret.applyEffect(effect, player, combat); cyberTint = 2.2; scoreBoard.add(25, "secret"); }
      });
    }
    fireMainCd = Math.max(0, fireMainCd - dt);
    fireSubCd = Math.max(0, fireSubCd - dt);
    fireGadgetCd = Math.max(0, fireGadgetCd - dt);
    loadout.update(dt);
    if (player.alive) {
      var mainW = WWNWeapons[loadout.mainId()];
      if (WWNInput.consumeFireMain() && fireMainCd <= 0) {
        if (combat.fireMain(player, loadout, now)) {
          fireMainCd = 1 / (mainW.rate || 5);
          if (loadout.mainId() === "vulcan") scoreBoard.add(1, "shot");
        }
      }
      if (WWNInput.consumeFireSub() && fireSubCd <= 0) {
        combat.fireSub(player, loadout, now, aiList.concat(netSync.getRemotes())); fireSubCd = 0.2;
      }
      if (WWNInput.consumeFireGadget() && fireGadgetCd <= 0) {
        combat.useGadget(player, loadout, now); fireGadgetCd = 0.25;
      }
    }
    // Always drive local ship from local input only
    player.update(dt, flight, boost, empBlocked);
    for (var i = 0; i < aiList.length; i++) aiList[i].update(dt, player, combat, now);
    mapHazards.update(dt, player, combat, scoreApi());
    scoreBoard.update(dt);
    if (player.alive && player.hp <= 0) {
      player.kill(); combat.spawnParticle(player.x, player.y, "#ff2d95", 30, 200); camera.shake = 10;
      pushKillFeed("撃破された"); if (els.respawnOverlay) els.respawnOverlay.classList.remove("hidden");
    }
    if (!player.alive) {
      if (els.respawnOverlay) els.respawnOverlay.textContent = "リスポーンまで " + Math.max(0, player.respawnTimer).toFixed(1) + "s";
      if (player.tryRespawn() && els.respawnOverlay) els.respawnOverlay.classList.add("hidden");
    }
    aiList.forEach(function (bot) {
      if (bot.alive && bot.hp <= 0) {
        bot.alive = false; combat.spawnParticle(bot.x, bot.y, "#ff2d95", 24, 180);
        camera.shake = Math.max(camera.shake, 5); pushKillFeed(bot.username + " 撃墜 +100"); scoreBoard.onKill();
        setTimeout(function () {
          if (!active) return;
          bot.alive = true; bot.hp = WWNConfig.HP_MAX;
          var half = WWNConfig.WORLD_SIZE * 0.4;
          bot.x = (Math.random() - 0.5) * half; bot.y = (Math.random() - 0.5) * half;
        }, 3500);
      }
    });
    camera.follow(player, dt); netSync.updateRemotes(dt);
    WWNCombatUpdate.update(combat, dt, player, aiList.concat(netSync.getRemotes()), loadout, now);
    if (gameMode === "online") netSync.update(dt, player, loadout, combat);
    if (cyberTint > 0) cyberTint = Math.max(0, cyberTint - dt);
    if (els.gadgetHint) {
      var gid = loadout.gadgetId(), w = WWNWeapons[gid], lines = [];
      if (loadout.cd[gid] > 0) lines.push("CD " + loadout.cd[gid].toFixed(1) + "s");
      if (w.ammoMax != null) lines.push("残" + (loadout.ammo[gid] || 0) + "/" + w.ammoMax);
      if (loadout.isStealthed(now)) lines.push("STEALTH");
      if (loadout.isEmped(now)) lines.push("EMP!");
      els.gadgetHint.textContent = lines.join(" · ") || "Ready";
    }
    var C = WWNConfig, half = C.WORLD_SIZE / 2;
    var distEdge = Math.min(half - Math.abs(player.x), half - Math.abs(player.y));
    if (els.borderWarn) {
      if (distEdge < C.BORDER_WARN) {
        els.borderWarn.classList.add("show");
        els.borderWarn.textContent = "境界接近 · あと " + Math.max(0, Math.round(distEdge)) + " m";
      } else els.borderWarn.classList.remove("show");
    }
    if (els.hudHp) els.hudHp.style.width = (player.hp / C.HP_MAX) * 100 + "%";
    if (els.hudBoost) { els.hudBoost.style.width = (player.boost / C.BOOST_MAX) * 100 + "%"; els.hudBoost.classList.toggle("draining", player.boosting); }
    if (els.hudSpeed) els.hudSpeed.textContent = Math.round(player.speed) + " u/s";
    if (els.hudCoord) els.hudCoord.textContent = Math.round(player.x) + " , " + Math.round(player.y);
    if (els.hudFps && loop) els.hudFps.textContent = loop.fps + " fps";
    if (els.hudHeat) els.hudHeat.style.width = Math.min(100, loadout.heat) + "%";
    if (els.hudEnergy) els.hudEnergy.style.width = Math.min(100, loadout.energy) + "%";
    if (els.hudAmmo) {
      var sid = loadout.subId(), am = loadout.ammo[sid];
      els.hudAmmo.textContent = am != null ? "サブ残弾: " + am : "";
    }
    if (els.hudScore) els.hudScore.textContent = "PT " + scoreBoard.points;
    if (els.hudCombo) els.hudCombo.textContent = scoreBoard.combo > 1 ? "COMBO x" + scoreBoard.combo : "";
    if (minimapCanvas) WWNMinimap.draw(null, minimapCanvas, player, aiList.concat(netSync.getRemotes()), combat, player.team);
    WWNInput.endFrame();
  }
  function render() {
    var w = camera.w, h = camera.h;
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(camera.zoom, camera.zoom); ctx.translate(-w / 2, -h / 2);
    camera.applyShake(ctx); world.draw(ctx, camera); mapHazards.draw(ctx, camera);
    WWNCombatDraw.draw(ctx, camera, combat);
    aiList.forEach(function (bot) { bot.draw(ctx, camera); });
    netSync.getRemotes().forEach(function (r) { r.draw(ctx, camera, player.team); });
    var now = performance.now() / 1000;
    player.draw(ctx, camera, loadout.isStealthed(now));
    var stick = WWNInput.getStick();
    if (stick.active) {
      ctx.beginPath(); ctx.arc(stick.ox, stick.oy, stick.maxR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,245,255,0.28)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(stick.ox + stick.dx * stick.maxR, stick.oy + stick.dy * stick.maxR, 18, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,245,255,0.38)"; ctx.fill();
    }
    if (cyberTint > 0) {
      ctx.fillStyle = "rgba(0,245,255," + (0.08 * Math.min(1, cyberTint)) + ")";
      ctx.fillRect(camera.x - w, camera.y - h, w * 3, h * 3);
    }
    var ly = 80;
    scoreBoard.log.forEach(function (e) {
      ctx.globalAlpha = Math.min(1, e.t);
      ctx.fillStyle = "#ffd700"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("+" + e.n, w / 2, ly); ly += 18; ctx.globalAlpha = 1;
    });
    ctx.restore();
  }
  window.WWNGame = { start: startGame, stop: stopGame, isActive: function () { return active; } };
})();
