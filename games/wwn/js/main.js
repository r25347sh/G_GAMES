(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return document.querySelectorAll(s); };
  var els = {
    formPanel: $("#form-panel"), connectedPanel: $("#connected-panel"),
    username: $("#username"), roomName: $("#room-name"), roomKey: $("#room-key"),
    btnJoin: $("#btn-join"), btnOpen: $("#btn-open"), btnLeave: $("#btn-leave"),
    statusDot: $("#status-dot"), statusText: $("#status-text"),
    ownerBadge: $("#owner-badge"), ownerName: $("#owner-name"), playerList: $("#player-list"),
    teamPanel: $("#team-panel"), toast: $("#toast"),
  };
  var currentMode = "1v1", cpuCount = 1, cpuDiff = "normal";
  function showToast(msg, isError) {
    var t = els.toast; if (!t) return;
    t.textContent = msg; t.classList.toggle("error", !!isError); t.classList.add("show");
    clearTimeout(showToast._tid); showToast._tid = setTimeout(function () { t.classList.remove("show"); }, 3400);
  }
  function setStatus(kind, text) {
    if (els.statusDot) els.statusDot.className = "status-dot " + (kind || "");
    if (els.statusText) els.statusText.textContent = text || "";
  }
  function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll("[data-mode]").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });
    if (!window.WWNRoom) return;
    if (mode === "open") {
      els.roomName.value = WWNRoom.OPEN_ROOM_NAME; els.roomName.disabled = true;
      els.roomKey.value = ""; els.roomKey.disabled = true;
    } else {
      els.roomName.disabled = false; els.roomKey.disabled = false;
      if (els.roomName.value === WWNRoom.OPEN_ROOM_NAME) els.roomName.value = "";
    }
  }
  function showConnected(isOwner, ownerName) {
    els.formPanel.classList.add("hidden"); els.connectedPanel.classList.remove("hidden");
    if (ownerName) { els.ownerName.textContent = ownerName; els.ownerBadge.classList.remove("hidden"); }
    setStatus("online", isOwner ? "ルームオーナーとして接続中" : "ルームに参加中");
    updateTeamPanel();
  }
  function showForm() {
    els.connectedPanel.classList.add("hidden"); els.formPanel.classList.remove("hidden");
    els.ownerBadge.classList.add("hidden");
    if (els.teamPanel) els.teamPanel.classList.add("hidden");
    setStatus("", "未接続"); renderPlayers([]);
  }
  function updateTeamPanel() {
    var st = WWNRoom && WWNRoom.getState && WWNRoom.getState();
    if (!els.teamPanel) return;
    if (st && st.mode === "team") els.teamPanel.classList.remove("hidden");
    else els.teamPanel.classList.add("hidden");
  }
  function renderPlayers(list) {
    var me = WWNRoom && WWNRoom.getState && WWNRoom.getState() && WWNRoom.getState().username;
    var mode = WWNRoom && WWNRoom.getState && WWNRoom.getState() && WWNRoom.getState().mode;
    els.playerList.innerHTML = "";
    if (!list || !list.length) {
      els.playerList.innerHTML = '<li style="color:var(--text-muted);font-size:0.85rem;">プレイヤーがいません</li>';
      return;
    }
    list.forEach(function (p) {
      var li = document.createElement("li");
      if (p.username === me) li.classList.add("self");
      var teamBadge = "";
      if (mode === "team" && p.team && p.team !== "NONE") {
        teamBadge = '<span class="tag ' + (p.team === "RED" ? "team-red" : "team-blue") + '">' + p.team + "</span>";
      }
      var ownerTag = p.isOwner ? '<span class="tag">オーナー</span>' : "";
      li.innerHTML = "<span>" + escapeHtml(p.username) + (p.username === me ? "（あなた）" : "") +
        '</span><span class="tags">' + teamBadge + ownerTag + "</span>";
      els.playerList.appendChild(li);
    });
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function bindRoomEvents() {
    if (!window.WWNRoom) return;
    WWNRoom.on("owner", function (name) {
      if (name) {
        els.ownerName.textContent = name; els.ownerBadge.classList.remove("hidden");
        var st = WWNRoom.getState();
        setStatus("online", st && st.isOwner ? "ルームオーナーとして接続中" : "ルームに参加中");
      }
    });
    WWNRoom.on("players", function (list) { renderPlayers(list); updateTeamPanel(); });
    WWNRoom.on("join", function (u) { showToast(u + " が参加しました"); });
    WWNRoom.on("leave", function (u) { showToast(u + " が退出しました"); });
    WWNRoom.on("migrating", function () { setStatus("connecting", "オーナー引き継ぎ中…"); showToast("オーナー引き継ぎ中…"); });
    WWNRoom.on("migrated", function (name) { showToast(name + " が新しいルームオーナーになりました"); setStatus("online", "ルームオーナーとして接続中"); });
    WWNRoom.on("toast", function (msg) { showToast(msg); });
  }
  async function doJoin() {
    if (!window.WWNRoom) { showToast("通信モジュール未読込", true); return; }
    var username = els.username.value.trim(), roomName = els.roomName.value.trim(), roomKey = els.roomKey.value.trim();
    var errU = WWNRoom.validateName(username, "ユーザー名"); if (errU) { showToast(errU, true); return; }
    var errR = WWNRoom.validateName(roomName, "ルーム名"); if (errR) { showToast(errR, true); return; }
    els.btnJoin.disabled = true; if (els.btnOpen) els.btnOpen.disabled = true;
    setStatus("connecting", "接続中…");
    try {
      var result = await WWNRoom.joinOrCreate({ username: username, roomName: roomName, roomKey: roomKey, mode: currentMode });
      showConnected(result.isOwner, result.ownerName || username);
      renderPlayers(WWNRoom.getPlayerList());
      showToast(result.isOwner ? "ルームを作成しました（オーナー）" : "ルームに参加しました");
    } catch (e) {
      console.error(e); setStatus("error", "接続失敗"); showToast(e.message || "接続に失敗しました", true); showForm();
    } finally {
      els.btnJoin.disabled = false; if (els.btnOpen) els.btnOpen.disabled = false;
    }
  }
  async function doOpenWorld() {
    setMode("open");
    if (!els.username.value.trim()) { showToast("先にユーザー名を入力してください", true); els.username.focus(); return; }
    els.roomName.value = WWNRoom.OPEN_ROOM_NAME; els.roomKey.value = ""; await doJoin();
  }
  function doLeave() { if (WWNRoom) WWNRoom.leave(); showForm(); showToast("ルームを退出しました"); }
  function launchOnline() { if (window.WWNGame) window.WWNGame.start({ mode: "online" }); }
  function launchSolo() { if (window.WWNGame) window.WWNGame.start({ mode: "solo" }); }
  function launchCpu() {
    if (window.WWNGame) window.WWNGame.start({ mode: "cpu", cpuCount: cpuCount, difficulty: cpuDiff });
  }
  function init() {
    document.querySelectorAll("[data-mode]").forEach(function (btn) {
      btn.addEventListener("click", function () { setMode(btn.dataset.mode); });
    });
    setMode("1v1");
    document.querySelectorAll("[data-cpu]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        cpuCount = parseInt(btn.dataset.cpu, 10) || 1;
        document.querySelectorAll("[data-cpu]").forEach(function (b) { b.classList.toggle("active", b === btn); });
      });
    });
    document.querySelectorAll("[data-diff]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        cpuDiff = btn.dataset.diff || "normal";
        document.querySelectorAll("[data-diff]").forEach(function (b) { b.classList.toggle("active", b === btn); });
      });
    });
    if (els.btnJoin) els.btnJoin.addEventListener("click", doJoin);
    if (els.btnOpen) els.btnOpen.addEventListener("click", doOpenWorld);
    if (els.btnLeave) els.btnLeave.addEventListener("click", doLeave);
    var btnSortie = document.getElementById("btn-sortie"); if (btnSortie) btnSortie.addEventListener("click", launchOnline);
    var btnSolo = document.getElementById("btn-solo-top"); if (btnSolo) btnSolo.addEventListener("click", launchSolo);
    var btnCpu = document.getElementById("btn-cpu-start"); if (btnCpu) btnCpu.addEventListener("click", launchCpu);
    var btnGuide = document.getElementById("btn-toggle-guide");
    var guidePanel = document.getElementById("guide-panel");
    if (btnGuide && guidePanel) {
      btnGuide.addEventListener("click", function () {
        var body = guidePanel.querySelector(".guide-grid");
        if (!body) return;
        var hidden = body.style.display === "none";
        body.style.display = hidden ? "" : "none";
        btnGuide.textContent = hidden ? "ガイドを折りたたむ" : "操作ガイドを表示";
      });
    }
    document.querySelectorAll("[data-team]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (WWNRoom && WWNRoom.setTeam) { WWNRoom.setTeam(btn.dataset.team); showToast("チームを " + btn.dataset.team + " に変更"); }
      });
    });
    [els.username, els.roomName, els.roomKey].forEach(function (input) {
      if (input) input.addEventListener("keydown", function (e) { if (e.key === "Enter") doJoin(); });
    });
    bindRoomEvents(); setStatus("", "未接続");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
