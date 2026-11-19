(function (global) {
  "use strict";
  var OPEN_ROOM_NAME = "OpenWorldOf_WWN", OPEN_ROOM_KEY = "";
  var VALID_NAME = /^[A-Za-z0-9_-]{2,24}$/, TEAMS = ["RED", "BLUE", "NONE"];
  var state = null, roomListeners = {}, migrating = false;
  function onRoom(event, fn) { if (!roomListeners[event]) roomListeners[event] = []; roomListeners[event].push(fn); }
  function emitRoom(event) { var args = Array.prototype.slice.call(arguments, 1); (roomListeners[event] || []).forEach(function (fn) { try { fn.apply(null, args); } catch (e) { console.error(e); } }); }
  function validateName(name, label) {
    if (!name || !VALID_NAME.test(name)) return label + "は半角英数字・ハイフン・アンダースコアのみ（2〜24文字）で入力してください。";
    return null;
  }
  function playerSnapshot() {
    if (!state) return [];
    return Array.from(state.players.values()).map(function (p) {
      return { username: p.username, peerId: p.peerId, isOwner: !!p.isOwner, team: p.team || "NONE", joinedAt: p.joinedAt || 0 };
    });
  }
  function sortCandidates() {
    return playerSnapshot().filter(function (p) { return p.peerId !== state.masterId; }).sort(function (a, b) {
      if (a.joinedAt !== b.joinedAt) return a.joinedAt - b.joinedAt;
      return a.username < b.username ? -1 : a.username > b.username ? 1 : 0;
    });
  }
  function myRankAmongSurvivors() {
    var list = sortCandidates();
    for (var i = 0; i < list.length; i++) if (list[i].username === state.username) return i;
    return 0;
  }
  async function ensureMesh() {
    if (!state) return;
    var myId = state.peerId, list = playerSnapshot(), tasks = [];
    list.forEach(function (p) {
      if (!p.peerId || p.peerId === myId || String(p.peerId).endsWith("_MASTER")) return;
      if (global.WWNPeer.getConnections().has(p.peerId)) return;
      tasks.push(global.WWNPeer.connectTo(p.peerId).catch(function () {}));
    });
    if (tasks.length) await Promise.all(tasks);
  }
  function bindPeerEvents() {
    global.WWNPeer.on("data", onData);
    global.WWNPeer.on("close", onConnClose);
  }
  function onConnClose(conn) {
    if (!conn || !state) return;
    var pid = conn.peer;
    if (String(pid).endsWith("_MASTER")) {
      if (!state.isOwner) setTimeout(function () { maybeMigrate("master-link-lost"); }, 600 + Math.random() * 400);
      return;
    }
    onPeerLeft(pid);
  }
  function onData(raw, conn) {
    var msg; try { msg = typeof raw === "string" ? JSON.parse(raw) : raw; } catch (_) { return; }
    if (!msg || !msg.type) return;
    if (msg.type === "join") handleJoin(msg, conn);
    else if (msg.type === "welcome") handleWelcome(msg);
    else if (msg.type === "player-list") handlePlayerList(msg);
    else if (msg.type === "player-left" && msg.peerId) onPeerLeft(msg.peerId);
    else if (msg.type === "owner-update") applyOwner(msg.ownerName);
    else if (msg.type === "team-update") handleTeamUpdate(msg);
    else if (msg.type === "owner-left") setTimeout(function () { maybeMigrate("owner-left-msg"); }, 300 + Math.random() * 300);
  }
  function handleJoin(msg, conn) {
    if (!state || !state.isOwner || !msg.username || !msg.peerId) return;
    var dup = false;
    state.players.forEach(function (p) { if (p.username === msg.username && p.peerId !== msg.peerId) dup = true; });
    if (dup) { global.WWNPeer.masterSend(conn, { type: "error", code: "DUPLICATE_NAME", message: "同じユーザー名が既にルーム内にいます。" }); return; }
    var team = state.mode === "team" ? autoAssignTeam() : "NONE";
    state.players.set(msg.peerId, { username: msg.username, isOwner: false, joinedAt: msg.joinedAt || Date.now(), peerId: msg.peerId, team: team });
    var list = playerSnapshot();
    global.WWNPeer.masterSend(conn, { type: "welcome", ownerName: state.ownerName, ownerPeerId: state.peerId, you: msg.username, yourTeam: team, mode: state.mode, players: list });
    global.WWNPeer.connectTo(msg.peerId).catch(function () {});
    global.WWNPeer.broadcast({ type: "player-list", players: list, ownerName: state.ownerName, ownerPeerId: state.peerId, mode: state.mode });
    emitRoom("players", list); emitRoom("join", msg.username);
  }
  function autoAssignTeam() {
    var red = 0, blue = 0;
    state.players.forEach(function (p) { if (p.team === "RED") red++; if (p.team === "BLUE") blue++; });
    return red <= blue ? "RED" : "BLUE";
  }
  function handleWelcome(msg) {
    if (!state) return;
    state.ownerName = msg.ownerName;
    if (msg.yourTeam) state.team = msg.yourTeam;
    if (msg.mode) state.mode = msg.mode;
    if (Array.isArray(msg.players)) {
      state.players.clear();
      msg.players.forEach(function (p) {
        state.players.set(p.peerId, { username: p.username, isOwner: !!p.isOwner, joinedAt: p.joinedAt || Date.now(), peerId: p.peerId, team: p.team || "NONE" });
      });
    }
    if (!state.players.has(state.peerId)) {
      state.players.set(state.peerId, { username: state.username, isOwner: false, joinedAt: state.joinedAt, peerId: state.peerId, team: state.team });
    }
    emitRoom("owner", state.ownerName); emitRoom("players", playerSnapshot()); emitRoom("welcome", msg); ensureMesh();
  }
  function handlePlayerList(msg) {
    if (!state || !Array.isArray(msg.players)) return;
    state.players.clear();
    msg.players.forEach(function (p) {
      state.players.set(p.peerId, { username: p.username, isOwner: !!p.isOwner, joinedAt: p.joinedAt || Date.now(), peerId: p.peerId, team: p.team || "NONE" });
    });
    if (msg.ownerName) state.ownerName = msg.ownerName;
    if (msg.mode) state.mode = msg.mode;
    state.isOwner = state.ownerName === state.username;
    emitRoom("players", playerSnapshot()); emitRoom("owner", state.ownerName); ensureMesh();
  }
  function handleTeamUpdate(msg) {
    if (!state) return;
    if (msg.peerId && state.players.has(msg.peerId)) {
      var p = state.players.get(msg.peerId); p.team = msg.team || "NONE"; state.players.set(msg.peerId, p);
    }
    if (msg.peerId === state.peerId) state.team = msg.team || "NONE";
    emitRoom("players", playerSnapshot());
  }
  function applyOwner(ownerName) {
    if (!state) return;
    state.ownerName = ownerName; state.isOwner = ownerName === state.username;
    state.players.forEach(function (p, id) { p.isOwner = p.username === ownerName; state.players.set(id, p); });
    emitRoom("owner", ownerName); emitRoom("players", playerSnapshot());
  }
  function onPeerLeft(peerId) {
    if (!state) return;
    var left = state.players.get(peerId); if (!left) return;
    state.players.delete(peerId); emitRoom("leave", left.username); emitRoom("players", playerSnapshot());
    if (state.isOwner) global.WWNPeer.broadcast({ type: "player-left", peerId: peerId, username: left.username });
    if (left.isOwner || left.username === state.ownerName) setTimeout(function () { maybeMigrate("owner-disconnected"); }, 400 + Math.random() * 350);
  }
  async function maybeMigrate(reason) {
    if (!state || migrating || state.isOwner) return;
    migrating = true; emitRoom("migrating", reason);
    var rank = myRankAmongSurvivors(), claimed = false;
    try { claimed = await global.WWNPeer.claimMaster(state.masterId, { rank: rank, retries: 6, baseDelayMs: 500 }); } catch (e) { console.warn(e); }
    if (claimed) {
      state.isOwner = true; state.ownerName = state.username;
      state.players.forEach(function (p, id) { p.isOwner = p.username === state.username; state.players.set(id, p); });
      global.WWNPeer.broadcast({ type: "owner-update", ownerName: state.username, ownerPeerId: state.peerId });
      global.WWNPeer.broadcast({ type: "player-list", players: playerSnapshot(), ownerName: state.username, ownerPeerId: state.peerId, mode: state.mode });
      emitRoom("owner", state.username); emitRoom("players", playerSnapshot()); emitRoom("migrated", state.username);
    }
    migrating = false;
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function joinOrCreate(opts) {
    var errUser = validateName(opts.username, "ユーザー名"); if (errUser) throw new Error(errUser);
    var errRoom = validateName(opts.roomName, "ルーム名"); if (errRoom) throw new Error(errRoom);
    var roomHash = await global.WWNPeer.computeRoomHash(opts.roomName, opts.roomKey || "");
    var peerId = global.WWNPeer.buildPeerId(opts.roomName, roomHash, opts.username);
    var masterId = global.WWNPeer.buildPeerId(opts.roomName, roomHash, "MASTER");
    state = {
      username: opts.username, roomName: opts.roomName, roomKey: opts.roomKey || "", roomHash: roomHash,
      mode: opts.mode || "1v1", isOwner: false, ownerName: null, peerId: peerId, masterId: masterId,
      team: opts.team || "NONE", players: new Map(), status: "connecting", joinedAt: Date.now(),
    };
    await global.WWNPeer.startPersonal(peerId); bindPeerEvents();
    state.players.set(peerId, { username: opts.username, isOwner: false, joinedAt: state.joinedAt, peerId: peerId, team: state.team });
    var claimed = await global.WWNPeer.claimMaster(masterId, { rank: 0, retries: 2, baseDelayMs: 300 });
    if (claimed) {
      state.isOwner = true; state.ownerName = opts.username;
      var me = state.players.get(peerId); me.isOwner = true;
      if (state.mode === "team") { me.team = "RED"; state.team = "RED"; }
      state.players.set(peerId, me); state.status = "connected";
      return { isOwner: true, peerId: peerId, ownerName: opts.username, roomHash: roomHash };
    }
    try {
      var conn = await global.WWNPeer.connectTo(masterId);
      conn.send(JSON.stringify({ type: "join", username: opts.username, peerId: peerId, roomHash: roomHash, joinedAt: state.joinedAt, ts: Date.now() }));
      await sleep(800); state.status = "connected";
      if (!state.ownerName) await maybeMigrate("no-welcome");
      return { isOwner: state.isOwner, peerId: peerId, ownerName: state.ownerName, roomHash: roomHash };
    } catch (e) {
      var ok = await global.WWNPeer.claimMaster(masterId, { rank: 0, retries: 4, baseDelayMs: 400 });
      if (!ok) { state.status = "error"; throw new Error("ルームへの接続に失敗しました。"); }
      state.isOwner = true; state.ownerName = opts.username;
      var me2 = state.players.get(peerId); me2.isOwner = true; state.players.set(peerId, me2);
      state.status = "connected";
      return { isOwner: true, peerId: peerId, ownerName: opts.username, roomHash: roomHash };
    }
  }
  function setTeam(team, targetPeerId) {
    if (!state || TEAMS.indexOf(team) === -1) return;
    var pid = targetPeerId || state.peerId;
    if (pid !== state.peerId && !state.isOwner) return;
    if (state.players.has(pid)) { var p = state.players.get(pid); p.team = team; state.players.set(pid, p); }
    if (pid === state.peerId) state.team = team;
    global.WWNPeer.broadcast({ type: "team-update", peerId: pid, team: team, by: state.username });
    emitRoom("players", playerSnapshot());
  }
  function leave() {
    if (state && state.isOwner) {
      global.WWNPeer.broadcast({ type: "owner-left", username: state.username, peerId: state.peerId });
      global.WWNPeer.releaseMaster();
    }
    global.WWNPeer.destroy(); state = null; migrating = false; roomListeners = {};
  }
  global.WWNRoom = {
    OPEN_ROOM_NAME: OPEN_ROOM_NAME, OPEN_ROOM_KEY: OPEN_ROOM_KEY, TEAMS: TEAMS,
    validateName: validateName, joinOrCreate: joinOrCreate, on: onRoom,
    getState: function () { return state; }, getPlayerList: playerSnapshot,
    setTeam: setTeam, leave: leave, isOpenMode: function (n) { return n === OPEN_ROOM_NAME; }, ensureMesh: ensureMesh,
  };
})(typeof window !== "undefined" ? window : globalThis);
