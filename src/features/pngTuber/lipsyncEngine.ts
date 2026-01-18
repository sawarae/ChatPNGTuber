/**
 * MotionPNG Tuber - Browser Lipsync Engine (DOM overlay)
 * Adapted for ChatPNGTuber
 */

import { AudioVolumeData } from './audioCapture';

export interface TrackFrame {
  valid: boolean;
  quad: number[][];
}

export interface TrackData {
  frames: TrackFrame[];
  fps: number;
  refSpriteSize: number[];
  calibration?: {
    offset: number[];
    scale: number;
    rotation: number;
  };
  calibrationApplied?: boolean;
}

export interface LipsyncEngineCallbacks {
  onLog?: (msg: string) => void;
  onFileStatus?: (status: 'success' | 'error', message: string) => void;
  onVolumeChange?: (volume: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onSectionsVisibility?: (visible: boolean) => void;
  onError?: (message: string) => void;
}

export interface LipsyncEngineAssets {
  video?: string;
  track?: string;
  mouth_closed: string;
  mouth_open: string;
  mouth_half?: string;
  mouth_e?: string;
  mouth_u?: string;
}

export interface LipsyncEngineOptions {
  debug?: boolean;
  hqAudioEnabled?: boolean;
  sensitivity?: number;
}

export interface LipsyncEngineElements {
  video: HTMLVideoElement;
  mouthCanvas: HTMLCanvasElement;
  stage: HTMLElement;
}

export interface LipsyncEngineConfig {
  elements: LipsyncEngineElements;
  callbacks?: LipsyncEngineCallbacks;
  assets?: LipsyncEngineAssets | null;
  options?: LipsyncEngineOptions;
}

type MouthState = 'closed' | 'open' | 'half' | 'e' | 'u';

export class LipsyncEngine {
  private video: HTMLVideoElement;
  private mouthCanvas: HTMLCanvasElement;
  private mouthCtx: CanvasRenderingContext2D;
  private stage: HTMLElement;
  private callbacks: LipsyncEngineCallbacks;
  private debug: boolean;

  private trackData: TrackData | null = null;
  private mouthSprites: Record<string, HTMLImageElement> = {};
  private mouthSpriteUrls: Record<string, string> = {};
  private activeSprite: HTMLImageElement | null = null;
  private videoUrl: string | null = null;
  private isRunning = false;

  private volume = 0;
  private smoothedHighRatio = 0;
  private sensitivity: number;
  private hqAudioEnabled: boolean;
  private envelope = 0;
  private noiseFloor = 0.002;
  private levelPeak = 0.02;
  private mouthChangeMinMs: number;

  private mouthState: MouthState = 'closed';
  private lastMouthChange = 0;
  private lastFrameIndex: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private animationId: number | null = null;
  private statusInterval: number | null = null;

  constructor({ elements, callbacks = {}, assets = null, options = {} }: LipsyncEngineConfig) {
    this.video = elements.video;
    this.mouthCanvas = elements.mouthCanvas;
    this.mouthCtx = this.mouthCanvas.getContext('2d')!;
    this.stage = elements.stage;

    this.callbacks = callbacks;

    const {
      debug = true,
      hqAudioEnabled = false,
      sensitivity = 50,
    } = options;
    this.debug = debug;
    this.sensitivity = sensitivity;
    this.hqAudioEnabled = hqAudioEnabled;
    this.mouthChangeMinMs = hqAudioEnabled ? 45 : 70;

    this.init();

    if (assets) {
      this._loadFromAssets(assets);
    }
  }

  private init() {
    window.addEventListener('resize', () => this.handleResize());
    window.addEventListener('beforeunload', () => this.cleanup());
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.stage);
      this.resizeObserver.observe(this.video);
    }
  }

  setSensitivity(value: number) {
    this.sensitivity = value;
  }

  setHQAudioEnabled(enabled: boolean) {
    this.hqAudioEnabled = enabled;
    this.mouthChangeMinMs = enabled ? 45 : 70;
    this.resetAudioStats();
    this.log(enabled ? 'HQ Audio: ON' : 'HQ Audio: OFF');
  }

  private log(msg: string) {
    if (this.debug) {
      console.log(msg);
      this.callbacks.onLog?.(msg);
    }
  }

  async loadFiles(files: File[]) {
    this.log('File count: ' + files.length);

    let videoFile: File | null = null;
    let trackFile: File | null = null;
    const spriteFiles: Record<string, File> = {};

    for (const file of files) {
      const name = file.name.toLowerCase();
      const path = (file as any).webkitRelativePath?.toLowerCase().replace(/\\/g, '/') || '';

      if (name.includes('mouthless') && name.endsWith('.mp4')) {
        if (name.includes('h264') || !videoFile) {
          videoFile = file;
          this.log('Video found: ' + file.name);
        }
      }
      if (name === 'mouth_track.json') {
        trackFile = file;
      }
      if (path.includes('mouth/') || path.includes('mouth\\')) {
        if (name === 'closed.png') spriteFiles.closed = file;
        if (name === 'open.png') spriteFiles.open = file;
        if (name === 'half.png') spriteFiles.half = file;
        if (name === 'e.png') spriteFiles.e = file;
        if (name === 'u.png') spriteFiles.u = file;
      }
    }

    const missing: string[] = [];
    if (!videoFile) missing.push('*_mouthless.mp4');
    if (!trackFile) missing.push('mouth_track.json');
    if (!spriteFiles.closed) missing.push('mouth/closed.png');
    if (!spriteFiles.open) missing.push('mouth/open.png');

    if (missing.length > 0) {
      this.callbacks.onFileStatus?.('error', `Missing: ${missing.join(', ')}`);
      return;
    }

    try {
      this.cleanup();

      const videoSrc = URL.createObjectURL(videoFile!);
      await this._setupVideo(videoSrc, true);

      const trackText = await trackFile!.text();
      await this._setupTrackData(JSON.parse(trackText));

      const spriteSources: Record<string, string> = {};
      for (const [key, file] of Object.entries(spriteFiles)) {
        spriteSources[key] = URL.createObjectURL(file);
      }
      await this._loadMouthSprites(spriteSources);

      this._onLoadComplete();
    } catch (err: any) {
      this.callbacks.onFileStatus?.('error', `Load error: ${err.message}`);
      console.error(err);
    }
  }

  private async _loadFromAssets(assets: LipsyncEngineAssets) {
    const missing: string[] = [];
    if (!assets.video) missing.push('video');
    if (!assets.track) missing.push('track');
    if (!assets.mouth_closed) missing.push('mouth_closed');
    if (!assets.mouth_open) missing.push('mouth_open');

    if (missing.length > 0) {
      this.callbacks.onFileStatus?.('error', `Missing assets: ${missing.join(', ')}`);
      return;
    }

    try {
      this.cleanup();

      await this._setupVideo(assets.video!, false);

      this.log('Loading track data...');
      const response = await fetch(assets.track!);
      if (!response.ok) throw new Error(`Track fetch failed: ${response.status}`);
      const trackData = await response.json();
      await this._setupTrackData(trackData);

      const spriteSources: Record<string, string> = {
        closed: assets.mouth_closed,
        open: assets.mouth_open,
      };
      if (assets.mouth_half) spriteSources.half = assets.mouth_half;
      if (assets.mouth_e) spriteSources.e = assets.mouth_e;
      if (assets.mouth_u) spriteSources.u = assets.mouth_u;
      await this._loadMouthSprites(spriteSources);

      this._onLoadComplete(true);
    } catch (err: any) {
      this.callbacks.onFileStatus?.('error', `Load error: ${err.message}`);
      console.error(err);
    }
  }

  private async _setupVideo(src: string, isObjectUrl: boolean) {
    this.log('Loading video...');

    if (isObjectUrl) {
      this.videoUrl = src;
    }
    this.video.src = src;
    this.video.loop = true;
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.preload = 'auto';
    this.video.controls = false;

    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        this.log(
          'Video ready: ' +
            this.video.videoWidth +
            'x' +
            this.video.videoHeight
        );
        this.video.removeEventListener('canplaythrough', onReady);
        this.video.removeEventListener('loadeddata', onReady);
        resolve();
      };
      this.video.addEventListener('canplaythrough', onReady);
      this.video.addEventListener('loadeddata', onReady);
      this.video.onerror = (e: any) => {
        this.log('Video error: ' + (e.message || 'unknown'));
        reject(new Error('Failed to load video'));
      };
      this.video.load();
    });

    this.mouthCanvas.width = this.video.videoWidth || 1;
    this.mouthCanvas.height = this.video.videoHeight || 1;
    if (this.mouthCtx) {
      this.mouthCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.mouthCtx.imageSmoothingEnabled = true;
      this.mouthCtx.clearRect(0, 0, this.mouthCanvas.width, this.mouthCanvas.height);
    }
  }

  private async _setupTrackData(trackData: TrackData) {
    this.trackData = trackData;
    this.log('Tracking: ' + this.trackData.frames.length + ' frames');
  }

  private async _loadMouthSprites(sources: Record<string, string>) {
    this.mouthSprites = {};
    this.mouthSpriteUrls = {};

    for (const [key, src] of Object.entries(sources)) {
      const img = await this._loadImageFromSrc(src);
      this.mouthSprites[key] = img;
      this.mouthSpriteUrls[key] = src;
    }
  }

  private _loadImageFromSrc(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  private _onLoadComplete(autoStart = false) {
    const statusMsg = `Load complete: ${this.trackData!.frames.length} frames, ${this.trackData!.fps}fps (${this.video.videoWidth}x${this.video.videoHeight})`;
    this.callbacks.onFileStatus?.('success', statusMsg);
    this.callbacks.onSectionsVisibility?.(true);

    this.setMouthState('closed', true);

    if (autoStart) {
      this.start();
    } else {
      this.renderPreview();
    }
  }

  cleanup() {
    this.stop();
    if (this.videoUrl) {
      URL.revokeObjectURL(this.videoUrl);
      this.videoUrl = null;
    }
    for (const url of Object.values(this.mouthSpriteUrls)) {
      if (url) URL.revokeObjectURL(url);
    }
    this.mouthSpriteUrls = {};
    this.mouthSprites = {};
    this.activeSprite = null;
    if (this.video) {
      this.video.removeAttribute('src');
      this.video.load();
    }
    if (this.mouthCtx && this.mouthCanvas) {
      this.mouthCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.mouthCtx.clearRect(0, 0, this.mouthCanvas.width, this.mouthCanvas.height);
    }
  }

  processAudioData(data: AudioVolumeData | null) {
    if (!data) return;

    if (this.hqAudioEnabled) {
      this.processAudioDataHQ(data);
      return;
    }

    const smoothing = 0.2;
    const ratio = data.high / (data.low + data.high + 1e-6);
    this.volume = this.volume * (1 - smoothing) + data.rms * smoothing;
    this.smoothedHighRatio =
      this.smoothedHighRatio * (1 - smoothing) + ratio * smoothing;

    const thresholds = this.getVolumeThresholds();
    const meter = Math.min(1, this.volume / (thresholds.half * 1.8));
    this.callbacks.onVolumeChange?.(meter);

    const nextState = this.selectMouthState(
      this.volume,
      this.smoothedHighRatio,
      thresholds
    );
    this.setMouthState(nextState);
  }

  resetAudioStats() {
    this.volume = 0;
    this.envelope = 0;
    this.noiseFloor = 0.002;
    this.levelPeak = 0.02;
    this.smoothedHighRatio = 0;
    this.callbacks.onVolumeChange?.(0);
  }

  private processAudioDataHQ(data: AudioVolumeData) {
    const ratio = data.high / (data.low + data.high + 1e-6);
    const ratioSmoothing = 0.25;
    this.smoothedHighRatio =
      this.smoothedHighRatio * (1 - ratioSmoothing) +
      ratio * ratioSmoothing;

    const rms = data.rms;
    const sensitivity = this.sensitivity / 100;
    const attack = 0.35;
    const release = 0.6;
    const k = rms > this.envelope ? attack : release;
    this.envelope = this.envelope * (1 - k) + rms * k;

    if (!this.noiseFloor) {
      this.noiseFloor = this.envelope;
    }
    if (this.envelope < this.noiseFloor) {
      const fall = 0.25;
      this.noiseFloor = this.noiseFloor * (1 - fall) + this.envelope * fall;
    } else {
      const rise = 0.01;
      this.noiseFloor = this.noiseFloor * (1 - rise) + this.envelope * rise;
    }

    const peakDecay = 0.985;
    this.levelPeak = Math.max(this.envelope, this.levelPeak * peakDecay);
    const minRange = 0.006;
    if (this.levelPeak < this.noiseFloor + minRange) {
      this.levelPeak = this.noiseFloor + minRange;
    }

    const gateMargin = 0.002 + (1 - sensitivity) * 0.008;
    const gateLevel = this.noiseFloor + gateMargin;
    if (this.envelope < gateLevel) {
      this.volume = 0;
      this.callbacks.onVolumeChange?.(0);
      this.setMouthState('closed');
      return;
    }

    const rawLevel =
      (this.envelope - this.noiseFloor) / (this.levelPeak - this.noiseFloor);
    const level = Math.max(0, Math.min(1, rawLevel));
    const gain = 0.6 + sensitivity * 0.8;
    const shaped = Math.min(1, Math.pow(level, 0.75) * gain);

    this.volume = shaped;
    this.callbacks.onVolumeChange?.(shaped);

    const thresholds = this.getVolumeThresholdsHQ();
    const nextState = this.selectMouthStateHQ(
      shaped,
      this.smoothedHighRatio,
      thresholds
    );
    this.setMouthState(nextState);
  }

  private getVolumeThresholds() {
    const sensitivity = this.sensitivity / 100;
    const closed = 0.008 + (1 - sensitivity) * 0.018;
    const half = 0.02 + (1 - sensitivity) * 0.06;
    return { closed, half };
  }

  private getVolumeThresholdsHQ() {
    const sensitivity = this.sensitivity / 100;
    const closed = 0.07 + (1 - sensitivity) * 0.08;
    const half = 0.22 + (1 - sensitivity) * 0.12;
    return { closed, half };
  }

  private selectMouthState(
    volume: number,
    highRatio: number,
    thresholds: { closed: number; half: number }
  ): MouthState {
    if (volume < thresholds.closed) return 'closed';
    if (volume < thresholds.half)
      return this.mouthSpriteUrls.half ? 'half' : 'open';

    if (highRatio > 0.62 && this.mouthSpriteUrls.e) return 'e';
    if (highRatio < 0.38 && this.mouthSpriteUrls.u) return 'u';
    return 'open';
  }

  private selectMouthStateHQ(
    level: number,
    highRatio: number,
    thresholds: { closed: number; half: number }
  ): MouthState {
    const hasHalf = !!this.mouthSpriteUrls.half;
    const hasE = !!this.mouthSpriteUrls.e;
    const hasU = !!this.mouthSpriteUrls.u;

    const closeTh = Math.max(0.02, thresholds.closed - 0.03);
    const halfDownTh = Math.max(closeTh + 0.02, thresholds.half - 0.02);

    let state = this.mouthState;
    if (state === 'e' || state === 'u') {
      state = 'open';
    }

    if (state === 'closed') {
      if (level >= thresholds.half) {
        state = 'open';
      } else if (level >= thresholds.closed && hasHalf) {
        state = 'half';
      } else if (level >= thresholds.closed) {
        state = 'open';
      } else {
        state = 'closed';
      }
    } else if (state === 'half') {
      if (level < closeTh) {
        state = 'closed';
      } else if (level >= thresholds.half) {
        state = 'open';
      } else {
        state = 'half';
      }
    } else {
      if (level < closeTh) {
        state = 'closed';
      } else if (level < halfDownTh && hasHalf) {
        state = 'half';
      } else {
        state = 'open';
      }
    }

    if (state === 'open') {
      if (highRatio > 0.62 && hasE) return 'e';
      if (highRatio < 0.38 && hasU) return 'u';
    }
    return state;
  }

  private setMouthState(state: MouthState, force = false) {
    const sprite =
      this.mouthSprites[state] ||
      this.mouthSprites.open ||
      this.mouthSprites.closed;
    if (!sprite) return;

    const now = performance.now();
    if (
      !force &&
      state !== this.mouthState &&
      now - this.lastMouthChange < this.mouthChangeMinMs
    ) {
      return;
    }

    if (force || state !== this.mouthState) {
      this.mouthState = state;
      this.activeSprite = sprite;
      this.lastMouthChange = now;
    }
  }

  private renderPreview() {
    if (!this.video || !this.trackData) return;
    this.video.pause();
    this.video.currentTime = 0;
    setTimeout(() => {
      this.renderFrame();
      this.log('Preview rendering complete');
    }, 80);
  }

  async start() {
    if (!this.video || !this.trackData) {
      this.callbacks.onError?.('Please select data folder first');
      return;
    }

    this.isRunning = true;
    this.callbacks.onPlayStateChange?.(true);

    try {
      this.log('Starting video playback...');
      this.video.currentTime = 0;
      const playPromise = this.video.play();
      if (playPromise !== undefined) {
        await playPromise;
      }

      this.log(
        'Playing: paused=' +
          this.video.paused +
          ', readyState=' +
          this.video.readyState +
          ', size=' +
          this.video.videoWidth +
          'x' +
          this.video.videoHeight
      );

      this.statusInterval = window.setInterval(() => {
        if (this.video && this.isRunning) {
          this.log(
            'time=' +
              this.video.currentTime.toFixed(2) +
              's, mouth=' +
              this.mouthState +
              ', vol=' +
              this.volume.toFixed(3)
          );
        }
      }, 500);

      this.startRenderLoop();
    } catch (err: any) {
      this.log('Playback error: ' + err.message);
      console.error('Video playback error:', err);
      this.startRenderLoop();
    }
  }

  stop() {
    this.isRunning = false;
    this.callbacks.onPlayStateChange?.(false);

    if (this.video) {
      this.video.pause();
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }
  }

  private startRenderLoop() {
    if (!this.isRunning) return;

    if ('requestVideoFrameCallback' in this.video) {
      const onFrame = () => {
        if (!this.isRunning) return;
        this.renderFrame();
        (this.video as any).requestVideoFrameCallback(onFrame);
      };
      (this.video as any).requestVideoFrameCallback(onFrame);
    } else {
      const loop = () => {
        if (!this.isRunning) return;
        this.renderFrame();
        this.animationId = requestAnimationFrame(loop);
      };
      loop();
    }
  }

  private renderFrame() {
    const video = this.video;
    const data = this.trackData;

    if (!video || video.readyState < 2 || !data) return;

    const totalFrames = data.frames.length;
    if (!totalFrames) return;

    const currentTime = video.currentTime;
    const fps = data.fps || 30;
    const frameIndex = Math.floor(currentTime * fps) % totalFrames;
    this.lastFrameIndex = frameIndex;
    this.updateMouthTransform(frameIndex);
  }

  private handleResize() {
    if (!this.trackData || !this.video || this.video.readyState < 2) return;
    const totalFrames = this.trackData.frames.length;
    if (!totalFrames) return;

    const frameIndex =
      this.lastFrameIndex !== null
        ? this.lastFrameIndex
        : Math.floor(this.video.currentTime * (this.trackData.fps || 30)) %
          totalFrames;
    this.updateMouthTransform(frameIndex);
  }

  private updateMouthTransform(frameIndex: number) {
    const data = this.trackData;
    if (!data || !data.frames || data.frames.length === 0) return;
    if (!this.mouthCtx || !this.mouthCanvas) return;

    const frame = data.frames[frameIndex];
    const ctx = this.mouthCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.mouthCanvas.width, this.mouthCanvas.height);
    if (!frame || !frame.valid) return;

    const sprite =
      this.activeSprite ||
      this.mouthSprites.open ||
      this.mouthSprites.closed;
    if (!sprite) return;

    const quad = frame.quad;
    const adjustedQuad = this.applyCalibrationToQuad(quad, data);
    this.drawWarpedSprite(sprite, adjustedQuad);
  }

  private applyCalibrationToQuad(quad: number[][], data: TrackData): number[][] {
    const calib = data.calibration || { offset: [0, 0], scale: 1, rotation: 0 };
    const applyCalib = data.calibrationApplied === true;
    if (!applyCalib) {
      return quad.map((pt) => [pt[0], pt[1]]);
    }

    const offsetX = calib.offset[0] || 0;
    const offsetY = calib.offset[1] || 0;
    const scale = calib.scale || 1;
    const rotation = ((calib.rotation || 0) * Math.PI) / 180;

    let cx = 0;
    let cy = 0;
    for (const [x, y] of quad) {
      cx += x;
      cy += y;
    }
    cx /= 4;
    cy /= 4;

    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    return quad.map(([x, y]) => {
      const dx = (x - cx) * scale;
      const dy = (y - cy) * scale;
      const rx = dx * cos - dy * sin + cx + offsetX;
      const ry = dx * sin + dy * cos + cy + offsetY;
      return [rx, ry];
    });
  }

  private drawWarpedSprite(sprite: HTMLImageElement, quad: number[][]) {
    if (!this.mouthCtx) return;
    const sw = sprite.naturalWidth || sprite.width;
    const sh = sprite.naturalHeight || sprite.height;
    if (!sw || !sh) return;

    const s0 = [0, 0];
    const s1 = [sw, 0];
    const s2 = [sw, sh];
    const s3 = [0, sh];

    const q0 = quad[0];
    const q1 = quad[1];
    const q2 = quad[2];
    const q3 = quad[3];

    this.drawTriangle(sprite, s0, s1, s2, q0, q1, q2);
    this.drawTriangle(sprite, s0, s2, s3, q0, q2, q3);
  }

  private drawTriangle(
    image: HTMLImageElement,
    s0: number[],
    s1: number[],
    s2: number[],
    d0: number[],
    d1: number[],
    d2: number[]
  ) {
    if (!this.mouthCtx) return;
    const ctx = this.mouthCtx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.moveTo(d0[0], d0[1]);
    ctx.lineTo(d1[0], d1[1]);
    ctx.lineTo(d2[0], d2[1]);
    ctx.closePath();
    ctx.clip();

    const mat = this.computeAffine(s0, s1, s2, d0, d1, d2);
    if (!mat) {
      ctx.restore();
      return;
    }
    ctx.setTransform(mat.a, mat.b, mat.c, mat.d, mat.e, mat.f);
    ctx.drawImage(image, 0, 0);
    ctx.restore();
  }

  private computeAffine(
    s0: number[],
    s1: number[],
    s2: number[],
    d0: number[],
    d1: number[],
    d2: number[]
  ): { a: number; b: number; c: number; d: number; e: number; f: number } | null {
    const sx0 = s0[0];
    const sy0 = s0[1];
    const sx1 = s1[0];
    const sy1 = s1[1];
    const sx2 = s2[0];
    const sy2 = s2[1];

    const dx0 = d0[0];
    const dy0 = d0[1];
    const dx1 = d1[0];
    const dy1 = d1[1];
    const dx2 = d2[0];
    const dy2 = d2[1];

    const denom = sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1);
    if (denom === 0) return null;

    const a = (dx0 * (sy1 - sy2) + dx1 * (sy2 - sy0) + dx2 * (sy0 - sy1)) / denom;
    const b = (dy0 * (sy1 - sy2) + dy1 * (sy2 - sy0) + dy2 * (sy0 - sy1)) / denom;
    const c = (dx0 * (sx2 - sx1) + dx1 * (sx0 - sx2) + dx2 * (sx1 - sx0)) / denom;
    const d = (dy0 * (sx2 - sx1) + dy1 * (sx0 - sx2) + dy2 * (sx1 - sx0)) / denom;
    const e =
      (dx0 * (sx1 * sy2 - sx2 * sy1) +
        dx1 * (sx2 * sy0 - sx0 * sy2) +
        dx2 * (sx0 * sy1 - sx1 * sy0)) /
      denom;
    const f =
      (dy0 * (sx1 * sy2 - sx2 * sy1) +
        dy1 * (sx2 * sy0 - sx0 * sy2) +
        dy2 * (sx0 * sy1 - sx1 * sy0)) /
      denom;

    return { a, b, c, d, e, f };
  }
}
