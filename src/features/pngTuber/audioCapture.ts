/**
 * AudioCapture - Audio analysis for lip sync
 */

export interface AudioVolumeData {
  rms: number;
  high: number;
  low: number;
}

export interface AudioCaptureCallbacks {
  onVolumeData?: (data: AudioVolumeData) => void;
  onStateChange?: (isRunning: boolean) => void;
  onDevicesLoaded?: (devices: Array<{ deviceId: string; label: string }>) => void;
  onError?: (message: string) => void;
}

export class AudioCapture {
  private callbacks: AudioCaptureCallbacks;
  private audioContext: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;
  private hqAudioEnabled = false;

  constructor(callbacks: AudioCaptureCallbacks = {}) {
    this.callbacks = callbacks;
  }

  setHQAudioEnabled(enabled: boolean) {
    this.hqAudioEnabled = enabled;
  }

  async loadDevices() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');

      const deviceList = audioInputs.map((device, i) => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${i + 1}`,
      }));
      this.callbacks.onDevicesLoaded?.(deviceList);
    } catch (err) {
      console.error('Microphone access error:', err);
    }
  }

  async start(deviceId: string | null = null) {
    if (this.micStream) return;

    try {
      const baseAudio: MediaTrackConstraints = {};
      if (deviceId) {
        baseAudio.deviceId = { exact: deviceId } as ConstrainDOMString;
      }
      let audioConstraints: MediaTrackConstraints = { ...baseAudio };
      if (this.hqAudioEnabled) {
        audioConstraints.echoCancellation = false;
        audioConstraints.noiseSuppression = false;
        audioConstraints.autoGainControl = false;
      }
      try {
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
        });
      } catch (err) {
        if (this.hqAudioEnabled) {
          console.warn(
            'HQ Audio constraints failed, fallback to default:',
            err
          );
          this.micStream = await navigator.mediaDevices.getUserMedia({
            audio: baseAudio,
          });
        } else {
          throw err;
        }
      }

      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      if (!this.audioContext.audioWorklet) {
        throw new Error('AudioWorklet is not supported in this browser');
      }

      await this.audioContext.audioWorklet.addModule('/audio-worklet.js');
      await this.audioContext.resume();

      const source = this.audioContext.createMediaStreamSource(this.micStream);
      this.workletNode = new AudioWorkletNode(
        this.audioContext,
        'volume-analyzer'
      );
      this.workletNode.port.onmessage = (event) => {
        this.callbacks.onVolumeData?.(event.data);
      };

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0;

      source.connect(this.workletNode);
      this.workletNode
        .connect(this.gainNode)
        .connect(this.audioContext.destination);

      this.callbacks.onStateChange?.(true);
    } catch (err: any) {
      console.error('Microphone start error:', err);
      this.stop();
      this.callbacks.onError?.(
        'Failed to start microphone: ' + err.message
      );
    }
  }

  stop() {
    if (this.workletNode) {
      try {
        this.workletNode.port.onmessage = null;
      } catch {
        // ignore
      }
      try {
        this.workletNode.disconnect();
      } catch {
        // ignore
      }
      this.workletNode = null;
    }

    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {
        // ignore
      }
      this.gainNode = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.callbacks.onStateChange?.(false);
  }

  isRunning() {
    return this.micStream !== null;
  }
}
