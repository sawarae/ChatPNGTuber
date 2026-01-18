import Anthropic from '@anthropic-ai/sdk';
import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  runtime: 'nodejs',
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY is not configured'
    });
  }

  try {
    const { messages, system, stream = true } = req.body;

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    if (stream) {
      // Set headers for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const streamResponse = await anthropic.messages.stream({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: messages,
        system: system || undefined,
      });

      // Stream the response
      for await (const chunk of streamResponse) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          const text = chunk.delta.text;
          res.write(text);
        }
      }

      res.end();
    } else {
      // Non-streaming response
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: messages,
        system: system || undefined,
      });

      const content = response.content[0];
      const message = content.type === 'text' ? content.text : '';

      res.status(200).json({ message });
    }
  } catch (error: any) {
    console.error('Claude API error:', error);
    res.status(500).json({
      error: error.message || 'An error occurred'
    });
  }
}
