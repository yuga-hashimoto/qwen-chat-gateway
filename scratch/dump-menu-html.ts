// Run with: npx tsx scratch/dump-menu-html.ts
import { defaultBrowserSession } from '../src/browser/browserSession';
import { defaultQwenGateway } from '../src/browser/qwenGateway';
import { safeWriteFile } from '../src/utils/files';
import { getConfig } from '../src/config';
import { sleep } from '../src/utils/time';

getConfig({ QWEN_BROWSER_USER_DATA_DIR: '/Users/yu-ga/browser_data/qwen' });

async function dumpMenuHtml() {
  console.log('Launching browser to dump drop-down menu...');
  try {
    const page = await defaultBrowserSession.ensurePage();
    await defaultQwenGateway.ensureReady();
    
    console.log('Clicking the "+" mode-select-open button...');
    const plusBtn = page.locator('.mode-select-open');
    await plusBtn.click();

    console.log('Waiting 2 seconds for menu to pop up...');
    await sleep(2000);

    const html = await page.content();
    await safeWriteFile('scratch/qwen-menu-dump.html', html);
    console.log('[Success] Menu HTML source dumped to scratch/qwen-menu-dump.html');
  } catch (err) {
    console.error(err);
  } finally {
    await defaultBrowserSession.close();
  }
}

dumpMenuHtml();
