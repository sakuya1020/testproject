# testproject

勤怠入力サイトのプロトタイプです。Next.js + TypeScript を使い、Prisma 経由で PostgreSQL に勤怠データを保存します。Railway で公開する構成です。

## 現在の仕様

- 勤怠入力画面と設定画面を行き来できる
- 年月を画面全体で指定する
- 指定月の1か月分の日別入力欄を最初から表示する
- 土日は初期非表示
- 「土日を表示」ボタンで土日を表示し、再押下で非表示に戻す
- 土日に入力がある場合、その日は非表示モードでも表示したままにする
- 各日は初期3行を表示する
- 行は日別に追加できる
- 空行は保存しない
- 週ごとにアコーディオンで開閉できる
- 週アコーディオンは初期状態ではすべて閉じる
- 週アコーディオンの開閉状態はブラウザに保存し、別月へ移動しても同じ週番号の開閉状態を再現する

## 勤怠入力項目

- オーダー: 半角のみ、最大9文字。設定画面で登録したオーダーNoを候補選択できる
- 移動時間: チェックボックス
- 工程: アルファベット2文字
- 詳細: 数字2桁
- オーダー名
- 勤務開始時間
- 勤務終了時間
- 作業内容
- 稼働時間: 勤務開始時間と勤務終了時間から「0時間00分」形式で自動表示

## 設定項目

- OP-NO: 数値3桁
- 氏名
- オーダー設定: 最大10件
  - オーダーNo
  - オーダー名
  - 時間1: 各日の1行目の開始時刻・終了時刻
  - 時間2: 各日の2行目の開始時刻・終了時刻
- 月次初期化
  - 年月、工程、詳細、オーダーNoを指定して実行
  - 対象年月の土日祝を除く日に、工程・詳細・オーダーNo・オーダー名を投入
  - 1行目には時間1、2行目には時間2を投入

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
│   │   ├── settings/
│   │   ├── actions.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── MonthAttendanceForm.tsx
│   │   └── page.tsx
│   └── lib/
│       ├── attendance.ts
│       ├── prisma.ts
│       └── settings.ts
├── railway.json
└── package.json
```

## ローカルセットアップ

```powershell
npm install
Copy-Item .env.example .env
npm run prisma:migrate
npm run dev
```

`.env` の `DATABASE_URL` は PostgreSQL 接続文字列に変更してください。

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

1. 勤怠入力画面から設定画面へ移動できる
2. 設定画面から勤怠入力画面へ戻れる
3. OP-NO、氏名、オーダー設定を保存できる
4. 勤怠入力画面のオーダー欄で設定したオーダーNoを選択できる
5. 月次初期化を実行すると、対象年月の土日祝以外に1行目・2行目が投入される
6. 週アコーディオンを開閉でき、別月へ移動しても開閉状態が再現される
7. 月次保存できる
8. CSVをダウンロードできる

## 残課題

- 社員・入力者の管理
- ログイン
- 承認フロー
- 祝日判定の会社カレンダー対応
- 業務用CSV形式への調整
- 稼働時間の丸め・休憩・深夜跨ぎの扱い
- 監査ログ
