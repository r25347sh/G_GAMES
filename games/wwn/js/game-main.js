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
    var groups = ["G1","G2","G3","G4","G5","G6","G7","G8","G9","G10","G11","G12"], idx = 0;
    for (var g = 0; g < groups.length; g++) {
      for (var n = 0; n < 5; n++) {
        try {
          var bot = new WWNAiPilot("cpu-auto-" + (++idx), "easy", idx, groups[g % 7]);
          bot.openWeak = true;
          bot.hp = Math.max(25, (bot.hp || 40) * 0.5);
          aiList.push(bot);
        } catch (e) { console.error("spawn bot", e); }
      }
    }
  }
  function spawnAllyBots(count) {
    var types = ["guardian", "striker", "phantom"];
    count = Math.max(1, Math.min(3, count || 3));
    for (var i = 0; i < count; i++) {
      try {
        var bot = new WWNAiPilot("cpu-ally-" + (aiList.length + 1), "normal", i, "ALLY", types[i % 3]);
        bot.team = player ? player.team : "BLUE";
        bot.group = "ALLY"; bot.isAlly = true; bot.openWeak = false;
        if (player) {
          var ang = player.angle + Math.PI + (i - 1) * 0.5;
          bot.x = player.x + Math.cos(ang) * (55 + i * 28);
          bot.y = player.y + Math.sin(ang) * (55 + i * 28);
          bot.angle = player.angle;
        }
        aiList.push(bot);
      } catch (e) { console.error(e); }
    }
  }
  function pushKillFeed(msg) {
    if (!els.killFeed) return;
    var d = document.createElement("div"); d.textContent = msg;
    els.killFeed.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 3200);
  }
  function updateWeaponHud() {
    if (!loadout) return;
    if (els.weaponMain && window.WWNWeapons) els.weaponMain.textContent = (WWNWeapons[loadout.mainId()] || {}).name || loadout.mainId();
    if (els.weaponSub && window.WWNWeapons) els.weaponSub.textContent = (WWNWeapons[loadout.subId()] || {}).name || loadout.subId();
    if (els.weaponGadget && window.WWNWeapons) els.weaponGadget.textContent = (WWNWeapons[loadout.gadgetId()] || {}).name || loadout.gadgetId();
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
    if (!initDom()) return;
    active = true; gameMode = options.mode || "solo"; aiList = [];
    fireMainCd = fireSubCd = fireGadgetCd = secretCd = 0; cyberTint = 0; secretIdx = 0;
    if (els.lobbyWrap) els.lobbyWrap.classList.add("hidden");
    if (els.gameLayer) els.gameLayer.classList.remove("hidden");
    document.body.classList.add("in-game");
    resize();
    player = new WWNPlayer(0, 0);
    camera = new WWNCamera();
    world = new WWNWorld();
    combat = new WWNCombat();
    loadout = new WWNWeaponLoadout();
    try { mapHazards = new WWNMapHazards(); } catch (e) { mapHazards = null; }
    scoreBoard = new WWNScoreBoard();
    supports = window.WWNSupportSystem ? new WWNSupportSystem() : null;
    netSync = new WWNNetSync();
    player.alive = true; player.hp = WWNConfig.HP_MAX; player.boost = WWNConfig.BOOST_MAX;
    player.team = options.team || "BLUE";
    player.netId = options.netId || ("local-" + Math.random().toString(36).slice(2, 8));
    camera.snap(player.x, player.y);
    resize(); WWNInput.bind(canvas);
    if (options.mode === "cpu" || options.cpuCount) {
      var diff = options.diff || "normal";
      if (options.over) {
        var overN = Math.max(40, Math.min(60, options.cpuCount || 48));
        for (var oi = 0; oi < overN; oi++) {
          try {
            var ob = new WWNAiPilot("cpu-over-" + (oi + 1), "easy", oi, "G" + ((oi % 7) + 1));
            ob.openWeak = true; ob.hp *= 0.55; aiList.push(ob);
          } catch (e) {}
        }
      } else {
        var n = Math.max(1, Math.min(60, options.cpuCount || 12));
        var groups = ["G1","G2","G3","G4","G5","G6","G7"];
        for (var i = 0; i < n; i++) {
          try { aiList.push(new WWNAiPilot("cpu-" + (i + 1), diff, i, groups[i % groups.length])); } catch (e) {}
        }
      }
    } else spawnFillerBots();
    if (loop) try { loop.stop(); } catch (_) {}
    loop = new WWNGameLoop(update, render); loop.start();
    window.addEventListener("resize", resize);
    if (els.btnExit) els.btnExit.onclick = function () { stopGame(); };
  }
  function stopGame() {
    active = false;
    if (loop) try { loop.stop(); } catch (_) {}
    try { WWNInput.unbind(); } catch (_) {}
    document.body.classList.remove("in-game");
    aiList = []; if (supports) { try { supports.clear(); } catch (e) {} }
    if (els.gameLayer) els.gameLayer.classList.add("hidden");
    if (els.lobbyWrap) els.lobbyWrap.classList.remove("hidden");
  }
  function update(dt) {
    if (!active || !player) return;
    window.__wwnPlayer = player; window.__wwnCombat = combat; window.__wwnAiList = aiList;
    window.__wwnRemotes = netSync && netSync.getRemotes ? netSync.getRemotes() : [];
    window.__wwnCamera = camera; window.__wwnLoadout = loadout;
    fireMainCd = Math.max(0, fireMainCd - dt);
    fireSubCd = Math.max(0, fireSubCd - dt);
    fireGadgetCd = Math.max(0, fireGadgetCd - dt);
    secretCd = Math.max(0, secretCd - dt);
    cyberTint = Math.max(0, cyberTint - dt);
    var now = performance.now() / 1000;
    if (window.WWNSecret) {
      WWNSecret.tryResolve().then(function (effect) {
        if (effect) { updateSecretHud(); pushKillFeed("解放: " + (WWNSecret.getMeta(effect).name || effect)); }
      });
    }
    if (WWNInput.consumeCycleSecret && WWNInput.consumeCycleSecret()) {
      var ul0 = window.WWNSecret ? WWNSecret.getUnlockedList() : [];
      if (ul0.length) { secretIdx = (secretIdx + 1) % ul0.length; updateSecretHud(); }
    }
    var flight = WWNInput.getFlight();
    var boost = WWNInput.isBoost();
    var empBlocked = loadout.isEmped ? loadout.isEmped(now) : false;
    if (WWNInput.consumeCycleMain()) { loadout.cycleMain(); updateWeaponHud(); }
    if (WWNInput.consumeCycleSub()) { loadout.cycleSub(); updateWeaponHud(); }
    if (WWNInput.consumeCycleGadget()) { loadout.cycleGadget(); updateWeaponHud(); }
    loadout.update(dt);
    if (player.alive && !empBlocked) {
      if (WWNInput.consumeFireMain() && fireMainCd <= 0) {
        combat.fireMain(player, loadout, now); fireMainCd = 0.05;
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
          if (!supports && window.WWNSupportSystem) supports = new WWNSupportSystem();
          var enemiesNow = aiList.concat(netSync.getRemotes());
          var api = {
            spawnAlly: function (n) { spawnAllyBots(n); },
            spawnDrones: function (n) { if (supports) supports.spawnDrones(player, n || 6); },
            spawnTurret: function () { if (supports) supports.spawnTurret(player); },
            spawnLeech: function () { if (supports) supports.spawnLeech(player, enemiesNow); },
            spawnShield: function (sec) { if (supports) supports.spawnShield(player, sec || 6); },
            spawnTether: function () { if (supports) supports.spawnTether(player, enemiesNow); },
            hiveConvert: function () { if (supports) supports.hiveConvert(player, enemiesNow); },
            spawnRepairBot: function () { if (supports) supports.spawnRepairBot(player); },
            spawnKamikaze: function () { if (supports) supports.spawnKamikaze(player, enemiesNow); },
            spawnSatellite: function () { if (supports) supports.spawnSatellite(player); },
            spawnMineRing: function () { if (supports) supports.spawnMineRing(player); },
            spawnClone: function () { if (supports) supports.spawnClone(player); },
            spawnDome: function (sec) { if (supports) supports.spawnDome(player, sec || 7); },
            spawnFreezer: function () { if (supports) supports.spawnFreezer(player); },
            spawnBattery: function () { if (supports) supports.spawnBattery(player); },
            refill: function () { if (loadout && loadout.refillAmmo) loadout.refillAmmo(); },
            globalChaff: function (sec) { player.chaffUntil = performance.now() / 1000 + (sec || 5); },
            damageRay: function (x, y, ang, range, dmg, width) {
              enemiesNow.forEach(function (t) {
                if (!t || !t.alive || t.isAlly) return;
                var x2 = x + Math.cos(ang) * range, y2 = y + Math.sin(ang) * range;
                var dx = x2 - x, dy = y2 - y, len2 = dx * dx + dy * dy || 1;
                var tpar = Math.max(0, Math.min(1, ((t.x - x) * dx + (t.y - y) * dy) / len2));
                var px = x + dx * tpar, py = y + dy * tpar;
                if (Math.hypot(t.x - px, t.y - py) < (width || 30) + (t.radius || 18))
                  t.hp = Math.max(0, (t.hp || 0) - dmg);
              });
            },
            novaDamage: function (pl, aoe, dmg) {
              enemiesNow.forEach(function (t) {
                if (!t || !t.alive || t.isAlly) return;
                var d = Math.hypot(t.x - pl.x, t.y - pl.y);
                if (d < aoe) t.hp = Math.max(0, (t.hp || 0) - dmg * (1 - d / aoe * 0.5));
              });
            },
            getEnemies: function () { return enemiesNow.filter(function (e) { return e && e.alive && !e.isAlly; }); },
          };
          var ok = false;
          try { ok = !!WWNSecret.applyEffect(sid, player, combat, api); } catch (err) { console.error(err); }
          if (ok) {
            secretCd = 2.5; cyberTint = 1.5;
            pushKillFeed("特殊: " + (WWNSecret.getMeta(sid).name || sid));
          } else {
            pushKillFeed("特殊失敗: " + sid);
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
    try { if (mapHazards) mapHazards.update(dt, player, combat); } catch (e) {}
    try { if (supports) supports.update(dt, player, combat, aiList.concat(netSync.getRemotes())); } catch (e) { console.error("supports", e); }
    if (scoreBoard) scoreBoard.update(dt);
    try { if (window.WWNCombatUpdate) WWNCombatUpdate.update(combat, dt, player, allEntities, loadout, now); } catch (e) {}
    if (player.alive && player.hp <= 0) { player.kill(); pushKillFeed("撃破された…"); }
    camera.follow(player, dt);
    updateHud();
  }
  function updateHud() {
    if (!player || !loadout) return;
    var hpPct = Math.max(0, player.hp / WWNConfig.HP_MAX);
    if (els.hudHp) els.hudHp.style.width = (hpPct * 100) + "%";
    if (els.hudHpText) els.hudHpText.textContent = Math.round(player.hp) + " / " + WWNConfig.HP_MAX;
    if (els.hudBoost) els.hudBoost.style.width = (Math.max(0, player.boost / WWNConfig.BOOST_MAX) * 100) + "%";
    if (els.hudHeat) els.hudHeat.style.width = Math.min(100, loadout.heat || 0) + "%";
    if (els.hudEnergy) els.hudEnergy.style.width = Math.min(100, loadout.energy || 0) + "%";
    if (els.hudSpeed) els.hudSpeed.textContent = Math.round(Math.hypot(player.vx || 0, player.vy || 0)) + " u/s";
    if (els.hudCoord) els.hudCoord.textContent = Math.round(player.x) + " , " + Math.round(player.y);
    updateWeaponHud(); updateSecretHud();
    if (els.hudFps && loop) els.hudFps.textContent = Math.round(loop.fps || 0) + " fps";
    if (els.hudScore && scoreBoard) els.hudScore.textContent = "PT " + (scoreBoard.score || 0);
  }
  function render() {
    if (!ctx || !canvas) return;
    var w = window.innerWidth, h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    try { if (world) world.draw(ctx, camera); } catch (e) {}
    try { if (mapHazards && mapHazards.draw) mapHazards.draw(ctx, camera); } catch (e) {}
    try { if (supports) supports.draw(ctx, camera, player); } catch (e) {}
    try { if (window.WWNCombatDraw) WWNCombatDraw.draw(ctx, camera, combat); } catch (e) {}
    for (var i = 0; i < aiList.length; i++) {
      try { if (aiList[i].alive) aiList[i].draw(ctx, camera); } catch (e) {}
    }
    try {
      var now = performance.now() / 1000;
      var stl = loadout && loadout.isStealthed ? loadout.isStealthed(now) : false;
      if (player) player.draw(ctx, camera, stl);
    } catch (e) {}
    if (cyberTint > 0) {
      ctx.fillStyle = "rgba(0,245,255," + (0.08 * Math.min(1, cyberTint)) + ")";
      ctx.fillRect(0, 0, w, h);
    }
    try {
      if (minimapCanvas && window.WWNMinimap) WWNMinimap.draw(minimapCanvas, player, aiList, netSync.getRemotes(), world);
    } catch (e) {}
  }
  window.WWNGame = {
    start: startGame,
    stop: stopGame,
    isActive: function () { return active; },
  };
})();
