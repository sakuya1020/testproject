# testproject

勤怠入力サイトのローカルプロトタイプです。Next.js + TypeScript を使い、Prisma 経由で SQLite に勤怠データを保存します。

## 実装方針

- Next.js App Router の Server Components / Server Actions を使い、画面と保存処理を小さく構成する
- SQLite はローカル開発用DBとして `prisma/dev.db` に作成する
- Prisma schema の `Attendance` モデルで「氏名」「勤務日」「出勤時刻」「退勤時刻」「休憩時間」「備考」を管理する
- CSV は `/api/attendance/csv` の Route Handler で生成する
- プロトタイプとしてログイン、権限、承認ワークフローは対象外にする

## ファイル構成

```text
.
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── api/attendance/csv/route.ts
│   │   ├── actions.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── lib/
│       ├── attendance.ts
│       └── prisma.ts
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## セットアップ手順

1. 依存関係をインストールする

   ```powershell
   npm install
   ```

2. 環境変数ファイルを作成する

   ```powershell
   Copy-Item .env.example .env
   ```

3. Prisma のマイグレーションを実行する

   ```powershell
   npm run prisma:migrate
   ```

   このコマンドは、初回実行時に空の `prisma/dev.db` を作成してから Prisma migration を適用します。

4. 開発サーバーを起動する

   ```powershell
   npm run dev
   ```

5. ブラウザで開く

   ```text
   http://localhost:3000
   ```

## 動作確認手順

1. トップページで「氏名」「勤務日」「出勤時刻」「退勤時刻」「休憩時間」「備考」を入力して保存する
2. 保存済みデータ一覧に入力内容が表示されることを確認する
3. 一覧の行を開き、値を変更して「更新」を押す
4. 更新後の値が一覧に反映されることを確認する
5. 「削除」を押し、対象行が一覧から消えることを確認する
6. 「CSVダウンロード」を押し、`attendance.csv` が取得できることを確認する
7. 品質確認として以下を実行する

   ```powershell
   npm run lint
   ```

## 実装時に確認したこと

- `npm run prisma:migrate` で SQLite DB と Prisma Client を作成できること
- `npm run lint` が成功すること
- `npm run build` が成功すること
- 開発サーバーでトップページが HTTP 200 を返すこと
- Prisma Client 経由で保存、更新、削除ができること
- `/api/attendance/csv` が CSV を返すこと

開発サーバーは `npm run dev` で起動する一時的なプロセスです。ターミナルを閉じる、プロセスを停止する、または Windows を終了すると停止します。

## 残課題

- 入力者認証とユーザー別データ管理
- 出退勤時刻と休憩時間から実働時間を計算する機能
- 月次集計、検索、絞り込み
- 削除前の確認ダイアログ
- CSV の文字コードや項目形式の業務要件への調整
- 本番運用向けDB、バックアップ、監査ログの検討
