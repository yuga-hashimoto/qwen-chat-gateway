// Run with: npx tsx scratch/dump-image-html.ts
import { defaultBrowserSession } from '../src/browser/browserSession';
import { defaultQwenGateway } from '../src/browser/qwenGateway';
import { safeWriteFile } from '../src/utils/files';
import { getConfig } from '../src/config';
import { sleep } from '../src/utils/time';
import { getSelector } from '../src/browser/selectors';

getConfig({ QWEN_BROWSER_USER_DATA_DIR: '/Users/yu-ga/browser_data/qwen' });

async function dumpImageHtml() {
  console.log('Launching browser to request image and dump html...');
  try {
    const page = await defaultBrowserSession.ensurePage();
    await defaultQwenGateway.ensureReady();
    
    console.log('Sending image generation prompt...');
    const chatInput = await getSelector(page, 'chatInput');
    await chatInput.fill('Generate an image: Draw a very simple green circle.');
    const sendBtn = await getSelector(page, 'sendButton');
    await sendBtn.click();

    console.log('Waiting 20 seconds for generation and rendering...');
    await sleep(20000);

    const html = await page.content();
    await safeWriteFile('scratch/qwen-image-dump.html', html);
    console.log('[Success] HTML source dumped to scratch/qwen-image-dump.html');
  } catch (err) {
    console.error(err);
  } finally {
    await defaultBrowserSession.close();
  }
}

dumpImageHtml();
