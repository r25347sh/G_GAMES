(function (global) {
  "use strict";
  var PEERJS_CDN = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
  var STUN = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
  var personalPeer = null, masterPeer = null;
  var connections = new Map();
  var listeners = { open: [], connection: [], data: [], close: [], error: [], disconnected: [], masterOpen: [], masterClose: [] };
  function on(event, fn) { if (!listeners[event]) listeners[event] = []; listeners[event].push(fn); }
  function off(event, fn) { if (!listeners[event]) return; listeners[event] = listeners[event].filter(function (f) { return f !== fn; }); }
  function emit(event) { var args = Array.prototype.slice.call(arguments, 1); (listeners[event] || []).forEach(function (fn) { try { fn.apply(null, args); } catch (e) { console.error(e); } }); }
  async function sha256Hex(str) {
    var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }
  async function computeRoomHash(roomName, roomKey) {
    var full = await sha256Hex(roomName + "|" + (roomKey || ""));
    return full.slice(0, 12);
  }
  function buildPeerId(roomName, roomHash, username) { return roomName + "_" + roomHash + "_" + username; }
  function loadPeerJS() {
    return new Promise(function (resolve, reject) {
      if (global.Peer) { resolve(global.Peer); return; }
      var s = document.createElement("script"); s.src = PEERJS_CDN;
      s.onload = function () { resolve(global.Peer); };
      s.onerror = function () { reject(new Error("PeerJSの読み込みに失敗しました")); };
      document.head.appendChild(s);
    });
  }
  function setupConn(conn, isMasterChannel) {
    conn.on("open", function () { if (!isMasterChannel) connections.set(conn.peer, conn); emit("connection", conn, { isMasterChannel: !!isMasterChannel }); });
    conn.on("data", function (data) { emit("data", data, conn, { isMasterChannel: !!isMasterChannel }); });
    conn.on("close", function () { if (!isMasterChannel) connections.delete(conn.peer); emit("close", conn, { isMasterChannel: !!isMasterChannel }); });
    conn.on("error", function (err) { emit("error", err, conn); });
  }
  async function startPersonal(peerId) {
    await loadPeerJS();
    if (personalPeer) { try { personalPeer.destroy(); } catch (_) {} personalPeer = null; }
    connections.clear();
    return new Promise(function (resolve, reject) {
      personalPeer = new global.Peer(peerId, { debug: 1, config: STUN });
      var settled = false;
      var timer = setTimeout(function () { if (!settled) { settled = true; reject(new Error("接続タイムアウト")); } }, 12000);
      personalPeer.on("open", function (id) { if (settled) return; settled = true; clearTimeout(timer); emit("open", id); resolve(id); });
      personalPeer.on("error", function (err) {
        if (settled) return; settled = true; clearTimeout(timer); emit("error", err);
        if (err && err.type === "unavailable-id") reject(new Error("このユーザー名は既に使用されています。別の名前を選んでください。"));
        else reject(err);
      });
      personalPeer.on("connection", function (conn) { setupConn(conn, false); });
      personalPeer.on("disconnected", function () { emit("disconnected"); });
      personalPeer.on("close", function () { emit("close"); });
    });
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function tryClaimOnce(masterId) {
    return new Promise(function (resolve) {
      var settled = false;
      var p = new global.Peer(masterId, { debug: 0, config: STUN });
      function finish(v) {
        if (settled) return; settled = true; clearTimeout(timer);
        try { p.off("open", onOpen); p.off("error", onError); } catch (_) {}
        if (v !== "ok") { try { p.destroy(); } catch (_) {} }
        resolve(v);
      }
      function onOpen() {
        masterPeer = p;
        masterPeer.on("connection", function (conn) { setupConn(conn, true); });
        masterPeer.on("close", function () { masterPeer = null; emit("masterClose"); });
        masterPeer.on("error", function (err) { emit("error", err); });
        finish("ok");
      }
      function onError(err) { if (err && err.type === "unavailable-id") finish("taken"); else finish("error"); }
      var timer = setTimeout(function () { finish("error"); }, 8000);
      p.on("open", onOpen); p.on("error", onError);
    });
  }
  async function claimMaster(masterId, opts) {
    opts = opts || {}; await loadPeerJS();
    var rank = opts.rank || 0, retries = opts.retries != null ? opts.retries : 5, baseDelay = opts.baseDelayMs != null ? opts.baseDelayMs : 450;
    if (rank > 0) await sleep(rank * baseDelay + Math.random() * 220);
    for (var attempt = 0; attempt < retries; attempt++) {
      if (masterPeer) { try { masterPeer.destroy(); } catch (_) {} masterPeer = null; }
      var result = await tryClaimOnce(masterId);
      if (result === "ok") { emit("masterOpen", masterId); return true; }
      if (result === "taken") {
        if (attempt < retries - 1) { await sleep(baseDelay * (attempt + 1) + Math.random() * 180); continue; }
        return false;
      }
      await sleep(baseDelay * (attempt + 1));
    }
    return false;
  }
  function releaseMaster() { if (masterPeer) { try { masterPeer.destroy(); } catch (_) {} masterPeer = null; emit("masterClose"); } }
  function connectTo(targetId, opts) {
    opts = opts || {}; var reliable = opts.reliable !== false;
    return new Promise(function (resolve, reject) {
      if (!personalPeer || !personalPeer.open) { reject(new Error("Peerが開いていません")); return; }
      if (connections.has(targetId)) { resolve(connections.get(targetId)); return; }
      var conn = personalPeer.connect(targetId, { reliable: reliable });
      var timer = setTimeout(function () { reject(new Error("相手への接続がタイムアウトしました")); }, 10000);
      conn.on("open", function () { clearTimeout(timer); setupConn(conn, String(targetId).endsWith("_MASTER")); resolve(conn); });
      conn.on("error", function (err) { clearTimeout(timer); reject(err); });
    });
  }
  function broadcast(data, opts) {
    opts = opts || {}; var payload = typeof data === "string" ? data : JSON.stringify(data);
    connections.forEach(function (conn, id) {
      if (opts.exclude && id === opts.exclude) return;
      if (conn.open) { try { conn.send(payload); } catch (e) { console.warn(e); } }
    });
  }
  function sendTo(peerId, data) {
    var conn = connections.get(peerId);
    if (conn && conn.open) { try { conn.send(typeof data === "string" ? data : JSON.stringify(data)); } catch (e) {} return true; }
    return false;
  }
  function masterSend(conn, data) {
    if (!conn || !conn.open) return;
    try { conn.send(typeof data === "string" ? data : JSON.stringify(data)); } catch (_) {}
  }
  function destroy() {
    connections.forEach(function (c) { try { c.close(); } catch (_) {} });
    connections.clear(); releaseMaster();
    if (personalPeer) { try { personalPeer.destroy(); } catch (_) {} personalPeer = null; }
  }
  global.WWNPeer = {
    on: on, off: off, computeRoomHash: computeRoomHash, buildPeerId: buildPeerId,
    startPersonal: startPersonal, claimMaster: claimMaster, releaseMaster: releaseMaster,
    connectTo: connectTo, broadcast: broadcast, sendTo: sendTo, masterSend: masterSend,
    getConnections: function () { return connections; },
    getPersonalId: function () { return personalPeer ? personalPeer.id : null; },
    hasMaster: function () { return !!(masterPeer && masterPeer.open); },
    destroy: destroy,
  };
})(typeof window !== "undefined" ? window : globalThis);
