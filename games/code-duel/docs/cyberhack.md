# CyberHack リファレンス

**難易度: ★★★☆☆（電子戦・トリッキー）**

直接的な火力より、イベントフックと電子戦で相手のAIロジックを狂わせる言語です。

---

## イベント構文

```
ON <event> DO <action>
```

### イベント一覧

| イベント | 意味 |
|----------|------|
| `near` / `far` | 距離が近い / 遠い |
| `front` / `left` / `right` | 敵の相対方向 |
| `lowenergy` | エネルギー低下 |
| `overheat` | ヒート过高 |
| `wall` | 壁が近い |
| `always` | 常に |
| `hit` | 被弾時（簡易） |

### アクション例

`fire` / `spread` / `charge` / `shield` / `thrust` / `left` / `right` / `flee` / `jam`

---

## 電子戦コマンド

| コマンド | 効果 |
|----------|------|
| `jam` / `jamming` | センサーノイズ + 短時間防御 |
| `decoy` | デコイ展開（エネルギー消費） |
| `glitch` | 相手UIへの軽微干渉演出 |

---

## サンプル

```
ON near DO spread
ON front DO fire
ON lowenergy DO shield
ON wall DO right

thrust 0.7
ON far DO thrust

jam
```
