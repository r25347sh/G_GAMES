(function (global) {
  "use strict";
  var keys = Object.create(null);
  var just = Object.create(null);
  var canvas = null;
  var firePointers = Object.create(null);
  var stick = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0, maxR: 56 };
  var bound = false;

  function bind(targetCanvas) {
    if (bound) unbind();
    canvas = targetCanvas;
    bound = true;
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", clearKeys);
    window.addEventListener("keypress", onKeyPress);
    if (canvas) {
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
      canvas.addEventListener("lostpointercapture", onPointerUp);
      canvas.addEventListener("contextmenu", preventDefault);
    }
  }
  function preventDefault(e) { e.preventDefault(); }
  function unbind() {
    if (!bound) return;
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
    window.removeEventListener("blur", clearKeys);
    window.removeEventListener("keypress", onKeyPress);
    if (canvas) {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("lostpointercapture", onPointerUp);
      canvas.removeEventListener("contextmenu", preventDefault);
    }
    bound = false; canvas = null; clearKeys();
    stick.active = false; stick.id = null; stick.dx = stick.dy = 0;
    firePointers = Object.create(null);
  }
  function isTyping(target) {
    return !!(target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)));
  }
  function onKeyDown(e) {
    if (isTyping(e.target) || (global.WWNTerminal && global.WWNTerminal.isOpen && global.WWNTerminal.isOpen())) return;
    if (!keys[e.code]) just[e.code] = true;
    keys[e.code] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyQ", "KeyJ", "KeyF", "KeyK", "KeyE", "KeyG", "KeyL", "KeyR", "Digit1", "Digit2", "Digit3", "Digit4"].indexOf(e.code) >= 0) e.preventDefault();
  }
  function onKeyUp(e) { keys[e.code] = false; }
  function clearKeys() {
    Object.keys(keys).forEach(function (k) { keys[k] = false; });
    Object.keys(just).forEach(function (k) { just[k] = false; });
    firePointers = Object.create(null);
  }
  function onKeyPress(e) {
    if (global.WWNSecret && e.key && e.key.length === 1) global.WWNSecret.onKey(e.key);
  }
  function onPointerDown(e) {
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    var px = e.clientX - rect.left, py = e.clientY - rect.top;
    if (px < rect.width * 0.42 && !stick.active) {
      stick.active = true; stick.id = e.pointerId; stick.ox = px; stick.oy = py; stick.dx = 0; stick.dy = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    } else if (px > rect.width * 0.55) {
      firePointers[e.pointerId] = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    }
    if (e.cancelable) e.preventDefault();
  }
  function onPointerMove(e) {
    if (!canvas || !stick.active || e.pointerId !== stick.id) return;
    var rect = canvas.getBoundingClientRect();
    var dx = e.clientX - rect.left - stick.ox, dy = e.clientY - rect.top - stick.oy;
    var len = Math.hypot(dx, dy) || 1;
    if (len > stick.maxR) { dx = dx / len * stick.maxR; dy = dy / len * stick.maxR; }
    stick.dx = dx / stick.maxR; stick.dy = dy / stick.maxR;
    if (e.cancelable) e.preventDefault();
  }
  function onPointerUp(e) {
    delete firePointers[e.pointerId];
    if (stick.active && (e.pointerId === stick.id || e.type === "pointercancel" || e.type === "lostpointercapture")) {
      stick.active = false; stick.dx = 0; stick.dy = 0; stick.id = null;
    }
  }
  function getFlight() {
    var turn = 0, thrust = 0;
    if (keys.KeyA || keys.ArrowLeft) turn -= 1;
    if (keys.KeyD || keys.ArrowRight) turn += 1;
    if (keys.KeyW || keys.ArrowUp) thrust += 1;
    if (keys.KeyS || keys.ArrowDown) thrust -= 1;
    if (stick.active) { turn += stick.dx; thrust -= stick.dy; }
    return { turn: Math.max(-1, Math.min(1, turn)), thrust: Math.max(-1, Math.min(1, thrust)) };
  }
  function isBoost() { return !!(keys.KeyB || keys.ShiftLeft || keys.ShiftRight || keys.Space); }
  function consumeFireMain() { return !!(firePointers && Object.keys(firePointers).length || keys.KeyQ || keys.KeyJ); }
  function consumeAny(codes) {
    for (var i = 0; i < codes.length; i++) {
      if (just[codes[i]]) { just[codes[i]] = false; return true; }
    }
    return false;
  }
  function consumeFireSub() { return consumeAny(["KeyF", "KeyK"]); }
  function consumeFireGadget() { return consumeAny(["KeyE", "KeyG", "KeyL"]); }
  function consumeCycleMain() { return consumeAny(["Digit1"]); }
  function consumeCycleSub() { return consumeAny(["Digit2"]); }
  function consumeCycleGadget() { return consumeAny(["Digit3"]); }
  function consumeCycleSecret() { return consumeAny(["Digit4"]); }
  function consumeFireSecret() { return consumeAny(["KeyR"]); }
  function getStick() { return stick; }
  function endFrame() { Object.keys(just).forEach(function (k) { just[k] = false; }); }
  function getAxis() { var f = getFlight(); return { x: f.turn, y: -f.thrust }; }
  global.WWNInput = {
    bind: bind, unbind: unbind, getFlight: getFlight, getAxis: getAxis, isBoost: isBoost,
    getStick: getStick, consumeFireMain: consumeFireMain, consumeFireSub: consumeFireSub,
    consumeFireGadget: consumeFireGadget, consumeCycleMain: consumeCycleMain,
    consumeCycleSub: consumeCycleSub, consumeCycleGadget: consumeCycleGadget,
    consumeCycleSecret: consumeCycleSecret, consumeFireSecret: consumeFireSecret,
    endFrame: endFrame,
  };
})(typeof window !== "undefined" ? window : globalThis);
