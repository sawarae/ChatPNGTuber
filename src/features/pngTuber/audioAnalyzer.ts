/**
 * Audio analyzer for TTS lip sync
 * Analyzes audio buffer to extract volume and frequency data for LipsyncEngine
 */

import { AudioVolumeData } from './audioCapture';

export class TTSAudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private lowpassNode: BiquadFilterNode | null = null;
  private lowAnalyserNode: AnalyserNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private updateInterval: number | null = null;
  private onVolumeData: ((data: AudioVolumeData) => void) | null = null;

  async initialize() {
    this.audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }

  async playAndAnalyze(
    audioBuffer: ArrayBuffer,
    onVolumeData: (data: AudioVolumeData) => void
  ): Promise<void> {
    if (!this.audioContext) {
      await this.initialize();
    }

    this.onVolumeData = onVolumeData;

    // Decode audio
    const decodedBuffer = await this.audioContext!.decodeAudioData(
      audioBuffer.slice(0)
    );

    // Create audio nodes
    this.sourceNode = this.audioContext!.createBufferSource();
    this.sourceNode.buffer = decodedBuffer;

    // Full spectrum analyzer
    this.analyserNode = this.audioContext!.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.3;

    // Lowpass filter at 700Hz (same as AudioWorklet)
    this.lowpassNode = this.audioContext!.createBiquadFilter();
    this.lowpassNode.type = 'lowpass';
    this.lowpassNode.frequency.value = 700;
    this.lowpassNode.Q.value = 0.7071; // Butterworth

    // Low frequency analyzer
    this.lowAnalyserNode = this.audioContext!.createAnalyser();
    this.lowAnalyserNode.fftSize = 2048;
    this.lowAnalyserNode.smoothingTimeConstant = 0.3;

    // Create dummy gain node for output (muted)
    const gainNode = this.audioContext!.createGain();
    gainNode.gain.value = 0;

    // Connect nodes
    this.sourceNode.connect(this.analyserNode);
    this.sourceNode.connect(this.lowpassNode);
    this.lowpassNode.connect(this.lowAnalyserNode);
    this.sourceNode.connect(gainNode);
    gainNode.connect(this.audioContext!.destination);

    // Start analysis loop
    this.startAnalysisLoop();

    // Play audio
    this.sourceNode.start(0);

    // Wait for audio to finish
    return new Promise((resolve) => {
      this.sourceNode!.onended = () => {
        this.stopAnalysisLoop();
        resolve();
      };
    });
  }

  private startAnalysisLoop() {
    if (!this.analyserNode || !this.lowAnalyserNode) return;

    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const lowDataArray = new Uint8Array(bufferLength);

    const analyze = () => {
      if (!this.analyserNode || !this.lowAnalyserNode) return;

      // Get frequency data
      this.analyserNode.getByteFrequencyData(dataArray);
      this.lowAnalyserNode.getByteFrequencyData(lowDataArray);

      // Calculate RMS (volume)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = dataArray[i] / 255.0;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / bufferLength);

      // Calculate low frequency energy
      let lowSum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = lowDataArray[i] / 255.0;
        lowSum += normalized * normalized;
      }
      const lowEnergy = lowSum / bufferLength;

      // Calculate high frequency energy (approximation)
      // High = Total - Low
      const highEnergy = Math.max(0, rms * rms - lowEnergy);

      if (this.onVolumeData) {
        this.onVolumeData({
          rms,
          low: lowEnergy,
          high: highEnergy,
        });
      }
    };

    // Update at ~60fps
    this.updateInterval = window.setInterval(analyze, 1000 / 60);
  }

  private stopAnalysisLoop() {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Reset to closed mouth
    if (this.onVolumeData) {
      this.onVolumeData({ rms: 0, low: 0, high: 0 });
    }
  }

  stop() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch {
        // already stopped
      }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    this.stopAnalysisLoop();

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.lowpassNode) {
      this.lowpassNode.disconnect();
      this.lowpassNode = null;
    }

    if (this.lowAnalyserNode) {
      this.lowAnalyserNode.disconnect();
      this.lowAnalyserNode = null;
    }
  }

  cleanup() {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}
