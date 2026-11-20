(function (global) {
  "use strict";
  var open = false;
  var el, input, logEl, apiRef = null;
  function ensureDom() {
    if (el) return;
    el = document.createElement("div");
    el.id = "wwn-terminal";
    el.innerHTML =
      '<div class="wwn-term-inner">' +
      '<div class="wwn-term-title">WWN // ROOT CONSOLE</div>' +
      '<div class="wwn-term-log" id="wwn-term-log"></div>' +
      '<div class="wwn-term-row"><span class="wwn-term-ps">$</span>' +
      '<input id="wwn-term-input" autocomplete="off" spellcheck="false" /></div>' +
      '<div class="wwn-term-hint">help · fire &lt;id&gt; · unlock &lt;id&gt; · allies · status · clear · exit</div>' +
      "</div>";
    document.body.appendChild(el);
    logEl = el.querySelector("#wwn-term-log");
    input = el.querySelector("#wwn-term-input");
    input.addEventListener("keydown", function (e) {
      e.stopPropagation();
      if (e.key === "Enter") { run(input.value.trim()); input.value = ""; }
      if (e.key === "Escape") close();
    });
    if (!document.getElementById("wwn-term-style")) {
      var st = document.createElement("style");
      st.id = "wwn-term-style";
      st.textContent =
        "#wwn-terminal{display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.72);align-items:center;justify-content:center;font-family:ui-monospace,Menlo,Consolas,monospace}" +
        "#wwn-terminal.open{display:flex}" +
        ".wwn-term-inner{width:min(640px,92vw);background:#0a0e14;border:1px solid #00f5ff;border-radius:10px;box-shadow:0 0 40px rgba(0,245,255,.25);padding:14px 16px;color:#c8f7ff}" +
        ".wwn-term-title{color:#00f5ff;font-weight:700;letter-spacing:.12em;margin-bottom:8px;font-size:13px}" +
        ".wwn-term-log{height:260px;overflow:auto;background:#05080c;border:1px solid #1a2a33;border-radius:6px;padding:10px;font-size:12px;line-height:1.5;white-space:pre-wrap}" +
        ".wwn-term-row{display:flex;align-items:center;gap:8px;margin-top:10px}" +
        ".wwn-term-ps{color:#00f5ff}" +
        "#wwn-term-input{flex:1;background:#05080c;border:1px solid #1a2a33;color:#e8f7ff;padding:8px 10px;border-radius:6px;font:inherit;outline:none}" +
        "#wwn-term-input:focus{border-color:#00f5ff}" +
        ".wwn-term-hint{margin-top:8px;font-size:11px;color:#5a7a88}";
      document.head.appendChild(st);
    }
  }
  function println(msg, color) {
    ensureDom();
    var line = document.createElement("div");
    if (color) line.style.color = color;
    line.textContent = msg;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }
  function openTerm(api) {
    ensureDom();
    apiRef = api || null;
    open = true;
    el.classList.add("open");
    println("session opened · type help", "#00f5ff");
    setTimeout(function () { input.focus(); }, 50);
  }
  function close() {
    open = false;
    if (el) el.classList.remove("open");
  }
  function run(cmd) {
    if (!cmd) return;
    println("$ " + cmd, "#7ab");
    var parts = cmd.toLowerCase().split(/\s+/);
    var c = parts[0];
    var arg = parts[1] || "";
    if (c === "help" || c === "?") {
      println("commands:");
      println("  help                 this list");
      println("  list                 unlocked secrets");
      println("  fire <id>            trigger unlocked secret");
      println("  unlock <id>          force unlock (console only)");
      println("  allies [type] [n]    spawn ally (guardian|striker|phantom)");
      println("  heal / boost / refill");
      println("  chaos                random battlefield pulse");
      println("  status               ship / unlock count");
      println("  phrases              show phrase list (debug)");
      println("  clear / exit");
      return;
    }
    if (c === "exit" || c === "close" || c === "quit") { close(); return; }
    if (c === "clear") { logEl.innerHTML = ""; return; }
    if (c === "list") {
      var ul = global.WWNSecret ? WWNSecret.getUnlockedList() : [];
      if (!ul.length) println("(none unlocked)", "#888");
      else ul.forEach(function (id) {
        var m = WWNSecret.getMeta(id);
        println("  " + id + "  —  " + (m.name || ""));
      });
      return;
    }
    if (c === "phrases") {
      if (global.WWNSecret && WWNSecret.listPhrasesDev) {
        WWNSecret.listPhrasesDev().forEach(function (l) { println("  " + l, "#8af"); });
      }
      return;
    }
    if (c === "unlock") {
      if (!arg) { println("usage: unlock <id>", "#f66"); return; }
      if (global.WWNSecret) { WWNSecret.unlock(arg); println("unlocked: " + arg, "#6f6"); }
      return;
    }
    if (c === "fire") {
      if (!arg) { println("usage: fire <id>", "#f66"); return; }
      if (!global.WWNSecret || !WWNSecret.isUnlocked(arg)) { println("not unlocked: " + arg, "#f66"); return; }
      if (apiRef && apiRef.fireSecret) {
        var ok = apiRef.fireSecret(arg);
        println(ok ? "fired " + arg : "failed " + arg, ok ? "#6f6" : "#f66");
      } else println("no game context — unlock only in lobby", "#fa0");
      return;
    }
    if (c === "allies") {
      var typ = arg || "guardian";
      var n = parseInt(parts[2], 10) || 1;
      if (apiRef && apiRef.spawnAllyType) {
        apiRef.spawnAllyType(typ, n);
        println("spawned " + n + "× " + typ, "#6f6");
      } else println("need in-game context", "#fa0");
      return;
    }
    if (c === "heal") {
      if (apiRef && apiRef.heal) { apiRef.heal(); println("hull restored", "#6f6"); }
      else println("need in-game", "#fa0");
      return;
    }
    if (c === "boost") {
      if (apiRef && apiRef.fullBoost) { apiRef.fullBoost(); println("boost charged", "#6f6"); }
      else println("need in-game", "#fa0");
      return;
    }
    if (c === "refill") {
      if (apiRef && apiRef.refill) { apiRef.refill(); println("ammo refilled", "#6f6"); }
      else println("need in-game", "#fa0");
      return;
    }
    if (c === "chaos") {
      if (apiRef && apiRef.chaos) { apiRef.chaos(); println("chaos pulse", "#f6a"); }
      else println("need in-game", "#fa0");
      return;
    }
    if (c === "status") {
      if (apiRef && apiRef.status) println(apiRef.status());
      else {
        var n2 = global.WWNSecret ? WWNSecret.getUnlockedList().length : 0;
        println("unlocks=" + n2);
      }
      return;
    }
    println("unknown: " + c + "  (help)", "#f66");
  }
  global.WWNTerminal = {
    open: openTerm,
    close: close,
    isOpen: function () { return open; },
  };
})(typeof window !== "undefined" ? window : globalThis);
