/**
 * Text-based lip sync for Web Speech API
 * Analyzes text to generate mouth movements
 */

import { AudioVolumeData } from './audioCapture';

interface PhonemeData {
  char: string;
  mouthState: 'closed' | 'open' | 'half' | 'e' | 'u';
  duration: number;
}

/**
 * Text-based lip sync animator
 * Generates lip sync data from text without audio analysis
 */
export class TextBasedLipsync {
  private animationInterval: number | null = null;
  private currentIndex = 0;
  private phonemes: PhonemeData[] = [];
  private onVolumeData: ((data: AudioVolumeData) => void) | null = null;

  /**
   * Analyze text and generate phoneme sequence
   */
  private analyzeText(text: string): PhonemeData[] {
    const phonemes: PhonemeData[] = [];

    // Remove special characters and spaces
    const cleanText = text.replace(/[、。！？…\s]/g, '');

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const mouthState = this.getMouthStateForChar(char);

      // Base duration per character (will be adjusted by rate)
      const duration = 150; // milliseconds

      phonemes.push({
        char,
        mouthState,
        duration,
      });
    }

    return phonemes;
  }

  /**
   * Get mouth state for a character
   */
  private getMouthStateForChar(char: string): 'closed' | 'open' | 'half' | 'e' | 'u' {
    // Vowel detection
    const charCode = char.charCodeAt(0);

    // Hiragana vowels
    const hiraganaA = ['あ', 'か', 'が', 'さ', 'ざ', 'た', 'だ', 'な', 'は', 'ば', 'ぱ', 'ま', 'や', 'ら', 'わ'];
    const hiraganaI = ['い', 'き', 'ぎ', 'し', 'じ', 'ち', 'ぢ', 'に', 'ひ', 'び', 'ぴ', 'み', 'り'];
    const hiraganaU = ['う', 'く', 'ぐ', 'す', 'ず', 'つ', 'づ', 'ぬ', 'ふ', 'ぶ', 'ぷ', 'む', 'ゆ', 'る'];
    const hiraganaE = ['え', 'け', 'げ', 'せ', 'ぜ', 'て', 'で', 'ね', 'へ', 'べ', 'ぺ', 'め', 'れ'];
    const hiraganaO = ['お', 'こ', 'ご', 'そ', 'ぞ', 'と', 'ど', 'の', 'ほ', 'ぼ', 'ぽ', 'も', 'よ', 'ろ', 'を'];

    // Katakana vowels
    const katakanaA = ['ア', 'カ', 'ガ', 'サ', 'ザ', 'タ', 'ダ', 'ナ', 'ハ', 'バ', 'パ', 'マ', 'ヤ', 'ラ', 'ワ'];
    const katakanaI = ['イ', 'キ', 'ギ', 'シ', 'ジ', 'チ', 'ヂ', 'ニ', 'ヒ', 'ビ', 'ピ', 'ミ', 'リ'];
    const katakanaU = ['ウ', 'ク', 'グ', 'ス', 'ズ', 'ツ', 'ヅ', 'ヌ', 'フ', 'ブ', 'プ', 'ム', 'ユ', 'ル'];
    const katakanaE = ['エ', 'ケ', 'ゲ', 'セ', 'ゼ', 'テ', 'デ', 'ネ', 'ヘ', 'ベ', 'ペ', 'メ', 'レ'];
    const katakanaO = ['オ', 'コ', 'ゴ', 'ソ', 'ゾ', 'ト', 'ド', 'ノ', 'ホ', 'ボ', 'ポ', 'モ', 'ヨ', 'ロ', 'ヲ'];

    // Small tsu (closed mouth)
    if (char === 'っ' || char === 'ッ') {
      return 'closed';
    }

    // 'n' sound (closed/half)
    if (char === 'ん' || char === 'ン') {
      return 'half';
    }

    // Vowel-based mouth states
    if (hiraganaA.includes(char) || katakanaA.includes(char)) {
      return 'open'; // 'a' sound - open mouth
    }
    if (hiraganaI.includes(char) || katakanaI.includes(char)) {
      return 'e'; // 'i' sound - similar to 'e' shape
    }
    if (hiraganaU.includes(char) || katakanaU.includes(char)) {
      return 'u'; // 'u' sound - rounded mouth
    }
    if (hiraganaE.includes(char) || katakanaE.includes(char)) {
      return 'e'; // 'e' sound
    }
    if (hiraganaO.includes(char) || katakanaO.includes(char)) {
      return 'open'; // 'o' sound - open mouth
    }

    // Default for unknown characters
    return 'half';
  }

  /**
   * Convert mouth state to audio volume data
   */
  private mouthStateToAudioData(state: 'closed' | 'open' | 'half' | 'e' | 'u'): AudioVolumeData {
    switch (state) {
      case 'closed':
        return { rms: 0.0, high: 0.0, low: 0.0 };
      case 'half':
        return { rms: 0.3, high: 0.15, low: 0.15 };
      case 'open':
        return { rms: 0.6, high: 0.3, low: 0.3 };
      case 'e':
        return { rms: 0.5, high: 0.4, low: 0.1 }; // High frequency dominant
      case 'u':
        return { rms: 0.5, high: 0.1, low: 0.4 }; // Low frequency dominant
      default:
        return { rms: 0.0, high: 0.0, low: 0.0 };
    }
  }

  /**
   * Start lip sync animation for text
   */
  async animate(
    text: string,
    rate: number = 1.0,
    onVolumeData: (data: AudioVolumeData) => void
  ): Promise<void> {
    this.stop();

    this.onVolumeData = onVolumeData;
    this.phonemes = this.analyzeText(text);
    this.currentIndex = 0;

    return new Promise((resolve) => {
      const playNextPhoneme = () => {
        if (this.currentIndex >= this.phonemes.length) {
          // Animation complete - close mouth
          this.onVolumeData?.({ rms: 0.0, high: 0.0, low: 0.0 });
          this.stop();
          resolve();
          return;
        }

        const phoneme = this.phonemes[this.currentIndex];
        const audioData = this.mouthStateToAudioData(phoneme.mouthState);
        this.onVolumeData?.(audioData);

        this.currentIndex++;

        // Adjust duration by rate
        const adjustedDuration = phoneme.duration / rate;
        this.animationInterval = window.setTimeout(playNextPhoneme, adjustedDuration);
      };

      playNextPhoneme();
    });
  }

  /**
   * Stop animation
   */
  stop() {
    if (this.animationInterval !== null) {
      clearTimeout(this.animationInterval);
      this.animationInterval = null;
    }
    this.currentIndex = 0;
    this.phonemes = [];
    this.onVolumeData?.({ rms: 0.0, high: 0.0, low: 0.0 });
  }
}

/**
 * Simple random lip sync for unknown text
 */
export class RandomLipsync {
  private animationInterval: number | null = null;
  private onVolumeData: ((data: AudioVolumeData) => void) | null = null;

  /**
   * Start random lip sync animation
   */
  async animate(
    duration: number,
    onVolumeData: (data: AudioVolumeData) => void
  ): Promise<void> {
    this.stop();

    this.onVolumeData = onVolumeData;
    const startTime = performance.now();

    return new Promise((resolve) => {
      const updateMouth = () => {
        const elapsed = performance.now() - startTime;

        if (elapsed >= duration * 1000) {
          this.onVolumeData?.({ rms: 0.0, high: 0.0, low: 0.0 });
          this.stop();
          resolve();
          return;
        }

        // Random mouth state
        const rms = Math.random() * 0.5 + 0.2;
        const high = Math.random() * 0.3;
        const low = Math.random() * 0.3;

        this.onVolumeData?.({ rms, high, low });

        // Update every 100-200ms
        const nextInterval = 100 + Math.random() * 100;
        this.animationInterval = window.setTimeout(updateMouth, nextInterval);
      };

      updateMouth();
    });
  }

  /**
   * Stop animation
   */
  stop() {
    if (this.animationInterval !== null) {
      clearTimeout(this.animationInterval);
      this.animationInterval = null;
    }
    this.onVolumeData?.({ rms: 0.0, high: 0.0, low: 0.0 });
  }
}
