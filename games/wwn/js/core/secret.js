/**
 * Hidden command system.
 * Input is hashed with SHA-256; only hashes are stored/compared.
 * Network never transmits command strings — only resulting game objects/effects.
 *
 * To register a new command:
 *   const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("YOUR_SECRET_STRING"));
 *   const hex = Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2,"0")).join("");
 *   Add hex to SECRET_HASHES with effect id.
 *
 * Test: SHA-256 of "TEST_ORBITAL_LASER" registered at runtime.
 */
(function (global) {
  "use strict";
  var SECRET_HASHES = {};
  var ready = false;
  var hashToEffect = Object.create(null);
  async function sha256Hex(str) {
    var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }
  async function init() {
    var testH = await sha256Hex("TEST_ORBITAL_LASER");
    hashToEffect[testH] = "orbital";
    Object.keys(SECRET_HASHES).forEach(function (h) { hashToEffect[h] = SECRET_HASHES[h]; });
    ready = true;
  }
  init();
  var buffer = "";
  var lastKey = 0;
  function onKey(ch) {
    if (!ch || ch.length !== 1) return null;
    var now = performance.now();
    if (now - lastKey > 2500) buffer = "";
    lastKey = now;
    buffer += ch;
    if (buffer.length > 48) buffer = buffer.slice(-48);
    return null;
  }
  async function tryResolve() {
    if (!ready || buffer.length < 4) return null;
    var h = await sha256Hex(buffer);
    var effect = hashToEffect[h];
    if (effect) { buffer = ""; return effect; }
    for (var len = Math.min(buffer.length, 32); len >= 8; len--) {
      h = await sha256Hex(buffer.slice(-len));
      effect = hashToEffect[h];
      if (effect) { buffer = ""; return effect; }
    }
    return null;
  }
  global.WWNSecret = {
    onKey: onKey,
    tryResolve: tryResolve,
    clearBuffer: function () { buffer = ""; },
    applyEffect: function (effectId, player, combat) {
      if (effectId === "orbital") { combat.spawnOrbital(player); return true; }
      return false;
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
