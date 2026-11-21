(function () {
  "use strict";
  var secretBuffer = "", secretLast = 0;
  var WINGMAN_HASH = "5d86d506f4f54726d14d3ff3621922e97dfe6124ef8d24a140808107af89a3a2";
  var trail = [], shadows = [], gimmicks = [];
  var GIMMICK_TYPES = ["spin", "fakehp", "warp", "slow", "flipctrl", "noise"];
  function digest(text) {
    if (!window.crypto || !crypto.subtle || !window.TextEncoder) return Promise.resolve("");
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || !e.key || e.key.length !== 1 || !/[a-z0-9]/i.test(e.key)) return;
    if (window.WWNTerminal && WWNTerminal.isOpen && WWNTerminal.isOpen()) return;
    var now = performance.now();
    if (now - secretLast > 3500) secretBuffer = "";
    secretLast = now;
    secretBuffer = (secretBuffer + e.key.toLowerCase()).slice(-20);
    if (secretBuffer.slice(-7) === "wingman") {
      secretBuffer = "";
      digest("wingman").then(function (hash) {
        if (hash === WINGMAN_HASH && window.WWNSecret) WWNSecret.unlock("wingman");
      });
    }
  }, true);
  function spawnKagebunshin() {
    shadows = [];
    for (var i = 0; i < 30; i++) shadows.push({ delay: 3 + i * 2, life: 18 });
    window.__wwnShadows = shadows;
  }
  function spawnRandomGimmick(player) {
    if (!player) return;
    var behind = player.angle + Math.PI;
    for (var i = 0; i < 5; i++) {
      var ang = behind + (Math.random() - 0.5) * 1.2;
      var d = 80 + Math.random() * 160 + i * 30;
      gimmicks.push({
        x: player.x + Math.cos(ang) * d, y: player.y + Math.sin(ang) * d,
        type: GIMMICK_TYPES[(Math.random() * GIMMICK_TYPES.length) | 0],
        life: 45, armed: true, pulse: Math.random() * 6.28
      });
    }
    window.__wwnGimmicks = gimmicks;
  }
  function applyGimmick(type, player) {
    if (type === "spin") player.angle += Math.PI;
    else if (type === "fakehp") { player.__fakeHpUntil = performance.now() / 1000 + 8; player.__fakeHpBonus = 20; }
    else if (type === "warp") {
      var half = ((window.WWNConfig && WWNConfig.WORLD_SIZE) || 9000) * 0.35;
      player.x = (Math.random() - 0.5) * half * 2; player.y = (Math.random() - 0.5) * half * 2;
      player.vx *= 0.2; player.vy *= 0.2;
    } else if (type === "slow") player.__slowUntil = performance.now() / 1000 + 4;
    else if (type === "flipctrl") player.__flipUntil = performance.now() / 1000 + 5;
    else if (type === "noise") player.__noiseUntil = performance.now() / 1000 + 3;
  }
  function tickShadows(player, dt) {
    if (!player || !player.alive) return;
    trail.push({ x: player.x, y: player.y, angle: player.angle });
    if (trail.length > 400) trail.shift();
    for (var i = shadows.length - 1; i >= 0; i--) {
      shadows[i].life -= dt; if (shadows[i].life <= 0) shadows.splice(i, 1);
    }
  }
  function tickGimmicks(player, dt) {
    if (!player) return;
    for (var i = gimmicks.length - 1; i >= 0; i--) {
      var g = gimmicks[i];
      g.life -= dt; g.pulse += dt * 3;
      if (g.life <= 0) { gimmicks.splice(i, 1); continue; }
      if (!g.armed || !player.alive) continue;
      if (Math.hypot(player.x - g.x, player.y - g.y) < 28) {
        g.armed = false; g.life = Math.min(g.life, 2); applyGimmick(g.type, player);
      }
    }
  }
  function drawShadows(ctx, cam) {
    if (!shadows.length || !trail.length) return;
    shadows.forEach(function (sh) {
      var idx = trail.length - 1 - sh.delay; if (idx < 0) return;
      var p = trail[idx];
      var sx = cam.sx ? cam.sx(p.x) : p.x - cam.x + cam.w / 2;
      var sy = cam.sy ? cam.sy(p.y) : p.y - cam.y + cam.h / 2;
      ctx.save(); ctx.globalAlpha = 0.28 * Math.min(1, sh.life / 4);
      ctx.translate(sx, sy); ctx.rotate(p.angle);
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-11, 9); ctx.lineTo(-5, 0); ctx.lineTo(-11, -9); ctx.closePath();
      ctx.fillStyle = "#9b8cff"; ctx.fill(); ctx.strokeStyle = "#c4b5fd"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    });
  }
  function drawGimmicks(ctx, cam) {
    gimmicks.forEach(function (g) {
      var sx = cam.sx ? cam.sx(g.x) : g.x - cam.x + cam.w / 2;
      var sy = cam.sy ? cam.sy(g.y) : g.y - cam.y + cam.h / 2;
      if (sx < -40 || sx > cam.w + 40 || sy < -40 || sy > cam.h + 40) return;
      ctx.save(); ctx.translate(sx, sy);
      var pulse = 1 + Math.sin(g.pulse) * 0.08; ctx.scale(pulse, pulse);
      ctx.fillStyle = g.armed ? "rgba(255, 220, 80, 0.9)" : "rgba(120,120,120,0.5)";
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(12, -6); ctx.lineTo(12, 8); ctx.lineTo(0, 16); ctx.lineTo(-12, 8); ctx.lineTo(-12, -6); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#1a1020"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("?", 0, 1);
      ctx.restore();
    });
  }
  function installSecretHooks() {
    if (!window.WWNSecret || WWNSecret.__extraHooks) return;
    var orig = WWNSecret.applyEffect.bind(WWNSecret);
    WWNSecret.applyEffect = function (id, player, combat, api) {
      api = Object.assign({}, api || {});
      if (id === "kagebunshin") { spawnKagebunshin(); return true; }
      if (id === "randomgimmick") { spawnRandomGimmick(player); return true; }
      if (id === "hive" || id === "hiveconvert") {
        if (api.hiveConvert) api.hiveConvert();
        return true;
      }
      if (id === "wingman") {
        var roles = window.WWNAllyRoleOrder || ["guardian", "striker", "phantom", "medic", "vanguard"];
        var list = window.__wwnAiList || [];
        if (player && window.WWNAiPilot) {
          for (var i = 0; i < 5; i++) {
            try {
              var bot = new WWNAiPilot("ally-" + roles[i] + "-" + i, "normal", i, "ALLY", roles[i]);
              bot.isAlly = true; bot.group = "ALLY"; bot.team = player.team || "BLUE";
              bot.roleIndex = i; bot.leaderId = player.netId;
              var a = player.angle + Math.PI + (i - 2) * 0.4, d = 70 + i * 14;
              bot.x = player.x + Math.cos(a) * d; bot.y = player.y + Math.sin(a) * d; bot.angle = player.angle;
              list.push(bot);
            } catch (e) {}
          }
        }
        return true;
      }
      return orig(id, player, combat, api);
    };
    WWNSecret.__extraHooks = true;
  }
  function frame() {
    installSecretHooks();
    var player = window.__wwnPlayer, cam = window.__wwnCamera, canvas = document.getElementById("game-canvas");
    if (player && window.WWNGame && WWNGame.isActive && WWNGame.isActive()) {
      tickShadows(player, 1 / 60); tickGimmicks(player, 1 / 60);
      if (player.__slowUntil && performance.now() / 1000 < player.__slowUntil) { player.vx *= 0.92; player.vy *= 0.92; }
      if (canvas && cam) {
        var ctx = canvas.getContext("2d");
        if (ctx) { drawShadows(ctx, cam); drawGimmicks(ctx, cam); }
      }
      if (player.__fakeHpUntil && performance.now() / 1000 < player.__fakeHpUntil) {
        var el = document.getElementById("hud-hp-text");
        if (el) {
          var max = (window.WWNConfig && WWNConfig.HP_MAX) || 320;
          el.textContent = Math.round(player.hp + (player.__fakeHpBonus || 20)) + " / " + max;
        }
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  setInterval(installSecretHooks, 400);
})();
