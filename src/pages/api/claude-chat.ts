// Claude API is not used - using Google Gemini API instead
// This file is kept for reference but the SDK is not installed

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  res.status(501).json({
    error: 'Claude API is not used - using Google Gemini API via /api/chat instead'
  });
}
