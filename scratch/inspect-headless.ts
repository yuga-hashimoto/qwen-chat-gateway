// Run with: npx tsx scratch/inspect-headless.ts
import { defaultBrowserSession } from '../src/browser/browserSession';
import { defaultQwenGateway } from '../src/browser/qwenGateway';
import { safeWriteFile } from '../src/utils/files';
import { getConfig } from '../src/config';
import { sleep } from '../src/utils/time';
import { getSelector } from '../src/browser/selectors';

getConfig({ QWEN_BROWSER_USER_DATA_DIR: '/Users/yu-ga/browser_data/qwen', QWEN_BROWSER_HEADLESS: true });

async function inspectHeadless() {
  console.log('Launching browser (HEADLESS) to generate image and inspect...');
  try {
    const page = await defaultBrowserSession.ensurePage();
    await defaultQwenGateway.ensureReady();
    
    // 1. 画像生成モードの確認と切り替え
    const currentModeLocator = page.locator('.mode-select-current-mode');
    const hasCurrentMode = await currentModeLocator.count() > 0;
    
    if (hasCurrentMode) {
      console.log('Current mode text:', await currentModeLocator.innerText());
    } else {
      console.log('Switching to Create Image mode...');
      await page.locator('.mode-select-open').click();
      await sleep(1000);
      await page.locator('li[data-menu-id$="-t2i"]').click();
      await sleep(2000);
    }

    // スクリーンショット (送信前)
    await page.screenshot({ path: 'scratch/headless-before-send.png' });
    console.log('Saved scratch/headless-before-send.png');

    // 2. プロンプト入力と送信
    console.log('Inputting prompt...');
    const chatInput = await getSelector(page, 'chatInput');
    await chatInput.fill('Draw a very simple yellow circle on a black background.');
    
    console.log('Clicking send...');
    const sendBtn = await getSelector(page, 'sendButton');
    await sendBtn.click();

    console.log('Waiting 30 seconds for generation...');
    await sleep(30000);

    // スクリーンショット (送信30秒後)
    await page.screenshot({ path: 'scratch/headless-after-30s.png' });
    console.log('Saved scratch/headless-after-30s.png');

    const html = await page.content();
    await safeWriteFile('scratch/qwen-headless-image.html', html);
    console.log('[Success] HTML source dumped to scratch/qwen-headless-image.html');
  } catch (err) {
    console.error(err);
  } finally {
    await defaultBrowserSession.close();
  }
}

inspectHeadless();
