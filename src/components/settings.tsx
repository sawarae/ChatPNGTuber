import React from "react";
import { IconButton } from "./iconButton";
import { TextButton } from "./textButton";
import { Message } from "@/features/messages/messages";
import {
  KoeiroParam,
  PRESET_A,
  PRESET_B,
  PRESET_C,
  PRESET_D,
} from "@/features/constants/koeiroParam";
import { Link } from "./link";

type ViewerMode = "VRM" | "PNGTuber";

type Props = {
  systemPrompt: string;
  chatLog: Message[];
  koeiroParam: KoeiroParam;
  viewerMode: ViewerMode;
  onClickClose: () => void;
  onChangeSystemPrompt: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onChangeChatLog: (index: number, text: string) => void;
  onChangeKoeiroParam: (x: number, y: number) => void;
  onChangeViewerMode: (mode: ViewerMode) => void;
  onClickOpenVrmFile: () => void;
  onClickResetChatLog: () => void;
  onClickResetSystemPrompt: () => void;
};
export const Settings = ({
  chatLog,
  systemPrompt,
  koeiroParam,
  viewerMode,
  onClickClose,
  onChangeSystemPrompt,
  onChangeChatLog,
  onChangeKoeiroParam,
  onChangeViewerMode,
  onClickOpenVrmFile,
  onClickResetChatLog,
  onClickResetSystemPrompt,
}: Props) => {
  return (
    <div className="fixed z-40 inset-0 bg-white/80 backdrop-blur">
      <div className="absolute top-6 right-6">
        <IconButton
          iconName="24/Close"
          isProcessing={false}
          onClick={onClickClose}
        ></IconButton>
      </div>
      <div className="max-h-full overflow-auto">
        <div className="text-text1 max-w-3xl mx-auto px-24 py-64 ">
          <div className="my-24 typography-32 font-bold">設定</div>
          <div className="my-24">
            <div className="my-16 typography-20 font-bold">AI API について</div>
            <div>
              このアプリケーションは
              <Link
                url="https://console.anthropic.com/"
                label="Claude API"
              />
              を使用しています。APIキーは環境変数（.env.local）で設定されています。
            </div>
            <div className="my-16">
              ※ サーバー側でAPI通信を行います。
              <br />
              ※ 利用しているモデルはClaude 3.5 Sonnet (2024-10-22)です。
            </div>
          </div>
          <div className="my-40">
            <div className="my-16 typography-20 font-bold">
              ビューアーモード
            </div>
            <div className="my-8 flex gap-4">
              <TextButton
                onClick={() => onChangeViewerMode("VRM")}
                className={viewerMode === "VRM" ? "bg-primary text-white" : ""}
              >
                VRM (3D)
              </TextButton>
              <TextButton
                onClick={() => onChangeViewerMode("PNGTuber")}
                className={viewerMode === "PNGTuber" ? "bg-primary text-white" : ""}
              >
                PNGTuber (2D)
              </TextButton>
            </div>
            <div className="my-8 text-sm text-secondary">
              {viewerMode === "VRM"
                ? "3D VRMモデルを使用します。VRMファイルを読み込んでキャラクターを変更できます。"
                : "2D MotionPNGTuberを使用します。フォルダを選択してキャラクターを読み込んでください。"}
            </div>
          </div>
          <div className="my-40">
            <div className="my-16 typography-20 font-bold">
              キャラクターモデル
            </div>
            <div className="my-8">
              <TextButton onClick={onClickOpenVrmFile}>VRMを開く</TextButton>
            </div>
          </div>
          <div className="my-40">
            <div className="my-8">
              <div className="my-16 typography-20 font-bold">
                キャラクター設定（システムプロンプト）
              </div>
              <TextButton onClick={onClickResetSystemPrompt}>
                キャラクター設定リセット
              </TextButton>
            </div>

            <textarea
              value={systemPrompt}
              onChange={onChangeSystemPrompt}
              className="px-16 py-8  bg-surface1 hover:bg-surface1-hover h-168 rounded-8 w-full"
            ></textarea>
          </div>
          <div className="my-40">
            <div className="my-16 typography-20 font-bold">音声について</div>
            <div>
              Web Speech APIを使用して音声を生成します。ブラウザとOSにインストールされている日本語音声が使用されます。
            </div>
            <div className="mt-8 text-sm text-secondary">
              ※ 以前のKoeiromap APIは2024年にサービス終了したため、無料で利用できるWeb Speech APIに切り替えました。
            </div>
          </div>
          {chatLog.length > 0 && (
            <div className="my-40">
              <div className="my-8 grid-cols-2">
                <div className="my-16 typography-20 font-bold">会話履歴</div>
                <TextButton onClick={onClickResetChatLog}>
                  会話履歴リセット
                </TextButton>
              </div>
              <div className="my-8">
                {chatLog.map((value, index) => {
                  return (
                    <div
                      key={index}
                      className="my-8 grid grid-flow-col  grid-cols-[min-content_1fr] gap-x-fixed"
                    >
                      <div className="w-[64px] py-8">
                        {value.role === "assistant" ? "Character" : "You"}
                      </div>
                      <input
                        key={index}
                        className="bg-surface1 hover:bg-surface1-hover rounded-8 w-full px-16 py-8"
                        type="text"
                        value={value.content}
                        onChange={(event) => {
                          onChangeChatLog(index, event.target.value);
                        }}
                      ></input>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
