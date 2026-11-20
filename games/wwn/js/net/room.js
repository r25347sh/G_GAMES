(function (global) {
  "use strict";
  var state = null, listeners = Object.create(null), migrating = false;
  var OPEN_NAME = "OpenWorldOf_WWN";
  function on(type, fn) { (listeners[type] ||= []).push(fn); }
  function emit(type) { var args = Array.prototype.slice.call(arguments, 1); (listeners[type] || []).forEach(function (fn) { try { fn.apply(null, args); } catch (_) {} }); }
  function validateName(name) { return /^[A-Za-z0-9_-]{2,24}$/.test(name || ""); }
  function snapshot() { if (!state) return []; return Array.from(state.players.values()).map(function (p) { return { username: p.username, peerId: p.peerId, isOwner: !!p.isOwner, team: p.team || "NONE", joinedAt: p.joinedAt || 0 }; }); }
  function ensureMesh() {
    if (!state) return Promise.resolve();
    var tasks = snapshot().filter(function (p) { return p.peerId !== state.peerId && p.peerId !== state.masterId; }).map(function (p) {
      if (global.WWNPeer.getConnections().has(p.peerId)) return Promise.resolve();
      return global.WWNPeer.connectTo(p.peerId).catch(function () {});
    });
    return Promise.all(tasks);
  }
  function bindEvents() {
    global.WWNPeer.on("data", onData); global.WWNPeer.on("close", onConnectionClose);
  }
  function onConnectionClose(conn) {
    if (!conn || !state) return;
    if (String(conn.peer).endsWith("_MASTER") && !state.isOwner) setTimeout(function () { migrate("master-disconnected"); }, 800);
  }
  function onData(raw) {
    var msg; try { msg = typeof raw === "string" ? JSON.parse(raw) : raw; } catch (_) { return; }
    if (!msg || !msg.type) return;
    if (msg.type === "join") handleJoin(msg);
    else if (msg.type === "welcome") handleWelcome(msg);
    else if (msg.type === "player-list") handlePlayerList(msg);
    else if (msg.type === "player-left") removePeer(msg.peerId);
    else if (msg.type === "owner-update") handleOwner(msg.ownerName);
    else if (msg.type === "team-update") handleTeam(msg);
    else if (msg.type === "owner-left") setTimeout(function () { migrate("owner-left"); }, 500);
  }
  function handleJoin(msg) {
    if (!state || !state.isOwner || !msg.username || !msg.peerId) return;
    var duplicate = Array.from(state.players.values()).some(function (p) { return p.username === msg.username && p.peerId !== msg.peerId; });
    if (duplicate) return;
    var team = state.mode === "team" ? (Array.from(state.players.values()).filter(function (p) { return p.team === "RED"; }).length <= Array.from(state.players.values()).filter(function (p) { return p.team === "BLUE"; }).length ? "RED" : "BLUE") : "NONE";
    state.players.set(msg.peerId, { username: msg.username, peerId: msg.peerId, isOwner: false, team: team, joinedAt: msg.joinedAt || Date.now() });
    var list = snapshot();
    var masterConn = global.WWNPeer.getConnections().get(msg.peerId);
    if (masterConn) global.WWNPeer.masterSend(masterConn, { type: "welcome", ownerName: state.username, players: list, yourTeam: team, mode: state.mode });
    global.WWNPeer.broadcast({ type: "player-list", ownerName: state.username, players: list, mode: state.mode });
    emit("players", list); ensureMesh();
  }
  function handleWelcome(msg) {
    if (!state) return; state.ownerName = msg.ownerName || state.ownerName;
    if (msg.mode) state.mode = msg.mode; if (msg.yourTeam) state.team = msg.yourTeam;
    if (Array.isArray(msg.players)) { state.players.clear(); msg.players.forEach(function (p) { state.players.set(p.peerId, p); }); }
    if (!state.players.has(state.peerId)) state.players.set(state.peerId, { username: state.username, peerId: state.peerId, isOwner: false, team: state.team, joinedAt: state.joinedAt });
    emit("owner", state.ownerName); emit("players", snapshot()); ensureMesh();
  }
  function handlePlayerList(msg) {
    if (!state || !Array.isArray(msg.players)) return;
    state.players.clear(); msg.players.forEach(function (p) { state.players.set(p.peerId, p); });
    state.ownerName = msg.ownerName || state.ownerName; state.isOwner = state.ownerName === state.username;
    if (msg.mode) state.mode = msg.mode; emit("owner", state.ownerName); emit("players", snapshot()); ensureMesh();
  }
  function handleTeam(msg) { if (!state || !msg.peerId) return; var p = state.players.get(msg.peerId); if (p) { p.team = msg.team || "NONE"; state.players.set(msg.peerId, p); } if (msg.peerId === state.peerId) state.team = msg.team || "NONE"; emit("players", snapshot()); }
  function handleOwner(ownerName) { if (!state) return; state.ownerName = ownerName; state.isOwner = ownerName === state.username; emit("owner", ownerName); emit("players", snapshot()); }
  function removePeer(peerId) { if (!state) return; var p = state.players.get(peerId); if (!p) return; state.players.delete(peerId); emit("leave", p.username); emit("players", snapshot()); if (state.isOwner) global.WWNPeer.broadcast({ type: "player-left", peerId: peerId }); }
  async function migrate(reason) {
    if (!state || migrating || state.isOwner) return; migrating = true;
    var list = snapshot().filter(function (p) { return p.peerId !== state.peerId; }).sort(function (a, b) { return (a.joinedAt || 0) - (b.joinedAt || 0); });
    var rank = list.findIndex(function (p) { return p.peerId === state.peerId; }); if (rank < 0) rank = 0;
    var claimed = await global.WWNPeer.claimMaster(state.masterId, { retries: 7 });
    if (claimed) { state.isOwner = true; state.ownerName = state.username; var list = snapshot(); global.WWNPeer.broadcast({ type: "owner-update", ownerName: state.username }); global.WWNPeer.broadcast({ type: "player-list", ownerName: state.username, players: list, mode: state.mode }); emit("migrated", state.username); }
    migrating = false;
  }
  async function joinOrCreate(opts) {
    if (!validateName(opts.username)) throw new Error("ユーザー名は半角英数字・ハイフン・アンダースコア（2〜24文字）です。");
    if (!validateName(opts.roomName)) throw new Error("ルーム名は半角英数字・ハイフン・アンダースコア（2〜24文字）です。");
    var hash = await global.WWNPeer.computeRoomHash(opts.roomName, opts.roomKey || "");
    var peerId = global.WWNPeer.buildPeerId(opts.roomName, hash, opts.username); var masterId = global.WWNPeer.buildPeerId(opts.roomName, hash, "MASTER");
    state = { username: opts.username, roomName: opts.roomName, roomKey: opts.roomKey || "", roomHash: hash, mode: opts.mode || "1v1", peerId: peerId, masterId: masterId, isOwner: false, ownerName: null, team: opts.team || "NONE", players: new Map(), joinedAt: Date.now(), status: "connecting" };
    await global.WWNPeer.startPersonal(peerId); bindEvents();
    state.players.set(peerId, { username: opts.username, peerId: peerId, isOwner: false, team: state.team, joinedAt: state.joinedAt });
    var claimed = await global.WWNPeer.claimMaster(masterId, { retries: 3 });
    if (claimed) { state.isOwner = true; state.ownerName = opts.username; var me = state.players.get(peerId); me.isOwner = true; if (state.mode === "team") { me.team = "RED"; state.team = "RED"; } state.players.set(peerId, me); state.status = "connected"; return { isOwner: true, peerId: peerId, ownerName: opts.username, roomHash: hash }; }
    try { var conn = await global.WWNPeer.connectTo(masterId); conn.send(JSON.stringify({ type: "join", username: opts.username, peerId: peerId, joinedAt: state.joinedAt })); await new Promise(function (resolve) { setTimeout(resolve, 900); }); if (!state.ownerName) await migrate("no-welcome"); state.status = "connected"; return { isOwner: state.isOwner, peerId: peerId, ownerName: state.ownerName, roomHash: hash }; }
    catch (_) { throw new Error("ルームへ接続できませんでした。ルーム名・キーとネット接続を確認してください。"); }
  }
  function setTeam(team) { if (!state || !["RED", "BLUE", "NONE"].includes(team)) return; state.team = team; var p = state.players.get(state.peerId); if (p) { p.team = team; state.players.set(state.peerId, p); } global.WWNPeer.broadcast({ type: "team-update", peerId: state.peerId, team: team }); }
  function leave() { if (!state) return; if (state.isOwner) global.WWNPeer.broadcast({ type: "owner-left", ownerName: state.username }); global.WWNPeer.destroy(); state = null; migrating = false; }
  global.WWNRoom = { OPEN_ROOM_NAME: OPEN_NAME, validateName: validateName, joinOrCreate: joinOrCreate, on: on, getState: function () { return state; }, getPlayerList: snapshot, setTeam: setTeam, leave: leave, isOpenMode: function (name) { return name === OPEN_NAME; }, ensureMesh: ensureMesh };
})(typeof window !== "undefined" ? window : globalThis);
