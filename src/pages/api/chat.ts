import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const apiKey = req.body.apiKey || process.env.GOOGLE_API_KEY;
  const model = process.env.VERTEX_AI_MODEL || "gemini-2.5-flash-lite";

  if (!apiKey) {
    res
      .status(400)
      .json({ message: "APIキーが間違っているか、設定されていません。" });

    return;
  }

  try {
    // Convert OpenAI-style messages to Vertex AI format
    const messages = req.body.messages || [];
    const contents = messages.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: contents,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Vertex AI Error:", errorData);
      res.status(response.status).json({
        message: errorData.error?.message || "エラーが発生しました"
      });
      return;
    }

    const data = await response.json();
    const message = data.candidates?.[0]?.content?.parts?.[0]?.text || "エラーが発生しました";

    res.status(200).json({ message: message });
  } catch (error) {
    console.error("Vertex AI Error:", error);
    res.status(500).json({ message: "エラーが発生しました" });
  }
}
