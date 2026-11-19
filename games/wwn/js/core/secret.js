/**
 * Hash-gated unlocks. No plaintext in SECRET_HASHES table.
 * Generate: crypto.subtle.digest SHA-256 of the phrase → hex.
 */
(function (global) {
  "use strict";
  var SECRET_HASHES = {};
  var ready = false;
  var hashToEffect = Object.create(null);
  var unlocked = Object.create(null);
  var listeners = [];
  var EFFECT_META = {
    orbital: { name: "衛星レーザー", slot: "gadget" },
    blackhole: { name: "ブラックホール", slot: "gadget" },
    overdrive: { name: "ゴーストウィング", slot: "gadget" },
    mirage: { name: "ミラージュ艦隊", slot: "gadget" },
    cyber: { name: "サイバーストーム", slot: "gadget" },
    voidcannon: { name: "ヴォイドキャノン", slot: "main" },
    phoenix: { name: "フェニックスキット", slot: "gadget" },
    storm: { name: "ストームブレイカー", slot: "main" },
    neonblade: { name: "ネオンブレイド", slot: "sub" },
    warp: { name: "ワープドライブ", slot: "gadget" },
  };
  async function sha256Hex(str) {
    var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }
  async function init() {
    var pairs = [
      ["orbitallaser", "orbital"], ["blackholecore", "blackhole"], ["ghostwing", "overdrive"],
      ["miragefleet", "mirage"], ["cyberstorm", "cyber"], ["voidcannon", "voidcannon"],
      ["phoenixkit", "phoenix"], ["stormbreaker", "storm"], ["neonblade", "neonblade"], ["warpdrive", "warp"],
    ];
    for (var i = 0; i < pairs.length; i++) hashToEffect[await sha256Hex(pairs[i][0])] = pairs[i][1];
    Object.keys(SECRET_HASHES).forEach(function (h) { hashToEffect[h] = SECRET_HASHES[h]; });
    ready = true;
  }
  init();
  var buffer = "", lastKey = 0;
  function onKey(ch) {
    if (!ch || ch.length !== 1) return;
    var now = performance.now();
    if (now - lastKey > 2800) buffer = "";
    lastKey = now;
    if (/[a-zA-Z0-9]/.test(ch)) { buffer += ch.toLowerCase(); if (buffer.length > 40) buffer = buffer.slice(-40); }
  }
  async function tryResolve() {
    if (!ready || buffer.length < 6) return null;
    var h = await sha256Hex(buffer), effect = hashToEffect[h];
    if (effect) { buffer = ""; return _unlock(effect); }
    for (var len = Math.min(buffer.length, 28); len >= 8; len--) {
      h = await sha256Hex(buffer.slice(-len)); effect = hashToEffect[h];
      if (effect) { buffer = ""; return _unlock(effect); }
    }
    return null;
  }
  function _unlock(effectId) {
    var first = !unlocked[effectId];
    unlocked[effectId] = true;
    if (first) listeners.forEach(function (fn) { try { fn(effectId, EFFECT_META[effectId]); } catch (_) {} });
    return effectId;
  }
  function applyEffect(effectId, player, combat) {
    if (!combat || !player) return false;
    if (effectId === "orbital") { combat.spawnOrbital(player); return true; }
    if (effectId === "blackhole") { if (combat.spawnBlackHole) combat.spawnBlackHole(player); return true; }
    if (effectId === "overdrive") {
      player.boost = global.WWNConfig.BOOST_MAX;
      player.hp = Math.min(global.WWNConfig.HP_MAX, player.hp + 40);
      combat.spawnParticle(player.x, player.y, "#00f5ff", 30, 200); return true;
    }
    if (effectId === "mirage") {
      var w = global.WWNWeapons.decoy;
      for (var i = 0; i < 3; i++) if (combat._spawnDecoy) combat._spawnDecoy(player, w);
      return true;
    }
    if (effectId === "cyber") {
      combat.events.push({ t: "emp", x: player.x, y: player.y, aoe: 500, duration: 4, dmg: 12, ownerId: player.netId, team: player.team });
      combat.effects.push({ type: "empRing", x: player.x, y: player.y, r: 0, maxR: 500, life: 0.7, color: "#9b5de5" });
      combat.spawnParticle(player.x, player.y, "#9b5de5", 36, 220); return true;
    }
    if (effectId === "voidcannon") {
      var p = combat.projectiles.acquire();
      p.alive = true; p.type = "plasma";
      p.x = player.x + Math.cos(player.angle) * 24; p.y = player.y + Math.sin(player.angle) * 24;
      p.angle = player.angle;
      p.vx = Math.cos(player.angle) * 380 + (player.vx || 0) * 0.2;
      p.vy = Math.sin(player.angle) * 380 + (player.vy || 0) * 0.2;
      p.life = 2.2; p.maxLife = 2.2; p.dmg = 55; p.aoe = 110;
      p.ownerId = player.netId || "local"; p.team = player.team || "NONE";
      p.radius = 14; p.color = "#5b2cff"; p.targetId = null; p.turn = 0; p.split = 0;
      combat.spawnParticle(p.x, p.y, "#5b2cff", 16, 100); return true;
    }
    if (effectId === "phoenix") {
      player.hp = global.WWNConfig.HP_MAX; player.boost = global.WWNConfig.BOOST_MAX;
      combat.spawnParticle(player.x, player.y, "#ff6bb5", 40, 200); return true;
    }
    if (effectId === "storm") {
      for (var s = -3; s <= 3; s++) {
        var sp = combat.projectiles.acquire();
        var ang = player.angle + s * 0.12;
        sp.alive = true; sp.type = "vulcan";
        sp.x = player.x + Math.cos(player.angle) * 20; sp.y = player.y + Math.sin(player.angle) * 20;
        sp.angle = ang; sp.vx = Math.cos(ang) * 950; sp.vy = Math.sin(ang) * 950;
        sp.life = 1.0; sp.maxLife = 1.0; sp.dmg = 8;
        sp.ownerId = player.netId || "local"; sp.team = player.team || "NONE";
        sp.radius = 4; sp.aoe = 0; sp.color = "#ffe066"; sp.targetId = null; sp.turn = 0; sp.split = 0;
      }
      return true;
    }
    if (effectId === "neonblade") {
      combat.effects.push({ type: "laser", x: player.x, y: player.y, angle: player.angle, range: 220, dmg: 35, ownerId: player.netId || "local", team: player.team || "NONE", color: "#39ff14", width: 8, life: 0.12 });
      combat.events.push({ t: "laser", x: player.x, y: player.y, angle: player.angle, range: 220, dmg: 35, ownerId: player.netId, team: player.team, color: "#39ff14" });
      return true;
    }
    if (effectId === "warp") {
      player.x += Math.cos(player.angle) * 320; player.y += Math.sin(player.angle) * 320;
      combat.spawnParticle(player.x, player.y, "#7df9ff", 24, 160); return true;
    }
    return false;
  }
  global.WWNSecret = {
    onKey: onKey, tryResolve: tryResolve, applyEffect: applyEffect,
    isUnlocked: function (id) { return !!unlocked[id]; },
    getUnlockedList: function () { return Object.keys(unlocked).filter(function (k) { return unlocked[k]; }); },
    getMeta: function (id) { return EFFECT_META[id] || { name: id, slot: "gadget" }; },
    onUnlock: function (fn) { listeners.push(fn); },
  };
})(typeof window !== "undefined" ? window : globalThis);
