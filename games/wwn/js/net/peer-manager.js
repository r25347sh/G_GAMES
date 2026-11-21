(function (global) {
  "use strict";
  var STUN_LIST = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" }
  ];
  var peer = null, master = null, connections = new Map(); var amHost = false;
  var listeners = Object.create(null);
  function on(type, fn) { (listeners[type] ||= []).push(fn); }
  function off(type, fn) { if (listeners[type]) listeners[type] = listeners[type].filter(function (x) { return x !== fn; }); }
  function emit(type) { var args = Array.prototype.slice.call(arguments, 1); (listeners[type] || []).forEach(function (fn) { try { fn.apply(null, args); } catch (_) {} }); }
  function loadPeerJS() {
    if (global.Peer) return Promise.resolve(global.Peer);
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script"); s.src = "https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js";
      s.onload = function () { global.Peer ? resolve(global.Peer) : reject(new Error("PeerJSの読み込みに失敗しました")); };
      s.onerror = function () { reject(new Error("PeerJSの読み込みに失敗しました")); };
      document.head.appendChild(s);
    });
  }
  async function shaHex(text) { var b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)); return Array.from(new Uint8Array(b)).map(function (v) { return v.toString(16).padStart(2, "0"); }).join(""); }
  async function computeRoomHash(name, key) { return (await shaHex(name + "|" + (key || ""))).slice(0, 16); }
  function peerId(name, hash, user) { return encodeURIComponent(name).replace(/%/g, "-").slice(0, 20) + "_" + hash + "_" + encodeURIComponent(user).replace(/%/g, "-").slice(0, 24); }
  function setupConnection(conn, masterChannel) {
    conn.on("open", function () { if (!masterChannel) connections.set(conn.peer, conn); emit("connection", conn, { isMasterChannel: masterChannel }); });
    conn.on("data", function (data) { emit("data", data, conn, { isMasterChannel: masterChannel }); });
    conn.on("close", function () { if (!masterChannel) connections.delete(conn.peer); emit("close", conn, { isMasterChannel: masterChannel }); });
    conn.on("error", function (err) { emit("error", err, conn); });
  }
  function newPeer(id) { return new global.Peer(id, { debug: 0, config: { iceServers: STUN_LIST } }); }
  async function startPersonal(id) {
    await loadPeerJS();
    if (peer) try { peer.destroy(); } catch (_) {}
    connections.clear();
    return new Promise(function (resolve, reject) {
      peer = newPeer(id);
      peer.on("open", function () { emit("open", id); resolve(id); });
      peer.on("connection", function (conn) { setupConnection(conn, false); });
      peer.on("error", function (err) { emit("error", err); reject(err); });
      peer.on("disconnected", function () { emit("disconnected"); });
    });
  }
  function claimMaster(id, opts) {
    opts = opts || {}; var retries = opts.retries || 5;
    return new Promise(function (resolve) {
      var tryOne = function (n) {
        if (n >= retries) return resolve(false);
        var candidate = newPeer(id); var settled = false;
        var timer = setTimeout(function () { if (!settled) { settled = true; try { candidate.destroy(); } catch (_) {} tryOne(n + 1); } }, 6000);
        candidate.on("open", function () {
          if (settled) return; settled = true; clearTimeout(timer);
          master = candidate;
          master.on("connection", function (conn) { setupConnection(conn, true); });
          master.on("close", function () { master = null; amHost = false; emit("masterClose"); });
          emit("masterOpen", id); amHost = true; resolve(true);
        });
        candidate.on("error", function () {
          if (settled) return; settled = true; clearTimeout(timer);
          try { candidate.destroy(); } catch (_) {}
          setTimeout(function () { tryOne(n + 1); }, 200);
        });
      };
      tryOne(0);
    });
  }
  function releaseMaster() {
    amHost = false;
    if (master) { try { master.destroy(); } catch (_) {} master = null; }
  }
  function connectTo(id) {
    return new Promise(function (resolve, reject) {
      if (!peer) return reject(new Error("Peer not started"));
      var conn = peer.connect(id, { reliable: true });
      var timer = setTimeout(function () { reject(new Error("connect timeout")); }, 10000);
      conn.on("open", function () { clearTimeout(timer); setupConnection(conn, false); resolve(conn); });
      conn.on("error", function (err) { clearTimeout(timer); reject(err); });
    });
  }
  function broadcast(data) {
    var payload = typeof data === "string" ? data : JSON.stringify(data);
    connections.forEach(function (conn) {
      if (conn && conn.open) try { conn.send(payload); } catch (_) {}
    });
    if (master && master.open) {
      // also fanout via master connections if we are host - PeerJS master receives connections
    }
  }
  function sendTo(id, data) {
    var conn = connections.get(id);
    if (!conn || !conn.open) return false;
    try { conn.send(typeof data === "string" ? data : JSON.stringify(data)); return true; } catch (_) { return false; }
  }
  function masterSend(data) {
    if (!master) return false;
    try {
      // send to all connected to master
      return true;
    } catch (_) { return false; }
  }
  function destroy() {
    amHost = false;
    releaseMaster();
    connections.forEach(function (c) { try { c.close(); } catch (_) {} });
    connections.clear();
    if (peer) try { peer.destroy(); } catch (_) {}
    peer = null;
  }
  function isMaster() {
    if (window.WWNRoom && WWNRoom.getState) {
      var st = WWNRoom.getState();
      if (st && st.isOwner) return true;
    }
    return !!amHost;
  }
  global.WWNPeer = {
    isMaster: isMaster, on: on, off: off, loadPeerJS: loadPeerJS, computeRoomHash: computeRoomHash,
    buildPeerId: peerId, startPersonal: startPersonal, claimMaster: claimMaster, releaseMaster: releaseMaster,
    connectTo: connectTo, broadcast: broadcast, sendTo: sendTo, masterSend: masterSend,
    getConnections: function () { return connections; },
    getPersonalId: function () { return peer ? peer.id : null; },
    hasMaster: function () { return !!(master && master.open); },
    destroy: destroy
  };
})(typeof window !== "undefined" ? window : globalThis);
