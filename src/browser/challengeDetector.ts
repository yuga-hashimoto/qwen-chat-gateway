import { Page } from 'playwright-core';
import { QwenGatewayError } from '../models/errors';
import { getConfig } from '../config';

/**
 * Qwen Web上のチャレンジ画面や認証要求を検出し、例外をスローして実行を停止します。
 */
export async function detectChallenge(page: Page): Promise<void> {
  const config = getConfig();
  if (!config.QWEN_STOP_ON_CHALLENGE) {
    return; // 検知停止が無効化されている場合はスキップ
  }

  const url = page.url();

  // 1. ログイン要求ページのチェック
  const loginBtn = page.locator('button, a').filter({ hasText: /ログイン|新規登録|sign in|log in/i });
  let loginBtnCount = 0;
  try {
    loginBtnCount = await loginBtn.count();
  } catch {}

  if (url.includes('/login') || url.includes('/signin') || loginBtnCount > 0) {
    throw new QwenGatewayError(
      'qwen_not_logged_in',
      'User is not logged in. Please check the visible browser and log in manually.',
      401
    );
  }

  // 2. ページ全体のテキストを検査
  let bodyText = '';
  try {
    bodyText = await page.innerText('body');
  } catch {
    // ページロード中の場合はスキップ
    return;
  }

  const normalizedText = bodyText.toLowerCase();

  // ログイン未検出のフォールバック
  if (
    normalizedText.includes('sign in to qwen') ||
    normalizedText.includes('qwenにログイン') ||
    normalizedText.includes('qwenにサインイン')
  ) {
    throw new QwenGatewayError(
      'qwen_not_logged_in',
      'Login required page detected via content. Please log in manually.',
      401
    );
  }

  // CAPTCHA・異常検知キーワード
  const challengeKeywords = [
    'captcha',
    '機器の検証',
    'ロボットではない',
    '滑块', // スライドパズル（中国語）
    'verify your browser',
    'unusual activity',
    'verification code',
    '安全チェック',
    'アクセスが拒否されました',
    'access denied',
  ];

  for (const keyword of challengeKeywords) {
    if (normalizedText.includes(keyword)) {
      throw new QwenGatewayError(
        'qwen_challenge_detected',
        `Qwen Chat requires user attention (Challenge detected: "${keyword}"). Please check the visible browser.`,
        403
      );
    }
  }

  // レート制限キーワード
  const rateLimitKeywords = [
    'rate limit',
    'too many requests',
    '一時的にアクセス制限',
    'しばらく時間をおいて',
    'try again later',
    'リクエストが多すぎます',
    'reached the limit',
    'usage limit',
    'reached the daily',
  ];

  for (const keyword of rateLimitKeywords) {
    if (normalizedText.includes(keyword)) {
      throw new QwenGatewayError(
        'qwen_rate_limited',
        `Qwen Chat Web rate limit detected: "${keyword}". Please retry later.`,
        429
      );
    }
  }
}
