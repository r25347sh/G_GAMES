(function () {
  "use strict";
  var canvas, ctx, loop, player, camera, world, combat, loadout, netSync, minimapCanvas;
  var mapHazards, scoreBoard, supports;
  var active = false;
  var fireMainCd = 0, fireSubCd = 0, fireGadgetCd = 0, secretCd = 0, cyberTint = 0, secretIdx = 0;
  var aiList = [];
  var gameMode = "solo";
  var els = {};
  function $(id) { return document.getElementById(id); }
  function initDom() {
    els.gameLayer = $("game-layer"); els.lobbyWrap = $("lobby-wrap");
    canvas = $("game-canvas"); if (!canvas) return false;
    ctx = canvas.getContext("2d");
    els.hudHp = $("hud-hp"); els.hudHpText = $("hud-hp-text"); els.hudBoost = $("hud-boost");
    els.hudHeat = $("hud-heat"); els.hudEnergy = $("hud-energy");
    els.hudSpeed = $("hud-speed"); els.hudCoord = $("hud-coord"); els.hudScore = $("hud-score");
    els.weaponMain = $("weapon-main"); els.weaponSub = $("weapon-sub"); els.weaponGadget = $("weapon-gadget");
    els.secretSlot = $("secret-slot"); els.killFeed = $("kill-feed");
    els.respawnOverlay = $("respawn-overlay"); els.borderWarn = $("border-warn");
    els.hudFps = $("hud-fps"); els.btnExit = $("btn-exit-game");
    minimapCanvas = $("minimap-canvas");
    if (els.btnExit) els.btnExit.onclick = function () { stopGame(); };
    return true;
  }
  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    if (camera) { camera.w = canvas.width; camera.h = canvas.height; }
  }
  function pushKillFeed(msg) {
    if (!els.killFeed) return;
    var d = document.createElement("div"); d.textContent = msg;
    els.killFeed.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 3200);
  }
  function spawnCpuBots(count, diff, over) {
    var groups = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"];
    var n = Math.max(1, Math.min(60, count || 5));
    for (var i = 0; i < n; i++) {
      try {
        var bot = new WWNAiPilot("cpu-" + (i + 1), diff || "normal", i, groups[i % groups.length]);
        if (over) { bot.openWeak = true; bot.hp *= 0.55; bot.hpMax *= 0.55; }
        aiList.push(bot);
      } catch (e) {}
    }
  }
  function spawnAllyBots(n) {
    var types = ["guardian", "striker", "phantom", "medic", "vanguard"];
    n = Math.min(5, n || 5);
    for (var i = 0; i < n; i++) {
      try {
        var bot = new WWNAiPilot("cpu-ally-" + (aiList.length + 1), "normal", i, "ALLY", types[i % types.length]);
        bot.isAlly = true; bot.group = "ALLY"; bot.team = "BLUE"; bot.roleIndex = i;
        if (player) {
          var a = player.angle + Math.PI + (i - 2) * 0.4, d = 70 + i * 14;
          bot.x = player.x + Math.cos(a) * d; bot.y = player.y + Math.sin(a) * d;
          bot.angle = player.angle;
        }
        aiList.push(bot);
      } catch (e) {}
    }
  }
  function updateWeaponHud() {
    if (!loadout || !window.WWNWeapons) return;
    if (els.weaponMain) els.weaponMain.textContent = (WWNWeapons[loadout.mainId()] || {}).name || loadout.mainId();
    if (els.weaponSub) els.weaponSub.textContent = (WWNWeapons[loadout.subId()] || {}).name || loadout.subId();
    if (els.weaponGadget) els.weaponGadget.textContent = (WWNWeapons[loadout.gadgetId()] || {}).name || loadout.gadgetId();
  }
  function updateSecretHud() {
    if (!els.secretSlot || !window.WWNSecret) return;
    var ul = WWNSecret.getUnlockedList();
    if (!ul.length) { els.secretSlot.textContent = "—"; els.secretSlot.style.opacity = "0.35"; return; }
    if (secretIdx >= ul.length) secretIdx = 0;
    els.secretSlot.textContent = WWNSecret.getMeta(ul[secretIdx]).name;
    els.secretSlot.style.opacity = "1";
  }
  function startGame(options) {
    options = options || {};
    if (!initDom()) { console.error("[WWN] DOM missing"); return; }
    active = true; gameMode = options.mode || "solo"; aiList = [];
    fireMainCd = fireSubCd = fireGadgetCd = secretCd = 0; cyberTint = 0; secretIdx = 0;
    if (els.lobbyWrap) els.lobbyWrap.classList.add("hidden");
    if (els.gameLayer) els.gameLayer.classList.remove("hidden");
    document.body.classList.add("in-game");
    try {
      resize();
      player = new WWNPlayer(0, 0);
      camera = new WWNCamera();
      world = new WWNWorld();
      combat = new WWNCombat();
      loadout = new WWNWeaponLoadout();
      try { mapHazards = new WWNMapHazards(); } catch (e) { mapHazards = null; }
      scoreBoard = window.WWNScoreBoard ? new WWNScoreBoard() : null;
      supports = window.WWNSupportSystem ? new WWNSupportSystem() : null;
      netSync = new WWNNetSync();
      player.alive = true;
      player.hp = WWNConfig.HP_MAX;
      player.boost = WWNConfig.BOOST_MAX;
      player.team = (options.team && options.team !== "NONE") ? options.team : "BLUE";
      player.netId = options.netId || ("local-" + Math.random().toString(36).slice(2, 8));
      player.username = options.username || player.username || "Pilot";
      try {
        window.__wwnNetSync = netSync;
        netSync.setLocalId(player.netId);
        netSync.bind();
        netSync.onCombatEvent = function (ev) {
          try { if (combat && combat.ingestRemoteEvent) combat.ingestRemoteEvent(ev); } catch (e2) {}
        };
        if (window.WWNPeer && typeof WWNPeer.isMaster === "function") netSync.setHost(!!WWNPeer.isMaster());
        else netSync.setHost(!!options.isOwner || options.mode === "solo" || options.mode === "cpu" || options.mode === "over");
      } catch (e) { console.warn("[WWN] net", e); }
      camera.x = player.x; camera.y = player.y;
      resize();
      WWNInput.bind(canvas);
      if (options.mode === "cpu" || options.cpuCount) {
        var diff = options.diff || options.difficulty || "normal";
        if (options.over || options.mode === "over") {
          spawnCpuBots(Math.max(40, Math.min(60, options.cpuCount || 48)), diff, true);
        } else {
          spawnCpuBots(options.cpuCount || 5, diff, false);
        }
      } else if (options.mode === "solo") {
        spawnCpuBots(7, "easy", false);
      } else if (options.mode === "online" || options.mode === "open") {
        spawnCpuBots(12, "easy", true);
      }
      loop = new WWNGameLoop(update, render);
      loop.start();
      updateWeaponHud(); updateSecretHud();
      window.__wwnPlayer = player; window.__wwnCombat = combat; window.__wwnAiList = aiList;
      window.__wwnNetSync = netSync; window.__wwnLoadout = loadout; window.__wwnCamera = camera;
      window.__wwnRemotes = netSync && netSync.getRemotes ? netSync.getRemotes() : [];
      console.log("[WWN] start ok bots=" + aiList.length);
    } catch (e) {
      console.error("[WWN] start failed", e);
      stopGame();
    }
  }
  function stopGame() {
    active = false;
    try { if (loop) loop.stop(); } catch (e) {}
    try { WWNInput.unbind(); } catch (e) {}
    try { if (netSync && netSync.unbind) netSync.unbind(); } catch (e) {}
    aiList = [];
    if (supports) try { supports.clear(); } catch (e) {}
    if (els.gameLayer) els.gameLayer.classList.add("hidden");
    if (els.lobbyWrap) els.lobbyWrap.classList.remove("hidden");
    document.body.classList.remove("in-game");
  }
  function update(dt) {
    if (!active || !player) return;
    var now = performance.now() / 1000;
    try {
      fireMainCd = Math.max(0, fireMainCd - dt);
      fireSubCd = Math.max(0, fireSubCd - dt);
      fireGadgetCd = Math.max(0, fireGadgetCd - dt);
      secretCd = Math.max(0, secretCd - dt);
      if (cyberTint > 0) cyberTint = Math.max(0, cyberTint - dt);
      if (WWNInput.consumeCycleSecret && WWNInput.consumeCycleSecret()) {
        secretIdx++; updateSecretHud();
      }
      var flight = WWNInput.getFlight();
      var boost = WWNInput.isBoost();
      if (player.alive) player.update(dt, flight, boost);
      if (WWNInput.consumeCycleMain()) { loadout.cycleMain(); updateWeaponHud(); }
      if (WWNInput.consumeCycleSub()) { loadout.cycleSub(); updateWeaponHud(); }
      if (WWNInput.consumeCycleGadget()) { loadout.cycleGadget(); updateWeaponHud(); }
      if (player.alive) {
        if (WWNInput.consumeFireMain() && fireMainCd <= 0) {
          combat.fireMain(player, loadout, now); fireMainCd = 0.05;
        }
        if (WWNInput.consumeFireSub() && fireSubCd <= 0) {
          combat.fireSub(player, loadout, now, aiList.concat(netSync ? netSync.getRemotes() : [])); fireSubCd = 0.2;
        }
        if (WWNInput.consumeFireGadget() && fireGadgetCd <= 0) {
          combat.useGadget(player, loadout, now); fireGadgetCd = 0.25;
        }
        if (WWNInput.consumeFireSecret && WWNInput.consumeFireSecret() && secretCd <= 0 && window.WWNSecret) {
          var ul = WWNSecret.getUnlockedList();
          if (ul.length) {
            if (secretIdx >= ul.length) secretIdx = 0;
            var id = ul[secretIdx];
            var api = {
              spawnAlly: function (n) { spawnAllyBots(n || 5); },
              spawnDrones: function (n) { if (supports && supports.spawnDrones) supports.spawnDrones(player, n); },
              spawnTurret: function () { if (supports && supports.spawnTurret) supports.spawnTurret(player); },
              spawnLeech: function () { if (supports && supports.spawnLeech) supports.spawnLeech(player); },
              spawnShield: function (n) { if (supports && supports.spawnShield) supports.spawnShield(player, n); },
              hiveConvert: function () { if (supports && supports.hiveConvert) supports.hiveConvert(player, aiList); },
              spawnTether: function () { if (supports && supports.spawnTether) supports.spawnTether(player); },
              spawnRepairBot: function () { if (supports && supports.spawnRepairBot) supports.spawnRepairBot(player); },
              spawnKamikaze: function () { if (supports && supports.spawnKamikaze) supports.spawnKamikaze(player); },
              spawnSatellite: function () { if (supports && supports.spawnSatellite) supports.spawnSatellite(player); },
              spawnMineRing: function () { if (supports && supports.spawnMineRing) supports.spawnMineRing(player, combat); },
              spawnClone: function () { if (supports && supports.spawnClone) supports.spawnClone(player); },
              spawnDome: function (n) { if (supports && supports.spawnDome) supports.spawnDome(player, n); },
              spawnFreezer: function () { if (supports && supports.spawnFreezer) supports.spawnFreezer(player); },
              novaDamage: function (pl, r, d) {
                aiList.forEach(function (t) {
                  if (!t || !t.alive || t.isAlly) return;
                  if (Math.hypot(t.x - pl.x, t.y - pl.y) < r) t.hp = Math.max(0, t.hp - d);
                });
              },
              damageRay: function (x, y, ang, range, width, dmg) {
                aiList.forEach(function (t) {
                  if (!t || !t.alive || t.isAlly) return;
                  var dx = t.x - x, dy = t.y - y;
                  var proj = dx * Math.cos(ang) + dy * Math.sin(ang);
                  if (proj < 0 || proj > range) return;
                  var perp = Math.abs(-dx * Math.sin(ang) + dy * Math.cos(ang));
                  if (perp < width + (t.radius || 18)) t.hp = Math.max(0, t.hp - dmg);
                });
              },
              refill: function () { if (loadout && loadout.refillAmmo) loadout.refillAmmo(); }
            };
            WWNSecret.applyEffect(id, player, combat, api);
            secretCd = 1.2;
          }
        }
      }
      if (loadout && loadout.update) loadout.update(dt, now);
      try {
        if (netSync) {
          if (window.WWNPeer && WWNPeer.isMaster) netSync.setHost(!!WWNPeer.isMaster());
          netSync.tick(dt, player, loadout, combat);
          netSync.updateRemotes(dt);
          window.__wwnRemotes = netSync.getRemotes();
        }
      } catch (e) {}
      if (player && loadout) {
        player.chaffUntil = loadout.chaffUntil || 0;
        player.stealthed = loadout.isStealthed ? loadout.isStealthed(now) : false;
        if (!player.team || player.team === "NONE") player.team = "BLUE";
      }
      var allEntities = aiList.concat(netSync ? netSync.getRemotes() : []);
      for (var i = 0; i < aiList.length; i++) {
        try { aiList[i].update(dt, player, combat, now, allEntities); } catch (e) {}
      }
      for (var ri = 0; ri < aiList.length; ri++) {
        var bot = aiList[ri];
        if (!bot) continue;
        if (bot.alive && (bot.hp || 0) <= 0) {
          bot.alive = false;
          bot.respawnTimer = (WWNConfig.RESPAWN_SEC || 3.2) * (bot.isAlly ? 0.55 : 1.1);
        }
        if (!bot.alive) {
          bot.respawnTimer = (bot.respawnTimer || 0) - dt;
          if (bot.respawnTimer <= 0) {
            bot.alive = true;
            bot.hp = bot.hpMax || WWNConfig.HP_MAX * 0.75;
            var half = (WWNConfig.WORLD_SIZE || 9000) * 0.38;
            if (bot.isAlly && player) {
              var ang = Math.random() * Math.PI * 2;
              bot.x = player.x + Math.cos(ang) * 120;
              bot.y = player.y + Math.sin(ang) * 120;
            } else {
              bot.x = (Math.random() - 0.5) * half * 2;
              bot.y = (Math.random() - 0.5) * half * 2;
            }
            bot.vx = 0; bot.vy = 0;
          }
        }
      }
      try {
        if (mapHazards) mapHazards.update(dt, player, combat, {
          add: function (n, k) { if (scoreBoard && scoreBoard.add) scoreBoard.add(n, k); },
          refillAmmo: function () { if (loadout && loadout.refillAmmo) loadout.refillAmmo(); }
        });
      } catch (e) {}
      try { if (supports) supports.update(dt, player, combat, allEntities); } catch (e) {}
      if (scoreBoard) scoreBoard.update(dt);
      try { if (window.WWNCombatUpdate) WWNCombatUpdate.update(combat, dt, player, allEntities, loadout, now); } catch (e) {}
      if (player.alive && player.hp <= 0) {
        player.kill();
        pushKillFeed("撃破された…");
        if (els.respawnOverlay) els.respawnOverlay.classList.remove("hidden");
      }
      if (player && !player.alive) {
        if (els.respawnOverlay) {
          els.respawnOverlay.classList.remove("hidden");
          els.respawnOverlay.textContent = (player.respawnTimer > 0.05)
            ? ("再出撃… " + player.respawnTimer.toFixed(1) + "s") : "再出撃中";
        }
        if ((player.respawnTimer || 0) <= 0 && player.tryRespawn && player.tryRespawn()) {
          if (loadout && loadout.refillAmmo) loadout.refillAmmo();
          if (els.respawnOverlay) els.respawnOverlay.classList.add("hidden");
        }
      } else if (els.respawnOverlay) {
        els.respawnOverlay.classList.add("hidden");
      }
      if (camera && player.alive) camera.follow(player, dt);
      else if (camera && player) { camera.x = player.x; camera.y = player.y; }
    } catch (e) { console.error("[WWN update]", e); }
    try { updateHud(); } catch (e) {}
  }
  function updateHud() {
    if (!player || !loadout) return;
    var hpPct = Math.max(0, player.hp / WWNConfig.HP_MAX);
    if (els.hudHp) els.hudHp.style.width = (hpPct * 100) + "%";
    if (els.hudHpText) els.hudHpText.textContent = Math.round(player.hp) + " / " + WWNConfig.HP_MAX;
    if (els.hudBoost) els.hudBoost.style.width = (Math.max(0, player.boost / WWNConfig.BOOST_MAX) * 100) + "%";
    if (els.hudHeat) els.hudHeat.style.width = Math.min(100, (loadout.heat || 0)) + "%";
    if (els.hudEnergy) els.hudEnergy.style.width = Math.min(100, (loadout.energy || 0)) + "%";
    if (els.hudSpeed) els.hudSpeed.textContent = Math.round(player.speed || 0) + " u/s";
    if (els.hudCoord) els.hudCoord.textContent = Math.round(player.x) + ", " + Math.round(player.y);
    if (els.hudScore && scoreBoard) els.hudScore.textContent = "PT " + (scoreBoard.points || 0);
    if (els.hudFps && loop) els.hudFps.textContent = Math.round(loop.fps || 0) + " fps";
    updateSecretHud();
  }
  function render() {
    if (!ctx || !canvas) return;
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    try { if (world) world.draw(ctx, camera); } catch (e) {}
    try { if (mapHazards && mapHazards.draw) mapHazards.draw(ctx, camera); } catch (e) {}
    try { if (supports) supports.draw(ctx, camera, player); } catch (e) {}
    try { if (window.WWNCombatDraw) WWNCombatDraw.draw(ctx, camera, combat); } catch (e) {}
    for (var i = 0; i < aiList.length; i++) {
      try { if (aiList[i] && aiList[i].alive) aiList[i].draw(ctx, camera); } catch (e) {}
    }
    try {
      if (netSync) {
        var rems = netSync.getRemotes();
        for (var ri = 0; ri < rems.length; ri++) {
          try { if (rems[ri]) rems[ri].draw(ctx, camera, player && player.team); } catch (e) {}
        }
      }
    } catch (e) {}
    try {
      var now = performance.now() / 1000;
      var stl = loadout && loadout.isStealthed ? loadout.isStealthed(now) : false;
      if (player) player.draw(ctx, camera, stl);
    } catch (e) {
      if (player && camera) {
        var px = player.x - camera.x + w / 2, py = player.y - camera.y + h / 2;
        ctx.fillStyle = "#00f5ff"; ctx.beginPath(); ctx.arc(px, py, 14, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (cyberTint > 0) {
      ctx.fillStyle = "rgba(0,245,255," + (0.08 * Math.min(1, cyberTint)) + ")";
      ctx.fillRect(0, 0, w, h);
    }
    try {
      if (minimapCanvas && window.WWNMinimap) WWNMinimap.draw(minimapCanvas, player, aiList, netSync ? netSync.getRemotes() : [], world);
    } catch (e) {}
  }
  window.addEventListener("resize", resize);
  window.WWNGame = {
    start: startGame,
    stop: stopGame,
    isActive: function () { return active; }
  };
})();
