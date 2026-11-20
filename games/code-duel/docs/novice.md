# NoviceScript リファレンス

**難易度: ★☆☆☆☆（初心者向け）**

英語に近いシンプルな命令で機体を動かせます。プログラミング未経験でもすぐに対戦可能です。

---

## 基本命令

| 命令 | 説明 |
|------|------|
| `go` / `thrust` | 前進（強さ 0〜1 も指定可） |
| `stop` / `brake` | ブレーキ |
| `turn left` / `left` | 左旋回 |
| `turn right` / `right` | 右旋回 |
| `face enemy` / `aim` | 敵の方向を向く |
| `fire` / `shoot` | 通常弾発射 |
| `spread` | 拡散弾 |
| `charge` | チャージ弾 |
| `shield` / `guard` | シールド展開 |
| `chase` / `pursue` | 敵を追跡 |
| `flee` / `run` | 敵から逃走 |
| `orbit` / `circle` | 円を描くように移動しつつ攻撃 |

---

## 条件分岐

```
if 条件 then 行動
```

### 使える条件

| 条件 | 意味 |
|------|------|
| `near` / `close` | 距離が近い（約160未満） |
| `far` | 距離が遠い（約280超） |
| `left` | 敵が左にいる |
| `right` | 敵が右にいる |
| `front` / `ahead` | 敵が正面にいる |
| `energy low` | エネルギーが少ない |
| `heat high` / `overheat` | ヒートが高い |
| `wall near` | 壁が近い |
| `dist < 数値` | 距離が数値未満 |
| `dist > 数値` | 距離が数値超 |

### 使える行動（then の後）

`fire` / `spread` / `charge` / `shield` / `go` / `left` / `right` / `face` / `flee`

---

## サンプルコード

### 初級：追いかけ撃ち

```
face enemy
chase

if front then fire
if near then spread
if energy low then shield
if wall near then turn right
```

### 中級：距離管理

```
face enemy

if dist > 250 then go
if dist < 100 then flee
if front then fire
if near then spread
if energy low then shield
```

---

## 注意

- 1行に1命令
- 上から順に**毎フレーム**実行されます
- コメントは `//` で書けます
- 大文字小文字は区別しません
