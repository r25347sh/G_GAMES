(function () {
  "use strict";
  var joining = false, cpuCount = 5, cpuDiff = "normal";
  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 2400);
  }
  function bindModeGrid() {
    var grid = document.getElementById("mode-grid");
    if (!grid) return;
    grid.querySelectorAll(".mode-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        grid.querySelectorAll(".mode-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
      });
    });
    document.querySelectorAll(".cpu-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.dataset.cpu) cpuCount = parseInt(btn.dataset.cpu, 10) || 5;
        if (btn.dataset.diff) cpuDiff = btn.dataset.diff;
        document.querySelectorAll(".cpu-btn").forEach(function (b) {
          if (b.dataset.cpu || b.dataset.diff) b.classList.toggle("active", b === btn);
        });
      });
    });
  }
  function doSortie() {
    var room = window.WWNRoom && WWNRoom.getState ? WWNRoom.getState() : null;
    var team = (room && room.team && room.team !== "NONE") ? room.team : "BLUE";
    if (window.WWNGame) window.WWNGame.start({
      mode: "online",
      netId: room && room.peerId,
      team: team,
      username: room && room.username,
      isOwner: !!(room && room.isOwner)
    });
  }
  function doSolo() { if (window.WWNGame) WWNGame.start({ mode: "solo" }); }
  function doCpu() {
    if (window.WWNGame) WWNGame.start({ mode: cpuCount >= 18 ? "over" : "cpu", cpuCount: cpuCount, difficulty: cpuDiff });
  }
  function doJoin() {
    if (joining) return;
    var username = ((document.getElementById("username") || {}).value || "").trim();
    var roomName = ((document.getElementById("room-name") || {}).value || "").trim();
    var roomKey = (document.getElementById("room-key") || {}).value || "";
    if (!username || !roomName) { toast("ユーザー名とルーム名を入力してください"); return; }
    var modeBtn = document.querySelector("#form-panel .mode-btn.active"), mode = modeBtn ? modeBtn.dataset.mode : "1v1";
    if (!window.WWNRoom || !WWNRoom.joinOrCreate) { toast("接続モジュール未読込"); return; }
    joining = true;
    WWNRoom.joinOrCreate({ username: username, roomName: roomName, roomKey: roomKey, mode: mode })
      .then(function () {
        toast("P2Pルームに接続しました（途中参加OK）");
        var form = document.getElementById("form-panel"), conn = document.getElementById("connected-panel");
        if (form) form.classList.add("hidden"); if (conn) conn.classList.remove("hidden");
        if (mode === "open") setTimeout(doSortie, 600);
      })
      .catch(function (err) { toast("接続失敗: " + (err && err.message ? err.message : err)); })
      .then(function () { joining = false; }, function () { joining = false; });
  }
  document.addEventListener("DOMContentLoaded", function () {
    bindModeGrid();
    var btnJoin = document.getElementById("btn-join"), btnSortie = document.getElementById("btn-sortie");
    var btnLeave = document.getElementById("btn-leave"), btnSolo = document.getElementById("btn-solo-top");
    var btnCpu = document.getElementById("btn-cpu-start"), btnOpen = document.getElementById("btn-open");
    if (btnJoin) btnJoin.onclick = doJoin; if (btnSortie) btnSortie.onclick = doSortie;
    if (btnSolo) btnSolo.onclick = doSolo; if (btnCpu) btnCpu.onclick = doCpu;
    if (btnOpen) btnOpen.onclick = function () {
      var u = document.getElementById("username"), r = document.getElementById("room-name");
      if (!u || !u.value.trim()) { toast("先にユーザー名を入力してください"); return; }
      r.value = "OpenWorldOf_WWN";
      var openBtn = document.querySelector('[data-mode="open"]'); if (openBtn) openBtn.click(); doJoin();
    };
    if (btnLeave) btnLeave.onclick = function () {
      if (window.WWNRoom && WWNRoom.leave) WWNRoom.leave();
      var form = document.getElementById("form-panel"), conn = document.getElementById("connected-panel");
      if (conn) conn.classList.add("hidden"); if (form) form.classList.remove("hidden");
    };
  });
})();
