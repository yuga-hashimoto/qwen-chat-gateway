// Run with: npx tsx scratch/inspect-hover-image.ts
import { defaultBrowserSession } from '../src/browser/browserSession';
import { defaultQwenGateway } from '../src/browser/qwenGateway';
import { safeWriteFile } from '../src/utils/files';
import { getConfig } from '../src/config';
import { sleep } from '../src/utils/time';
import { getSelector } from '../src/browser/selectors';

getConfig({ QWEN_BROWSER_USER_DATA_DIR: '/Users/yu-ga/browser_data/qwen', QWEN_BROWSER_HEADLESS: true });

async function inspectHoverImage() {
  console.log('Launching browser to inspect image hover download button...');
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

    // 2. 送信
    console.log('Sending prompt...');
    const chatInput = await getSelector(page, 'chatInput');
    await chatInput.fill('Draw a very simple yellow circle on a black background.');
    const sendBtn = await getSelector(page, 'sendButton');
    await sendBtn.click();

    console.log('Waiting 90s...');
    await sleep(90000);

    // 3. 画像要素にホバー
    const imgLocator = page.locator('img.qwen-image').first();
    const markdownImgLocator = page.locator('.qwen-markdown-image').first();
    
    if (await imgLocator.count() > 0) {
      console.log('Hovering on img.qwen-image...');
      await imgLocator.hover();
      await sleep(2000);
      await page.screenshot({ path: 'scratch/headless-image-hover-img.png' });
      
      const html = await page.content();
      await safeWriteFile('scratch/qwen-hover-img.html', html);
      console.log('Saved scratch/headless-image-hover-img.png and HTML');
    } else if (await markdownImgLocator.count() > 0) {
      console.log('Hovering on .qwen-markdown-image...');
      await markdownImgLocator.hover();
      await sleep(2000);
      await page.screenshot({ path: 'scratch/headless-image-hover-md.png' });
    } else {
      console.warn('Image element not found for hover.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await defaultBrowserSession.close();
  }
}

inspectHoverImage();
