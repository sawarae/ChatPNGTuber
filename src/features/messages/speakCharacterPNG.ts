import { LipsyncEngine } from "../pngTuber/lipsyncEngine";
import { Screenplay } from "./messages";

const createSpeakCharacterPNG = () => {
  let prevSpeakPromise: Promise<unknown> = Promise.resolve();
  let currentAudio: HTMLAudioElement | null = null;
  let audioContext: AudioContext | null = null;
  let analyserNode: AnalyserNode | null = null;
  let animationId: number | null = null;

  const stopCurrentAudio = () => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
  };

  const analyzeAudio = (
    analyser: AnalyserNode,
    lipsyncEngine: LipsyncEngine
  ) => {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const analyze = () => {
      if (!currentAudio) return;

      analyser.getByteFrequencyData(dataArray);

      // Calculate RMS and frequency bands
      let sum = 0;
      let lowSum = 0;
      let highSum = 0;
      const midPoint = Math.floor(bufferLength / 2);

      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i] / 255;
        sum += value * value;
        if (i < midPoint) {
          lowSum += value;
        } else {
          highSum += value;
        }
      }

      const rms = Math.sqrt(sum / bufferLength);
      const low = lowSum / midPoint;
      const high = highSum / (bufferLength - midPoint);

      lipsyncEngine.processAudioData({ rms, low, high });

      animationId = requestAnimationFrame(analyze);
    };

    analyze();
  };

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
      stopCurrentAudio();

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

        // Create audio element
        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        currentAudio = audio;

        // Setup Web Audio API for analyzing audio for lipsync
        if (!audioContext) {
          audioContext = new AudioContext();
        }

        // Resume audio context if suspended
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }

        const sourceNode = audioContext.createMediaElementSource(audio);
        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 256;
        analyserNode.smoothingTimeConstant = 0.3;

        sourceNode.connect(analyserNode);
        analyserNode.connect(audioContext.destination);

        return new Promise<void>((resolve) => {
          audio.onended = () => {
            stopCurrentAudio();
            // Reset to closed mouth
            lipsyncEngine.processAudioData({ rms: 0, low: 0, high: 0 });
            onComplete?.();
            resolve();
          };

          audio.onerror = (event) => {
            console.error("Audio playback error:", event);
            stopCurrentAudio();
            lipsyncEngine.processAudioData({ rms: 0, low: 0, high: 0 });
            onComplete?.();
            resolve();
          };

          // Start analyzing audio for lipsync
          analyzeAudio(analyserNode!, lipsyncEngine);

          audio.play().catch((error) => {
            console.error("Audio play error:", error);
            stopCurrentAudio();
            lipsyncEngine.processAudioData({ rms: 0, low: 0, high: 0 });
            onComplete?.();
            resolve();
          });
        });
      } catch (error) {
        console.error("GCP TTS error:", error);
        lipsyncEngine.processAudioData({ rms: 0, low: 0, high: 0 });
        onComplete?.();
      }
    });
  };
};

export const speakCharacterPNG = createSpeakCharacterPNG();
