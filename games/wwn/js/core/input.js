(function (global) {
  "use strict";
  var keys = Object.create(null);
  var pointerX = 0, pointerY = 0, pointerDown = false;
  var canvas = null;
  var fireMain = false;
  var just = Object.create(null);
  var stick = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0, maxR: 56 };
  var fireBtn = { active: false };
  function bind(targetCanvas) {
    canvas = targetCanvas;
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
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
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
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
    pointerDown = true;
    var rect = canvas.getBoundingClientRect();
    pointerX = e.clientX - rect.left; pointerY = e.clientY - rect.top;
    if (pointerX < rect.width * 0.4) {
      stick.active = true; stick.id = e.pointerId; stick.ox = pointerX; stick.oy = pointerY; stick.dx = 0; stick.dy = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    } else if (pointerX > rect.width * 0.65 && pointerY > rect.height * 0.55) {
      fireBtn.active = true; fireMain = true;
    }
  }
  function onPointerMove(e) {
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    pointerX = e.clientX - rect.left; pointerY = e.clientY - rect.top;
    if (stick.active && e.pointerId === stick.id) {
      var dx = pointerX - stick.ox, dy = pointerY - stick.oy;
      var len = Math.hypot(dx, dy) || 1;
      if (len > stick.maxR) { dx = (dx / len) * stick.maxR; dy = (dy / len) * stick.maxR; }
      stick.dx = dx / stick.maxR; stick.dy = dy / stick.maxR;
    }
  }
  function onPointerUp(e) {
    pointerDown = false; fireBtn.active = false; fireMain = false;
    if (stick.active && (e.pointerId === stick.id || e.type === "pointercancel")) {
      stick.active = false; stick.dx = 0; stick.dy = 0; stick.id = null;
    }
  }
  function getAxis() {
    var x = 0, y = 0;
    if (keys["KeyA"] || keys["ArrowLeft"]) x -= 1;
    if (keys["KeyD"] || keys["ArrowRight"]) x += 1;
    if (keys["KeyW"] || keys["ArrowUp"]) y -= 1;
    if (keys["KeyS"] || keys["ArrowDown"]) y += 1;
    if (stick.active) { x += stick.dx; y += stick.dy; }
    var len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x: x, y: y };
  }
  function isBoost() { return !!(keys["ShiftLeft"] || keys["ShiftRight"] || keys["Space"]); }
  function consumeFireMain() { return !!(fireMain || keys["KeyJ"] || keys["ControlLeft"]); }
  function consumeFireSub() {
    if (just["KeyK"] || just["KeyE"]) { just["KeyK"] = false; just["KeyE"] = false; return true; }
    return false;
  }
  function consumeFireGadget() {
    if (just["KeyL"] || just["KeyQ"] || just["KeyF"]) {
      just["KeyL"] = false; just["KeyQ"] = false; just["KeyF"] = false; return true;
    }
    return false;
  }
  function consumeCycleMain() { if (just["Digit1"]) { just["Digit1"] = false; return true; } return false; }
  function consumeCycleSub() { if (just["Digit2"]) { just["Digit2"] = false; return true; } return false; }
  function consumeCycleGadget() { if (just["Digit3"]) { just["Digit3"] = false; return true; } return false; }
  function getStick() { return stick; }
  function endFrame() { Object.keys(just).forEach(function (k) { just[k] = false; }); }
  global.WWNInput = {
    bind: bind, unbind: unbind, getAxis: getAxis, isBoost: isBoost, getStick: getStick,
    consumeFireMain: consumeFireMain, consumeFireSub: consumeFireSub, consumeFireGadget: consumeFireGadget,
    consumeCycleMain: consumeCycleMain, consumeCycleSub: consumeCycleSub, consumeCycleGadget: consumeCycleGadget,
    endFrame: endFrame,
  };
})(typeof window !== "undefined" ? window : globalThis);
