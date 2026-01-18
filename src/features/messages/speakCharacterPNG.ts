import { LipsyncEngine } from "../pngTuber/lipsyncEngine";
import { TextBasedLipsync } from "../pngTuber/textBasedLipsync";
import { Screenplay } from "./messages";
import { waitForVoices } from "./synthesizeSpeechWeb";

const createSpeakCharacterPNG = () => {
  let prevSpeakPromise: Promise<unknown> = Promise.resolve();
  let currentUtterance: SpeechSynthesisUtterance | null = null;
  const textLipsync = new TextBasedLipsync();

  return async (
    screenplay: Screenplay,
    lipsyncEngine: LipsyncEngine | null,
    _unusedApiKey: string,
    onStart?: () => void,
    onComplete?: () => void
  ) => {
    if (!lipsyncEngine) {
      console.warn("LipsyncEngine not available");
      onComplete?.();
      return;
    }

    prevSpeakPromise = prevSpeakPromise.then(async () => {
      onStart?.();

      // Stop any ongoing speech
      if (currentUtterance) {
        window.speechSynthesis.cancel();
        textLipsync.stop();
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

      // Start text-based lip sync animation
      const lipsyncPromise = textLipsync.animate(
        text,
        utterance.rate,
        (data) => {
          lipsyncEngine.processAudioData(data);
        }
      );

      return new Promise<void>((resolve) => {
        utterance.onend = async () => {
          currentUtterance = null;
          // Wait for lip sync to complete
          await lipsyncPromise;
          // Reset to closed mouth
          lipsyncEngine.processAudioData({ rms: 0, low: 0, high: 0 });
          onComplete?.();
          resolve();
        };

        utterance.onerror = async (event) => {
          console.error('Speech synthesis error:', event.error);
          currentUtterance = null;
          textLipsync.stop();
          lipsyncEngine.processAudioData({ rms: 0, low: 0, high: 0 });
          onComplete?.();
          resolve();
        };

        // Speak
        window.speechSynthesis.speak(utterance);
      });
    });
  };
};

export const speakCharacterPNG = createSpeakCharacterPNG();
