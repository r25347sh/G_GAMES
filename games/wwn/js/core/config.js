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
  };
})(typeof window !== "undefined" ? window : globalThis);
