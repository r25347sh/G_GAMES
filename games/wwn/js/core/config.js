(function (global) {
  "use strict";
  global.WWNConfig = {
    WORLD_SIZE: 6000,
    BORDER_WARN: 400,
    MAX_SPEED: 420,
    ACCEL: 520,
    DRAG: 1.85,
    TURN_RATE: 3.2,
    BOOST_MULT: 1.75,
    BOOST_DRAIN: 28,
    BOOST_REGEN: 12,
    BOOST_MAX: 100,
    CAM_LOOKAHEAD: 90,
    CAM_SMOOTH: 8,
    HP_MAX: 100,
    SHIP_RADIUS: 18,
  };
})(typeof window !== "undefined" ? window : globalThis);
