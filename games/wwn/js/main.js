(function () {
  "use strict";
  function toast(msg) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(function () { el.classList.remove("show"); }, 2400);
  }
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  var cpuCount = 1, cpuDiff = "normal";
  function bindModeGrid() {
    document.querySelectorAll(".mode-grid").forEach(function (grid) {
      grid.addEventListener("click", function (e) {
        var btn = e.target.closest(".mode-btn");
        if (!btn) return;
        grid.querySelectorAll(".mode-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        if (btn.dataset.cpu) cpuCount = parseInt(btn.dataset.cpu, 10) || 1;
        if (btn.dataset.diff) cpuDiff = btn.dataset.diff;
      });
    });
  }
  function doSortie() {
    if (window.WWNGame) window.WWNGame.start({ mode: "online" });
  }
  function doSolo() {
    if (window.WWNGame) window.WWNGame.start({ mode: "solo" });
  }
  function doCpu() {
    if (window.WWNGame) {
      var mode = (cpuCount >= 18) ? "over" : "cpu";
      window.WWNGame.start({ mode: mode, cpuCount: cpuCount, difficulty: cpuDiff });
    }
  }
  function doJoin() {
    var username = (document.getElementById("username") || {}).value || "";
    var roomName = (document.getElementById("room-name") || {}).value || "";
    var roomKey = (document.getElementById("room-key") || {}).value || "";
    username = username.trim(); roomName = roomName.trim();
    if (!username || !roomName) { toast("ユーザー名とルーム名を入力してください"); return; }
    var modeBtn = document.querySelector("#form-panel .mode-btn.active");
    var mode = modeBtn ? modeBtn.dataset.mode : "1v1";
    if (!window.WWNRoom) { toast("接続モジュール未読込"); return; }
    WWNRoom.join({ username: username, roomName: roomName, roomKey: roomKey, mode: mode })
      .then(function () {
        toast("接続しました");
        var form = document.getElementById("form-panel");
        var conn = document.getElementById("connected-panel");
        if (form) form.classList.add("hidden");
        if (conn) conn.classList.remove("hidden");
        if (mode === "open") {
          setTimeout(function () { doSortie(); }, 600);
        }
      })
      .catch(function (err) { toast("接続失敗: " + (err && err.message ? err.message : err)); });
  }
  document.addEventListener("DOMContentLoaded", function () {
    bindModeGrid();
    var btnJoin = document.getElementById("btn-join");
    var btnSortie = document.getElementById("btn-sortie");
    var btnLeave = document.getElementById("btn-leave");
    var btnSolo = document.getElementById("btn-solo-top");
    var btnCpu = document.getElementById("btn-cpu-start");
    var btnOpen = document.getElementById("btn-open");
    var btnGuide = document.getElementById("btn-toggle-guide");
    if (btnJoin) btnJoin.onclick = doJoin;
    if (btnSortie) btnSortie.onclick = doSortie;
    if (btnSolo) btnSolo.onclick = doSolo;
    if (btnCpu) btnCpu.onclick = doCpu;
    if (btnOpen) btnOpen.onclick = function () {
      var u = document.getElementById("username");
      if (u && !u.value.trim()) { toast("先にユーザー名を入力してください"); return; }
      if (u) {
        document.getElementById("room-name").value = "OpenWorldOf_WWN";
        var openBtn = document.querySelector('[data-mode="open"]');
        if (openBtn) openBtn.click();
        doJoin();
      }
    };
    if (btnLeave) btnLeave.onclick = function () {
      if (window.WWNRoom && WWNRoom.leave) WWNRoom.leave();
      var form = document.getElementById("form-panel");
      var conn = document.getElementById("connected-panel");
      if (conn) conn.classList.add("hidden");
      if (form) form.classList.remove("hidden");
    };
    if (btnGuide) {
      btnGuide.onclick = function () {
        var panel = document.getElementById("guide-panel");
        if (!panel) return;
        var body = panel.querySelector(".guide-grid");
        if (!body) return;
        var hidden = body.style.display === "none";
        body.style.display = hidden ? "" : "none";
        btnGuide.textContent = hidden ? "ガイドを折りたたむ" : "操作ガイドを表示";
      };
    }
  });
})();
