import React, { useCallback, useEffect, useRef } from 'react';
import { LipsyncEngine, LipsyncEngineAssets } from '@/features/pngTuber/lipsyncEngine';
import { AudioCapture } from '@/features/pngTuber/audioCapture';

interface PNGTuberViewerProps {
  assets?: LipsyncEngineAssets;
  className?: string;
  onReady?: () => void;
  debug?: boolean;
  engineRef?: React.RefObject<LipsyncEngine | null>;
}

export const PNGTuberViewer: React.FC<PNGTuberViewerProps> = ({
  assets,
  className = '',
  onReady,
  debug = false,
  engineRef: externalEngineRef,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const internalEngineRef = useRef<LipsyncEngine | null>(null);
  const audioCaptureRef = useRef<AudioCapture | null>(null);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || !stageRef.current) return;

    // Initialize AudioCapture
    const audioCapture = new AudioCapture({
      onVolumeData: (data) => {
        internalEngineRef.current?.processAudioData(data);
      },
      onStateChange: (isRunning) => {
        if (debug) console.log('Audio capture state:', isRunning);
      },
      onError: (message) => {
        console.error('AudioCapture error:', message);
      },
    });
    audioCaptureRef.current = audioCapture;

    // Initialize LipsyncEngine
    const engine = new LipsyncEngine({
      elements: {
        video: videoRef.current,
        mouthCanvas: canvasRef.current,
        stage: stageRef.current,
      },
      callbacks: {
        onLog: (msg) => {
          if (debug) console.log('[LipsyncEngine]', msg);
        },
        onFileStatus: (status, message) => {
          if (debug) console.log('[FileStatus]', status, message);
          if (status === 'success' && onReady) {
            onReady();
          }
        },
        onVolumeChange: (volume) => {
          // Can be used to update UI volume meter
        },
        onPlayStateChange: (isPlaying) => {
          if (debug) console.log('[PlayState]', isPlaying);
        },
        onError: (message) => {
          console.error('[LipsyncEngine Error]', message);
        },
      },
      assets: assets || null,
      options: {
        debug,
        hqAudioEnabled: true,
        sensitivity: 50,
      },
    });
    internalEngineRef.current = engine;

    // Sync with external ref if provided
    if (externalEngineRef) {
      (externalEngineRef as React.MutableRefObject<LipsyncEngine | null>).current = engine;
    }

    return () => {
      engine.cleanup();
      audioCapture.stop();
      if (externalEngineRef) {
        (externalEngineRef as React.MutableRefObject<LipsyncEngine | null>).current = null;
      }
    };
  }, [assets, debug, onReady, externalEngineRef]);

  const handleFolderSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files || !internalEngineRef.current) return;
      const files = Array.from(event.target.files);
      internalEngineRef.current.loadFiles(files);
    },
    []
  );

  return (
    <>
      <div className={`relative ${className}`}>
        <div ref={stageRef} className="relative w-full h-full">
          <video
            ref={videoRef}
            className="absolute top-0 left-0 w-full h-full object-contain"
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
          />
        </div>
      </div>

      {!assets && (
        <div className="fixed top-4 left-4 z-50">
          <label className="px-4 py-2 bg-white bg-opacity-80 rounded cursor-pointer hover:bg-opacity-100 transition-colors shadow-lg">
            <input
              type="file"
              // @ts-ignore - webkitdirectory is non-standard but widely supported
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFolderSelect}
              className="hidden"
            />
            <span className="text-sm font-medium">Select PNGTuber Folder</span>
          </label>
        </div>
      )}
    </>
  );
};

// Hook to expose engine controls
export const usePNGTuberControls = (engineRef: React.RefObject<LipsyncEngine | null>) => {
  const start = useCallback(() => {
    engineRef.current?.start();
  }, [engineRef]);

  const stop = useCallback(() => {
    engineRef.current?.stop();
  }, [engineRef]);

  const setSensitivity = useCallback(
    (value: number) => {
      engineRef.current?.setSensitivity(value);
    },
    [engineRef]
  );

  const setHQAudioEnabled = useCallback(
    (enabled: boolean) => {
      engineRef.current?.setHQAudioEnabled(enabled);
    },
    [engineRef]
  );

  const processAudioData = useCallback(
    (data: { rms: number; high: number; low: number } | null) => {
      engineRef.current?.processAudioData(data);
    },
    [engineRef]
  );

  return {
    start,
    stop,
    setSensitivity,
    setHQAudioEnabled,
    processAudioData,
  };
};
