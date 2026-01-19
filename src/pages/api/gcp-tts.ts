import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleAuth } from "google-auth-library";

type Data = {
  audio?: string;
  error?: string;
};

// Create GoogleAuth instance for service account authentication
const getAccessToken = async (): Promise<string> => {
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (credentials) {
    // Use JSON credentials from environment variable
    const auth = new GoogleAuth({
      credentials: JSON.parse(credentials),
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return token.token || "";
  }

  // Fallback to default credentials (e.g., GOOGLE_APPLICATION_CREDENTIALS file path)
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token || "";
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Get voice configuration from environment variables
  const defaultVoiceName = process.env.TTS_VOICE_NAME || "ja-JP-Neural2-B";
  const defaultLanguageCode = process.env.TTS_LANGUAGE_CODE || "ja-JP";

  const { text, languageCode = defaultLanguageCode, voiceName = defaultVoiceName } = req.body;

  if (!text) {
    res.status(400).json({ error: "Text is required" });
    return;
  }

  try {
    const accessToken = await getAccessToken();

    const response = await fetch(
      "https://texttospeech.googleapis.com/v1/text:synthesize",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode,
            name: voiceName,
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 1.0,
            pitch: 0.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("GCP TTS error:", errorData);
      res.status(response.status).json({ error: errorData.error?.message || "TTS request failed" });
      return;
    }

    const data = await response.json();
    res.status(200).json({ audio: data.audioContent });
  } catch (error: any) {
    console.error("GCP TTS error:", error);
    res.status(500).json({ error: error.message || "Failed to synthesize speech" });
  }
}
