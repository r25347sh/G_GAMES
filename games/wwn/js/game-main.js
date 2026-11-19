(function () {
  "use strict";
  var canvas, ctx, loop, player, camera, world, active = false;
  var els = {};
  function $(id) {
    return document.getElementById(id);
  }
  function initDom() {
    els.gameLayer = $("game-layer");
    canvas = $("game-canvas");
    els.hudHp = $("hud-hp");
    els.hudBoost = $("hud-boost");
    els.hudSpeed = $("hud-speed");
    els.hudCoord = $("hud-coord");
    els.hudFps = $("hud-fps");
    els.btnExit = $("btn-exit-game");
    els.borderWarn = $("border-warn");
    if (!canvas) return false;
    ctx = canvas.getContext("2d");
    return true;
  }
  function resize() {
    if (!canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (camera) camera.resize(w, h);
  }
  function startGame() {
    if (!initDom() || active) return;
    active = true;
    els.gameLayer.classList.remove("hidden");
    document.body.classList.add("in-game");
    player = new WWNPlayer(0, 0);
    camera = new WWNCamera();
    world = new WWNWorld();
    resize();
    WWNInput.bind(canvas);
    loop = new WWNGameLoop(update, render);
    loop.start();
    if (els.btnExit) els.btnExit.onclick = stopGame;
    window.addEventListener("resize", resize);
  }
  function stopGame() {
    active = false;
    if (loop) loop.stop();
    WWNInput.unbind();
    window.removeEventListener("resize", resize);
    if (els.gameLayer) els.gameLayer.classList.add("hidden");
    document.body.classList.remove("in-game");
  }
  function update(dt) {
    var axis = WWNInput.getAxis();
    var boost = WWNInput.isBoost();
    player.update(dt, axis, boost);
    camera.follow(player, dt);

    var C = WWNConfig;
    var half = C.WORLD_SIZE / 2;
    var distEdge = Math.min(half - Math.abs(player.x), half - Math.abs(player.y));
    if (els.borderWarn) {
      if (distEdge < C.BORDER_WARN) {
        els.borderWarn.classList.add("show");
        els.borderWarn.textContent =
          "境界接近 · あと " + Math.max(0, Math.round(distEdge)) + " m";
      } else {
        els.borderWarn.classList.remove("show");
      }
    }

    if (els.hudHp) els.hudHp.style.width = (player.hp / C.HP_MAX) * 100 + "%";
    if (els.hudBoost) {
      els.hudBoost.style.width = (player.boost / C.BOOST_MAX) * 100 + "%";
      els.hudBoost.classList.toggle("draining", player.boosting);
    }
    if (els.hudSpeed) els.hudSpeed.textContent = Math.round(player.speed) + " u/s";
    if (els.hudCoord)
      els.hudCoord.textContent = Math.round(player.x) + " , " + Math.round(player.y);
    if (els.hudFps && loop) els.hudFps.textContent = loop.fps + " fps";
  }
  function render() {
    var w = camera.w;
    var h = camera.h;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-w / 2, -h / 2);
    camera.applyShake(ctx);
    world.draw(ctx, camera);
    player.draw(ctx, camera);

    var stick = WWNInput.getStick();
    if (stick.active) {
      ctx.beginPath();
      ctx.arc(stick.ox, stick.oy, stick.maxR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,245,255,0.28)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(
        stick.ox + stick.dx * stick.maxR,
        stick.oy + stick.dy * stick.maxR,
        18,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = "rgba(0,245,255,0.38)";
      ctx.fill();
    }
    ctx.restore();
  }
  window.WWNGame = {
    start: startGame,
    stop: stopGame,
    isActive: function () {
      return active;
    },
  };
})();
