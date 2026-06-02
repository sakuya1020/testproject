# testproject

勤怠入力サイトのプロトタイプです。Next.js + TypeScript を使い、Prisma 経由で PostgreSQL に勤怠データを保存します。Railway での公開を想定した構成です。

## 実装方針

- Next.js App Router の Server Components / Server Actions で画面と保存処理を構成する
- データベースは Railway PostgreSQL を使う
- Prisma schema の `Attendance` モデルで「氏名」「勤務日」「出勤時刻」「退勤時刻」「休憩時間」「備考」を管理する
- CSV は `/api/attendance/csv` の Route Handler で生成する
- Railway の pre-deploy command で `npx prisma migrate deploy` を実行し、デプロイ前にDB migrationを適用する
- プロトタイプとしてログイン、権限、承認ワークフローは対象外にする

## ファイル構成

```text
.
├── prisma/
│   ├── migrations/
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
├── railway.json
├── package.json
├── tsconfig.json
└── README.md
```

## ローカルセットアップ

1. 依存関係をインストールする

   ```powershell
   npm install
   ```

2. PostgreSQL の接続文字列を用意する

   Railway PostgreSQL、またはローカル PostgreSQL の `DATABASE_URL` を使います。

3. 環境変数ファイルを作成する

   ```powershell
   Copy-Item .env.example .env
   ```

   `.env` の `DATABASE_URL` を実際の PostgreSQL 接続文字列に変更してください。

4. Prisma の migration を実行する

   ```powershell
   npm run prisma:migrate
   ```

5. 開発サーバーを起動する

   ```powershell
   npm run dev
   ```

6. ブラウザで開く

   ```text
   http://localhost:3000
   ```

## Railway公開手順

1. Railway Dashboard で `sakuya1020/testproject` を選び、GitHub repo からサービスを作成する
2. Railway のプロジェクトで `+ New` から PostgreSQL を追加する
3. Next.js サービスの Variables で PostgreSQL の `DATABASE_URL` を参照変数として追加する
4. デプロイする
5. `railway.json` の pre-deploy command により `npx prisma migrate deploy` が実行される
6. デプロイ完了後、Railway の公開URLを開いて動作確認する

Railway の公式ガイドでは、Next.js の standalone build と PostgreSQL 接続、Prisma migration の pre-deploy command が推奨されています。

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
   npm run build
   ```

## 実装時に確認したこと

- `npm run lint` が成功すること
- `npm run build` が成功すること
- Prisma schema が PostgreSQL provider として valid であること

## 残課題

- 入力者認証とユーザー別データ管理
- 出退勤時刻と休憩時間から実働時間を計算する機能
- 月次集計、検索、絞り込み
- 削除前の確認ダイアログ
- CSV の文字コードや項目形式の業務要件への調整
- 本番運用向けバックアップ、監査ログの検討
