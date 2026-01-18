export type PNGTuberAssets = {
  video: string;
  track: string;
  mouth_closed: string;
  mouth_open: string;
  mouth_half: string;
  mouth_e: string;
  mouth_u: string;
};

// 環境変数からアセットフォルダ名を取得（デフォルト: assets01）
const ASSETS_FOLDER = process.env.ASSETS_FOLDER || "assets01";
const ASSETS_BASE_PATH = `/assets/${ASSETS_FOLDER}`;

// Load video filename dynamically from API
let cachedVideoFilename: string | null = null;

export const getAssets = async (): Promise<PNGTuberAssets> => {
  // Use cached video filename if available
  if (!cachedVideoFilename) {
    try {
      const response = await fetch("/api/assets");
      if (response.ok) {
        const data = await response.json();
        cachedVideoFilename = data.video;
      } else {
        console.error("Failed to load video filename, using default");
        cachedVideoFilename = "pinkchan_mouthless_h264.mp4";
      }
    } catch (error) {
      console.error("Error loading video filename:", error);
      cachedVideoFilename = "pinkchan_mouthless_h264.mp4";
    }
  }

  return {
    video: `${ASSETS_BASE_PATH}/${cachedVideoFilename}`,
    track: `${ASSETS_BASE_PATH}/mouth_track.json`,
    mouth_closed: `${ASSETS_BASE_PATH}/mouth/closed.png`,
    mouth_open: `${ASSETS_BASE_PATH}/mouth/open.png`,
    mouth_half: `${ASSETS_BASE_PATH}/mouth/half.png`,
    mouth_e: `${ASSETS_BASE_PATH}/mouth/e.png`,
    mouth_u: `${ASSETS_BASE_PATH}/mouth/u.png`,
  };
};

// Deprecated: Use getAssets() instead
export const DEFAULT_ASSETS: PNGTuberAssets = {
  video: `${ASSETS_BASE_PATH}/pinkchan_mouthless_h264.mp4`,
  track: `${ASSETS_BASE_PATH}/mouth_track.json`,
  mouth_closed: `${ASSETS_BASE_PATH}/mouth/closed.png`,
  mouth_open: `${ASSETS_BASE_PATH}/mouth/open.png`,
  mouth_half: `${ASSETS_BASE_PATH}/mouth/half.png`,
  mouth_e: `${ASSETS_BASE_PATH}/mouth/e.png`,
  mouth_u: `${ASSETS_BASE_PATH}/mouth/u.png`,
} as const;
