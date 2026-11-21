(function (global) {
  "use strict";
  global.WWNConfig = {
    WORLD_SIZE: 9000, BORDER_WARN: 400, MAX_SPEED: 440, ACCEL: 560, DRAG: 1.9,
    TURN_RATE: 3.45, BOOST_MULT: 1.82, BOOST_DRAIN: 30, BOOST_REGEN: 14, BOOST_MAX: 100,
    CAM_LOOKAHEAD: 110, CAM_SMOOTH: 9.5, HP_MAX: 560, SHIP_RADIUS: 18,
    SYNC_HZ: 25, INTERP_DELAY: 0.1, RESPAWN_SEC: 3.2,
    MAX_PROJECTILES: 180, MAX_PARTICLES: 120, MAX_MINES: 18, MAX_DECOYS: 8,
  };
  global.WWNWeapons = {
    vulcan: { id: "vulcan", slot: "main", name: "バルカン", dmg: 9, rate: 11, speed: 920, life: 1.15, heat: 7, cool: 28, overheat: 100, color: "#ffd700", radius: 3.5 },
    laser: { id: "laser", slot: "main", name: "レーザー", dmg: 22, rate: 2.4, speed: 0, life: 0.1, energy: 20, energyMax: 100, energyRegen: 20, color: "#00f5ff", width: 5, range: 900 },
    plasma: { id: "plasma", slot: "main", name: "プラズマ", dmg: 28, rate: 0.55, speed: 480, life: 1.5, heat: 38, cool: 20, overheat: 100, energy: 28, color: "#c77dff", radius: 10, aoe: 72 },
    missile: { id: "missile", slot: "sub", name: "追尾ミサイル", dmg: 22, speed: 410, life: 3, turn: 2.7, rate: 0.75, ammoMax: 6, reload: 6, color: "#ff6b6b", radius: 5, lockRange: 850 },
    cluster: { id: "cluster", slot: "sub", name: "クラスター爆弾", dmg: 12, speed: 340, life: 1.7, rate: 0.8, ammoMax: 4, reload: 7, color: "#ffa94d", radius: 6, split: 5, aoe: 42 },
    emp: { id: "emp", slot: "sub", name: "EMPパルス", dmg: 12, aoe: 280, duration: 2.8, rate: 0.5, ammoMax: 3, reload: 9, color: "#9b5de5" },
    mine: { id: "mine", slot: "gadget", name: "空中機雷", dmg: 32, radius: 11, aoe: 62, armTime: 0.8, life: 20, rate: 0.8, ammoMax: 4, reload: 8, fuse: 55, color: "#ff6b6b" },
    stealth: { id: "stealth", slot: "gadget", name: "ステルス迷彩", duration: 5.5, cd: 14, cooldown: 13, color: "#a0aec0" },
    chaff: { id: "chaff", slot: "gadget", name: "チャフ・フレア", duration: 4.5, cd: 7, aoe: 280, ammoMax: 5, reload: 6, cooldown: 7, color: "#ffe066" },
    decoy: { id: "decoy", slot: "gadget", name: "デコイ", duration: 9, speed: 200, radius: 16, ammoMax: 3, reload: 9, color: "#ffb347" },
  };
  global.WWNWeaponOrder = { main: ["vulcan", "laser", "plasma"], sub: ["missile", "cluster", "emp"], gadget: ["mine", "stealth", "chaff", "decoy"] };
})(typeof window !== "undefined" ? window : globalThis);
