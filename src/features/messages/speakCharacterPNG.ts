import { wait } from "@/utils/wait";
import { synthesizeVoiceApi } from "./synthesizeVoice";
import { LipsyncEngine } from "../pngTuber/lipsyncEngine";
import { TTSAudioAnalyzer } from "../pngTuber/audioAnalyzer";
import { Screenplay, Talk } from "./messages";

const createSpeakCharacterPNG = () => {
  let lastTime = 0;
  let prevFetchPromise: Promise<unknown> = Promise.resolve();
  let prevSpeakPromise: Promise<unknown> = Promise.resolve();
  const audioAnalyzer = new TTSAudioAnalyzer();

  return async (
    screenplay: Screenplay,
    lipsyncEngine: LipsyncEngine | null,
    koeiroApiKey: string,
    onStart?: () => void,
    onComplete?: () => void
  ) => {
    if (!lipsyncEngine) {
      console.warn("LipsyncEngine not available");
      onComplete?.();
      return;
    }

    const fetchPromise = prevFetchPromise.then(async () => {
      const now = Date.now();
      if (now - lastTime < 1000) {
        await wait(1000 - (now - lastTime));
      }

      const buffer = await fetchAudio(screenplay.talk, koeiroApiKey).catch(
        () => null
      );
      lastTime = Date.now();
      return buffer;
    });

    prevFetchPromise = fetchPromise;
    prevSpeakPromise = Promise.all([fetchPromise, prevSpeakPromise]).then(
      async ([audioBuffer]) => {
        onStart?.();
        if (!audioBuffer) {
          onComplete?.();
          return;
        }

        // Initialize audio analyzer if needed
        await audioAnalyzer.initialize().catch(() => {});

        // Create audio context for playback
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const decodedBuffer = await audioContext.decodeAudioData(
          audioBuffer.slice(0)
        );

        // Create source node for playback
        const source = audioContext.createBufferSource();
        source.buffer = decodedBuffer;
        source.connect(audioContext.destination);

        // Analyze and sync lip movements
        const analyzePromise = audioAnalyzer.playAndAnalyze(
          audioBuffer,
          (data) => {
            lipsyncEngine.processAudioData(data);
          }
        );

        // Play audio
        source.start(0);

        // Wait for both to complete
        await Promise.all([
          analyzePromise,
          new Promise((resolve) => {
            source.onended = resolve;
          }),
        ]);

        // Reset to closed mouth
        lipsyncEngine.processAudioData({ rms: 0, low: 0, high: 0 });

        audioContext.close();
        onComplete?.();
      }
    );
  };
};

export const speakCharacterPNG = createSpeakCharacterPNG();

const fetchAudio = async (
  talk: Talk,
  apiKey: string
): Promise<ArrayBuffer> => {
  const ttsVoice = await synthesizeVoiceApi(
    talk.message,
    talk.speakerX,
    talk.speakerY,
    talk.style,
    apiKey
  );
  const url = ttsVoice.audio;

  if (url == null) {
    throw new Error("Something went wrong");
  }

  const resAudio = await fetch(url);
  const buffer = await resAudio.arrayBuffer();
  return buffer;
};
