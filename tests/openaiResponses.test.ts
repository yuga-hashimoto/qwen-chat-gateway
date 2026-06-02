import { describe, it, expect } from 'vitest';
import { normalizeChatResponse, normalizeImageResponse, normalizeVideoResponse } from '../src/server/responses';

describe('Response Normalization Tests', () => {
  it('should generate valid OpenAI chat completion response shape', () => {
    const response = normalizeChatResponse({
      chatId: 'chatcmpl-test123',
      model: 'qwen-web',
      text: 'Hello world!',
    });

    expect(response.id).toBe('chatcmpl-test123');
    expect(response.object).toBe('chat.completion');
    expect(response.model).toBe('qwen-web');
    expect(response.created).toBeGreaterThan(0);
    expect(response.choices).toHaveLength(1);
    expect(response.choices[0].message.role).toBe('assistant');
    expect(response.choices[0].message.content).toBe('Hello world!');
    expect(response.choices[0].finish_reason).toBe('stop');
    expect(response.usage).toBeDefined();
    expect(response.usage?.total_tokens).toBeNull();
  });

  it('should generate valid OpenAI image generation response shape', () => {
    const created = Math.floor(Date.now() / 1000);
    const response = normalizeImageResponse({
      created,
      path: './artifacts/images/test.png',
      url: 'http://127.0.0.1:8787/artifacts/images/test.png',
      b64_json: 'base64str',
      revisedPrompt: 'revised text',
    });

    expect(response.created).toBe(created);
    expect(response.data).toHaveLength(1);
    expect(response.data[0].path).toBe('./artifacts/images/test.png');
    expect(response.data[0].url).toBe('http://127.0.0.1:8787/artifacts/images/test.png');
    expect(response.data[0].b64_json).toBe('base64str');
    expect(response.data[0].revised_prompt).toBe('revised text');
  });

  it('should generate valid custom video generation response shape', () => {
    const created = Math.floor(Date.now() / 1000);
    const response = normalizeVideoResponse({
      id: 'vid-test123',
      created,
      status: 'completed',
      path: './artifacts/videos/test.mp4',
      url: 'http://127.0.0.1:8787/artifacts/videos/test.mp4',
      metadataPath: './artifacts/videos/test.json',
    });

    expect(response.id).toBe('vid-test123');
    expect(response.object).toBe('video.generation');
    expect(response.status).toBe('completed');
    expect(response.created).toBe(created);
    expect(response.data).toHaveLength(1);
    expect(response.data[0].path).toBe('./artifacts/videos/test.mp4');
    expect(response.data[0].url).toBe('http://127.0.0.1:8787/artifacts/videos/test.mp4');
    expect(response.data[0].metadataPath).toBe('./artifacts/videos/test.json');
  });
});
