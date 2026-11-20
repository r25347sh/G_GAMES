(function (global) {
  "use strict";
  var state = null, listeners = Object.create(null), migrating = false;
  var OPEN_NAME = "OpenWorldOf_WWN", peerDataBound = false, peerCloseBound = false;
  function on(type, fn) { (listeners[type] || (listeners[type] = [])).push(fn); }
  function emit(type) { var args = Array.prototype.slice.call(arguments, 1); (listeners[type] || []).forEach(function (fn) { try { fn.apply(null, args); } catch (e) { console.error(e); } }); }
  function validateName(name) { return /^[A-Za-z0-9_-]{2,24}$/.test(name || ""); }
  function snapshot() {
    if (!state) return [];
    return Array.from(state.players.values()).map(function (p) {
      return { username: p.username, peerId: p.peerId, isOwner: !!p.isOwner, team: p.team || "NONE", joinedAt: p.joinedAt || 0 };
    });
  }
  function ensureMesh() {
    if (!state) return Promise.resolve();
    return Promise.all(snapshot().filter(function (p) {
      return p.peerId && p.peerId !== state.peerId && p.peerId !== state.masterId;
    }).map(function (p) {
      var conn = global.WWNPeer.getConnections().get(p.peerId);
      if (conn && conn.open) return Promise.resolve(conn);
      return global.WWNPeer.connectTo(p.peerId).catch(function () {});
    }));
  }
  function bindEvents() {
    if (peerDataBound) global.WWNPeer.off("data", onData);
    if (peerCloseBound) global.WWNPeer.off("close", onConnectionClose);
    global.WWNPeer.on("data", onData); global.WWNPeer.on("close", onConnectionClose);
    peerDataBound = peerCloseBound = true;
  }
  function unbindEvents() {
    if (global.WWNPeer && global.WWNPeer.off) {
      if (peerDataBound) global.WWNPeer.off("data", onData);
      if (peerCloseBound) global.WWNPeer.off("close", onConnectionClose);
    }
    peerDataBound = peerCloseBound = false;
  }
  function onConnectionClose(conn) {
    if (!conn || !state) return;
    if (String(conn.peer).endsWith("_MASTER")) {
      if (!state.isOwner) setTimeout(function () { migrate("master-disconnected"); }, 700);
      return;
    }
    removePeer(conn.peer);
  }
  function onData(raw, conn) {
    var msg; try { msg = typeof raw === "string" ? JSON.parse(raw) : raw; } catch (_) { return; }
    if (!msg || !msg.type) return;
    if (msg.type === "join") handleJoin(msg, conn);
    else if (msg.type === "welcome") handleWelcome(msg);
    else if (msg.type === "player-list") handlePlayerList(msg);
    else if (msg.type === "player-left") removePeer(msg.peerId);
    else if (msg.type === "owner-update") handleOwner(msg.ownerName);
    else if (msg.type === "team-update") handleTeam(msg);
    else if (msg.type === "owner-left") setTimeout(function () { migrate("owner-left"); }, 450);
  }
  function handleJoin(msg, conn) {
    if (!state || !state.isOwner || !conn || !msg.username || !msg.peerId) return;
    // Join messages must arrive on a live P2P data channel from the claimed room.
    if (!conn.open || !global.WWNPeer.getPersonalId()) return;
    var duplicate = Array.from(state.players.values()).some(function (p) { return p.username === msg.username && p.peerId !== msg.peerId; });
    if (duplicate) { global.WWNPeer.masterSend(conn, { type: "error", message: "同じユーザー名が既にルーム内にいます。" }); return; }
    var team = "NONE";
    if (state.mode === "team") {
      var players = Array.from(state.players.values());
      team = players.filter(function (p) { return p.team === "RED"; }).length <= players.filter(function (p) { return p.team === "BLUE"; }).length ? "RED" : "BLUE";
    }
    state.players.set(msg.peerId, { username: msg.username, peerId: msg.peerId, isOwner: false, team: team, joinedAt: msg.joinedAt || Date.now() });
    var list = snapshot();
    // The host peer is a separate PeerJS endpoint: reply on the incoming host channel, not the personal-peer mesh.
    global.WWNPeer.masterSend(conn, { type: "welcome", ownerName: state.username, ownerPeerId: state.peerId, players: list, yourTeam: team, mode: state.mode });
    global.WWNPeer.broadcast({ type: "player-list", ownerName: state.username, ownerPeerId: state.peerId, players: list, mode: state.mode });
    emit("players", list); ensureMesh();
  }
  function handleWelcome(msg) {
    if (!state) return;
    state.ownerName = msg.ownerName || state.ownerName;
    if (msg.mode) state.mode = msg.mode;
    if (msg.yourTeam) state.team = msg.yourTeam;
    if (Array.isArray(msg.players)) {
      state.players.clear();
      msg.players.forEach(function (p) { if (p && p.peerId) state.players.set(p.peerId, p); });
    }
    if (!state.players.has(state.peerId)) state.players.set(state.peerId, { username: state.username, peerId: state.peerId, isOwner: false, team: state.team, joinedAt: state.joinedAt });
    state.status = "connected";
    if (state.resolveWelcome) { state.resolveWelcome(msg); state.resolveWelcome = null; }
    emit("owner", state.ownerName); emit("players", snapshot()); ensureMesh();
  }
  function handlePlayerList(msg) {
    if (!state || !Array.isArray(msg.players)) return;
    state.players.clear();
    msg.players.forEach(function (p) { if (p && p.peerId) state.players.set(p.peerId, p); });
    if (!state.players.has(state.peerId)) state.players.set(state.peerId, { username: state.username, peerId: state.peerId, isOwner: false, team: state.team, joinedAt: state.joinedAt });
    state.ownerName = msg.ownerName || state.ownerName;
    state.isOwner = state.ownerName === state.username;
    if (msg.mode) state.mode = msg.mode;
    emit("owner", state.ownerName); emit("players", snapshot()); ensureMesh();
  }
  function handleTeam(msg) {
    if (!state || !msg.peerId) return;
    var p = state.players.get(msg.peerId);
    if (p) { p.team = msg.team || "NONE"; state.players.set(msg.peerId, p); }
    if (msg.peerId === state.peerId) state.team = msg.team || "NONE";
    emit("players", snapshot());
  }
  function handleOwner(name) {
    if (!state) return;
    state.ownerName = name; state.isOwner = name === state.username;
    state.players.forEach(function (p, id) { p.isOwner = p.username === name; state.players.set(id, p); });
    emit("owner", name); emit("players", snapshot());
  }
  function removePeer(id) {
    if (!state || !id || id === state.peerId) return;
    var p = state.players.get(id); if (!p) return;
    state.players.delete(id); emit("leave", p.username); emit("players", snapshot());
    if (state.isOwner) global.WWNPeer.broadcast({ type: "player-left", peerId: id });
    if (p.isOwner || p.username === state.ownerName) setTimeout(function () { migrate("owner-left"); }, 400);
  }
  async function migrate() {
    if (!state || migrating || state.isOwner) return;
    migrating = true;
    try {
      var claimed = await global.WWNPeer.claimMaster(state.masterId, { retries: 7 });
      if (claimed && state) {
        state.isOwner = true; state.ownerName = state.username;
        state.players.forEach(function (p, id) { p.isOwner = id === state.peerId; state.players.set(id, p); });
        global.WWNPeer.broadcast({ type: "owner-update", ownerName: state.username, ownerPeerId: state.peerId });
        global.WWNPeer.broadcast({ type: "player-list", ownerName: state.username, ownerPeerId: state.peerId, players: snapshot(), mode: state.mode });
        emit("migrated", state.username); emit("players", snapshot());
      }
    } finally { migrating = false; }
  }
  async function joinOrCreate(opts) {
    if (!validateName(opts.username)) throw new Error("ユーザー名は半角英数字・ハイフン・アンダースコア（2〜24文字）です。");
    if (!validateName(opts.roomName)) throw new Error("ルーム名は半角英数字・ハイフン・アンダースコア（2〜24文字）です。");
    if (state) leave();
    var hash = await global.WWNPeer.computeRoomHash(opts.roomName, opts.roomKey || "");
    var id = global.WWNPeer.buildPeerId(opts.roomName, hash, opts.username), masterId = global.WWNPeer.buildPeerId(opts.roomName, hash, "MASTER");
    state = { username: opts.username, roomName: opts.roomName, roomKey: opts.roomKey || "", roomHash: hash, mode: opts.mode || "1v1", peerId: id, masterId: masterId, isOwner: false, ownerName: null, team: opts.team || "NONE", players: new Map(), joinedAt: Date.now(), status: "connecting", resolveWelcome: null };
    await global.WWNPeer.startPersonal(id); bindEvents();
    state.players.set(id, { username: opts.username, peerId: id, isOwner: false, team: state.team, joinedAt: state.joinedAt });
    var claimed = await global.WWNPeer.claimMaster(masterId, { retries: 3 });
    if (claimed) {
      state.isOwner = true; state.ownerName = opts.username;
      var me = state.players.get(id); me.isOwner = true;
      if (state.mode === "team") { me.team = "RED"; state.team = "RED"; }
      state.players.set(id, me); state.status = "connected";
      return { isOwner: true, peerId: id, ownerName: opts.username, roomHash: hash };
    }
    var welcomePromise = new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { if (state) { state.resolveWelcome = null; reject(new Error("ルームホストから応答がありません。ルーム名・キーを確認して再試行してください。")); } }, 12000);
      state.resolveWelcome = function (msg) { clearTimeout(timer); resolve(msg); };
    });
    try {
      var conn = await global.WWNPeer.connectTo(masterId);
      global.WWNPeer.masterSend(conn, { type: "join", username: opts.username, peerId: id, joinedAt: state.joinedAt, roomHash: hash });
      await welcomePromise;
      await ensureMesh();
      return { isOwner: state.isOwner, peerId: id, ownerName: state.ownerName, roomHash: hash };
    } catch (err) {
      state.status = "error";
      throw err;
    }
  }
  function setTeam(team) {
    if (!state || ["RED", "BLUE", "NONE"].indexOf(team) < 0) return;
    state.team = team;
    var p = state.players.get(state.peerId); if (p) { p.team = team; state.players.set(state.peerId, p); }
    global.WWNPeer.broadcast({ type: "team-update", peerId: state.peerId, team: team }); emit("players", snapshot());
  }
  function leave() {
    if (!state) return;
    if (state.isOwner) global.WWNPeer.broadcast({ type: "owner-left", ownerName: state.username, peerId: state.peerId });
    unbindEvents(); global.WWNPeer.destroy(); state = null; migrating = false;
  }
  global.WWNRoom = { OPEN_ROOM_NAME: OPEN_NAME, validateName: validateName, joinOrCreate: joinOrCreate, on: on, getState: function () { return state; }, getPlayerList: snapshot, setTeam: setTeam, leave: leave, isOpenMode: function (name) { return name === OPEN_NAME; }, ensureMesh: ensureMesh };
})(typeof window !== "undefined" ? window : globalThis);
