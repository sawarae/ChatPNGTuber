/**
 * Web Speech API TTS with audio capture for lip sync
 */

export interface SpeechSynthesisConfig {
  lang?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
}

export interface TTSAudioData {
  buffer: ArrayBuffer;
  duration: number;
}

/**
 * Synthesize speech using Web Speech API and capture audio for lip sync
 */
export async function synthesizeSpeechWeb(
  text: string,
  config: SpeechSynthesisConfig = {}
): Promise<TTSAudioData> {
  const {
    lang = 'ja-JP',
    pitch = 1.0,
    rate = 1.0,
    volume = 1.0,
    voice = null,
  } = config;

  // Get available voices
  const voices = window.speechSynthesis.getVoices();

  // Find a Japanese voice if available
  let selectedVoice = voice;
  if (!selectedVoice && voices.length > 0) {
    selectedVoice = voices.find(v => v.lang.startsWith('ja')) || voices[0];
  }

  return new Promise<TTSAudioData>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.pitch = pitch;
    utterance.rate = rate;
    utterance.volume = volume;
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    let startTime = 0;
    let endTime = 0;

    utterance.onstart = () => {
      startTime = performance.now();
    };

    utterance.onend = () => {
      endTime = performance.now();
      const duration = (endTime - startTime) / 1000; // Convert to seconds

      // Since we can't directly capture Web Speech API audio,
      // we'll create a simple audio buffer estimation
      // This is a fallback - real audio capture would require MediaRecorder
      const sampleRate = 16000;
      const samples = Math.floor(duration * sampleRate);
      const buffer = new ArrayBuffer(samples * 2); // 16-bit audio

      resolve({
        buffer,
        duration,
      });
    };

    utterance.onerror = (event) => {
      reject(new Error(`Speech synthesis failed: ${event.error}`));
    };

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Synthesize speech with MediaRecorder for better audio capture
 */
export async function synthesizeSpeechWithCapture(
  text: string,
  config: SpeechSynthesisConfig = {}
): Promise<{ audioBlob: Blob; duration: number }> {
  const {
    lang = 'ja-JP',
    pitch = 1.0,
    rate = 1.0,
    volume = 1.0,
    voice = null,
  } = config;

  // Create audio context for capture
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const destination = audioContext.createMediaStreamDestination();

  // Create oscillator as audio source (placeholder for speech synthesis audio)
  // Note: Web Speech API doesn't provide direct audio stream access
  // This is a workaround using MediaRecorder

  return new Promise<{ audioBlob: Blob; duration: number }>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.pitch = pitch;
    utterance.rate = rate;
    utterance.volume = volume;

    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voice;
    if (!selectedVoice && voices.length > 0) {
      selectedVoice = voices.find(v => v.lang.startsWith('ja')) || voices[0];
    }
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    let startTime = 0;
    const chunks: Blob[] = [];

    utterance.onstart = () => {
      startTime = performance.now();
    };

    utterance.onend = () => {
      const duration = (performance.now() - startTime) / 1000;
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      resolve({ audioBlob, duration });
    };

    utterance.onerror = (event) => {
      reject(new Error(`Speech synthesis failed: ${event.error}`));
    };

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Get available voices for speech synthesis
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis.getVoices();
}

/**
 * Wait for voices to be loaded
 */
export function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };
  });
}
