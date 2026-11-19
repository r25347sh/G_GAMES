(function (global) {
  "use strict";
  global.WWNConfig = {
    WORLD_SIZE: 12000,
    BORDER_WARN: 500,
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
      dmg: 28, rate: 1.2, speed: 420, life: 1.6, heat: 28, cool: 18, overheat: 100,
      color: "#c77dff", radius: 10, aoe: 70,
    },
    missile: {
      id: "missile", slot: "sub", name: "追尾ミサイル",
      dmg: 22, speed: 380, life: 3.2, turn: 2.8, ammoMax: 6, reload: 5.5,
      color: "#ff6b6b", radius: 5, lockRange: 700,
    },
    cluster: {
      id: "cluster", slot: "sub", name: "クラスター爆弾",
      dmg: 10, speed: 300, life: 1.8, ammoMax: 4, reload: 6,
      color: "#ffa94d", radius: 6, split: 5, aoe: 40,
    },
    emp: {
      id: "emp", slot: "sub", name: "EMPパルス",
      dmg: 8, aoe: 260, duration: 3.2, ammoMax: 2, reload: 10,
      color: "#9b5de5",
    },
    mine: {
      id: "mine", slot: "gadget", name: "空中機雷",
      dmg: 35, radius: 28, life: 25, ammoMax: 4, reload: 7, trigger: 70,
      color: "#ffd700",
    },
    stealth: {
      id: "stealth", slot: "gadget", name: "ステルス迷彩",
      duration: 5.5, cd: 14, color: "#a0aec0",
    },
    chaff: {
      id: "chaff", slot: "gadget", name: "チャフ・フレア",
      duration: 2.5, cd: 8, aoe: 200, color: "#ffe066",
    },
    decoy: {
      id: "decoy", slot: "gadget", name: "デコイ",
      duration: 10, speed: 180, radius: 16, ammoMax: 3, reload: 9,
      color: "#ffb347",
    },
  };

  global.WWNWeaponOrder = {
    main: ["vulcan", "laser", "plasma"],
    sub: ["missile", "cluster", "emp"],
    gadget: ["mine", "stealth", "chaff", "decoy"],
  };
})(typeof window !== "undefined" ? window : globalThis);
