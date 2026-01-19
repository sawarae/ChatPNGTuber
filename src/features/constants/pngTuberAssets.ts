export type PNGTuberAssets = {
  video: string;
  track: string;
  mouth_closed: string;
  mouth_open: string;
  mouth_half: string;
  mouth_e: string;
  mouth_u: string;
};

// Load assets info dynamically from API
let cachedAssetsInfo: { video: string; folder: string } | null = null;

export const getAssets = async (): Promise<PNGTuberAssets> => {
  // Use cached assets info if available
  if (!cachedAssetsInfo) {
    try {
      const response = await fetch("/api/assets");
      if (response.ok) {
        const data = await response.json();
        cachedAssetsInfo = {
          video: data.video,
          folder: data.folder,
        };
      } else {
        console.error("Failed to load assets info, using default");
        cachedAssetsInfo = {
          video: "pinkchan_mouthless_h264.mp4",
          folder: "assets01",
        };
      }
    } catch (error) {
      console.error("Error loading assets info:", error);
      cachedAssetsInfo = {
        video: "pinkchan_mouthless_h264.mp4",
        folder: "assets01",
      };
    }
  }

  const assetsBasePath = `/assets/${cachedAssetsInfo.folder}`;

  return {
    video: `${assetsBasePath}/${cachedAssetsInfo.video}`,
    track: `${assetsBasePath}/mouth_track.json`,
    mouth_closed: `${assetsBasePath}/mouth/closed.png`,
    mouth_open: `${assetsBasePath}/mouth/open.png`,
    mouth_half: `${assetsBasePath}/mouth/half.png`,
    mouth_e: `${assetsBasePath}/mouth/e.png`,
    mouth_u: `${assetsBasePath}/mouth/u.png`,
  };
};

// Deprecated: Use getAssets() instead
const DEFAULT_FOLDER = "assets01";
export const DEFAULT_ASSETS: PNGTuberAssets = {
  video: `/assets/${DEFAULT_FOLDER}/pinkchan_mouthless_h264.mp4`,
  track: `/assets/${DEFAULT_FOLDER}/mouth_track.json`,
  mouth_closed: `/assets/${DEFAULT_FOLDER}/mouth/closed.png`,
  mouth_open: `/assets/${DEFAULT_FOLDER}/mouth/open.png`,
  mouth_half: `/assets/${DEFAULT_FOLDER}/mouth/half.png`,
  mouth_e: `/assets/${DEFAULT_FOLDER}/mouth/e.png`,
  mouth_u: `/assets/${DEFAULT_FOLDER}/mouth/u.png`,
} as const;
