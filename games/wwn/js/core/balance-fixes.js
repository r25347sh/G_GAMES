(function () {
  "use strict";
  function nerfAllies() {
    if (!window.WWNAllyTypes) return;
    var R = WWNAllyTypes;
    var keys = Object.keys(R);
    for (var i = 0; i < keys.length; i++) {
      var r = R[keys[i]];
      if (!r || r.__nerfed) continue;
      if (keys[i] === "guardian") { r.damage = 0.5; r.leash = 220; r.preferDist = 100; }
      else if (keys[i] === "striker") { r.damage = 0.8; r.leash = 360; }
      else if (keys[i] === "phantom") { r.damage = 0.65; r.leash = 380; }
      else if (keys[i] === "medic") { r.damage = 0.3; r.leash = 180; r.range = 420; }
      else if (keys[i] === "vanguard") { r.damage = 0.7; r.leash = 340; }
      else r.damage = Math.min(r.damage || 1, 0.7);
      r.__nerfed = true;
    }
  }
  function enforceRoles() {
    var list = window.__wwnAiList || [];
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || !b.isAlly) continue;
      if (!b.allyType && window.WWNAllyRoleOrder) {
        b.allyType = WWNAllyRoleOrder[b.roleIndex % 5];
        b.username = (WWNAllyTypes[b.allyType] || {}).label || b.username;
      }
      var cfg = window.WWNAllyTypes && WWNAllyTypes[b.allyType];
      if (cfg) {
        b.leash = cfg.leash || b.leash;
        b.dmgMul = cfg.damage || b.dmgMul;
        b.attackRange = cfg.range || b.attackRange;
        b.preferDist = cfg.preferDist || b.preferDist;
      }
    }
  }
  setInterval(function () { nerfAllies(); enforceRoles(); }, 500);
})();
