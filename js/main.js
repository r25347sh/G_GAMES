/**
 * G_GAMES - Home (ambient + dynamic game cards from registry)
 */
(function () {
  "use strict";
  function initAmbient() {
    const ambient = document.getElementById("ambient");
    if (!ambient) return;
    const COLORS = ["pink", "cyan", "gold"];
    const COUNT = 18;
    function spawn() {
      const p = document.createElement("span");
      p.className = "g5-ambient-particle " + COLORS[Math.floor(Math.random() * COLORS.length)];
      const size = 2 + Math.random() * 4;
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.left = Math.random() * 100 + "%";
      p.style.animationDuration = 8 + Math.random() * 14 + "s";
      p.style.animationDelay = Math.random() * 4 + "s";
      ambient.appendChild(p);
      p.addEventListener("animationend", function () { p.remove(); });
    }
    for (let i = 0; i < COUNT; i++) setTimeout(spawn, i * 350);
    setInterval(spawn, 1200);
  }
  function initCards() {
    if (window.GGamesRegistry) {
      window.GGamesRegistry.renderCards(document.getElementById("games-grid"));
    }
  }
  function boot() { initAmbient(); initCards(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
