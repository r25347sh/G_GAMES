(function (global) {
  "use strict";
  var EFFECT_META = {
    orbital: { name: "衛星レーザー", slot: "secret" },
    blackhole: { name: "ブラックホール", slot: "secret" },
    overdrive: { name: "ゴーストウィング", slot: "secret" },
    mirage: { name: "ミラージュ", slot: "secret" },
    cyber: { name: "サイバーストーム", slot: "secret" },
    voidcannon: { name: "ヴォイド砲", slot: "secret" },
    phoenix: { name: "フェニックス", slot: "secret" },
    storm: { name: "ストーム", slot: "secret" },
    neonblade: { name: "ネオン刃", slot: "secret" },
    warp: { name: "ワープ", slot: "secret" },
    airdrop: { name: "補給", slot: "secret" },
    fortify: { name: "装甲", slot: "secret" },
    blitz: { name: "ブリッツ", slot: "secret" },
    silence: { name: "サイレンス", slot: "secret" },
    nova: { name: "ノヴァ", slot: "secret" },
    gravity: { name: "重力井戸", slot: "secret" },
    droneswarm: { name: "ドローンスウォーム", slot: "secret" },
    turretpod: { name: "自動砲塔", slot: "secret" },
    leech: { name: "リーチ寄生", slot: "secret" },
    shieldwall: { name: "シールドウォール", slot: "secret" },
    hive: { name: "ハイブ変換", slot: "secret" },
    tether: { name: "テザー錨", slot: "secret" },
    wingman: { name: "旧式僚機", slot: "secret" },
    repairbot: { name: "修理ドローン", slot: "secret" },
    kamikaze: { name: "特攻ドローン", slot: "secret" },
    orbitalsat: { name: "軌道衛星", slot: "secret" },
    minering: { name: "機雷リング", slot: "secret" },
    shadowclone: { name: "シャドウ分体", slot: "secret" },
    barrierdome: { name: "バリアドーム", slot: "secret" },
    cryofield: { name: "凍結フィールド", slot: "secret" },
    missilebat: { name: "ミサイル電池", slot: "secret" },
    terminal: { name: "ターミナル", slot: "secret" },
  };
  var PHRASES = {
    orbitallaser: "orbital", blackholecore: "blackhole", ghostwing: "overdrive",
    miragefleet: "mirage", cyberstorm: "cyber", voidcannon: "voidcannon",
    phoenixkit: "phoenix", stormbreaker: "storm", neonblade: "neonblade",
    warpdrive: "warp", supplydrop: "airdrop", fortifyshell: "fortify",
    blitzrush: "blitz", silencerain: "silence", novaburst: "nova",
    gravitywell: "gravity", droneswarm: "droneswarm", turretpod: "turretpod",
    leechbite: "leech", shieldwall: "shieldwall", hiveconvert: "hive",
    tetheranchor: "tether", wingman: "wingman", repairdrone: "repairbot",
    kamikazesuicide: "kamikaze", orbitalsat: "orbitalsat", minering: "minering",
    shadowclone: "shadowclone", barrierdome: "barrierdome", cryofield: "cryofield",
    missilebat: "missilebat", rootaccess: "terminal", console: "terminal",
  };
  var unlocked = Object.create(null);
  var buffer = "", lastKey = 0, pendingNotify = null;
  var STORAGE_KEY = "wwn_secret_unlocks_v2";
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) JSON.parse(raw).forEach(function (id) { unlocked[id] = true; });
  } catch (_) {}
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.keys(unlocked).filter(function (k) { return unlocked[k]; })));
    } catch (_) {}
  }
  function unlock(id) {
    if (!id || !EFFECT_META[id]) return null;
    var first = !unlocked[id]; unlocked[id] = true; save();
    if (first) pendingNotify = id; return id;
  }
  function onKey(ch) {
    if (!ch || ch.length !== 1) return;
    if (global.WWNTerminal && WWNTerminal.isOpen && WWNTerminal.isOpen()) return;
    var now = performance.now();
    if (now - lastKey > 3500) buffer = "";
    lastKey = now;
    if (!/[a-zA-Z0-9]/.test(ch)) return;
    buffer += ch.toLowerCase();
    if (buffer.length > 40) buffer = buffer.slice(-40);
    if (PHRASES[buffer]) { unlock(PHRASES[buffer]); buffer = ""; return; }
    for (var len = Math.min(buffer.length, 22); len >= 6; len--) {
      var slice = buffer.slice(-len);
      if (PHRASES[slice]) { unlock(PHRASES[slice]); buffer = ""; return; }
    }
  }
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key && e.key.length === 1) onKey(e.key);
    }, true);
  }
  function tryResolve() {
    if (pendingNotify) { var id = pendingNotify; pendingNotify = null; return Promise.resolve(id); }
    return Promise.resolve(null);
  }
  function applyEffect(effectId, player, combat, api) {
    if (!player || !effectId) return false;
    api = api || {};
    var C = global.WWNConfig || { HP_MAX: 100, BOOST_MAX: 100, MAX_SPEED: 400 };
    try {
      if (global.WWNSupportBridge && WWNSupportBridge.apiFor) {
        var b = WWNSupportBridge.apiFor(player, combat, global.__wwnAiList || [], global.__wwnNetSync, global.__wwnLoadout, api.spawnAlly);
        for (var bk in b) if (api[bk] == null) api[bk] = b[bk];
      }
    } catch (_) {}
    global.__wwnPlayer = player;
    global.__wwnCombat = combat;
    function dmgRay(ang, range, dmg) {
      if (api.damageRay) { api.damageRay(player.x, player.y, ang, range, dmg, 30, player); return; }
      ((api.getEnemies && api.getEnemies()) || []).forEach(function (t) {
        if (!t || !t.hp) return;
        var dx = t.x - player.x, dy = t.y - player.y, dist = Math.hypot(dx, dy);
        if (dist > range) return;
        var diff = Math.atan2(dy, dx) - ang;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) < 0.18) t.hp = Math.max(0, t.hp - dmg);
      });
    }
    function pushFx(fx) { if (combat && combat.effects) combat.effects.push(fx); }
    function boom(c, n) { if (combat && combat.spawnParticle) combat.spawnParticle(player.x, player.y, c || "#00f5ff", n || 24, 160); }
    if (effectId === "orbital") {
      pushFx({ type: "orbitalBeam", x: player.x, y: player.y, angle: player.angle, range: 1400, life: 0.9, width: 22, color: "#ff3366" });
      dmgRay(player.angle, 1400, 60); boom("#ff3366", 40); return true;
    }
    if (effectId === "blackhole" || effectId === "gravity") {
      var dist = effectId === "gravity" ? 120 : 180;
      pushFx({ type: "blackhole", x: player.x + Math.cos(player.angle) * dist, y: player.y + Math.sin(player.angle) * dist, r: 20, maxR: 180, life: 5, pull: 450, dmg: 0.3, ownerId: player.netId, team: player.team });
      boom("#9b5de5", 30); return true;
    }
    if (effectId === "overdrive") { player.boost = C.BOOST_MAX; player.hp = Math.min(C.HP_MAX, (player.hp || 0) + 35); boom("#00f5ff", 28); return true; }
    if (effectId === "phoenix") { player.hp = C.HP_MAX; player.boost = C.BOOST_MAX; boom("#ff6bb5", 40); return true; }
    if (effectId === "warp") { player.x += Math.cos(player.angle) * 380; player.y += Math.sin(player.angle) * 380; boom("#7df9ff", 20); return true; }
    if (effectId === "blitz") { player.boost = C.BOOST_MAX; player.vx = Math.cos(player.angle) * C.MAX_SPEED * 1.5; player.vy = Math.sin(player.angle) * C.MAX_SPEED * 1.5; boom("#ef5350", 24); return true; }
    if (effectId === "fortify") { player.hp = Math.min(C.HP_MAX * 1.4, (player.hp || 0) + 55); boom("#66bb6a", 28); return true; }
    if (effectId === "airdrop") { if (api.refill) api.refill(); player.hp = Math.min(C.HP_MAX, (player.hp || 0) + 40); player.boost = C.BOOST_MAX; boom("#ffd700", 24); return true; }
    if (effectId === "cyber" || effectId === "nova" || effectId === "silence") {
      var aoe = effectId === "nova" ? 320 : (effectId === "silence" ? 600 : 480);
      if (combat && combat.events) combat.events.push({ t: "emp", x: player.x, y: player.y, aoe: aoe, duration: 3.5, dmg: effectId === "nova" ? 30 : 10, ownerId: player.netId, team: player.team });
      pushFx({ type: "empRing", x: player.x, y: player.y, r: 0, maxR: aoe, life: 0.6, color: "#9b5de5" });
      if (effectId === "silence" && api.globalChaff) api.globalChaff(5);
      if (effectId === "nova" && api.novaDamage) api.novaDamage(player, aoe, 30);
      boom("#9b5de5", 36); return true;
    }
    if (effectId === "storm" && combat && combat.projectiles) {
      for (var s = -4; s <= 4; s++) {
        var sp = combat.projectiles.acquire(); if (!sp) break;
        var a = player.angle + s * 0.1;
        sp.alive = true; sp.type = "vulcan"; sp.x = player.x; sp.y = player.y; sp.angle = a;
        sp.vx = Math.cos(a) * 980; sp.vy = Math.sin(a) * 980; sp.life = 1.1; sp.maxLife = 1.1; sp.dmg = 9;
        sp.ownerId = player.netId; sp.team = player.team; sp.radius = 4; sp.aoe = 0; sp.color = "#ffe066"; sp.targetId = null; sp.turn = 0; sp.split = 0;
      }
      return true;
    }
    if (effectId === "voidcannon" && combat && combat.projectiles) {
      var p = combat.projectiles.acquire();
      if (p) {
        p.alive = true; p.type = "plasma"; p.x = player.x; p.y = player.y; p.angle = player.angle;
        p.vx = Math.cos(player.angle) * 500; p.vy = Math.sin(player.angle) * 500;
        p.life = 2.2; p.maxLife = 2.2; p.dmg = 50; p.aoe = 110; p.ownerId = player.netId; p.team = player.team;
        p.radius = 14; p.color = "#7b2cbf"; p.targetId = null; p.turn = 0; p.split = 0;
      }
      return true;
    }
    if (effectId === "neonblade") { dmgRay(player.angle, 260, 42); boom("#39ff14", 16); return true; }
    if (effectId === "mirage") {
      if (combat && combat._spawnDecoy && global.WWNWeapons) for (var i = 0; i < 4; i++) combat._spawnDecoy(player, WWNWeapons.decoy);
      boom("#ffb347", 20); return true;
    }
    if (effectId === "droneswarm") { if (api.spawnDrones) api.spawnDrones(6); boom("#4fc3f7", 30); return true; }
    if (effectId === "turretpod") { if (api.spawnTurret) api.spawnTurret(); boom("#ff9800", 24); return true; }
    if (effectId === "leech") { if (api.spawnLeech) api.spawnLeech(); boom("#c62828", 20); return true; }
    if (effectId === "shieldwall") { if (api.spawnShield) api.spawnShield(6); boom("#81d4fa", 28); return true; }
    if (effectId === "hive") { if (api.hiveConvert) api.hiveConvert(); boom("#ce93d8", 32); return true; }
    if (effectId === "tether") { if (api.spawnTether) api.spawnTether(); boom("#ffd54f", 24); return true; }
    if (effectId === "wingman") { if (api.spawnAlly) api.spawnAlly(3); boom("#4fc3f7", 24); return true; }
    if (effectId === "repairbot") { if (api.spawnRepairBot) api.spawnRepairBot(); boom("#69f0ae", 20); return true; }
    if (effectId === "kamikaze") { if (api.spawnKamikaze) api.spawnKamikaze(); boom("#ff5722", 24); return true; }
    if (effectId === "orbitalsat") { if (api.spawnSatellite) api.spawnSatellite(); boom("#e040fb", 22); return true; }
    if (effectId === "minering") { if (api.spawnMineRing) api.spawnMineRing(); boom("#ff6b6b", 20); return true; }
    if (effectId === "shadowclone") { if (api.spawnClone) api.spawnClone(); boom("#80cbc4", 20); return true; }
    if (effectId === "barrierdome") { if (api.spawnDome) api.spawnDome(7); boom("#b388ff", 26); return true; }
    if (effectId === "cryofield") { if (api.spawnFreezer) api.spawnFreezer(); boom("#80d8ff", 24); return true; }
    if (effectId === "missilebat") { if (api.spawnBattery) api.spawnBattery(); boom("#ff6b6b", 22); return true; }
    if (effectId === "terminal") { if (global.WWNTerminal) WWNTerminal.open(api); return true; }
    return false;
  }
  global.WWNSecret = {
    onKey: onKey, tryResolve: tryResolve, applyEffect: applyEffect, unlock: unlock,
    isUnlocked: function (id) { return !!unlocked[id]; },
    getUnlockedList: function () { return Object.keys(unlocked).filter(function (k) { return unlocked[k]; }); },
    getMeta: function (id) { return EFFECT_META[id] || { name: id, slot: "secret" }; },
    listPhrasesDev: function () { return Object.keys(PHRASES).map(function (p) { return p + " → " + PHRASES[p]; }); },
  };
})(typeof window !== "undefined" ? window : globalThis);
