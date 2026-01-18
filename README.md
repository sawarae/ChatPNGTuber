# ChatPNGTuber

ChatPNGTuberは、ChatVRMをベースに開発された、ブラウザで3DキャラクターおよびMotionPNGTuberと会話ができるデモアプリケーションです。

## 主な機能

- 3D VRMモデルまたは2D MotionPNGTuberの表示と会話
- Google Gemini APIを使用した自然な会話生成
- Google Cloud Text-to-Speech APIによる高品質な音声合成
- リアルタイムリップシンク（PNGTuberモード）
- 表情や感情表現を含んだ返答

## 使用技術

- **音声認識**: [Web Speech API (SpeechRecognition)](https://developer.mozilla.org/ja/docs/Web/API/SpeechRecognition)
- **会話生成**: [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- **音声合成**: [Google Cloud Text-to-Speech API](https://cloud.google.com/text-to-speech)
- **3Dキャラクター**: [@pixiv/three-vrm](https://github.com/pixiv/three-vrm)
- **2D PNGTuber**: [MotionPNGTuber](https://github.com/rotejin/MotionPNGTuber_Player)

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/sawarae/ChatPNGTuber.git
cd ChatPNGTuber
```

### 2. パッケージのインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.local`ファイルをプロジェクトのルートディレクトリに作成し、以下の設定を行ってください。

```bash
# .env.local

# Google Gemini API Key (会話生成用)
# https://aistudio.google.com/app/apikey から取得
GOOGLE_API_KEY=your-google-api-key-here
VERTEX_AI_MODEL=gemini-2.5-flash-lite

# Google Cloud Text-to-Speech API (音声合成用)
# サービスアカウントのJSON認証情報
# Option 1: JSON内容を直接設定（Vercelなどへのデプロイ時に推奨）
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"...","private_key":"..."}

# Option 2: JSONファイルのパスを設定（ローカル開発時に推奨）
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

#### Google Gemini APIキーの取得

1. [Google AI Studio](https://aistudio.google.com/app/apikey)にアクセス
2. 「Create API Key」をクリック
3. 生成されたAPIキーを`.env.local`の`GOOGLE_API_KEY`に設定

#### Google Cloud Text-to-Speech APIの設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを作成または選択
3. [Cloud Text-to-Speech API](https://console.cloud.google.com/apis/library/texttospeech.googleapis.com)を有効化
4. サービスアカウントを作成：
   - 左メニュー「IAMと管理」→「サービスアカウント」
   - 「サービスアカウントを作成」をクリック
   - 名前を入力（例: `tts-service-account`）
5. サービスアカウントキー（JSON）を作成：
   - 作成したサービスアカウントをクリック
   - 「キー」タブ→「鍵を追加」→「新しい鍵を作成」
   - 「JSON」を選択して作成
6. ダウンロードしたJSONファイルの内容を`.env.local`に設定

**注意**: `.env.local`ファイルは`.gitignore`に含まれているため、Gitリポジトリにコミットされません。

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスしてください。

## 使い方

### VRMモード（3D）
1. 設定画面で「ビューアーモード」を「VRM (3D)」に設定
2. 任意のVRMファイルをドラッグ＆ドロップで読み込み
3. チャット入力欄からメッセージを送信

### PNGTuberモード（2D）
1. 設定画面で「ビューアーモード」を「PNGTuber (2D)」に設定
2. 画面左上の「Select PNGTuber Folder」から、以下を含むフォルダを選択：
   - `*_mouthless_h264.mp4` (口消し動画)
   - `mouth_track.json` (トラッキングデータ)
   - `mouth/closed.png`, `mouth/open.png` (必須)
   - `mouth/half.png`, `mouth/e.png`, `mouth/u.png` (オプション)
3. チャット入力欄からメッセージを送信

## ビルド（本番環境用）

```bash
npm run build
npm start
```

## Google APIs について

### Gemini API（会話生成）

このアプリケーションは、会話生成にGoogle Gemini APIを使用しています。

- 軽量で高速なモデル（gemini-2.5-flash-lite）を使用
- APIリクエストはサーバーサイド（Next.js API Routes）で処理されます
- APIキーは環境変数として安全に管理されます
- ドキュメント: [https://ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs)

### Text-to-Speech API（音声合成）

Google Cloud Text-to-Speech APIを使用した高品質な音声合成を実装しています。

- Neural2音声モデルを使用した自然な日本語音声
- デフォルト音声: `ja-JP-Neural2-B`
- リアルタイム音声解析によるリップシンク対応（PNGTuberモード）
- サービスアカウント認証による安全なAPI呼び出し
- ドキュメント: [https://cloud.google.com/text-to-speech/docs](https://cloud.google.com/text-to-speech/docs)

## 注意事項

- 差別的または暴力的な発言、特定の人物を貶めるような発言を意図的に誘導しないでください
- VRMモデルを使用する際は、モデルの利用条件に従ってください
- MotionPNGTuberアセットを使用する際は、各アセットの利用規約を確認してください
- Google Cloud APIの使用には料金が発生する場合があります

## ライセンス

元のChatVRMプロジェクトのライセンスに従います。

## クレジット

- 元プロジェクト: [ChatVRM by pixiv](https://github.com/pixiv/ChatVRM)
- MotionPNGTuber: [rotejin/MotionPNGTuber_Player](https://github.com/rotejin/MotionPNGTuber_Player)
