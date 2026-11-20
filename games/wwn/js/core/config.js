(function (global) {
  "use strict";
  global.WWNConfig = {
    WORLD_SIZE: 12000, BORDER_WARN: 500, MAX_SPEED: 440, ACCEL: 560, DRAG: 1.9,
    TURN_RATE: 3.45, BOOST_MULT: 1.82, BOOST_DRAIN: 30, BOOST_REGEN: 14, BOOST_MAX: 100,
    CAM_LOOKAHEAD: 110, CAM_SMOOTH: 9.5, HP_MAX: 100, SHIP_RADIUS: 18,
    SYNC_HZ: 25, INTERP_DELAY: 0.08, RESPAWN_SEC: 4,
    MAX_PROJECTILES: 220, MAX_PARTICLES: 220, MAX_MINES: 24, MAX_DECOYS: 12,
  };
  global.WWNWeapons = {
    vulcan: { id: "vulcan", slot: "main", name: "バルカン", dmg: 8, rate: 10, speed: 880, life: 1.15, heat: 7, cool: 25, overheat: 100, color: "#ffd700", radius: 3 },
    laser: { id: "laser", slot: "main", name: "レーザー", dmg: 26, rate: 3.5, speed: 0, life: 0.08, energy: 16, energyMax: 100, energyRegen: 20, color: "#00f5ff", width: 7, range: 950 },
    plasma: { id: "plasma", slot: "main", name: "プラズマ", dmg: 42, rate: 1.2, speed: 520, life: 1.6, heat: 24, cool: 25, overheat: 100, color: "#c77dff", radius: 10, aoe: 90 },
    missile: { id: "missile", slot: "sub", name: "追尾ミサイル", dmg: 34, speed: 430, life: 3.2, turn: 3.2, rate: 1, ammoMax: 8, reload: 5.5, color: "#ff6b6b", radius: 6, lockRange: 1000 },
    cluster: { id: "cluster", slot: "sub", name: "クラスター爆弾", dmg: 16, speed: 360, life: 1.8, rate: 1, ammoMax: 5, reload: 6, color: "#ffa94d", radius: 7, split: 5, aoe: 55 },
    emp: { id: "emp", slot: "sub", name: "EMPパルス", dmg: 18, aoe: 300, duration: 2.6, rate: 1, ammoMax: 3, reload: 9, color: "#9b5de5" },
    mine: { id: "mine", slot: "gadget", name: "空中機雷", dmg: 46, radius: 12, aoe: 75, armTime: 0.65, life: 22, rate: 1, ammoMax: 5, reload: 6, trigger: 70, color: "#ff6b6b" },
    stealth: { id: "stealth", slot: "gadget", name: "ステルス迷彩", duration: 5.5, cd: 14, cooldown: 12, color: "#a0aec0" },
    chaff: { id: "chaff", slot: "gadget", name: "チャフ・フレア", duration: 4.5, cd: 7, aoe: 280, ammoMax: 6, reload: 5, cooldown: 6, color: "#ffe066" },
    decoy: { id: "decoy", slot: "gadget", name: "デコイ", duration: 10, speed: 220, radius: 16, ammoMax: 4, reload: 8, color: "#ffb347" },
  };
  global.WWNWeaponOrder = {
    main: ["vulcan", "laser", "plasma"],
    sub: ["missile", "cluster", "emp"],
    gadget: ["mine", "stealth", "chaff", "decoy"],
  };
})(typeof window !== "undefined" ? window : globalThis);
