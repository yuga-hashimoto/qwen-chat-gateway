import { describe, it, expect, vi } from 'vitest';
import { getSelector } from '../src/browser/selectors';
import { getConfig } from '../src/config';
import { Page, Locator } from 'playwright-core';
import { QwenGatewayError } from '../src/models/errors';

// 簡易的な Locator/Page のモックを作成するヘルパー
function createPageMockWithSelector(matchingSelector: string) {
  const locatorMock = {
    count: async () => 1,
    first: () => 'found-element' as unknown as Locator,
  };

  const page = {
    locator: vi.fn((sel) => {
      if (sel === matchingSelector) {
        return locatorMock;
      }
      return { count: async () => 0 };
    }),
    getByRole: vi.fn(() => ({ count: async () => 0 })),
  } as unknown as Page;

  return { page, locatorMock };
}

describe('Selector Fallback Tests', () => {
  it('should fall back to next selector if first is not found', async () => {
    // chatInput のデフォルト候補 ['textarea', '[placeholder*="Qwen"]', ...] のうち、
    // textarea は無いが、[placeholder*="Qwen"] がある場合
    const { page } = createPageMockWithSelector('[placeholder*="Qwen"]');

    const result = await getSelector(page, 'chatInput');
    expect(result).toBe('found-element');
    expect(page.locator).toHaveBeenCalledWith('textarea');
    expect(page.locator).toHaveBeenCalledWith('[placeholder*="Qwen"]');
  });

  it('should prioritize environment override if provided', async () => {
    // 環境変数 QWEN_SELECTOR_CHAT_INPUT にカスタムCSSを設定
    getConfig({ QWEN_SELECTOR_CHAT_INPUT: '.my-custom-chat-input' });

    // カスタムCSSだけがマッチするPageモックを用意
    const { page } = createPageMockWithSelector('.my-custom-chat-input');

    const result = await getSelector(page, 'chatInput');
    expect(result).toBe('found-element');
    expect(page.locator).toHaveBeenCalledWith('.my-custom-chat-input');
    // デフォルトの textarea などの検索は行われないことを確認
    expect(page.locator).not.toHaveBeenCalledWith('textarea');

    // クリーンアップ
    getConfig({ QWEN_SELECTOR_CHAT_INPUT: '' });
  });

  it('should throw qwen_selector_not_found if none of the fallbacks exist', async () => {
    const page = {
      locator: vi.fn(() => ({ count: async () => 0 })),
      getByRole: vi.fn(() => ({ count: async () => 0 })),
    } as unknown as Page;

    await expect(getSelector(page, 'chatInput')).rejects.toThrowError(
      new QwenGatewayError('qwen_selector_not_found', 'Required element for "chatInput" not found on the page. Qwen UI might have changed.', 500)
    );
  });
});
