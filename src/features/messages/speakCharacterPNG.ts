import { LipSync } from "../lipSync/lipSync";
import { Screenplay } from "./messages";

const createSpeakCharacterPNG = () => {
  let prevSpeakPromise: Promise<unknown> = Promise.resolve();

  return async (
    screenplay: Screenplay,
    lipSync: LipSync | null,
    _unusedApiKey: string,
    onStart?: () => void,
    onComplete?: () => void
  ) => {
    if (!lipSync) {
      console.warn("LipSync not available");
      onComplete?.();
      return;
    }

    prevSpeakPromise = prevSpeakPromise.then(async () => {
      onStart?.();

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
            // languageCode and voiceName will use server-side defaults from env vars
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "TTS request failed");
        }

        const data = await response.json();
        const audioBase64 = data.audio;

        // Convert base64 to ArrayBuffer
        const binaryString = atob(audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const audioBuffer = bytes.buffer;

        // Resume AudioContext if suspended (required for browser autoplay policy)
        if (lipSync.audio.state === 'suspended') {
          console.log('[PNGLipsync] Resuming suspended AudioContext');
          await lipSync.audio.resume();
        }
        // Play audio using LipSync class (following VRM pattern)
        await new Promise<void>((resolve) => {
          lipSync.playFromArrayBuffer(audioBuffer, () => {
            console.log('[PNGLipsync] Playback ended');
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

export const speakCharacterPNG = createSpeakCharacterPNG();
export { LipSync };
