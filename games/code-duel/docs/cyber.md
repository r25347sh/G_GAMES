# CyberScript リファレンス

**難易度: ★★★☆☆（標準）**

Python / Lua 風の構文で、状況適応型の本格AIを記述できます。

---

## センサー（読み取り専用変数）

| 変数 | 説明 |
|------|------|
| `dist` | 敵との距離 |
| `angle` | 敵への相対角度（rad）。負=左 / 正=右 |
| `lead` | 偏差射撃用の予測角度 |
| `energy` | エネルギー残量 (0-100) |
| `heat` | ヒート量 (0-100) |
| `hp` | 耐久値 |
| `vx`, `vy` | 自分の速度 |
| `targetVx`, `targetVy` | 敵の速度 |
| `wallLeft` / `wallRight` / `wallTop` / `wallBottom` | 各壁までの距離 |
| `wallMin` | 最も近い壁までの距離 |
| `time` | 試合経過時間 |
| `dt` | フレーム時間 |

---

## アクション関数

| 関数 | 説明 |
|------|------|
| `thrust(power)` | 推進 0.0〜1.0 |
| `turn(dir)` | 旋回 -1.0〜1.0（負=左） |
| `fire()` | 通常弾 |
| `fire("spread")` | 拡散弾 |
| `fire("charge")` | チャージ弾 |
| `shield()` | 反射シールド |
| `log(msg)` | コンソール出力 |

---

## 制御構文・演算

```
if (条件) { ... } else if (条件) { ... } else { ... }

let x = 10
x = x + 1

abs()  sin()  cos()  atan2()  min()  max()  sqrt()  hypot()
sign()  clamp(v, a, b)  deg()  rad()  pi
```

---

## サンプルコード

### 追跡 + 偏差射撃

```
let aim = lead;
if (abs(aim) > 0.08) {
  turn(sign(aim) * 0.95);
}

if (dist > 220) {
  thrust(1.0);
} else if (dist < 90) {
  thrust(0.25);
  turn(sign(aim) * 0.4);
} else {
  thrust(0.65);
}

if (abs(angle) < 0.22 && dist < 320 && energy > 20) {
  if (dist < 140) {
    fire("spread");
  } else {
    fire();
  }
}

if (energy < 30) {
  shield();
}

if (wallMin < 55) {
  turn(0.8);
  thrust(0.7);
}
```

---

## Tips

- `lead` を使うと偏差射撃ができ、命中率が大きく上がります
- エネルギーとヒートを常に監視し、無理な連射を避けましょう
- 壁際では反射を利用したトリックも有効です
