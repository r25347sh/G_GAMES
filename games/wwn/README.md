# 第n次世界大戦 (wwn)

見下ろし型2D空中戦 P2P対戦アクション。

## 実装状況

| Step | 内容 | 状態 |
|------|------|------|
| 1 | ディレクトリ + ホーム | 完了 |
| 2 | ロビー + PeerJS + オーナー表示 | 完了 |
| 3 | ホストマイグレーション + フルメッシュ + チーム準備 | 完了 |

## Peer ID 形式（厳守）

```
roomHash = SHA-256(roomName + "|" + roomKey).slice(0, 12)
peerId   = `${roomName}_${roomHash}_${username}`
masterId = `${roomName}_${roomHash}_MASTER`
```

- 全員が常に personal peerId で起動
- オーナーのみ MASTER を追加で claim（ランデブー用）
- オーナー切断時: 参加順（joinedAt → username）で rank 付けし、staggered retry で MASTER を再取得

## フルメッシュ

welcome / player-list 受信後、未接続の全 peerId へ `connectTo` してメッシュを張る。

## チーム戦

mode=team のとき RED/BLUE 自動振り分け + ロビーで手動変更可能。

## 隠しコマンド方針（Step10）

- 生コマンド文字列をソースに書かない（SHA-256照合）
- P2P同期は結果オブジェクトのみ（コマンド文字列は送らない）
