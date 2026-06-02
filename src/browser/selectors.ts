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
    'textarea',
    '[placeholder*="Qwen"]',
    '[placeholder*="メッセージ"]',
    '[placeholder*="Ask"]',
    'textarea[rows="1"]',
  ],
  sendButton: [
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
    'button:has-text("ダウンロード")',
    'button:has-text("Download")',
    'button:has(svg[class*="download"])',
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

  // 1. 環境変数のオーバーライドがあれば最優先で適用
  const envOverrideKey = `QWEN_SELECTOR_${key.replace(/[A-Z]/g, (m) => `_${m}`).toUpperCase()}` as keyof typeof config;
  const envOverrideValue = config[envOverrideKey];
  
  const selectorsToTry = envOverrideValue
    ? [String(envOverrideValue)]
    : DEFAULT_SELECTORS[key];

  for (const selector of selectorsToTry) {
    let locator: Locator;

    if (selector.startsWith('aria-role:')) {
      // 例: "aria-role:button[name*='送信']"
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

    // 要素が存在するか確認
    try {
      const count = await locator.count();
      if (count > 0) {
        // 最初に見つかった有効な要素の Locator を返す
        return locator.first();
      }
    } catch {
      // エラー時は次の候補へ
    }
  }

  // 見つからなかった場合はエラー
  throw new QwenGatewayError(
    'qwen_selector_not_found',
    `Required element for "${key}" not found on the page. Qwen UI might have changed.`,
    500
  );
}
