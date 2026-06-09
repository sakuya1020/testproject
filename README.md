# testproject

勤怠入力サイトのプロトタイプです。Next.js + TypeScript を使い、Prisma 経由で PostgreSQL に勤怠データを保存します。Railway で公開する構成です。

## 現在の仕様

- 年月を画面全体で指定する
- 指定月の1か月分の日別入力欄を最初から表示する
- 土日は初期非表示
- 「土日を表示」ボタンで土日を表示し、再押下で非表示に戻す
- 土日に入力がある場合、その日は非表示モードでも表示したままにする
- 各日は初期3行（午前、午後、残業）を表示する
- 行は日別に追加できる
- 空行は保存しない

## 入力項目

- オーダー: 半角のみ、最大9文字
- 移動時間: チェックボックス
- 工程: アルファベット2文字
- 詳細: 数字2桁
- オーダー名
- 勤務開始時間
- 勤務終了時間
- 作業内容
- 稼働時間: 勤務開始時間と勤務終了時間から自動表示

## ファイル構成

```text
.
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── scripts/
│   ├── prepare-standalone.cjs
│   └── start-railway.cjs
├── src/
│   ├── app/
│   │   ├── api/attendance/csv/route.ts
│   │   ├── api/health/route.ts
│   │   ├── actions.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── MonthAttendanceForm.tsx
│   │   └── page.tsx
│   └── lib/
│       ├── attendance.ts
│       └── prisma.ts
├── railway.json
└── package.json
```

## ローカルセットアップ

1. 依存関係をインストールする

   ```powershell
   npm install
   ```

2. 環境変数ファイルを作成する

   ```powershell
   Copy-Item .env.example .env
   ```

3. `.env` の `DATABASE_URL` を PostgreSQL 接続文字列に変更する

4. Prisma migration を実行する

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

## Railway公開

- `railway.json` で Railway の build / deploy / healthcheck を設定しています
- pre-deploy command で `npx prisma migrate deploy` を実行します
- healthcheck は `/api/health` を使います
- standalone build 用に、build 後に `.next/static` を `.next/standalone/.next/static` へコピーします

## 動作確認

```powershell
npm run lint
npm run build
```

画面では以下を確認してください。

1. 年月を変えて表示できる
2. 平日の入力欄が1か月分表示される
3. 土日の表示/非表示を切り替えられる
4. 土日に入力したあと、土日非表示に戻しても入力済みの土日は残る
5. 日別に行追加できる
6. 月次保存できる
7. 保存後に再表示して入力内容が残る
8. CSVをダウンロードできる

## 残課題

- 社員・入力者の管理
- ログイン
- 承認フロー
- 月次集計
- 業務用CSV形式への調整
- 稼働時間の丸め・休憩・深夜跨ぎの扱い
- 監査ログ
