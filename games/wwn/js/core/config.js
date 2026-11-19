(function (global) {
  "use strict";
  global.WWNConfig = {
    WORLD_SIZE: 6000, BORDER_WARN: 400, MAX_SPEED: 440, ACCEL: 560, DRAG: 1.9,
    TURN_RATE: 3.45, BOOST_MULT: 1.82, BOOST_DRAIN: 30, BOOST_REGEN: 14, BOOST_MAX: 100,
    CAM_LOOKAHEAD: 110, CAM_SMOOTH: 9.5, HP_MAX: 100, SHIP_RADIUS: 18,
    SYNC_HZ: 25, INTERP_DELAY: 0.08, RESPAWN_SEC: 4,
    MAX_PROJECTILES: 120, MAX_PARTICLES: 180, MAX_MINES: 24, MAX_DECOYS: 12,
  };
  global.WWNWeapons = {
    vulcan: { id:"vulcan", slot:"main", name:"バルカン", dmg:6, rate:12, speed:900, life:1.2, heat:8, cool:22, overheat:100, color:"#ffd700", radius:3 },
    laser: { id:"laser", slot:"main", name:"レーザー", dmg:14, rate:4, speed:0, life:0.05, energy:18, energyMax:100, energyRegen:14, color:"#00f5ff", width:3, range:700 },
    plasma: { id:"plasma", slot:"main", name:"プラズマ", dmg:28, rate:1.4, speed:420, life:1.6, aoe:90, energy:35, energyMax:100, energyRegen:10, color:"#9b5de5", radius:10 },
    missile: { id:"missile", slot:"sub", name:"追尾ミサイル", dmg:40, rate:0.7, speed:380, life:3.5, lockRange:900, turn:4.2, ammo:6, ammoMax:6, reload:8, color:"#ff2d95", radius:5 },
    cluster: { id:"cluster", slot:"sub", name:"クラスター", dmg:12, rate:0.9, speed:320, life:2.2, splits:6, aoe:55, ammo:4, ammoMax:4, reload:10, color:"#ff8c42", radius:7 },
    emp: { id:"emp", slot:"sub", name:"EMPパルス", dmg:8, rate:0.35, life:0.6, aoe:280, duration:3.5, ammo:3, ammoMax:3, reload:12, color:"#7df9ff", radius:0 },
    mine: { id:"mine", slot:"gadget", name:"空中機雷", dmg:45, rate:0.5, aoe:70, armTime:0.8, ammo:5, ammoMax:5, reload:6, color:"#ff6b6b", radius:12 },
    stealth: { id:"stealth", slot:"gadget", name:"ステルス", duration:5, cooldown:14, energy:40, color:"#a0a0ff" },
    chaff: { id:"chaff", slot:"gadget", name:"チャフ", duration:2.5, cooldown:8, ammo:4, ammoMax:4, reload:7, color:"#e8e8e8" },
    decoy: { id:"decoy", slot:"gadget", name:"デコイ", duration:8, cooldown:12, ammo:3, ammoMax:3, reload:9, speed:180, color:"#ffb347", radius:16 },
  };
  global.WWNWeaponOrder = {
    main: ["vulcan","laser","plasma"],
    sub: ["missile","cluster","emp"],
    gadget: ["mine","stealth","chaff","decoy"],
  };
})(typeof window !== "undefined" ? window : globalThis);
