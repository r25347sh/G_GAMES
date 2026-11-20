(function (global) {
  "use strict";
  var META = {
    orbitallaser: { name: "軌道レーザー", slot: "main" },
    blackholecore: { name: "ブラックホール", slot: "gadget" },
    ghostwing: { name: "ゴースト翼", slot: "gadget" },
    miragefleet: { name: "ミラージュ艦隊", slot: "gadget" },
    cyberstorm: { name: "サイバーストーム", slot: "sub" },
    voidcannon: { name: "ヴォイド砲", slot: "main" },
    phoenixkit: { name: "フェニックス", slot: "gadget" },
    stormbreaker: { name: "ストーム", slot: "sub" },
    neonblade: { name: "ネオン刃", slot: "main" },
    warpdrive: { name: "ワープ", slot: "gadget" },
    wingman: { name: "味方召喚", slot: "gadget" },
    squadron: { name: "小隊展開", slot: "gadget" },
  };
  var PHRASE_TO_ID = {
    orbitallaser: "orbitallaser", blackholecore: "blackholecore",
    ghostwing: "ghostwing", miragefleet: "miragefleet",
    cyberstorm: "cyberstorm", voidcannon: "voidcannon",
    phoenixkit: "phoenixkit", stormbreaker: "stormbreaker",
    neonblade: "neonblade", warpdrive: "warpdrive",
    wingman: "wingman", squadron: "squadron",
  };
  var unlocked = {};
  var buf = "";
  var lastT = 0;
  var pendingUnlock = null;
  function getUnlockedList() {
    return Object.keys(unlocked).filter(function (k) { return unlocked[k]; });
  }
  function getMeta(id) { return META[id] || { name: id, slot: "gadget" }; }
  function tryResolve() {
    if (pendingUnlock) {
      var id = pendingUnlock; pendingUnlock = null;
      return Promise.resolve(id);
    }
    return Promise.resolve(null);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Backspace") { buf = buf.slice(0, -1); return; }
      if (e.key.length !== 1) return;
      var ch = e.key.toLowerCase();
      if (!/[a-z0-9]/.test(ch)) return;
      var now = performance.now();
      if (now - lastT > 2500) buf = "";
      lastT = now;
      buf += ch;
      if (buf.length > 24) buf = buf.slice(-24);
      if (PHRASE_TO_ID[buf]) {
        var id = PHRASE_TO_ID[buf];
        unlocked[id] = true;
        buf = "";
        pendingUnlock = id;
      }
    }, true);
  }
  function applyEffect(effectId, player, combat, api) {
    if (!effectId || !player) return false;
    if (effectId === "wingman" && api && api.spawnAlly) { api.spawnAlly(3); return true; }
    if (effectId === "squadron" && api && api.spawnAlly) { api.spawnAlly(3); return true; }
    if (effectId === "phoenixkit") {
      player.hp = Math.min((global.WWNConfig && WWNConfig.HP_MAX) || 100, player.hp + 50);
      return true;
    }
    if (effectId === "warpdrive") {
      player.x += Math.cos(player.angle) * 400;
      player.y += Math.sin(player.angle) * 400;
      return true;
    }
    if (combat && combat.spawnParticle) combat.spawnParticle(player.x, player.y, "#00f5ff", 20, 150);
    return true;
  }
  global.WWNSecret = {
    tryResolve: tryResolve,
    applyEffect: applyEffect,
    getUnlockedList: getUnlockedList,
    getMeta: getMeta,
    _unlocked: unlocked,
  };
})(typeof window !== "undefined" ? window : globalThis);
