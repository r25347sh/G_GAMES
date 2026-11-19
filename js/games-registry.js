/**
 * G_GAMES - Game registry (single source of truth for home cards)
 */
(function (global) {
  "use strict";
  const GAMES = [
    {
      id: "wwn",
      title: "第n次世界大戦",
      description: "見下ろし型2D空中戦。ドッグファイト＆タクティカルバトル。カスタムルーム / オープン乱戦対応。",
      path: "games/wwn/index.html",
      status: "wip",
      statusLabel: "Step4 完了",
      icon: "✈️",
      highlight: true,
    },
    {
      id: "coming-soon",
      title: "Coming Soon",
      description: "次のタイトルを鋭意制作中。乞うご期待。",
      path: null,
      status: "soon",
      statusLabel: "近日公開",
      icon: "🚀",
      highlight: false,
    },
  ];
  function renderCards(container) {
    if (!container) return;
    container.innerHTML = "";
    GAMES.forEach(function (g) {
      const article = document.createElement("article");
      article.className = "card" + (g.highlight ? " card-wwn" : "");
      const statusClass = g.status === "ready" ? "status-ready" : g.status === "wip" ? "status-wip" : "status-soon";
      const action = g.path
        ? '<a href="' + g.path + '" class="btn btn-primary" style="margin-top:1.1rem;font-size:0.88rem;">' +
          (g.status === "ready" ? "プレイ" : "ロビーへ入る") + "</a>"
        : "";
      article.innerHTML =
        '<div class="card-icon">' + g.icon + "</div>" +
        "<h3>" + escapeHtml(g.title) + "</h3>" +
        "<p>" + escapeHtml(g.description) + "</p>" +
        '<span class="status ' + statusClass + '">' + escapeHtml(g.statusLabel) + "</span>" +
        action;
      container.appendChild(article);
    });
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  global.GGamesRegistry = { GAMES: GAMES, renderCards: renderCards };
})(typeof window !== "undefined" ? window : globalThis);
