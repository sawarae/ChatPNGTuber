import { useState, useCallback } from "react";
import { Link } from "./link";

type Props = {};
export const Introduction = ({}: Props) => {
  const [opened, setOpened] = useState(true);

  return opened ? (
    <div className="absolute z-40 w-full h-full px-24 py-40  bg-black/30 font-M_PLUS_2">
      <div className="mx-auto my-auto max-w-3xl max-h-full p-24 overflow-auto bg-white rounded-16">
        <div className="my-24">
          <div className="my-8 font-bold typography-20 text-secondary ">
            このアプリケーションについて
          </div>
          <div>
            Webブラウザだけで3Dキャラクターとの会話を、マイクやテキスト入力、音声合成を用いて楽しめます。キャラクター（VRM）の変更や性格設定、音声調整もできます。
          </div>
        </div>
        <div className="my-24">
          <div className="my-8 font-bold typography-20 text-secondary">
            技術紹介
          </div>
          <div>
            3Dモデルの表示や操作には
            <Link
              url={"https://github.com/pixiv/three-vrm"}
              label={"@pixiv/three-vrm"}
            />
            、 会話文生成には
            <Link
              url={
                "https://openai.com/blog/introducing-chatgpt-and-whisper-apis"
              }
              label={"ChatGPT API"}
            />
            、 音声合成には
            <Link
              url={"https://developer.mozilla.org/ja/docs/Web/API/Web_Speech_API"}
              label={"Web Speech API"}
            />
            、 2D PNGTuberには
            <Link
              url={"https://github.com/rotejin/MotionPNGTuber_Player"}
              label={"MotionPNGTuber"}
            />
            を使用しています。
          </div>
          <div className="my-16">
            このデモはGitHubでソースコードを公開しています。自由に変更や改変をお試しください！
            <br />
            リポジトリ：
            <Link
              url={"https://github.com/pixiv/ChatVRM"}
              label={"https://github.com/pixiv/ChatVRM"}
            />
          </div>
        </div>

        <div className="my-24">
          <div className="my-8 font-bold typography-20 text-secondary">
            利用上の注意
          </div>
          <div>
            差別的または暴力的な発言、特定の人物を貶めるような発言を、意図的に誘導しないでください。また、VRMモデルを使ってキャラクターを差し替える際はモデルの利用条件に従ってください。
          </div>
        </div>

        <div className="my-24">
          <div className="my-8 font-bold typography-20 text-secondary">
            API設定について
          </div>
          <div>
            このアプリケーションは
            <Link
              url="https://console.anthropic.com/"
              label="Claude API"
            />
            を使用しています。APIキーは環境変数（.env.local）に設定されています。
          </div>
          <div className="my-16">
            ※ サーバー側でAPI通信を行うため、会話内容がサーバーを経由します。
            <br />
            ※ 利用しているモデルはClaude 3.5 Sonnet (2024-10-22)です。
          </div>
        </div>
        <div className="my-24">
          <button
            onClick={() => {
              setOpened(false);
            }}
            className="font-bold bg-secondary hover:bg-secondary-hover active:bg-secondary-press disabled:bg-secondary-disabled text-white px-24 py-8 rounded-oval"
          >
            はじめる
          </button>
        </div>
      </div>
    </div>
  ) : null;
};
