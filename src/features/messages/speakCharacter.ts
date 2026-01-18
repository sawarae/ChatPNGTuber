import { wait } from "@/utils/wait";
import { Viewer } from "../vrmViewer/viewer";
import { Screenplay } from "./messages";
import { Talk } from "./messages";
import { waitForVoices } from "./synthesizeSpeechWeb";

const createSpeakCharacter = () => {
  let prevSpeakPromise: Promise<unknown> = Promise.resolve();
  let currentUtterance: SpeechSynthesisUtterance | null = null;

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
      if (currentUtterance) {
        window.speechSynthesis.cancel();
      }

      const text = screenplay.talk.message;
      if (!text) {
        onComplete?.();
        return;
      }

      // Wait for voices to be available
      await waitForVoices();

      // Create speech utterance
      const utterance = new SpeechSynthesisUtterance(text);
      currentUtterance = utterance;

      // Configure voice settings
      utterance.lang = 'ja-JP';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Select Japanese voice if available
      const voices = window.speechSynthesis.getVoices();
      const japaneseVoice = voices.find(v => v.lang.startsWith('ja'));
      if (japaneseVoice) {
        utterance.voice = japaneseVoice;
      }

      return new Promise<void>((resolve) => {
        utterance.onend = () => {
          currentUtterance = null;
          onComplete?.();
          resolve();
        };

        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event.error);
          currentUtterance = null;
          onComplete?.();
          resolve();
        };

        // Speak
        window.speechSynthesis.speak(utterance);
      });
    });
  };
};

export const speakCharacter = createSpeakCharacter();
