import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

type Data = {
  video?: string;
  folder?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const assetsFolder = process.env.ASSETS_FOLDER || "assets01";
  const assetsPath = path.join(process.cwd(), "public", "assets", assetsFolder);

  try {
    // Check if directory exists
    if (!fs.existsSync(assetsPath)) {
      res.status(404).json({ error: `Assets folder not found: ${assetsFolder}` });
      return;
    }

    // Find *_mouthless_h264.mp4 file
    const files = fs.readdirSync(assetsPath);
    const videoFile = files.find((file) => file.endsWith("_mouthless_h264.mp4"));

    if (!videoFile) {
      res.status(404).json({ error: "Video file (*_mouthless_h264.mp4) not found" });
      return;
    }

    res.status(200).json({ video: videoFile, folder: assetsFolder });
  } catch (error: any) {
    console.error("Assets API error:", error);
    res.status(500).json({ error: error.message || "Failed to load assets" });
  }
}
