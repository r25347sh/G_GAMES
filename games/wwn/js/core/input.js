(function (global) {
  "use strict";
  var keys = Object.create(null);
  var just = Object.create(null);
  var canvas = null;
  var fireMainHold = false;
  var stick = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0, maxR: 56 };
  function bind(targetCanvas) {
    canvas = targetCanvas;
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", clearKeys);
    window.addEventListener("keypress", onKeyPress);
    if (canvas) {
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
      canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    }
  }
  function unbind() {
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
    window.removeEventListener("blur", clearKeys);
    window.removeEventListener("keypress", onKeyPress);
  }
  function onKeyDown(e) {
    if (!keys[e.code]) just[e.code] = true;
    keys[e.code] = true;
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].indexOf(e.code) >= 0) e.preventDefault();
  }
  function onKeyUp(e) { keys[e.code] = false; }
  function clearKeys() { Object.keys(keys).forEach(function (k) { keys[k] = false; }); }
  function onKeyPress(e) {
    if (global.WWNSecret && e.key && e.key.length === 1) global.WWNSecret.onKey(e.key);
  }
  function onPointerDown(e) {
    var rect = canvas.getBoundingClientRect();
    var px = e.clientX - rect.left, py = e.clientY - rect.top;
    if (px < rect.width * 0.42) {
      stick.active = true; stick.id = e.pointerId; stick.ox = px; stick.oy = py; stick.dx = 0; stick.dy = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    } else if (px > rect.width * 0.55) fireMainHold = true;
  }
  function onPointerMove(e) {
    if (!canvas || !stick.active || e.pointerId !== stick.id) return;
    var rect = canvas.getBoundingClientRect();
    var px = e.clientX - rect.left, py = e.clientY - rect.top;
    var dx = px - stick.ox, dy = py - stick.oy;
    var len = Math.hypot(dx, dy) || 1;
    if (len > stick.maxR) { dx = (dx / len) * stick.maxR; dy = (dy / len) * stick.maxR; }
    stick.dx = dx / stick.maxR; stick.dy = dy / stick.maxR;
  }
  function onPointerUp(e) {
    fireMainHold = false;
    if (stick.active && (e.pointerId === stick.id || e.type === "pointercancel")) {
      stick.active = false; stick.dx = 0; stick.dy = 0; stick.id = null;
    }
  }
  function getFlight() {
    var turn = 0, thrust = 0;
    if (keys["KeyA"] || keys["ArrowLeft"]) turn -= 1;
    if (keys["KeyD"] || keys["ArrowRight"]) turn += 1;
    if (keys["KeyW"] || keys["ArrowUp"]) thrust += 1;
    if (keys["KeyS"] || keys["ArrowDown"]) thrust -= 1;
    if (stick.active) { turn += stick.dx; thrust += -stick.dy; }
    return { turn: Math.max(-1, Math.min(1, turn)), thrust: Math.max(-1, Math.min(1, thrust)) };
  }
  function isBoost() { return !!(keys["KeyB"] || keys["ShiftLeft"] || keys["ShiftRight"]); }
  function consumeFireMain() { return !!(fireMainHold || keys["KeyQ"] || keys["Space"]); }
  function consumeFireSub() {
    if (just["KeyF"]) { just["KeyF"] = false; return true; }
    return false;
  }
  function consumeFireGadget() {
    if (just["KeyE"] || just["KeyG"]) { just["KeyE"] = false; just["KeyG"] = false; return true; }
    return false;
  }
  function consumeCycleMain() { if (just["Digit1"]) { just["Digit1"] = false; return true; } return false; }
  function consumeCycleSub() { if (just["Digit2"]) { just["Digit2"] = false; return true; } return false; }
  function consumeCycleGadget() { if (just["Digit3"]) { just["Digit3"] = false; return true; } return false; }
  function consumeCycleSecret() { if (just["Digit4"]) { just["Digit4"] = false; return true; } return false; }
  function consumeFireSecret() { if (just["KeyR"]) { just["KeyR"] = false; return true; } return false; }
  function getStick() { return stick; }
  function endFrame() { Object.keys(just).forEach(function (k) { just[k] = false; }); }
  function getAxis() { var f = getFlight(); return { x: f.turn, y: -f.thrust }; }
  global.WWNInput = {
    bind: bind, unbind: unbind, getFlight: getFlight, getAxis: getAxis, isBoost: isBoost,
    getStick: getStick, consumeFireMain: consumeFireMain, consumeFireSub: consumeFireSub,
    consumeFireGadget: consumeFireGadget, consumeCycleMain: consumeCycleMain,
    consumeCycleSub: consumeCycleSub, consumeCycleGadget: consumeCycleGadget,
    consumeCycleSecret: consumeCycleSecret, consumeFireSecret: consumeFireSecret, endFrame: endFrame,
  };
})(typeof window !== "undefined" ? window : globalThis);
