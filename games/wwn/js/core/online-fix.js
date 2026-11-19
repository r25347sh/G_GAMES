(function () {
  "use strict";
  setInterval(function () {
    try {
      if (window.WWNGame && WWNGame.isActive && WWNGame.isActive() &&
          window.WWNRoom && WWNRoom.ensureMesh) {
        WWNRoom.ensureMesh();
      }
    } catch (_) {}
  }, 3000);
})();
