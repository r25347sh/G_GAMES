(function (global) {
  "use strict";
  global.WWNConfig = {
    WORLD_SIZE: 12000, BORDER_WARN: 500, MAX_SPEED: 440, ACCEL: 560, DRAG: 1.9,
    TURN_RATE: 3.45, BOOST_MULT: 1.82, BOOST_DRAIN: 30, BOOST_REGEN: 14, BOOST_MAX: 100,
    CAM_LOOKAHEAD: 110, CAM_SMOOTH: 9.5, HP_MAX: 100, SHIP_RADIUS: 18,
    SYNC_HZ: 20, INTERP_DELAY: 0.1, RESPAWN_SEC: 4,
    MAX_PROJECTILES: 140, MAX_PARTICLES: 120, MAX_MINES: 18, MAX_DECOYS: 8,
  };
  // Non-secret loadout: modest damage with meaningful weapon-specific tradeoffs.
  global.WWNWeapons = {
    vulcan: { id: "vulcan", slot: "main", name: "バルカン", dmg: 6, rate: 10, speed: 880, life: 1.1, heat: 8, cool: 25, overheat: 100, color: "#ffd700", radius: 3 },
    laser: { id: "laser", slot: "main", name: "レーザー", dmg: 17, rate: 3.0, speed: 0, life: 0.08, energy: 24, energyMax: 100, energyRegen: 18, color: "#00f5ff", width: 4, range: 820 },
    plasma: { id: "plasma", slot: "main", name: "プラズマ", dmg: 30, rate: 1.15, speed: 500, life: 1.45, heat: 27, cool: 22, overheat: 100, color: "#c77dff", radius: 9, aoe: 68 },
    missile: { id: "missile", slot: "sub", name: "追尾ミサイル", dmg: 25, speed: 410, life: 3, turn: 2.7, rate: 0.8, ammoMax: 6, reload: 6, color: "#ff6b6b", radius: 5, lockRange: 850 },
    cluster: { id: "cluster", slot: "sub", name: "クラスター爆弾", dmg: 11, speed: 340, life: 1.7, rate: 0.85, ammoMax: 4, reload: 7, color: "#ffa94d", radius: 6, split: 5, aoe: 42 },
    emp: { id: "emp", slot: "sub", name: "EMPパルス", dmg: 8, aoe: 250, duration: 2.2, rate: 0.65, ammoMax: 2, reload: 10, color: "#9b5de5" },
    mine: { id: "mine", slot: "gadget", name: "空中機雷", dmg: 30, radius: 11, aoe: 60, armTime: 0.8, life: 20, rate: 0.8, ammoMax: 4, reload: 8, trigger: 55, color: "#ff6b6b" },
    stealth: { id: "stealth", slot: "gadget", name: "ステルス迷彩", duration: 5.5, cd: 14, cooldown: 13, color: "#a0aec0" },
    chaff: { id: "chaff", slot: "gadget", name: "チャフ・フレア", duration: 4.5, cd: 7, aoe: 280, ammoMax: 5, reload: 6, cooldown: 7, color: "#ffe066" },
    decoy: { id: "decoy", slot: "gadget", name: "デコイ", duration: 9, speed: 200, radius: 16, ammoMax: 3, reload: 9, color: "#ffb347" },
  };
  global.WWNWeaponOrder = { main: ["vulcan", "laser", "plasma"], sub: ["missile", "cluster", "emp"], gadget: ["mine", "stealth", "chaff", "decoy"] };
})(typeof window !== "undefined" ? window : globalThis);
