import { chromium, BrowserContext, Page } from 'playwright-core';
import * as path from 'path';
import { getConfig } from '../config';
import { findBrowserExecutable } from '../utils/platform';
import { QwenGatewayError } from '../models/errors';
import { ensureDir } from '../utils/files';

export class BrowserSession {
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  /**
   * ブラウザセッションを起動します。既に起動している場合は何もしません。
   */
  async launch(): Promise<void> {
    if (this.context && this.page) {
      // 動作確認。もし切断されていたら再起動する
      try {
        await this.page.evaluate(() => 1);
        return;
      } catch {
        await this.close();
      }
    }

    const config = getConfig();
    const executablePath = config.QWEN_BROWSER_EXECUTABLE_PATH || findBrowserExecutable();
    if (!executablePath) {
      throw new QwenGatewayError(
        'browser_launch_failed',
        'Could not locate Chrome or Edge installation. Please set QWEN_BROWSER_EXECUTABLE_PATH or install Chrome/Edge.',
        500
      );
    }

    const absoluteUserDataDir = path.resolve(config.QWEN_BROWSER_USER_DATA_DIR);
    await ensureDir(absoluteUserDataDir);

    console.log(`[BrowserSession] Launching browser: ${executablePath}`);
    console.log(`[BrowserSession] User data dir: ${absoluteUserDataDir}`);
    console.log(`[BrowserSession] Headless: ${config.QWEN_BROWSER_HEADLESS}`);

    try {
      this.context = await chromium.launchPersistentContext(absoluteUserDataDir, {
        executablePath,
        headless: config.QWEN_BROWSER_HEADLESS,
        viewport: null, // 画面サイズは元のままで制御
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
      });

      const pages = this.context.pages();
      this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
    } catch (err: any) {
      throw new QwenGatewayError(
        'browser_launch_failed',
        `Failed to launch browser context: ${err.message}`,
        500
      );
    }
  }

  /**
   * ブラウザセッションを終了します。
   */
  async close(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();
      }
    } catch (err: any) {
      console.warn(`[BrowserSession Warning] Error while closing: ${err.message}`);
    } finally {
      this.context = null;
      this.page = null;
    }
  }

  /**
   * 現在稼働しているページを取得します。起動していなければ起動します。
   */
  async ensurePage(): Promise<Page> {
    await this.launch();
    if (!this.page) {
      throw new QwenGatewayError('browser_launch_failed', 'Failed to retrieve browser page object', 500);
    }
    return this.page;
  }

  getContext(): BrowserContext | null {
    return this.context;
  }

  getPage(): Page | null {
    return this.page;
  }

  /**
   * 接続およびログイン状態を診断して結果を返却します（doctorコマンドで使用）。
   */
  async checkHealth(): Promise<{
    browserPath: string | null;
    reachable: boolean;
    loggedIn: boolean;
    challenge: boolean;
  }> {
    const config = getConfig();
    const browserPath = config.QWEN_BROWSER_EXECUTABLE_PATH || findBrowserExecutable();

    let reachable = false;
    let loggedIn = false;
    let challenge = false;

    try {
      const page = await this.ensurePage();
      
      // Qwen Web への遷移を試みる
      await page.goto(config.QWEN_WEB_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      reachable = true;

      const url = page.url();

      // 1. ログインチェック
      const loginBtn = page.locator('button, a').filter({ hasText: /ログイン|新規登録|sign in|log in/i });
      let loginBtnCount = 0;
      try {
        loginBtnCount = await loginBtn.count();
      } catch {}

      if (url.includes('/login') || url.includes('/signin') || loginBtnCount > 0) {
        loggedIn = false;
      } else {
        // セレクタでチャット入力欄を探す
        const chatInput = await page.$('textarea, [placeholder*="Qwen"], [placeholder*="メッセージ"]');
        loggedIn = !!chatInput;
      }

      // 2. チャレンジ検知
      // 画面内にキャプチャ系のテキストがあるか
      const bodyText = await page.innerText('body').catch(() => '');
      const challengeKeywords = [
        'captcha',
        '機器の検証',
        'ロボットではない',
        'unusual activity',
        'verification code',
        'アクセスが拒否されました',
      ];
      challenge = challengeKeywords.some((keyword) => bodyText.toLowerCase().includes(keyword));

    } catch (err: any) {
      console.warn(`[BrowserSession Doctor Warning]: ${err.message}`);
    }

    return {
      browserPath,
      reachable,
      loggedIn,
      challenge,
    };
  }

  /**
   * エラー発生時にデバッグ用のスクリーンショットを artifacts ディレクトリに保存します。
   */
  async takeErrorScreenshot(label: string): Promise<string | null> {
    if (!this.page) return null;
    try {
      const config = getConfig();
      const artifactsDir = path.resolve(config.QWEN_ARTIFACTS_DIR);
      await ensureDir(artifactsDir);
      
      const filename = `error_${label}_${Date.now()}.png`;
      const screenshotPath = path.join(artifactsDir, filename);
      await this.page.screenshot({ path: screenshotPath });
      console.log(`[BrowserSession] Saved debug screenshot to: ${screenshotPath}`);
      return screenshotPath;
    } catch (err: any) {
      console.warn(`[BrowserSession Warning] Failed to take error screenshot: ${err.message}`);
      return null;
    }
  }
}
export const defaultBrowserSession = new BrowserSession();
