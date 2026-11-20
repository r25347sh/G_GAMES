(function (global) {
  "use strict";
  var STUN_LIST = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" }
  ];
  var TURN_AVAILABLE = false;
  var peer = null, master = null, connections = new Map();
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
      peer = newPeer(id); var done = false;
      var timer = setTimeout(function () { if (!done) { done = true; reject(new Error("P2P接続タイムアウト。HTTPSまたはローカルホストで開いてください。")); } }, 15000);
      peer.on("open", function (value) { if (done) return; done = true; clearTimeout(timer); emit("open", value); resolve(value); });
      peer.on("connection", function (conn) { setupConnection(conn, false); });
      peer.on("error", function (err) { if (!done) { done = true; clearTimeout(timer); reject(err.type === "unavailable-id" ? new Error("同じユーザー名が使用中です。別名を選んでください。") : err); } emit("error", err); });
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
        candidate.on("open", function () { if (settled) return; settled = true; clearTimeout(timer); master = candidate; master.on("connection", function (conn) { setupConnection(conn, true); }); master.on("close", function () { master = null; emit("masterClose"); }); emit("masterOpen", id); resolve(true); });
        candidate.on("error", function (err) { if (settled) return; settled = true; clearTimeout(timer); try { candidate.destroy(); } catch (_) {} if (err.type === "unavailable-id") setTimeout(function () { tryOne(n + 1); }, 350 + n * 220); else setTimeout(function () { tryOne(n + 1); }, 700); });
      };
      tryOne(0);
    });
  }
  function connectTo(id) {
    return new Promise(function (resolve, reject) {
      if (!peer || !peer.open) return reject(new Error("P2P Peerが開いていません"));
      if (connections.has(id) && connections.get(id).open) return resolve(connections.get(id));
      var conn = peer.connect(id, { reliable: true, serialization: "json" }); var settled = false;
      var timer = setTimeout(function () { if (!settled) { settled = true; reject(new Error("相手への接続タイムアウト")); } }, 12000);
      conn.on("open", function () { if (settled) return; settled = true; clearTimeout(timer); setupConnection(conn, false); resolve(conn); });
      conn.on("error", function (err) { if (!settled) { settled = true; clearTimeout(timer); reject(err); } });
    });
  }
  function broadcast(data) { var text = typeof data === "string" ? data : JSON.stringify(data); connections.forEach(function (conn) { if (conn.open) try { conn.send(text); } catch (_) {} }); }
  function sendTo(id, data) { var conn = connections.get(id); if (!conn || !conn.open) return false; try { conn.send(typeof data === "string" ? data : JSON.stringify(data)); return true; } catch (_) { return false; } }
  function masterSend(conn, data) { if (conn && conn.open) try { conn.send(typeof data === "string" ? data : JSON.stringify(data)); } catch (_) {} }
  function releaseMaster() { if (master) try { master.destroy(); } catch (_) {} master = null; emit("masterClose"); }
  function destroy() { connections.forEach(function (c) { try { c.close(); } catch (_) {} }); connections.clear(); releaseMaster(); if (peer) try { peer.destroy(); } catch (_) {} peer = null; }
  global.WWNPeer = { on: on, off: off, loadPeerJS: loadPeerJS, computeRoomHash: computeRoomHash, buildPeerId: peerId, startPersonal: startPersonal, claimMaster: claimMaster, releaseMaster: releaseMaster, connectTo: connectTo, broadcast: broadcast, sendTo: sendTo, masterSend: masterSend, getConnections: function () { return connections; }, getPersonalId: function () { return peer ? peer.id : null; }, hasMaster: function () { return !!(master && master.open); }, destroy: destroy };
})(typeof window !== "undefined" ? window : globalThis);
