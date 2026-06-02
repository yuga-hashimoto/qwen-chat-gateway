// Run with: npx tsx scratch/inspect-headless-long.ts
import { defaultBrowserSession } from '../src/browser/browserSession';
import { defaultQwenGateway } from '../src/browser/qwenGateway';
import { safeWriteFile } from '../src/utils/files';
import { getConfig } from '../src/config';
import { sleep } from '../src/utils/time';
import { getSelector } from '../src/browser/selectors';

getConfig({ QWEN_BROWSER_USER_DATA_DIR: '/Users/yu-ga/browser_data/qwen', QWEN_BROWSER_HEADLESS: true });

async function inspectHeadlessLong() {
  console.log('Launching browser (HEADLESS) to generate image and inspect after 90s...');
  try {
    const page = await defaultBrowserSession.ensurePage();
    await defaultQwenGateway.ensureReady();
    
    // 1. 画像生成モードの確認と切り替え
    const currentModeLocator = page.locator('.mode-select-current-mode');
    const hasCurrentMode = await currentModeLocator.count() > 0;
    
    if (!hasCurrentMode) {
      console.log('Switching to Create Image mode...');
      await page.locator('.mode-select-open').click();
      await sleep(1000);
      await page.locator('li[data-menu-id$="-t2i"]').click();
      await sleep(2000);
    }

    // 2. プロンプト入力と送信
    console.log('Inputting prompt...');
    const chatInput = await getSelector(page, 'chatInput');
    await chatInput.fill('Draw a very simple yellow circle on a black background.');
    
    console.log('Clicking send...');
    const sendBtn = await getSelector(page, 'sendButton');
    await sendBtn.click();

    console.log('Waiting 90 seconds for generation...');
    await sleep(90000);

    // スクリーンショット
    await page.screenshot({ path: 'scratch/headless-after-90s.png' });
    console.log('Saved scratch/headless-after-90s.png');

    const html = await page.content();
    await safeWriteFile('scratch/qwen-headless-image-90s.html', html);
    console.log('[Success] HTML source dumped to scratch/qwen-headless-image-90s.html');
  } catch (err) {
    console.error(err);
  } finally {
    await defaultBrowserSession.close();
  }
}

inspectHeadlessLong();
