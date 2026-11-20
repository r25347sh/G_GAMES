(function () {
  "use strict";
  var WINGMAN_HASH = "5d86d506f4f54726d14d3ff3621922e97dfe6124ef8d24a140808107af89a3a2";
  var joinCodeBuffer = "", joinCodeTime = 0;
  function showMessage(message) {
    var toast = document.getElementById("toast"); if (!toast) return;
    toast.textContent = message; toast.classList.add("show"); setTimeout(function () { toast.classList.remove("show"); }, 3000);
  }
  function spawnWingmen(count) {
    var player = window.__wwnPlayer, list = window.__wwnAiList;
    if (!player || !list || !window.WWNAiPilot) return;
    var roles = ["guardian", "striker", "phantom", "medic", "tactician"];
    var alive = list.filter(function (bot) { return bot && bot.isAlly && bot.alive; }).length;
    var wanted = Math.max(5, Math.min(5, count || 5));
    for (var i = 0; i < roles.length && alive < wanted; i++) {
      var bot = new WWNAiPilot("wingman-" + roles[i] + "-" + Date.now().toString(36) + "-" + i, "normal", i, "ALLY", roles[i]);
      bot.isAlly = true; bot.group = "ALLY"; bot.team = player.team || "BLUE"; bot.leaderId = player.netId; bot.roleIndex = i;
      var a = player.angle + Math.PI + (i - 2) * 0.48, d = 100 + i * 18;
      bot.x = player.x + Math.cos(a) * d; bot.y = player.y + Math.sin(a) * d; bot.angle = player.angle;
      list.push(bot); alive++;
    }
    showMessage("WINGMAN SQUAD: 5機編隊が合流！");
  }
  function installWingman() {
    var secret = window.WWNSecret;
    if (!secret || secret.__wingmanSquadWrapped) return;
    var original = secret.applyEffect;
    secret.applyEffect = function (id, player, combat, api) {
      if (id !== "wingman") return original.apply(this, arguments);
      api = Object.assign({}, api || {}); api.spawnAlly = spawnWingmen;
      return original.call(this, id, player, combat, api);
    };
    secret.__wingmanSquadWrapped = true;
  }
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || !e.key || e.key.length !== 1 || !/[a-z0-9]/i.test(e.key)) return;
    if (e.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable)) return;
    var now = performance.now(); if (now - joinCodeTime > 3500) joinCodeBuffer = "";
    joinCodeTime = now; joinCodeBuffer = (joinCodeBuffer + e.key.toLowerCase()).slice(-7);
    if (joinCodeBuffer !== "wingman") return;
    joinCodeBuffer = "";
    if (!window.crypto || !crypto.subtle || !window.TextEncoder) return;
    crypto.subtle.digest("SHA-256", new TextEncoder().encode("wingman")).then(function (digest) {
      var hash = Array.from(new Uint8Array(digest)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
      if (hash === WINGMAN_HASH && window.WWNSecret) { WWNSecret.unlock("wingman"); showMessage("隠しコマンド解除: WINGMAN SQUAD"); }
    }).catch(function () {});
  }, true);

  function limitDefaultCpuPopulation() {
    if (!window.WWNGame || WWNGame.__wwnPopulationWrapped) return;
    var original = WWNGame.start;
    WWNGame.start = function (options) {
      options = Object.assign({}, options || {});
      if (options.mode === "over") { options.mode = "cpu"; options.cpuCount = 21; }
      if (options.cpuCount == null) options.cpuCount = 21;
      return original.call(WWNGame, options);
    };
    WWNGame.__wwnPopulationWrapped = true;
  }
  installWingman(); limitDefaultCpuPopulation();
  setInterval(function () { installWingman(); limitDefaultCpuPopulation(); }, 500);
})();
