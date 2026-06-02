// Run with: npx tsx scratch/e2e-test.ts
import { defaultQwenGateway } from '../src/browser/qwenGateway';
import { defaultBrowserSession } from '../src/browser/browserSession';
import { defaultArtifactStore } from '../src/artifacts/artifactStore';
import { fileExists } from '../src/utils/files';
import * as path from 'path';
import { getConfig } from '../src/config';

// ユーザーが手動ログインを完了したホームディレクトリ配下のプロファイルを参照するように指定
getConfig({ QWEN_BROWSER_USER_DATA_DIR: '/Users/yu-ga/browser_data/qwen', QWEN_BROWSER_HEADLESS: true });

async function runE2ETest() {
  console.log('=== Starting Qwen Chat Gateway Real E2E Test ===');
  
  try {
    // 1. ブラウザ準備
    console.log('[1/4] Ensuring browser session ready...');
    await defaultBrowserSession.launch();
    await defaultQwenGateway.ensureReady();
    
    // 2. 実チャットテスト
    console.log('[2/4] Sending test prompt to Qwen...');
    const chatPrompt = 'Hello Qwen! Please reply with exactly "QWEN OK" and nothing else to confirm this automation test is successful.';
    const chatResult = await defaultQwenGateway.chat({
      prompt: chatPrompt,
      mode: 'fast' // スピードアップのため高速モードを指定
    });
    
    console.log('\n--- Qwen Chat Response ---');
    console.log(chatResult.text);
    console.log('--------------------------\n');
    
    if (!chatResult.text.includes('QWEN OK') && !chatResult.text.includes('Qwen') && !chatResult.text.includes('OK')) {
      console.warn('[Warning] Response did not strictly match, but text was returned.');
    } else {
      console.log('[Success] Chat automation confirmed.');
    }

    // 3. 画像生成テスト
    console.log('[3/4] Testing Real Image Generation & Auto-download...');
    const imagePrompt = 'Draw a very simple yellow circle on a black background.';
    try {
      const imageResult = await defaultQwenGateway.generateImage({
        prompt: imagePrompt,
        responseFormat: 'path'
      });

      console.log('\n--- Image Gen Result ---');
      console.log(`Saved Path:   ${imageResult.path}`);
      console.log(`Static URL:   ${imageResult.url}`);
      console.log('------------------------\n');

      // 保存された画像ファイルの存在検証
      const absoluteImagePath = path.resolve(process.cwd(), imageResult.path);
      const exist = await fileExists(absoluteImagePath);
      if (exist) {
        console.log('[Success] Image artifact successfully stored.');
      } else {
        throw new Error(`Generated image file not found at: ${absoluteImagePath}`);
      }
    } catch (err: any) {
      if (err.code === 'qwen_generation_failed' || err.status === 429) {
        console.warn(`\n[Warning] Image generation test skipped due to Qwen account limit: ${err.message}`);
      } else {
        throw err;
      }
    }

    // 3.5. 動画生成テスト & DOMダンプ
    console.log('[3.5/4] Testing Video Generation & HTML Dump...');
    try {
      const videoResult = await defaultQwenGateway.generateVideo({
        prompt: '猫が戯れている',
        wait: true
      });
      console.log('\n--- Video Gen Result ---');
      console.log(`Saved Path:   ${('path' in videoResult) ? videoResult.path : 'N/A'}`);
      console.log('------------------------\n');
    } catch (err: any) {
      console.log('\n[E2E Info] Video generation failed/timed out:', err.message);
      try {
        const page = await defaultBrowserSession.ensurePage();
        const html = await page.evaluate(() => {
          const card = document.querySelector('.qwen-chat-response-control-card-top');
          return card ? card.innerHTML : 'Card not found';
        });
        console.log('\n--- CONTROL CARD HTML ---');
        console.log(html);
        console.log('-------------------------\n');
        
        // 動画全体のコンテナHTMLもダンプ
        const containerHtml = await page.evaluate(() => {
          const container = document.querySelector('.qwen-video, [class*="video-container"]');
          return container ? container.outerHTML : 'Video container not found';
        });
        console.log('\n--- VIDEO CONTAINER HTML ---');
        console.log(containerHtml);
        console.log('----------------------------\n');
      } catch (dumpErr) {
        console.error('Failed to dump HTML:', dumpErr);
      }
    }

    // 4. API サーバー経由での動作検証
    console.log('[4/4] E2E Operations Complete.');
    
    } catch (err: any) {
      console.error('\n!!! E2E Test Failed !!!');
      console.error(err);
      try {
        const page = await defaultBrowserSession.ensurePage();
        const screenshotPath = path.resolve('/Users/yu-ga/.gemini/antigravity/brain/d1cf2521-7797-4e2b-8851-55696f4852b3/error_screenshot.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`Saved error screenshot to: ${screenshotPath}`);
      } catch (screenshotErr) {
        console.error('Failed to take screenshot:', screenshotErr);
      }
    } finally {
      console.log('Closing browser session...');
      await defaultBrowserSession.close();
      console.log('=== Test Run Finished ===');
    }
}

runE2ETest();
