(function () {
  "use strict";
  var styleCounter = 0, secretIdx = 0, lastHpWrite = 0;
  function patchAiCtor() {
    if (!window.WWNAiPilot || WWNAiPilot.__styled) return;
    var Orig = WWNAiPilot;
    function Wrapped(id, difficulty, styleIndex, group) {
      if (styleIndex == null) styleIndex = styleCounter++;
      Orig.call(this, id, difficulty, styleIndex, group);
    }
    Wrapped.prototype = Orig.prototype; Wrapped.__styled = true; window.WWNAiPilot = Wrapped;
  }
  function patchDecoy() {
    if (!window.WWNCombat || !WWNCombat.prototype || WWNCombat.prototype.__decoyPatched) return;
    WWNCombat.prototype._spawnDecoy = function (player, w) {
      var d = this.decoys.acquire();
      d.alive = true;
      d.id = "decoy-" + (player.netId || "local") + "-" + Math.floor(Math.random() * 1e6);
      d.x = player.x - Math.cos(player.angle) * 30; d.y = player.y - Math.sin(player.angle) * 30;
      var side = Math.random() < 0.5 ? 1 : -1;
      d.angle = player.angle + side * (0.4 + Math.random() * 0.5);
      var spd = (w.speed || 180) * (0.85 + Math.random() * 0.4);
      d.vx = Math.cos(d.angle) * spd + (player.vx || 0) * 0.5;
      d.vy = Math.sin(d.angle) * spd + (player.vy || 0) * 0.5;
      d.life = w.duration; d.hp = 35;
      d.ownerId = player.netId || "local"; d.team = player.team || "NONE";
      d.radius = w.radius || 16; d.turn = (Math.random() - 0.5) * 1.2;
      this.events.push({ t: "decoy", id: d.id, x: d.x, y: d.y, vx: d.vx, vy: d.vy, angle: d.angle, life: d.life, ownerId: d.ownerId, team: d.team, radius: d.radius, hp: d.hp });
      this.spawnParticle(d.x, d.y, "#ffb347", 14, 100); return d;
    };
    WWNCombat.prototype.__decoyPatched = true;
  }
  function ensureHpTextEl() {
    if (document.getElementById("hud-hp-text")) return;
    var labels = document.querySelectorAll(".hud-label");
    for (var i = 0; i < labels.length; i++) {
      if (labels[i].textContent.indexOf("Hull") >= 0) {
        var span = document.createElement("span");
        span.id = "hud-hp-text"; span.style.cssText = "float:right;opacity:0.9;"; span.textContent = "100 / 100";
        labels[i].appendChild(document.createTextNode(" ")); labels[i].appendChild(span); break;
      }
    }
  }
  function ensureSecretSlot() {
    if (document.getElementById("secret-slot")) return;
    var weapons = document.querySelector(".hud-weapons"); if (!weapons) return;
    var div = document.createElement("div"); div.className = "wep-slot"; div.style.opacity = "0.35";
    div.innerHTML = '<span class="wep-key">4</span><span id="secret-slot">—</span>'; weapons.appendChild(div);
  }
  function updateSecretSlot() {
    var slot = document.getElementById("secret-slot"); if (!slot || !window.WWNSecret) return;
    var ul = WWNSecret.getUnlockedList();
    if (!ul.length) { slot.textContent = "—"; if (slot.parentElement) slot.parentElement.style.opacity = "0.35"; return; }
    if (secretIdx >= ul.length) secretIdx = 0;
    slot.textContent = WWNSecret.getMeta(ul[secretIdx]).name;
    if (slot.parentElement) slot.parentElement.style.opacity = "1";
  }
  function toast(msg) {
    var t = document.getElementById("toast"); if (!t) return;
    t.textContent = msg; t.classList.add("show"); setTimeout(function () { t.classList.remove("show"); }, 3000);
  }
  function bindSecretLobby() {
    window.addEventListener("keypress", function (e) {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (window.WWNSecret && e.key && e.key.length === 1) WWNSecret.onKey(e.key);
    });
    if (window.WWNSecret && WWNSecret.onUnlock) {
      WWNSecret.onUnlock(function (id, meta) { toast("解放: " + ((meta && meta.name) || id)); updateSecretSlot(); });
    }
    setInterval(function () {
      if (!window.WWNSecret) return;
      WWNSecret.tryResolve().then(function (effect) { if (effect) updateSecretSlot(); });
    }, 400);
  }
  function patchOpenAutoSortie() {
    var btn = document.getElementById("btn-open"); if (!btn || btn.__patched) return; btn.__patched = true;
    btn.addEventListener("click", function () {
      setTimeout(function () {
        try {
          if (window.WWNRoom && WWNRoom.getState && WWNRoom.getState() && WWNRoom.getState().peerId) {
            if (WWNRoom.ensureMesh) WWNRoom.ensureMesh();
            if (window.WWNGame && !WWNGame.isActive()) WWNGame.start({ mode: "online" });
          }
        } catch (e) { console.warn(e); }
      }, 800);
    }, true);
  }
  function meshKeepalive() {
    try {
      if (window.WWNGame && WWNGame.isActive && WWNGame.isActive() && window.WWNRoom && WWNRoom.ensureMesh) WWNRoom.ensureMesh();
    } catch (_) {}
  }
  function gameTick() {
    ensureHpTextEl(); ensureSecretSlot();
    var hpText = document.getElementById("hud-hp-text");
    var hpBar = document.getElementById("hud-hp");
    if (hpText && hpBar && hpBar.style.width && performance.now() - lastHpWrite > 80) {
      hpText.textContent = Math.round(parseFloat(hpBar.style.width) || 0) + " / 100";
      lastHpWrite = performance.now();
    }
    if (window.WWNInput && WWNInput.consumeCycleSecret && WWNInput.consumeCycleSecret()) {
      var ul = window.WWNSecret ? WWNSecret.getUnlockedList() : [];
      if (ul.length) { secretIdx = (secretIdx + 1) % ul.length; updateSecretSlot(); }
    }
    requestAnimationFrame(gameTick);
  }
  function boot() {
    patchAiCtor(); patchDecoy(); patchOpenAutoSortie(); bindSecretLobby();
    setInterval(meshKeepalive, 3000); requestAnimationFrame(gameTick);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 100); });
  else setTimeout(boot, 100);
})();
