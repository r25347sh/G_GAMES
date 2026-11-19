/**
 * Internal hash-gated unlocks. No plaintext in production table.
 * Generate hex: await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str))
 * then Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,"0")).join("")
 */
(function (global) {
  "use strict";
  var SECRET_HASHES = {};
  var ready = false;
  var hashToEffect = Object.create(null);
  var unlocked = Object.create(null);
  async function sha256Hex(str) {
    var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }
  async function init() {
    var pairs = [
      ["orbitallaser", "orbital"],
      ["blackholecore", "blackhole"],
      ["ghostwing", "overdrive"],
      ["miragefleet", "mirage"],
      ["cyberstorm", "cyber"],
    ];
    for (var i = 0; i < pairs.length; i++) {
      hashToEffect[await sha256Hex(pairs[i][0])] = pairs[i][1];
    }
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
    if (/[a-zA-Z0-9]/.test(ch)) {
      buffer += ch.toLowerCase();
      if (buffer.length > 40) buffer = buffer.slice(-40);
    }
  }
  async function tryResolve() {
    if (!ready || buffer.length < 6) return null;
    var h = await sha256Hex(buffer);
    var effect = hashToEffect[h];
    if (effect) { buffer = ""; unlocked[effect] = true; return effect; }
    for (var len = Math.min(buffer.length, 28); len >= 8; len--) {
      h = await sha256Hex(buffer.slice(-len));
      effect = hashToEffect[h];
      if (effect) { buffer = ""; unlocked[effect] = true; return effect; }
    }
    return null;
  }
  function applyEffect(effectId, player, combat) {
    if (!combat || !player) return false;
    if (effectId === "orbital") { combat.spawnOrbital(player); return true; }
    if (effectId === "blackhole") { if (combat.spawnBlackHole) combat.spawnBlackHole(player); return true; }
    if (effectId === "overdrive") {
      player.boost = global.WWNConfig.BOOST_MAX;
      player.hp = Math.min(global.WWNConfig.HP_MAX, player.hp + 40);
      combat.spawnParticle(player.x, player.y, "#00f5ff", 30, 200);
      return true;
    }
    if (effectId === "mirage") {
      var w = global.WWNWeapons.decoy;
      for (var i = 0; i < 3; i++) if (combat._spawnDecoy) combat._spawnDecoy(player, w);
      return true;
    }
    if (effectId === "cyber") {
      combat.effects.push({ type: "empRing", x: player.x, y: player.y, r: 0, maxR: 500, life: 0.7, color: "#9b5de5" });
      combat.spawnParticle(player.x, player.y, "#9b5de5", 36, 220);
      combat.events.push({ t: "emp", x: player.x, y: player.y, aoe: 500, duration: 4, dmg: 12, ownerId: player.netId, team: player.team });
      return true;
    }
    return false;
  }
  global.WWNSecret = {
    onKey: onKey, tryResolve: tryResolve, applyEffect: applyEffect,
    isUnlocked: function (id) { return !!unlocked[id]; },
  };
})(typeof window !== "undefined" ? window : globalThis);
