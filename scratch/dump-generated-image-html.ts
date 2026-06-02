// Run with: npx tsx scratch/dump-generated-image-html.ts
import { defaultBrowserSession } from '../src/browser/browserSession';
import { defaultQwenGateway } from '../src/browser/qwenGateway';
import { safeWriteFile } from '../src/utils/files';
import { getConfig } from '../src/config';
import { sleep } from '../src/utils/time';
import { getSelector } from '../src/browser/selectors';

getConfig({ QWEN_BROWSER_USER_DATA_DIR: '/Users/yu-ga/browser_data/qwen' });

async function dumpGeneratedImageHtml() {
  console.log('Launching browser to generate image...');
  try {
    const page = await defaultBrowserSession.ensurePage();
    await defaultQwenGateway.ensureReady();
    
    // 1. 画像生成モードの確認と切り替え
    const currentModeLocator = page.locator('.mode-select-current-mode');
    const isImageMode = await currentModeLocator.count() > 0 && 
                        (await currentModeLocator.innerText()).includes('Create image');
    
    if (!isImageMode) {
      console.log('Switching to Create Image mode...');
      await page.locator('.mode-select-open').click();
      await sleep(1000);
      await page.locator('li[data-menu-id$="-t2i"]').click();
      await sleep(2000);
    } else {
      console.log('Already in Create Image mode.');
    }

    // 2. プロンプト入力と送信
    console.log('Inputting prompt...');
    const chatInput = await getSelector(page, 'chatInput');
    await chatInput.fill('Draw a very simple green circle.');
    
    console.log('Clicking send...');
    const sendBtn = await getSelector(page, 'sendButton');
    await sendBtn.click();

    console.log('Waiting 35 seconds for generation and rendering...');
    await sleep(35000);

    const html = await page.content();
    await safeWriteFile('scratch/qwen-generated-image.html', html);
    console.log('[Success] HTML source dumped to scratch/qwen-generated-image.html');
  } catch (err) {
    console.error(err);
  } finally {
    await defaultBrowserSession.close();
  }
}

dumpGeneratedImageHtml();
