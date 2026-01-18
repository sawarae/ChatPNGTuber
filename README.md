# ChatPNGTuber

ChatPNGTuberは、ChatVRMをベースに開発された、ブラウザで3DキャラクターおよびMotionPNGTuberと会話ができるデモアプリケーションです。

## 主な機能

- 3D VRMモデルまたは2D MotionPNGTuberの表示と会話
- Claude 3.5 Sonnet APIを使用した自然な会話生成
- Web Speech APIによる音声合成
- テキストベースのリップシンク（PNGTuberモード）
- 表情や感情表現を含んだ返答

## 使用技術

- **音声認識**: [Web Speech API (SpeechRecognition)](https://developer.mozilla.org/ja/docs/Web/API/SpeechRecognition)
- **会話生成**: [Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- **音声合成**: [Web Speech API (SpeechSynthesis)](https://developer.mozilla.org/ja/docs/Web/API/SpeechSynthesis)
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

`.env.local`ファイルをプロジェクトのルートディレクトリに作成し、Claude APIキーを設定してください。

```bash
# .env.local
ANTHROPIC_API_KEY=your_api_key_here
```

Claude APIキーの取得方法：
1. [Anthropic Console](https://console.anthropic.com/)にアクセス
2. アカウントを作成またはログイン
3. API Keysセクションから新しいAPIキーを作成
4. 作成されたAPIキーを`.env.local`に貼り付け

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

## Claude API について

このアプリケーションは、会話生成にClaude 3.5 Sonnet (2024-10-22) APIを使用しています。

- APIリクエストはサーバーサイド（Next.js API Routes）で処理されます
- APIキーは環境変数として安全に管理されます
- 利用規約: [https://www.anthropic.com/legal/aup](https://www.anthropic.com/legal/aup)
- APIドキュメント: [https://docs.anthropic.com/](https://docs.anthropic.com/)

## 音声合成について

Web Speech APIを使用した無料の音声合成を実装しています。

- ブラウザとOSにインストールされている日本語音声を使用
- APIキー不要
- オフラインでも動作（音声がインストールされている場合）

## 注意事項

- 差別的または暴力的な発言、特定の人物を貶めるような発言を意図的に誘導しないでください
- VRMモデルを使用する際は、モデルの利用条件に従ってください
- MotionPNGTuberアセットを使用する際は、各アセットの利用規約を確認してください

## ライセンス

元のChatVRMプロジェクトのライセンスに従います。

## クレジット

- 元プロジェクト: [ChatVRM by pixiv](https://github.com/pixiv/ChatVRM)
- MotionPNGTuber: [rotejin/MotionPNGTuber_Player](https://github.com/rotejin/MotionPNGTuber_Player)
