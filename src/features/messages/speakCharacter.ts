import { Viewer } from "../vrmViewer/viewer";
import { Screenplay } from "./messages";

const createSpeakCharacter = () => {
  let prevSpeakPromise: Promise<unknown> = Promise.resolve();
  let currentAudio: HTMLAudioElement | null = null;

  return (
    screenplay: Screenplay,
    viewer: Viewer,
    _unusedApiKey: string,
    onStart?: () => void,
    onComplete?: () => void
  ) => {
    prevSpeakPromise = prevSpeakPromise.then(async () => {
      onStart?.();

      // Stop any ongoing speech
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }

      const text = screenplay.talk.message;
      if (!text) {
        onComplete?.();
        return;
      }

      try {
        // Call GCP Text-to-Speech API
        const response = await fetch("/api/gcp-tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            languageCode: "ja-JP",
            voiceName: "ja-JP-Neural2-B",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "TTS request failed");
        }

        const data = await response.json();
        const audioBase64 = data.audio;

        // Create audio element and play
        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        currentAudio = audio;

        return new Promise<void>((resolve) => {
          audio.onended = () => {
            currentAudio = null;
            onComplete?.();
            resolve();
          };

          audio.onerror = (event) => {
            console.error("Audio playback error:", event);
            currentAudio = null;
            onComplete?.();
            resolve();
          };

          audio.play().catch((error) => {
            console.error("Audio play error:", error);
            currentAudio = null;
            onComplete?.();
            resolve();
          });
        });
      } catch (error) {
        console.error("GCP TTS error:", error);
        onComplete?.();
      }
    });
  };
};

export const speakCharacter = createSpeakCharacter();
