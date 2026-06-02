import { ChatInput, ChatResult, ImageInput, ImageResult, VideoInput, VideoResult, VideoJob, UploadChatInput } from '../models/qwen';
import { defaultBrowserSession } from './browserSession';
import { getSelector } from './selectors';
import { detectChallenge } from './challengeDetector';
import { waitForResponse } from './resultParser';
import { uploadFile } from './fileUpload';
import { downloadLatestFile } from './downloadManager';
import { getConfig } from '../config';
import { sleep } from '../utils/time';
import { QwenGatewayError } from '../models/errors';
import { generateImageId, generateVideoId, generateVideoJobId } from '../utils/ids';
import { defaultArtifactStore } from '../artifacts/artifactStore';

export class QwenBrowserGateway {
  private lastUrl: string = '';

  /**
   * ブラウザが開き、Qwen Webのチャット画面が正しく表示されていることを保証します。
   */
  async ensureReady(): Promise<void> {
    const page = await defaultBrowserSession.ensurePage();
    const config = getConfig();
    const currentUrl = page.url();

    // 既にチャットページにいる場合は再遷移しない
    if (!currentUrl.includes('chat.qwen.ai') || this.lastUrl !== config.QWEN_WEB_URL) {
      console.log(`[QwenBrowserGateway] Navigating to ${config.QWEN_WEB_URL}`);
      await page.goto(config.QWEN_WEB_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
      this.lastUrl = config.QWEN_WEB_URL;
    }

    // チャレンジ（CAPTCHA）やログイン画面のチェック
    await detectChallenge(page);
  }

  /**
   * 通常のチャット応答を送信し、結果を受け取ります。
   */
  async chat(input: ChatInput): Promise<ChatResult> {
    const page = await defaultBrowserSession.ensurePage();
    await this.ensureReady();

    // 1. 各種モードの設定
    if (input.mode) {
      await this.setMode(input.mode);
    }
    if (input.webSearch !== undefined) {
      await this.setWebSearch(input.webSearch);
    }

    // 2. プロンプト入力と送信
    const config = getConfig();
    if (config.QWEN_STORE_PROMPTS) {
      console.log(`[QwenBrowserGateway] Sending prompt: "${input.prompt.substring(0, 60)}..."`);
    } else {
      console.log(`[QwenBrowserGateway] Sending prompt. length=${input.prompt.length}`);
    }
    const chatInput = await getSelector(page, 'chatInput');
    await chatInput.fill(input.prompt);
    await sleep(500); // 送信ボタンの活性化を待つ

    // 送信ボタンをクリック
    const sendBtn = await getSelector(page, 'sendButton');
    await sendBtn.click();

    // 3. レスポンスの待機とパース
    const text = await waitForResponse(page);
    return { text };
  }

  /**
   * ファイルをアップロードした上で、チャットプロンプトを送信します。
   */
  async uploadAndChat(input: UploadChatInput): Promise<ChatResult> {
    const page = await defaultBrowserSession.ensurePage();
    await this.ensureReady();

    // 1. ファイルアップロード
    await uploadFile(page, input.filePath);

    // 2. チャット送信
    return await this.chat({
      prompt: input.prompt,
      mode: input.mode,
    });
  }

  /**
   * 思考モード（thinking）、高速モード（fast）、自動（auto）などのモードを設定します。
   */
  async setMode(mode: 'auto' | 'thinking' | 'fast'): Promise<void> {
    const page = await defaultBrowserSession.ensurePage();
    await this.ensureReady();

    console.log(`[QwenBrowserGateway] Setting mode to: ${mode}`);
    try {
      // 1. 最新のセレクトボックス (qwen-select-thinking) が存在するかチェック
      const selectBox = page.locator('.qwen-select-thinking, .qwen-thinking-selector');
      const hasSelectBox = (await selectBox.count().catch(() => 0)) > 0;

      if (hasSelectBox) {
        // セレクトボックスをクリックしてドロップダウンを展開
        await selectBox.first().click();
        await sleep(1000);

        // モードに対応する選択肢のテキスト (言語設定に配慮して英語/日本語で部分一致)
        let optionText = /Auto|自動/i;
        if (mode === 'thinking') {
          optionText = /Thinking|思考|Deep/i;
        } else if (mode === 'fast') {
          optionText = /Fast|高速/i;
        }

        const option = page.locator('.ant-select-item-option-content, .ant-select-item, [class*="select-item"]').filter({ hasText: optionText });
        if ((await option.count()) > 0) {
          await option.first().click();
          await sleep(1000);
          console.log(`[QwenBrowserGateway] Mode successfully set to "${mode}" via dropdown.`);
          return;
        }
      }

      // 2. 従来のボタン型UIのフォールバック
      let btnSelectorKey: 'autoModeButton' | 'thinkingModeButton' | 'fastModeButton';
      if (mode === 'thinking') {
        btnSelectorKey = 'thinkingModeButton';
      } else if (mode === 'fast') {
        btnSelectorKey = 'fastModeButton';
      } else {
        btnSelectorKey = 'autoModeButton';
      }

      const btn = await getSelector(page, btnSelectorKey);
      
      const isActive = await btn.evaluate((el) => {
        const cls = el.className.toLowerCase();
        const pressed = el.getAttribute('aria-pressed');
        return cls.includes('active') || cls.includes('selected') || pressed === 'true';
      });

      if (!isActive) {
        await btn.click();
        await sleep(1000);
      }
    } catch (err: any) {
      console.warn(`[QwenBrowserGateway Warning] Failed to toggle mode "${mode}": ${err.message}`);
    }
  }

  /**
   * Web検索機能のトグルをON/OFFします。
   */
  async setWebSearch(enabled: boolean): Promise<void> {
    const page = await defaultBrowserSession.ensurePage();
    await this.ensureReady();

    console.log(`[QwenBrowserGateway] Setting Web Search to: ${enabled}`);
    try {
      const searchBtn = await getSelector(page, 'webSearchButton');
      
      const isChecked = await searchBtn.evaluate((el) => {
        const checked = el.getAttribute('aria-checked');
        const cls = el.className.toLowerCase();
        return checked === 'true' || cls.includes('checked') || cls.includes('active');
      });

      if (isChecked !== enabled) {
        await searchBtn.click();
        await sleep(1000); // UI反映を待つ
      }
    } catch (err: any) {
      console.warn(`[QwenBrowserGateway Warning] Failed to toggle web search: ${err.message}`);
    }
  }

  /**
   * 画像生成モードまたは動画生成モードへの切り替えを保証します。
   */
  private async switchToCreativeMode(mode: 'image' | 'video'): Promise<void> {
    const page = await defaultBrowserSession.ensurePage();
    const modeLabel = mode === 'image' ? 'Create image' : 'Create video';
    const targetMenuId = mode === 'image' ? '-t2i' : '-t2v';

    console.log(`[QwenBrowserGateway] Ensuring creative mode: ${modeLabel}`);

    const currentModeLocator = page.locator('.mode-select-current-mode');
    const hasCurrentMode = (await currentModeLocator.count().catch(() => 0)) > 0;

    if (hasCurrentMode) {
      const text = await currentModeLocator.innerText().catch(() => '');
      if (text.includes(modeLabel) || (mode === 'image' && text.includes('画像')) || (mode === 'video' && text.includes('動画'))) {
        console.log(`[QwenBrowserGateway] Already in ${modeLabel} mode.`);
        return;
      }
      // 異なるモードが選択されている場合は、閉じるボタンをクリックしてリセット
      console.log(`[QwenBrowserGateway] Clearing different mode...`);
      const closeBtn = currentModeLocator.locator('.mode-select-current-mode-close');
      if ((await closeBtn.count().catch(() => 0)) > 0) {
        await closeBtn.first().click();
        await sleep(1000);
      }
    }

    // モード切り替えメニューを展開
    console.log(`[QwenBrowserGateway] Opening mode menu...`);
    const modeSelectOpen = page.locator('.mode-select-open');
    if ((await modeSelectOpen.count().catch(() => 0)) > 0) {
      await modeSelectOpen.first().click();
      await sleep(1000);

      // ドロップダウンアイテムを探してクリック
      const option = page.locator(`li[data-menu-id$="${targetMenuId}"]`);
      if ((await option.count().catch(() => 0)) > 0) {
        await option.first().click();
        await sleep(2000); // UIの適用を待つ
      } else {
        // フォールバック: テキストでのマッチング
        const textOption = page.locator('.ant-dropdown-menu-item').filter({ hasText: new RegExp(modeLabel, 'i') });
        if ((await textOption.count().catch(() => 0)) > 0) {
          await textOption.first().click();
          await sleep(2000);
        } else {
          // 日本語フォールバック
          const jpText = mode === 'image' ? '画像生成' : '動画生成';
          const jpOption = page.locator('.ant-dropdown-menu-item').filter({ hasText: new RegExp(jpText) });
          if ((await jpOption.count().catch(() => 0)) > 0) {
            await jpOption.first().click();
            await sleep(2000);
          } else {
            throw new QwenGatewayError(
              'qwen_mode_switch_failed',
              `Could not find menu option for mode: ${modeLabel}`,
              500
            );
          }
        }
      }
    } else {
      console.warn(`[QwenBrowserGateway Warning] Plus button (.mode-select-open) not found.`);
    }
  }

  /**
   * 画像を生成して、ArtifactStore に保存し結果を返します。
   */
  async generateImage(input: ImageInput): Promise<ImageResult> {
    const page = await defaultBrowserSession.ensurePage();
    await this.ensureReady();

    // 1. 画像生成モードへの切り替え
    await this.switchToCreativeMode('image');

    const config = getConfig();
    if (config.QWEN_STORE_PROMPTS) {
      console.log(`[QwenBrowserGateway] Requesting image generation: "${input.prompt}"`);
    } else {
      console.log(`[QwenBrowserGateway] Requesting image generation. length=${input.prompt.length}`);
    }

    // 2. プロンプト入力と送信
    const chatInput = await getSelector(page, 'chatInput');
    await chatInput.fill(input.prompt);
    await sleep(500); // 送信ボタンの活性化を待つ

    const sendBtn = await getSelector(page, 'sendButton');
    await sendBtn.click();

    // 3. レスポンスの待機 (画像ブロックがレンダリングされるのを待つ)
    const responseText = await waitForResponse(page);

    // 画像生成エラーの早期チェック (利用制限等に達した場合の処理)
    const errorKeywords = ['制限', '上限', 'limit', 'error', 'エラー', 'できません', 'failed'];
    const isError = errorKeywords.some((kw) => responseText.toLowerCase().includes(kw));
    if (isError) {
      throw new QwenGatewayError(
        'qwen_generation_failed',
        `Image generation failed: Qwen returned an error/limit message: "${responseText}"`,
        429
      );
    }

    console.log('[QwenBrowserGateway] Image generation complete. Preparing download...');

    // 画像要素が出現するのを待ってからホバーしてダウンロードボタンを表示させる
    try {
      const imgSelector = '.qwen-chat-response-control-card-top, img.qwen-image, .qwen-markdown-image, div.qwen-chat-package-comp-new-img, [class*="qwen-markdown-image"]';
      await page.waitForSelector(imgSelector, { state: 'attached', timeout: 15000 });
      const img = page.locator(imgSelector).first();
      console.log('[QwenBrowserGateway] Image element found. Hovering to trigger download button...');
      await img.hover({ timeout: 5000 });
      await sleep(1500); // ホバー後の表示遅延に対応するため少し長めに待機
    } catch (err: any) {
      console.warn(`[QwenBrowserGateway Warning] Failed to find or hover image: ${err.message}`);
    }
    
    // 4. 生成された画像をダウンロード
    const download = await downloadLatestFile(page, 'downloadButton');
    const imageId = generateImageId();
    
    const meta = await defaultArtifactStore.saveImage(imageId, download.buffer, input.prompt);

    // 画像生成モードをリセット（後続のチャットに影響を与えないようにバッジをクリア）
    try {
      const closeBtn = page.locator('.mode-select-current-mode-close');
      if ((await closeBtn.count().catch(() => 0)) > 0) {
        await closeBtn.first().click();
        await sleep(1000);
      }
    } catch (err: any) {
      console.warn(`[QwenBrowserGateway Warning] Failed to reset image mode: ${err.message}`);
    }

    return {
      path: meta.path,
      url: meta.url,
      b64_json: input.responseFormat === 'b64_json' ? download.buffer.toString('base64') : null,
      revisedPrompt: input.prompt,
    };
  }

  /**
   * 動画を生成して、ArtifactStore に保存し結果を返します。
   */
  async generateVideo(input: VideoInput): Promise<VideoResult | VideoJob> {
    const page = await defaultBrowserSession.ensurePage();
    await this.ensureReady();

    // 1. 動画生成モードへの切り替え
    await this.switchToCreativeMode('video');

    const config = getConfig();
    if (config.QWEN_STORE_PROMPTS) {
      console.log(`[QwenBrowserGateway] Requesting video generation: "${input.prompt}"`);
    } else {
      console.log(`[QwenBrowserGateway] Requesting video generation. length=${input.prompt.length}`);
    }

    if (input.wait) {
      // 完了を待つ場合
      const chatInput = await getSelector(page, 'chatInput');
      await chatInput.fill(input.prompt);
      await sleep(500); // 送信ボタンの活性化を待つ

      const sendBtn = await getSelector(page, 'sendButton');
      await sendBtn.click();

      // 動画生成完了を待つ (動画生成は時間がかかるため最大10分待機)
      const responseText = await waitForResponse(page, 600000);

      // 動画生成エラーの早期チェック (利用制限等に達した場合の処理)
      const errorKeywords = ['制限', '上限', 'limit', 'error', 'エラー', 'できません', 'failed'];
      const isError = errorKeywords.some((kw) => responseText.toLowerCase().includes(kw));
      if (isError) {
        throw new QwenGatewayError(
          'qwen_generation_failed',
          `Video generation failed: Qwen returned an error/limit message: "${responseText}"`,
          429
        );
      }

      console.log('[QwenBrowserGateway] Video generation complete. Preparing download...');

      // 動画要素が出現するのを待ってからホバーしてダウンロードボタンを表示させる
      try {
        const videoSelector = '.qwen-chat-response-control-card-top, video, .qwen-video, div.qwen-chat-package-comp-new-video, [class*="qwen-video"]';
        await page.waitForSelector(videoSelector, { state: 'attached', timeout: 15000 });
        const video = page.locator(videoSelector).first();
        console.log('[QwenBrowserGateway] Video element found. Hovering to trigger download button...');
        await video.hover({ timeout: 5000 });
        await sleep(1500);
      } catch (err: any) {
        console.warn(`[QwenBrowserGateway Warning] Failed to find or hover video: ${err.message}`);
      }
      
      const download = await downloadLatestFile(page, 'downloadButton');
      const videoId = generateVideoId();
      const meta = await defaultArtifactStore.saveVideo(videoId, download.buffer, input.prompt);

      // 動画生成モードをリセット
      try {
        const closeBtn = page.locator('.mode-select-current-mode-close');
        if ((await closeBtn.count().catch(() => 0)) > 0) {
          await closeBtn.first().click();
          await sleep(1000);
        }
      } catch (err: any) {
        console.warn(`[QwenBrowserGateway Warning] Failed to reset video mode: ${err.message}`);
      }

      return {
        id: videoId,
        status: 'completed',
        path: meta.path,
        url: meta.url,
        metadataPath: pathsToMetadataPath(meta.path),
      };
    } else {
      // 非同期ジョブとして開始だけ行う
      const chatInput = await getSelector(page, 'chatInput');
      await chatInput.fill(input.prompt);
      await sleep(500); // 送信ボタンの活性化を待つ
      
      const sendBtn = await getSelector(page, 'sendButton');
      await sendBtn.click();

      // 動画生成モードをリセット
      try {
        const closeBtn = page.locator('.mode-select-current-mode-close');
        if ((await closeBtn.count().catch(() => 0)) > 0) {
          await closeBtn.first().click();
          await sleep(1000);
        }
      } catch (err: any) {
        console.warn(`[QwenBrowserGateway Warning] Failed to reset video mode: ${err.message}`);
      }

      const jobId = generateVideoJobId();
      console.log(`[QwenBrowserGateway] Video generation job started: ${jobId}`);

      return {
        id: jobId,
        status: 'processing',
        prompt: input.prompt,
        createdAt: new Date().toISOString(),
      };
    }
  }
}

function pathsToMetadataPath(filePath: string): string {
  return filePath.replace(/\.[a-zA-Z0-9]+$/, '.json');
}

export const defaultQwenGateway = new QwenBrowserGateway();
