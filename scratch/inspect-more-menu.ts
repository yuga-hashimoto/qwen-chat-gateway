// Run with: npx tsx scratch/inspect-more-menu.ts
import { defaultBrowserSession } from '../src/browser/browserSession';
import { defaultQwenGateway } from '../src/browser/qwenGateway';
import { safeWriteFile } from '../src/utils/files';
import { getConfig } from '../src/config';
import { sleep } from '../src/utils/time';
import { getSelector } from '../src/browser/selectors';

getConfig({ QWEN_BROWSER_USER_DATA_DIR: '/Users/yu-ga/browser_data/qwen', QWEN_BROWSER_HEADLESS: true });

async function inspectMoreMenu() {
  console.log('Launching browser to inspect "More" menu after image generation...');
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

    // 3. 三点リーダーを探す
    // クラス名やuseタグで探す
    const moreIconLocator = page.locator('svg use[xlink\\:href*="more"]').locator('xpath=./ancestor::span[contains(@class, "anticon")]/ancestor::div[contains(@class, "action-control-container")]');
    console.log('More icons count:', await moreIconLocator.count());
    
    if (await moreIconLocator.count() > 0) {
      console.log('Clicking the last More icon...');
      await moreIconLocator.last().click();
      await sleep(2000);

      // スクリーンショット
      await page.screenshot({ path: 'scratch/headless-more-menu.png' });
      console.log('Saved scratch/headless-more-menu.png');

      const html = await page.content();
      await safeWriteFile('scratch/qwen-more-menu.html', html);
      console.log('[Success] HTML dumped');
    } else {
      console.warn('More icon not found via selector.');
      // 別のセレクタを試す
      const allActionContainers = page.locator('.qwen-chat-package-comp-new-action-control-container');
      console.log('Total action containers:', await allActionContainers.count());
      if (await allActionContainers.count() > 0) {
        console.log('Clicking the last action container...');
        await allActionContainers.last().click();
        await sleep(2000);
        await page.screenshot({ path: 'scratch/headless-more-menu-fallback.png' });
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await defaultBrowserSession.close();
  }
}

inspectMoreMenu();
