import { useCallback, useContext, useEffect, useRef, useState } from "react";
import VrmViewer from "@/components/vrmViewer";
import { ViewerContext } from "@/features/vrmViewer/viewerContext";
import {
  Message,
  textsToScreenplay,
  Screenplay,
} from "@/features/messages/messages";
import { speakCharacter } from "@/features/messages/speakCharacter";
import { speakCharacterPNG } from "@/features/messages/speakCharacterPNG";
import { MessageInputContainer } from "@/components/messageInputContainer";
import { SYSTEM_PROMPT } from "@/features/constants/systemPromptConstants";
import { KoeiroParam, DEFAULT_PARAM } from "@/features/constants/koeiroParam";
import { getAssets, PNGTuberAssets } from "@/features/constants/pngTuberAssets";
// import { getChatResponseStream } from "@/features/chat/claudeChat"; // Removed: Using Google Gemini API instead
import { Menu } from "@/components/menu";
import { Meta } from "@/components/meta";
import { PNGTuberViewer } from "@/components/pngTuberViewer";
import { LipsyncEngine } from "@/features/pngTuber/lipsyncEngine";
import { LipSync } from "@/features/messages/speakCharacterPNG";

type ViewerMode = "VRM" | "PNGTuber";

export default function Home() {
  const { viewer } = useContext(ViewerContext);
  const [viewerMode, setViewerMode] = useState<ViewerMode>("PNGTuber");
  const lipsyncEngineRef = useRef<LipsyncEngine | null>(null);
  const lipSyncRef = useRef<LipSync | null>(null);

  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPT);
  const [koeiroParam, setKoeiroParam] = useState<KoeiroParam>(DEFAULT_PARAM);
  const [chatProcessing, setChatProcessing] = useState(false);
  const [chatLog, setChatLog] = useState<Message[]>([]);
  const [assistantMessage, setAssistantMessage] = useState("");
  const [assets, setAssets] = useState<PNGTuberAssets | null>(null);

  useEffect(() => {
    // Load assets on mount
    getAssets().then(setAssets);
  }, []);

  useEffect(() => {
    if (window.localStorage.getItem("chatVRMParams")) {
      const params = JSON.parse(
        window.localStorage.getItem("chatVRMParams") as string
      );
      setSystemPrompt(params.systemPrompt ?? SYSTEM_PROMPT);
      setKoeiroParam(params.koeiroParam ?? DEFAULT_PARAM);
      setChatLog(params.chatLog ?? []);
    }
  }, []);

  useEffect(() => {
    process.nextTick(() =>
      window.localStorage.setItem(
        "chatVRMParams",
        JSON.stringify({ systemPrompt, koeiroParam, chatLog })
      )
    );
  }, [systemPrompt, koeiroParam, chatLog]);

  const handleChangeChatLog = useCallback(
    (targetIndex: number, text: string) => {
      const newChatLog = chatLog.map((v: Message, i) => {
        return i === targetIndex ? { role: v.role, content: text } : v;
      });

      setChatLog(newChatLog);
    },
    [chatLog]
  );

  /**
   * 文ごとに音声を直列でリクエストしながら再生する
   */
  const handleSpeakAi = useCallback(
    async (
      screenplay: Screenplay,
      onStart?: () => void,
      onEnd?: () => void
    ) => {
      if (viewerMode === "VRM") {
        speakCharacter(screenplay, viewer, "", onStart, onEnd);
      } else if (viewerMode === "PNGTuber") {
        speakCharacterPNG(screenplay, lipSyncRef.current, "", onStart, onEnd);
      }
    },
    [viewerMode, viewer, lipSyncRef]
  );

  /**
   * アシスタントとの会話を行う
   */
  const handleSendChat = useCallback(
    async (text: string) => {
      const newMessage = text;

      if (newMessage == null) return;

      setChatProcessing(true);
      // ユーザーの発言を追加して表示
      const messageLog: Message[] = [
        ...chatLog,
        { role: "user", content: newMessage },
      ];
      setChatLog(messageLog);

      // Call Google Gemini API
      const messages: Message[] = [
        {
          role: "system",
          content: systemPrompt,
        },
        ...messageLog,
      ];

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages }),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        const aiMessage = data.message;

        // AIの返答を音声合成して再生
        const aiTalks = textsToScreenplay([aiMessage], koeiroParam);
        handleSpeakAi(aiTalks[0]);

        // アシスタントの返答をログに追加
        const messageLogAssistant: Message[] = [
          ...messageLog,
          { role: "assistant", content: aiMessage },
        ];

        setChatLog(messageLogAssistant);
      } catch (error) {
        console.error("Chat error:", error);
      } finally {
        setChatProcessing(false);
      }

      // Removed: Claude streaming API - kept for reference
      /*
      const messages: Message[] = [
        {
          role: "system",
          content: systemPrompt,
        },
        ...messageLog,
      ];

      const stream = await getChatResponseStream(messages).catch(
        (e: any) => {
          console.error(e);
          return null;
        }
      );
      if (stream == null) {
        setChatProcessing(false);
        return;
      }

      const reader = stream.getReader();
      let receivedMessage = "";
      let aiTextLog = "";
      let tag = "";
      const sentences = new Array<string>();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          receivedMessage += value;

          const tagMatch = receivedMessage.match(/^\[(.*?)\]/);
          if (tagMatch && tagMatch[0]) {
            tag = tagMatch[0];
            receivedMessage = receivedMessage.slice(tag.length);
          }

          const sentenceMatch = receivedMessage.match(
            /^(.+[。．！？\n]|.{10,}[、,])/
          );
          if (sentenceMatch && sentenceMatch[0]) {
            const sentence = sentenceMatch[0];
            sentences.push(sentence);
            receivedMessage = receivedMessage
              .slice(sentence.length)
              .trimStart();

            if (
              !sentence.replace(
                /^[\s\[\(\{「［（【『〈《〔｛«‹〘〚〛〙›»〕》〉』】）］」\}\)\]]+$/g,
                ""
              )
            ) {
              continue;
            }

            const aiText = `${tag} ${sentence}`;
            const aiTalks = textsToScreenplay([aiText], koeiroParam);
            aiTextLog += aiText;

            const currentAssistantMessage = sentences.join(" ");
            handleSpeakAi(aiTalks[0], () => {
              setAssistantMessage(currentAssistantMessage);
            });
          }
        }
      } catch (e) {
        setChatProcessing(false);
        console.error(e);
      } finally {
        reader.releaseLock();
      }

      const messageLogAssistant: Message[] = [
        ...messageLog,
        { role: "assistant", content: aiTextLog },
      ];

      setChatLog(messageLogAssistant);
      setChatProcessing(false);
      */
    },
    [systemPrompt, chatLog, handleSpeakAi, koeiroParam]
  );

  return (
    <div className={"font-M_PLUS_2"}>
      <Meta />
      {viewerMode === "VRM" ? (
        <VrmViewer />
      ) : assets ? (
        <PNGTuberViewer
          className="fixed top-0 left-0 w-screen h-screen -z-10"
          engineRef={lipsyncEngineRef}
          lipSyncRef={lipSyncRef}
          debug={true}
          onReady={() => {
            console.log("PNGTuber is ready");
          }}
          assets={assets}
        />
      ) : (
        <div className="fixed top-0 left-0 w-screen h-screen -z-10 flex items-center justify-center">
          <p>Loading assets...</p>
        </div>
      )}
      <MessageInputContainer
        isChatProcessing={chatProcessing}
        onChatProcessStart={handleSendChat}
      />
      <Menu
        systemPrompt={systemPrompt}
        chatLog={chatLog}
        koeiroParam={koeiroParam}
        assistantMessage={assistantMessage}
        viewerMode={viewerMode}
        onChangeSystemPrompt={setSystemPrompt}
        onChangeChatLog={handleChangeChatLog}
        onChangeKoeiromapParam={setKoeiroParam}
        onChangeViewerMode={setViewerMode}
        handleClickResetChatLog={() => setChatLog([])}
        handleClickResetSystemPrompt={() => setSystemPrompt(SYSTEM_PROMPT)}
      />
    </div>
  );
}
