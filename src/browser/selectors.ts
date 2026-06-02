import { Page, Locator } from 'playwright-core';
import { getConfig } from '../config';
import { QwenGatewayError } from '../models/errors';

export interface SelectorDefinitions {
  chatInput: string[];
  sendButton: string[];
  imageModeButton: string[];
  videoModeButton: string[];
  webSearchButton: string[];
  autoModeButton: string[];
  thinkingModeButton: string[];
  fastModeButton: string[];
  uploadButton: string[];
  downloadButton: string[];
  responseContainer: string[];
}

// デフォルトのCSSセレクタおよびキーワードリスト
const DEFAULT_SELECTORS: SelectorDefinitions = {
  chatInput: [
    'textarea.message-input-textarea',
    'textarea',
    '[placeholder*="Qwen"]',
    '[placeholder*="メッセージ"]',
    '[placeholder*="Ask"]',
    'textarea[rows="1"]',
  ],
  sendButton: [
    '.omni-button-content-btn',
    '.message-input-right-button-send button',
    'button.send-button',
    'button.stop-button',
    '.omni-button-content',
    'button[type="submit"]',
    'button:has(svg)',
    'aria-role:button[name*="送信"]',
    'aria-role:button[name*="Send"]',
  ],
  imageModeButton: [
    'aria-role:button[name*="画像"]',
    'aria-role:button[name*="Image"]',
    'button:has-text("画像")',
  ],
  videoModeButton: [
    'aria-role:button[name*="動画"]',
    'aria-role:button[name*="Video"]',
    'button:has-text("動画")',
  ],
  webSearchButton: [
    '.web-search-btn',
    'aria-role:button[name*="検索"]',
    'aria-role:button[name*="Search"]',
    'button:has-text("検索")',
  ],
  autoModeButton: [
    'button:has-text("自動")',
    'button:has-text("Auto")',
  ],
  thinkingModeButton: [
    'button:has-text("思考")',
    'button:has-text("Thinking")',
  ],
  fastModeButton: [
    'button:has-text("高速")',
    'button:has-text("Fast")',
  ],
  uploadButton: [
    'input[type="file"]',
    'button:has-text("アップロード")',
    'button:has-text("Upload")',
    'button:has(svg[class*="upload"])',
  ],
  downloadButton: [
    'div.qwen-chat-response-control-card-top button:last-child',
    'div.qwen-chat-response-control-card-top [role="button"]:last-child',
    'div.qwen-chat-response-control-card-top button:nth-last-child(1)',
    '[class*="download"i]',
    'button:has(svg[class*="download"])',
    '.qwen-chat-package-comp-new-action-control-container:has(use[xlink\\:href*="download"])',
    'span.anticon:has(use[xlink\\:href*="download"])',
    'button:has-text("ダウンロード")',
    'button:has-text("Download")',
    'div:has(svg use[xlink\\:href*="download"])',
  ],
  responseContainer: [
    '.markdown',
    '.message-content',
    '[class*="message-content"]',
    '.chat-response',
  ],
};

/**
 * キーワードやCSS定義からLocatorを取得し、存在を順次確認して返却します。
 */
export async function getSelector(
  page: Page,
  key: keyof SelectorDefinitions
): Promise<Locator> {
  const config = getConfig();
  const envOverrideKey = `QWEN_SELECTOR_${key.replace(/[A-Z]/g, (m) => `_${m}`).toUpperCase()}` as keyof typeof config;
  const envOverrideValue = config[envOverrideKey];
  
  const selectorsToTry = envOverrideValue
    ? [String(envOverrideValue)]
    : DEFAULT_SELECTORS[key];

  for (const selector of selectorsToTry) {
    let locator: Locator;

    if (selector.startsWith('aria-role:')) {
      const match = selector.match(/aria-role:([a-z]+)\[([a-z]+)\*?=["'](.+?)["']\]/i);
      if (match) {
        const [, role, attr, val] = match;
        locator = page.getByRole(role as any, { [attr]: new RegExp(val, 'i') });
      } else {
        locator = page.locator(selector);
      }
    } else {
      locator = page.locator(selector);
    }

    try {
      const count = await locator.count();
      if (count > 0) {
        return locator.first();
      }
    } catch {
      // エラー時は次の候補へ
    }
  }

  throw new QwenGatewayError(
    'qwen_selector_not_found',
    `Required element for "${key}" not found on the page. Qwen UI might have changed.`,
    500
  );
}

/**
 * 指定されたキーに対応する要素がDOM上に出現するまで待機し、Locatorを返します。
 * 送信直後のレスポンスコンテナ待機などに有効です。
 */
export async function waitForSelector(
  page: Page,
  key: keyof SelectorDefinitions,
  timeoutMs = 15000
): Promise<Locator> {
  const config = getConfig();
  const envOverrideKey = `QWEN_SELECTOR_${key.replace(/[A-Z]/g, (m) => `_${m}`).toUpperCase()}` as keyof typeof config;
  const envOverrideValue = config[envOverrideKey];
  
  const selectorsToTry = envOverrideValue
    ? [String(envOverrideValue)]
    : DEFAULT_SELECTORS[key];

  for (const selector of selectorsToTry) {
    try {
      if (selector.startsWith('aria-role:')) {
        const match = selector.match(/aria-role:([a-z]+)\[([a-z]+)\*?=["'](.+?)["']\]/i);
        if (match) {
          const [, role, attr, val] = match;
          const locator = page.getByRole(role as any, { [attr]: new RegExp(val, 'i') });
          await locator.first().waitFor({ state: 'attached', timeout: timeoutMs });
          return locator.first();
        }
      } else {
        await page.waitForSelector(selector, { state: 'attached', timeout: timeoutMs });
        return page.locator(selector).first();
      }
    } catch {
      // タイムアウトまたはエラー時は次の候補へ
    }
  }

  throw new QwenGatewayError(
    'qwen_selector_not_found',
    `Required element for "${key}" failed to appear on the page within ${timeoutMs}ms. Qwen UI might have changed.`,
    500
  );
}

/**
 * 指定されたキーに対応する要素がDOM上に出現するまで待機し、すべてのマッチする Locator を返します。
 */
export async function waitForAllSelectors(
  page: Page,
  key: keyof SelectorDefinitions,
  timeoutMs = 15000
): Promise<Locator> {
  const config = getConfig();
  const envOverrideKey = `QWEN_SELECTOR_${key.replace(/[A-Z]/g, (m) => `_${m}`).toUpperCase()}` as keyof typeof config;
  const envOverrideValue = config[envOverrideKey];
  
  const selectorsToTry = envOverrideValue
    ? [String(envOverrideValue)]
    : DEFAULT_SELECTORS[key];

  for (const selector of selectorsToTry) {
    try {
      if (selector.startsWith('aria-role:')) {
        const match = selector.match(/aria-role:([a-z]+)\[([a-z]+)\*?=["'](.+?)["']\]/i);
        if (match) {
          const [, role, attr, val] = match;
          const locator = page.getByRole(role as any, { [attr]: new RegExp(val, 'i') });
          await locator.first().waitFor({ state: 'attached', timeout: timeoutMs });
          return locator;
        }
      } else {
        await page.waitForSelector(selector, { state: 'attached', timeout: timeoutMs });
        return page.locator(selector);
      }
    } catch {
      // タイムアウトまたはエラー時は次の候補へ
    }
  }

  throw new QwenGatewayError(
    'qwen_selector_not_found',
    `Required element for "${key}" failed to appear on the page within ${timeoutMs}ms. Qwen UI might have changed.`,
    500
  );
}
