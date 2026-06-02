import { describe, it, expect } from 'vitest';
import { detectChallenge } from '../src/browser/challengeDetector';
import { QwenGatewayError } from '../src/models/errors';
import { Page } from 'playwright-core';

// 簡易的な Page のモックを作成するヘルパー
function createMockPage(url: string, innerTextContent: string): Page {
  const locatorMock = {
    filter: () => locatorMock,
    count: async () => 0,
  };
  return {
    url: () => url,
    innerText: async (selector: string) => {
      if (selector === 'body') return innerTextContent;
      return '';
    },
    locator: () => locatorMock,
  } as unknown as Page;
}

describe('Challenge Detector Tests', () => {
  it('should throw qwen_not_logged_in when URL is a login URL', async () => {
    const page = createMockPage('https://chat.qwen.ai/login', '');
    
    await expect(detectChallenge(page)).rejects.toThrowError(
      new QwenGatewayError('qwen_not_logged_in', 'User is not logged in. Please check the visible browser and log in manually.', 401)
    );
  });

  it('should throw qwen_not_logged_in when body text demands login', async () => {
    const page = createMockPage('https://chat.qwen.ai/', 'Please Sign in to Qwen to continue.');
    
    await expect(detectChallenge(page)).rejects.toThrowError(
      expect.objectContaining({ code: 'qwen_not_logged_in' })
    );
  });

  it('should throw qwen_challenge_detected when captcha keywords are present', async () => {
    const page = createMockPage('https://chat.qwen.ai/', 'Please solve the captcha puzzle to verify you are human.');
    
    await expect(detectChallenge(page)).rejects.toThrowError(
      expect.objectContaining({ code: 'qwen_challenge_detected' })
    );
  });

  it('should throw qwen_rate_limited when rate limit message is shown', async () => {
    const page = createMockPage('https://chat.qwen.ai/', 'Too many requests. Please try again later.');
    
    await expect(detectChallenge(page)).rejects.toThrowError(
      expect.objectContaining({ code: 'qwen_rate_limited' })
    );
  });

  it('should pass without error when page content is clean', async () => {
    const page = createMockPage('https://chat.qwen.ai/chat/123', 'Qwen is a large language model created by Alibaba.');
    
    // スローされないことを確認
    await expect(detectChallenge(page)).resolves.toBeUndefined();
  });
});
