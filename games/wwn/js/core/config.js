(function (global) {
  "use strict";
  global.WWNConfig = {
    WORLD_SIZE: 6000,
    BORDER_WARN: 400,
    MAX_SPEED: 440,
    ACCEL: 560,
    DRAG: 1.9,
    TURN_RATE: 3.45,
    BOOST_MULT: 1.82,
    BOOST_DRAIN: 30,
    BOOST_REGEN: 14,
    BOOST_MAX: 100,
    CAM_LOOKAHEAD: 110,
    CAM_SMOOTH: 9.5,
    HP_MAX: 100,
    SHIP_RADIUS: 18,
    SYNC_HZ: 25,
    INTERP_DELAY: 0.08,
    RESPAWN_SEC: 4,
    MAX_PROJECTILES: 120,
    MAX_PARTICLES: 180,
    MAX_MINES: 24,
    MAX_DECOYS: 12,
  };

  global.WWNWeapons = {
    vulcan: {
      id: "vulcan", slot: "main", name: "バルカン",
      dmg: 5, rate: 11, speed: 880, life: 1.15, heat: 9, cool: 20, overheat: 100,
      color: "#ffd700", radius: 3,
    },
    laser: {
      id: "laser", slot: "main", name: "レーザー",
      dmg: 12, rate: 3.5, speed: 0, life: 0.05, energy: 22, energyMax: 100, energyRegen: 12,
      color: "#00f5ff", width: 3, range: 700,
    },
    plasma: {
      id: "plasma", slot: "main", name: "プラズマ",
      dmg: 24, rate: 1.2, speed: 400, life: 1.5, aoe: 85, energy: 38, energyMax: 100, energyRegen: 11,
      color: "#9b5de5", radius: 10,
    },
    missile: {
      id: "missile", slot: "sub", name: "追尾ミサイル",
      dmg: 32, rate: 0.55, speed: 360, life: 3.2, lockRange: 820, turn: 3.4, ammo: 5, ammoMax: 5, reload: 10,
      color: "#ff2d95", radius: 5,
    },
    cluster: {
      id: "cluster", slot: "sub", name: "クラスター",
      dmg: 12, rate: 0.9, speed: 320, life: 2.2, splits: 6, aoe: 55, ammo: 4, ammoMax: 4, reload: 10,
      color: "#ff8c42", radius: 7,
    },
    emp: {
      id: "emp", slot: "sub", name: "EMPパルス",
      dmg: 6, rate: 0.3, life: 0.55, aoe: 240, duration: 2.8, ammo: 2, ammoMax: 2, reload: 14,
      color: "#7df9ff", radius: 0,
    },
    mine: {
      id: "mine", slot: "gadget", name: "空中機雷",
      dmg: 45, rate: 0.5, aoe: 70, armTime: 0.8, ammo: 5, ammoMax: 5, reload: 6,
      color: "#ff6b6b", radius: 12,
    },
    stealth: {
      id: "stealth", slot: "gadget", name: "ステルス",
      duration: 5, cooldown: 14, energy: 40,
      color: "#a0a0ff",
    },
    chaff: {
      id: "chaff", slot: "gadget", name: "チャフ",
      duration: 3.2, cooldown: 7, ammo: 4, ammoMax: 4, reload: 6,
      color: "#e8e8e8",
    },
    decoy: {
      id: "decoy", slot: "gadget", name: "デコイ",
      duration: 10, cooldown: 10, ammo: 3, ammoMax: 3, reload: 8, speed: 220,
      color: "#ffb347", radius: 16,
    },
  };

  global.WWNWeaponOrder = {
    main: ["vulcan", "laser", "plasma"],
    sub: ["missile", "cluster", "emp"],
    gadget: ["mine", "stealth", "chaff", "decoy"],
  };
})(typeof window !== "undefined" ? window : globalThis);
