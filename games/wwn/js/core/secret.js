(function (global) {
  "use strict";
  var EFFECT_META = {
    orbitallaser: { name: "衛星レーザー", slot: "secret" },
    blackhole: { name: "ブラックホール", slot: "secret" },
    cyber: { name: "サイバー", slot: "secret" },
    droneswarm: { name: "ドローンスウォーム", slot: "secret" },
    turretpod: { name: "砲塔ポッド", slot: "secret" },
    leech: { name: "リーチ", slot: "secret" },
    shieldwall: { name: "シールドウォール", slot: "secret" },
    hive: { name: "ハイヴ変換", slot: "secret" },
    tether: { name: "テザー", slot: "secret" },
    repairbot: { name: "修理ドローン", slot: "secret" },
    kamikaze: { name: "カミカゼ", slot: "secret" },
    orbitalsat: { name: "軌道衛星", slot: "secret" },
    minering: { name: "機雷リング", slot: "secret" },
    shadowclone: { name: "シャドウクローン", slot: "secret" },
    barrierdome: { name: "バリアドーム", slot: "secret" },
    cryofield: { name: "凍結フィールド", slot: "secret" },
    wingman: { name: "5機小隊", slot: "secret" },
    aetherwing: { name: "エーテルウィング", slot: "secret" },
    nova: { name: "ノヴァ", slot: "secret" },
    overdrive: { name: "オーバードライブ", slot: "secret" },
    terminal: { name: "ターミナル", slot: "secret" }
  };
  var PHRASES = {
    orbitallaser: "orbitallaser", blackhole: "blackhole", cyberpulse: "cyber",
    droneswarm: "droneswarm", turretpod: "turretpod", leechbite: "leech",
    shieldwall: "shieldwall", hiveconvert: "hive", tetheranchor: "tether",
    repairdrone: "repairbot", kamikazesuicide: "kamikaze", orbitalsat: "orbitalsat",
    minering: "minering", shadowclone: "shadowclone", barrierdome: "barrierdome",
    cryofield: "cryofield", wingman: "wingman", aetherwing: "aetherwing",
    novasurge: "nova", overdrive: "overdrive", rootaccess: "terminal"
  };
  var unlocked = {}, buffer = "", lastKey = 0;
  try { var saved = localStorage.getItem("wwn_secrets"); if (saved) unlocked = JSON.parse(saved) || {}; } catch (e) {}
  function save() { try { localStorage.setItem("wwn_secrets", JSON.stringify(unlocked)); } catch (e) {} }
  function unlock(id) { if (!EFFECT_META[id]) return false; unlocked[id] = true; save(); return true; }
  function getUnlockedList() { return Object.keys(unlocked).filter(function (k) { return unlocked[k] && EFFECT_META[k]; }); }
  function getMeta(id) { return EFFECT_META[id] || { name: id, slot: "secret" }; }
  function tryResolve() {
    var now = performance.now(); if (now - lastKey > 3500) buffer = "";
    var lower = buffer.toLowerCase(), found = null;
    Object.keys(PHRASES).forEach(function (phrase) { if (lower.slice(-phrase.length) === phrase) found = PHRASES[phrase]; });
    if (!found) return Promise.resolve(null);
    buffer = ""; unlock(found); return Promise.resolve(found);
  }
  function onKey(ch) {
    if (!ch || ch.length !== 1) return;
    var now = performance.now(); if (now - lastKey > 3500) buffer = "";
    lastKey = now; buffer = (buffer + ch.toLowerCase()).slice(-24);
  }
  function applyEffect(effectId, player, combat, api) {
    api = api || {};
    function boom(color, n) { if (combat && combat.spawnParticles) try { combat.spawnParticles(player.x, player.y, color || "#0ff", n || 20); } catch (e) {} }
    if (effectId === "orbitallaser") {
      if (api.damageRay) api.damageRay(player.x, player.y, player.angle, 1200, 55, 36);
      if (combat && combat.effects) combat.effects.push({ type: "orbital", x: player.x, y: player.y, angle: player.angle, range: 1200, width: 28, life: 0.35, color: "#00f5ff" });
      boom("#00f5ff", 40); return true;
    }
    if (effectId === "blackhole") {
      if (combat && combat.effects) combat.effects.push({ type: "blackhole", x: player.x + Math.cos(player.angle) * 200, y: player.y + Math.sin(player.angle) * 200, radius: 160, life: 4 });
      boom("#9b5de5", 30); return true;
    }
    if (effectId === "cyber") { boom("#0ff", 20); return true; }
    if (effectId === "droneswarm") { if (api.spawnDrones) api.spawnDrones(6); boom("#4fc3f7", 30); return true; }
    if (effectId === "turretpod") { if (api.spawnTurret) api.spawnTurret(); boom("#ff9800", 16); return true; }
    if (effectId === "leech") { if (api.spawnLeech) api.spawnLeech(); boom("#c62828", 16); return true; }
    if (effectId === "shieldwall") { if (api.spawnShield) api.spawnShield(6); boom("#81d4fa", 16); return true; }
    if (effectId === "hive") { if (api.hiveConvert) api.hiveConvert(); boom("#a5d6a7", 20); return true; }
    if (effectId === "tether") { if (api.spawnTether) api.spawnTether(); boom("#ffd54f", 16); return true; }
    if (effectId === "repairbot") { if (api.spawnRepairBot) api.spawnRepairBot(); boom("#69f0ae", 16); return true; }
    if (effectId === "kamikaze") { if (api.spawnKamikaze) api.spawnKamikaze(); boom("#ff5252", 20); return true; }
    if (effectId === "orbitalsat") { if (api.spawnSatellite) api.spawnSatellite(); boom("#b388ff", 16); return true; }
    if (effectId === "minering") { if (api.spawnMineRing) api.spawnMineRing(); boom("#ff6b6b", 20); return true; }
    if (effectId === "shadowclone") { if (api.spawnClone) api.spawnClone(); boom("#ce93d8", 16); return true; }
    if (effectId === "barrierdome") { if (api.spawnDome) api.spawnDome(7); boom("#80cbc4", 16); return true; }
    if (effectId === "cryofield") { if (api.spawnFreezer) api.spawnFreezer(); boom("#81d4fa", 16); return true; }
    if (effectId === "wingman") { if (api.spawnAlly) api.spawnAlly(5); boom("#4fc3f7", 24); return true; }
    if (effectId === "aetherwing") {
      if (api.spawnDrones) api.spawnDrones(9);
      if (api.spawnSatellite) api.spawnSatellite();
      if (api.spawnClone) api.spawnClone();
      if (api.novaDamage) api.novaDamage(player, 220, 18);
      boom("#e1bee7", 50); return true;
    }
    if (effectId === "nova") { if (api.novaDamage) api.novaDamage(player, 320, 40); boom("#fff59d", 40); return true; }
    if (effectId === "overdrive") { player.boost = (global.WWNConfig && WWNConfig.BOOST_MAX) || 100; if (api.refill) api.refill(); boom("#ff8a65", 20); return true; }
    if (effectId === "terminal") { if (global.WWNTerminal && WWNTerminal.open) WWNTerminal.open(); return true; }
    boom("#fff", 12); return true;
  }
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key && e.key.length === 1) onKey(e.key);
  }, true);
  global.WWNSecret = { onKey: onKey, tryResolve: tryResolve, applyEffect: applyEffect, unlock: unlock, getUnlockedList: getUnlockedList, getMeta: getMeta, EFFECT_META: EFFECT_META };
})(typeof window !== "undefined" ? window : globalThis);
