(function (global) {
  "use strict";
  var EFFECT_META = {
    orbital: { name: "衛星レーザー", slot: "secret" },
    blackhole: { name: "ブラックホール", slot: "secret" },
    overdrive: { name: "ゴーストウィング", slot: "secret" },
    mirage: { name: "ミラージュ艦隊", slot: "secret" },
    cyber: { name: "サイバーストーム", slot: "secret" },
    voidcannon: { name: "ヴォイドキャノン", slot: "secret" },
    phoenix: { name: "フェニックス", slot: "secret" },
    storm: { name: "ストームブレイカー", slot: "secret" },
    neonblade: { name: "ネオンブレイド", slot: "secret" },
    warp: { name: "ワープドライブ", slot: "secret" },
    wingman: { name: "味方トリオ", slot: "secret" },
    squadron: { name: "小隊展開", slot: "secret" },
    bastion: { name: "ガーディアン増援", slot: "secret" },
    hunter: { name: "ストライカー増援", slot: "secret" },
    specter: { name: "ファントム増援", slot: "secret" },
    airdrop: { name: "補給投下", slot: "secret" },
    fortify: { name: "装甲強化", slot: "secret" },
    blitz: { name: "電撃突撃", slot: "secret" },
    silence: { name: "全域チャフ", slot: "secret" },
    nova: { name: "ノヴァ爆発", slot: "secret" },
    gravity: { name: "重力井戸", slot: "secret" },
    mirror: { name: "ミラー分身", slot: "secret" },
    terminal: { name: "コマンドターミナル", slot: "secret" },
  };
  var PHRASES = [
    ["orbitallaser", "orbital"], ["blackholecore", "blackhole"], ["ghostwing", "overdrive"],
    ["miragefleet", "mirage"], ["cyberstorm", "cyber"], ["voidcannon", "voidcannon"],
    ["phoenixkit", "phoenix"], ["stormbreaker", "storm"], ["neonblade", "neonblade"],
    ["warpdrive", "warp"], ["wingman", "wingman"], ["squadron", "squadron"],
    ["bastioncall", "bastion"], ["huntercall", "hunter"], ["spectercall", "specter"],
    ["supplydrop", "airdrop"], ["fortifyshell", "fortify"], ["blitzrush", "blitz"],
    ["silencerain", "silence"], ["novaburst", "nova"], ["gravitywell", "gravity"],
    ["mirrorself", "mirror"], ["rootaccess", "terminal"], ["console", "terminal"],
  ];
  var hashToEffect = Object.create(null);
  var unlocked = Object.create(null);
  var ready = false, buffer = "", lastKey = 0;
  var STORAGE_KEY = "wwn_secret_unlocks_v1";
  function loadPersisted() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var arr = JSON.parse(raw);
      if (Array.isArray(arr)) arr.forEach(function (id) { unlocked[id] = true; });
    } catch (_) {}
  }
  function savePersisted() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.keys(unlocked).filter(function (k) { return unlocked[k]; })));
    } catch (_) {}
  }
  loadPersisted();
  async function sha256Hex(str) {
    var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(function (b) {
      return b.toString(16).padStart(2, "0");
    }).join("");
  }
  async function init() {
    for (var i = 0; i < PHRASES.length; i++) {
      hashToEffect[await sha256Hex(PHRASES[i][0])] = PHRASES[i][1];
    }
    ready = true;
  }
  init();
  function onKey(ch) {
    if (!ch || ch.length !== 1) return;
    if (global.WWNTerminal && WWNTerminal.isOpen && WWNTerminal.isOpen()) return;
    var now = performance.now();
    if (now - lastKey > 3200) buffer = "";
    lastKey = now;
    if (/[a-zA-Z0-9]/.test(ch)) {
      buffer += ch.toLowerCase();
      if (buffer.length > 48) buffer = buffer.slice(-48);
    }
  }
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key && e.key.length === 1) onKey(e.key);
    }, true);
  }
  function _unlock(effectId) {
    unlocked[effectId] = true;
    savePersisted();
    return effectId;
  }
  async function tryResolve() {
    if (!ready || buffer.length < 5) return null;
    var h = await sha256Hex(buffer);
    var effect = hashToEffect[h];
    if (effect) { buffer = ""; return _unlock(effect); }
    for (var len = Math.min(buffer.length, 28); len >= 6; len--) {
      h = await sha256Hex(buffer.slice(-len));
      effect = hashToEffect[h];
      if (effect) { buffer = ""; return _unlock(effect); }
    }
    return null;
  }
  function applyEffect(effectId, player, combat, api) {
    if (!player || !effectId) return false;
    api = api || {};
    var C = global.WWNConfig;
    if (effectId === "orbital" && combat) {
      var ang = player.angle, range = 1400;
      combat.effects.push({
        type: "orbitalBeam", x: player.x, y: player.y, angle: ang,
        range: range, life: 0.85, maxLife: 0.85, width: 22, color: "#ff3366",
        ownerId: player.netId, team: player.team,
      });
      combat.effects.push({
        type: "laser", x: player.x, y: player.y, angle: ang,
        range: range, dmg: 55, ownerId: player.netId, team: player.team,
        color: "#ff3366", width: 14, life: 0.2,
      });
      if (api.damageRay) api.damageRay(player.x, player.y, ang, range, 55, 28, player);
      combat.spawnParticle(player.x, player.y, "#ff3366", 40, 220);
      return true;
    }
    if (effectId === "blackhole" && combat) {
      combat.effects.push({
        type: "blackhole", x: player.x + Math.cos(player.angle) * 180,
        y: player.y + Math.sin(player.angle) * 180,
        r: 0, maxR: 160, life: 4.5, pull: 420, dmg: 0.35,
        ownerId: player.netId, team: player.team,
      });
      combat.spawnParticle(player.x, player.y, "#9b5de5", 36, 200);
      return true;
    }
    if (effectId === "overdrive") {
      player.boost = C.BOOST_MAX;
      player.hp = Math.min(C.HP_MAX, player.hp + 35);
      if (combat) combat.spawnParticle(player.x, player.y, "#00f5ff", 30, 180);
      return true;
    }
    if (effectId === "mirage" && combat && combat._spawnDecoy) {
      for (var i = 0; i < 4; i++) combat._spawnDecoy(player, global.WWNWeapons.decoy);
      return true;
    }
    if (effectId === "cyber" && combat) {
      combat.events.push({ t: "emp", x: player.x, y: player.y, aoe: 480, duration: 4.5, dmg: 10, ownerId: player.netId, team: player.team });
      combat.effects.push({ type: "empRing", x: player.x, y: player.y, r: 0, maxR: 480, life: 0.7, color: "#9b5de5" });
      return true;
    }
    if (effectId === "voidcannon" && combat) {
      var p = combat.projectiles.acquire();
      p.alive = true; p.type = "plasma";
      p.x = player.x + Math.cos(player.angle) * 28;
      p.y = player.y + Math.sin(player.angle) * 28;
      p.angle = player.angle;
      p.vx = Math.cos(player.angle) * 500 + (player.vx || 0) * 0.2;
      p.vy = Math.sin(player.angle) * 500 + (player.vy || 0) * 0.2;
      p.life = 2.2; p.maxLife = 2.2; p.dmg = 48; p.aoe = 110;
      p.ownerId = player.netId; p.team = player.team;
      p.radius = 14; p.color = "#7b2cbf"; p.targetId = null; p.turn = 0; p.split = 0;
      return true;
    }
    if (effectId === "phoenix") {
      player.hp = C.HP_MAX; player.boost = C.BOOST_MAX;
      if (combat) combat.spawnParticle(player.x, player.y, "#ff6bb5", 40, 200);
      return true;
    }
    if (effectId === "storm" && combat) {
      for (var s = -4; s <= 4; s++) {
        var sp = combat.projectiles.acquire();
        var a = player.angle + s * 0.1;
        sp.alive = true; sp.type = "vulcan";
        sp.x = player.x + Math.cos(player.angle) * 20;
        sp.y = player.y + Math.sin(player.angle) * 20;
        sp.angle = a; sp.vx = Math.cos(a) * 980; sp.vy = Math.sin(a) * 980;
        sp.life = 1.1; sp.maxLife = 1.1; sp.dmg = 9;
        sp.ownerId = player.netId; sp.team = player.team;
        sp.radius = 4; sp.aoe = 0; sp.color = "#ffe066";
        sp.targetId = null; sp.turn = 0; sp.split = 0;
      }
      return true;
    }
    if (effectId === "neonblade" && combat) {
      combat.effects.push({
        type: "laser", x: player.x, y: player.y, angle: player.angle,
        range: 260, dmg: 40, ownerId: player.netId, team: player.team,
        color: "#39ff14", width: 10, life: 0.15,
      });
      return true;
    }
    if (effectId === "warp") {
      player.x += Math.cos(player.angle) * 380;
      player.y += Math.sin(player.angle) * 380;
      if (combat) combat.spawnParticle(player.x, player.y, "#7df9ff", 24, 160);
      return true;
    }
    if (effectId === "wingman" && api.spawnAlly) { api.spawnAlly(3); if (combat) combat.spawnParticle(player.x, player.y, "#4fc3f7", 28, 160); return true; }
    if (effectId === "squadron" && api.spawnAlly) { api.spawnAlly(3); if (combat) combat.spawnParticle(player.x, player.y, "#4fc3f7", 40, 200); return true; }
    if (effectId === "bastion" && api.spawnAllyType) { api.spawnAllyType("guardian", 2); return true; }
    if (effectId === "hunter" && api.spawnAllyType) { api.spawnAllyType("striker", 2); return true; }
    if (effectId === "specter" && api.spawnAllyType) { api.spawnAllyType("phantom", 2); return true; }
    if (effectId === "airdrop" && api.refill) {
      api.refill(); player.hp = Math.min(C.HP_MAX, player.hp + 40); player.boost = C.BOOST_MAX;
      if (combat) combat.spawnParticle(player.x, player.y, "#ffd700", 24, 160); return true;
    }
    if (effectId === "fortify") {
      player.hp = Math.min(C.HP_MAX * 1.5, player.hp + 60);
      if (api.fortify) api.fortify(8);
      if (combat) combat.spawnParticle(player.x, player.y, "#66bb6a", 30, 180); return true;
    }
    if (effectId === "blitz") {
      player.boost = C.BOOST_MAX;
      player.vx = Math.cos(player.angle) * C.MAX_SPEED * 1.4;
      player.vy = Math.sin(player.angle) * C.MAX_SPEED * 1.4;
      if (combat) combat.spawnParticle(player.x, player.y, "#ef5350", 28, 160); return true;
    }
    if (effectId === "silence" && combat) {
      if (api.globalChaff) api.globalChaff(5);
      combat.spawnParticle(player.x, player.y, "#eee", 50, 200);
      combat.effects.push({ type: "empRing", x: player.x, y: player.y, r: 0, maxR: 600, life: 0.5, color: "#ffe066" });
      return true;
    }
    if (effectId === "nova" && combat) {
      combat.events.push({ t: "emp", x: player.x, y: player.y, aoe: 320, duration: 1.2, dmg: 28, ownerId: player.netId, team: player.team });
      combat.effects.push({ type: "empRing", x: player.x, y: player.y, r: 0, maxR: 320, life: 0.55, color: "#ff2d95" });
      if (api.novaDamage) api.novaDamage(player, 320, 28);
      return true;
    }
    if (effectId === "gravity" && combat) {
      combat.effects.push({
        type: "blackhole", x: player.x + Math.cos(player.angle) * 120,
        y: player.y + Math.sin(player.angle) * 120,
        r: 40, maxR: 200, life: 5, pull: 520, dmg: 0.2,
        ownerId: player.netId, team: player.team,
      });
      return true;
    }
    if (effectId === "mirror" && combat && combat._spawnDecoy) {
      for (var m = 0; m < 2; m++) combat._spawnDecoy(player, global.WWNWeapons.decoy);
      return true;
    }
    if (effectId === "terminal") {
      if (global.WWNTerminal) WWNTerminal.open(api);
      return true;
    }
    return false;
  }
  global.WWNSecret = {
    onKey: onKey,
    tryResolve: tryResolve,
    applyEffect: applyEffect,
    isUnlocked: function (id) { return !!unlocked[id]; },
    getUnlockedList: function () {
      return Object.keys(unlocked).filter(function (k) { return unlocked[k]; });
    },
    getMeta: function (id) {
      return EFFECT_META[id] || { name: id, slot: "secret" };
    },
    unlock: _unlock,
    listPhrasesDev: function () {
      return PHRASES.map(function (p) { return p[0] + " → " + p[1]; });
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
