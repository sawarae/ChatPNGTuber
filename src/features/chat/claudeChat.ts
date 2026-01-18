import { Message } from "../messages/messages";

/**
 * Get chat response from Claude API with streaming
 */
export async function getChatResponseStream(messages: Message[]) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set in environment variables");
  }

  // Convert messages to Claude format
  const claudeMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  // Extract system message
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';

  // Make API request to our backend endpoint
  const res = await fetch('/api/claude-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: claudeMessages,
      system: systemMessage,
    }),
  });

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const stream = new ReadableStream({
    async start(controller: ReadableStreamDefaultController) {
      const decoder = new TextDecoder("utf-8");
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          controller.enqueue(text);
        }
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });

  return stream;
}

/**
 * Get chat response from Claude API (non-streaming)
 */
export async function getChatResponse(messages: Message[]) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set in environment variables");
  }

  const res = await fetch('/api/claude-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role,
        content: m.content,
      })),
      system: messages.find(m => m.role === 'system')?.content || '',
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status}`);
  }

  const data = await res.json();
  return { message: data.message };
}
