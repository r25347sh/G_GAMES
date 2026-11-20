# CtrlWorld リファレンス

**難易度: ★★★★★（制作者専用・シークレット）**

「世界そのものを制御する」最難関・最強言語です。通常の言語選択リストには出ません。

---

## 解放について

デフォルトではロックされています。  
制作者のみが知る隠しコマンド、またはコンソールから解放します。

```js
// ブラウザコンソール例（開発用）
window.G_GAMES.langManager.interpreters.ctrlworld.unlock();
```

---

## レジスタ・フラグ

| 名前 | 説明 |
|------|------|
| `R0` 〜 `R7` | 汎用レジスタ |
| `FLAGS` | ZF (bit0) / SF (bit2) など |

---

## 基本命令

```
MOV dest, src
ADD / SUB / MUL dest, src
CMP a, b
JMP label
JZ / JNZ / JL label
```

---

## アクション

```
THRUST n
TURN n
FIRE / SPREAD / CHARGE
SHIELD
```

---

## 物理法則干渉（他言語では不可能）

| 命令 | 効果 |
|------|------|
| `GRAVITY n` | 局所引力場（弾を吸引） |
| `SLOWFIELD n` | 敵の時間遅延 |
| `SHIFT n` | 短距離座標シフト |
| `INTERRUPT` | 被弾危機時の自動防御割り込み |

---

## サンプル

```
MOV R0, DIST
CMP R0, 180
JL  CLOSE

MOV R1, LEAD
TURN R1
THRUST 0.9
FIRE
JMP END

CLOSE:
SLOWFIELD 1
SPREAD
SHIELD
THRUST 0.4

END:
NOP
```
