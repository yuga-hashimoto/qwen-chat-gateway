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
    console.log(`[QwenBrowserGateway] Sending prompt: "${input.prompt.substring(0, 60)}..."`);
    const chatInput = await getSelector(page, 'chatInput');
    await chatInput.fill(input.prompt);

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
      let btnSelectorKey: 'autoModeButton' | 'thinkingModeButton' | 'fastModeButton';
      if (mode === 'thinking') {
        btnSelectorKey = 'thinkingModeButton';
      } else if (mode === 'fast') {
        btnSelectorKey = 'fastModeButton';
      } else {
        btnSelectorKey = 'autoModeButton';
      }

      const btn = await getSelector(page, btnSelectorKey);
      
      // すでにアクティブ状態（クラス名や属性に active / selected などが含まれるか）を確認
      const isActive = await btn.evaluate((el) => {
        const cls = el.className.toLowerCase();
        const pressed = el.getAttribute('aria-pressed');
        return cls.includes('active') || cls.includes('selected') || pressed === 'true';
      });

      if (!isActive) {
        await btn.click();
        await sleep(1000); // UIの切り替えを待つ
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
   * 画像を生成して、ArtifactStore に保存し結果を返します。
   */
  async generateImage(input: ImageInput): Promise<ImageResult> {
    const page = await defaultBrowserSession.ensurePage();
    await this.ensureReady();

    console.log(`[QwenBrowserGateway] Requesting image generation: "${input.prompt}"`);

    // チャットとして画像生成のプロンプトを送信
    const chatPrompt = `Generate an image: ${input.prompt}`;
    await this.chat({
      prompt: chatPrompt,
      mode: input.mode,
    });

    console.log('[QwenBrowserGateway] Image generation prompt complete. Downloading image...');
    
    // 生成された画像をダウンロード
    const download = await downloadLatestFile(page, 'downloadButton');
    const imageId = generateImageId();
    
    const meta = await defaultArtifactStore.saveImage(imageId, download.buffer, input.prompt);

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

    console.log(`[QwenBrowserGateway] Requesting video generation: "${input.prompt}"`);

    // チャットとして動画生成のプロンプトを送信
    const chatPrompt = `Generate a video: ${input.prompt}`;
    
    if (input.wait) {
      // 完了を待つ場合
      await this.chat({
        prompt: chatPrompt,
      });

      console.log('[QwenBrowserGateway] Video generation prompt complete. Downloading video...');
      
      const download = await downloadLatestFile(page, 'downloadButton');
      const videoId = generateVideoId();
      const meta = await defaultArtifactStore.saveVideo(videoId, download.buffer, input.prompt);

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
      await chatInput.fill(chatPrompt);
      const sendBtn = await getSelector(page, 'sendButton');
      await sendBtn.click();

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
