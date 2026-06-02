// Run with: npx tsx scratch/dump-html.ts
import { defaultBrowserSession } from '../src/browser/browserSession';
import { defaultQwenGateway } from '../src/browser/qwenGateway';
import { safeWriteFile } from '../src/utils/files';
import { getConfig } from '../src/config';
import { sleep } from '../src/utils/time';

getConfig({ QWEN_BROWSER_USER_DATA_DIR: '/Users/yu-ga/browser_data/qwen' });

async function dump() {
  console.log('Launching browser to dump Qwen HTML...');
  try {
    const page = await defaultBrowserSession.ensurePage();
    await defaultQwenGateway.ensureReady();
    
    console.log('Waiting 5 seconds for page load and hydration...');
    await sleep(5000);

    const html = await page.content();
    await safeWriteFile('scratch/qwen-dump.html', html);
    console.log('[Success] HTML source dumped to scratch/qwen-dump.html');
  } catch (err) {
    console.error(err);
  } finally {
    await defaultBrowserSession.close();
  }
}

dump();
