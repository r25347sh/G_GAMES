# G_GAMES

G⁵ Portal デザイン準拠のブラウザ対戦ゲームポータル。

## 構成

```
G_GAMES/
├── index.html              # ホーム（games-registry から動的描画）
├── css/style.css
├── js/
│   ├── main.js
│   └── games-registry.js   # ゲーム一覧の単一ソース
├── .github/workflows/deploy.yml
├── .gitignore / .gitattributes / .nojekyll
└── games/
    ├── wwn/                # 第n次世界大戦
    └── code-duel/          # CODE DUEL（プログラミング対戦）
```

## ゲーム追加手順（競合ゼロ）

1. `games/<id>/` にゲームを配置
2. `js/games-registry.js` の `GAMES` 配列に1エントリ追加
3. `index.html` は編集しない

## デプロイ

`main` への push で GitHub Pages へ自動デプロイ（concurrency 制御付き）。

## 技術方針

- ビルド不要・静的ホスティング
- 通信: PeerJS（personal + MASTER ランデブー）
- ホストマイグレーション + フルメッシュ
- ゲーム状態は結果のみ同期（隠しコマンド方針）
