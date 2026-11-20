# Vectra リファレンス

**難易度: ★★★★☆（ベクトル・軌道特化）**

2Dベクトル演算と三角関数で、円軌道・サイン波・慣性ドリフト・トリックショットを数式で構築する言語です。

---

## ベクトル関数

| 関数 | 説明 |
|------|------|
| `V(x, y)` | ベクトル生成 |
| `add(a, b)` | 加算 |
| `sub(a, b)` | 減算 |
| `scale(v, s)` | スカラー倍 |
| `len(v)` | 長さ |
| `norm(v)` | 正規化 |
| `dot(a, b)` | 内積 |
| `cross(a, b)` | 外積（2Dスカラー） |
| `rot(v, ang)` | 回転 |
| `angleOf(v)` | 角度を取得 |

---

## センサー・状態

| 変数 | 説明 |
|------|------|
| `pos` | 自分の位置ベクトル |
| `vel` | 自分の速度ベクトル |
| `target` | 敵の位置ベクトル |
| `targetVel` | 敵の速度ベクトル |
| `dist` / `angle` / `lead` | 距離・角度・偏差角 |
| `energy` / `heat` / `wallMin` / `time` / `dt` | 状態 |

---

## アクション

| 関数 | 説明 |
|------|------|
| `thrust(v)` | 推進 |
| `turn(v)` | 旋回 |
| `fire()` / `fire("spread")` / `fire("charge")` | 射撃 |
| `shield()` | シールド |
| `aimTo(rad)` | 目標角度へ旋回を補助 |

---

## サンプル：円軌道 + 偏差射撃

```
let toTarget = sub(target, pos);
let dir = norm(toTarget);
let tangent = rot(dir, pi / 2);

let desired = add(
  scale(dir, -0.3),
  scale(tangent, 0.9)
);

let err = sub(desired, vel);
let forceDir = norm(err);

aimTo(angleOf(forceDir));
thrust(0.85);

if (abs(lead) < 0.18 && dist < 280 && energy > 25) {
  fire();
}

if (wallMin < 50) {
  aimTo(angle + pi);
  thrust(1);
}
```
