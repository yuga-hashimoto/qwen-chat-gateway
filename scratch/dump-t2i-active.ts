// Run with: npx tsx scratch/dump-t2i-active.ts
import { defaultBrowserSession } from '../src/browser/browserSession';
import { defaultQwenGateway } from '../src/browser/qwenGateway';
import { safeWriteFile } from '../src/utils/files';
import { getConfig } from '../src/config';
import { sleep } from '../src/utils/time';

getConfig({ QWEN_BROWSER_USER_DATA_DIR: '/Users/yu-ga/browser_data/qwen' });

async function dumpT2IActive() {
  console.log('Launching browser to activate Create Image mode...');
  try {
    const page = await defaultBrowserSession.ensurePage();
    await defaultQwenGateway.ensureReady();
    
    console.log('Clicking the "+" mode-select-open button...');
    await page.locator('.mode-select-open').click();
    await sleep(1000);

    console.log('Clicking "Create image" option...');
    // data-menu-id が -t2i で終わる li をクリック
    const t2iOption = page.locator('li[data-menu-id$="-t2i"]');
    await t2iOption.click();
    await sleep(2000);

    const html = await page.content();
    await safeWriteFile('scratch/qwen-t2i-active.html', html);
    console.log('[Success] HTML source dumped to scratch/qwen-t2i-active.html');
  } catch (err) {
    console.error(err);
  } finally {
    await defaultBrowserSession.close();
  }
}

dumpT2IActive();
