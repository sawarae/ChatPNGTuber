# ChatPNGTuber

ChatPNGTuberは、ChatVRM/MotionPNGTuber_Playerをベースに開発された、ブラウザでMotionPNGTuberとチャットができるデモアプリケーションです。

## 主な機能

- MotionPNGTuberの表示と会話

## 使用技術

- **会話生成**: [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- **音声合成**: [Google Cloud Text-to-Speech API](https://cloud.google.com/text-to-speech)
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

### 3. アセットの用意
1. [MotionPNGTuber](https://github.com/rotejin/MotionPNGTuber)を用いてアセットを作成。
2. public/assets/{アセットフォルダ名}配下に以下を格納：
   - `*_mouthless_h264.mp4` (口消し動画)
   - `mouth_track.json` (トラッキングデータ)
   - `mouth/closed.png`, `mouth/open.png` (必須)
   - `mouth/half.png`, `mouth/e.png`, `mouth/u.png` (オプション)

### 4. 環境変数の設定

`.env.local`ファイルをプロジェクトのルートディレクトリに作成し、以下の設定を行ってください。

```bash
# .env.local

ASSETS_FOLDER={アセットフォルダ名}

# Google Gemini API Key (会話生成用)
# https://aistudio.google.com/app/apikey から取得
GOOGLE_API_KEY=your-google-api-key-here
VERTEX_AI_MODEL=gemini-2.5-flash-lite

# Google Cloud Text-to-Speech API (音声合成用)
# サービスアカウントのJSON認証情報
# JSONファイルのパスを設定
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

#### Google Gemini APIキーの取得

1. [Google Vertex AI](https://console.cloud.google.com/vertex-ai/studio/settings/api-keys)にアクセス
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

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスしてください。

## ビルド（本番環境用）

```bash
npm run build
npm start
```

## ライセンス

元のChatVRMプロジェクトのライセンスに従います。

## クレジット

- 元プロジェクト: [ChatVRM by pixiv](https://github.com/pixiv/ChatVRM)
- MotionPNGTuber: [rotejin/MotionPNGTuber_Player](https://github.com/rotejin/MotionPNGTuber_Player)
