(function (global) {
  "use strict";

  const keys = Object.create(null);
  let pointerX = 0;
  let pointerY = 0;
  let pointerDown = false;
  let canvas = null;

  const stick = {
    active: false,
    id: null,
    ox: 0,
    oy: 0,
    dx: 0,
    dy: 0,
    maxR: 56,
  };

  function bind(targetCanvas) {
    canvas = targetCanvas;
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearKeys);
    if (canvas) {
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
    }
  }

  function unbind() {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", clearKeys);
  }

  function onKeyDown(e) {
    keys[e.code] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].indexOf(e.code) >= 0) {
      e.preventDefault();
    }
  }
  function onKeyUp(e) {
    keys[e.code] = false;
  }
  function clearKeys() {
    Object.keys(keys).forEach(function (k) {
      keys[k] = false;
    });
  }

  function onPointerDown(e) {
    pointerDown = true;
    const rect = canvas.getBoundingClientRect();
    pointerX = e.clientX - rect.left;
    pointerY = e.clientY - rect.top;
    if (pointerX < rect.width * 0.45) {
      stick.active = true;
      stick.id = e.pointerId;
      stick.ox = pointerX;
      stick.oy = pointerY;
      stick.dx = 0;
      stick.dy = 0;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (_) {}
    }
  }
  function onPointerMove(e) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    pointerX = e.clientX - rect.left;
    pointerY = e.clientY - rect.top;
    if (stick.active && e.pointerId === stick.id) {
      let dx = pointerX - stick.ox;
      let dy = pointerY - stick.oy;
      const len = Math.hypot(dx, dy) || 1;
      if (len > stick.maxR) {
        dx = (dx / len) * stick.maxR;
        dy = (dy / len) * stick.maxR;
      }
      stick.dx = dx / stick.maxR;
      stick.dy = dy / stick.maxR;
    }
  }
  function onPointerUp(e) {
    pointerDown = false;
    if (stick.active && (e.pointerId === stick.id || e.type === "pointercancel")) {
      stick.active = false;
      stick.dx = 0;
      stick.dy = 0;
      stick.id = null;
    }
  }

  function getAxis() {
    let x = 0;
    let y = 0;
    if (keys["KeyA"] || keys["ArrowLeft"]) x -= 1;
    if (keys["KeyD"] || keys["ArrowRight"]) x += 1;
    if (keys["KeyW"] || keys["ArrowUp"]) y -= 1;
    if (keys["KeyS"] || keys["ArrowDown"]) y += 1;
    if (stick.active) {
      x += stick.dx;
      y += stick.dy;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x: x, y: y };
  }

  function isBoost() {
    return !!(keys["ShiftLeft"] || keys["ShiftRight"] || keys["Space"]);
  }

  function getPointer() {
    return { x: pointerX, y: pointerY, down: pointerDown };
  }

  function getStick() {
    return stick;
  }

  global.WWNInput = {
    bind: bind,
    unbind: unbind,
    getAxis: getAxis,
    isBoost: isBoost,
    getPointer: getPointer,
    getStick: getStick,
  };
})(typeof window !== "undefined" ? window : globalThis);
