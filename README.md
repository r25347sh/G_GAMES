# G_GAMES

G⁵ Portal デザイン準拠のブラウザ P2P ゲームポータル。

## 構成

```
G_GAMES/
├── index.html
├── css/style.css
├── js/main.js
└── games/
    └── wwn/          # 第n次世界大戦
```

## ゲーム

| ID  | 名前           | 状態      |
|-----|----------------|-----------|
| wwn | 第n次世界大戦  | Step 3 完了 |

## 技術方針

- ビルド不要・静的ホスティング
- P2P: PeerJS（personal + MASTER デュアル）
- ホストマイグレーション: 参加順 + staggered claim
- フルメッシュ接続
- デザイン: G5PORTAL 完全準拠
