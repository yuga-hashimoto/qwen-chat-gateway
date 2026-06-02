import { Page } from 'playwright-core';
import * as path from 'path';
import { existsSync } from 'fs';
import { getSelector } from './selectors';
import { QwenGatewayError } from '../models/errors';
import { sleep } from '../utils/time';

/**
 * 指定されたファイルを Qwen Chat のファイルアップロード機能を利用して添付します。
 */
export async function uploadFile(page: Page, filePath: string): Promise<void> {
  const absolutePath = path.resolve(filePath);
  if (!existsSync(absolutePath)) {
    throw new QwenGatewayError(
      'invalid_request',
      `File to upload not found: ${filePath}`,
      400
    );
  }

  console.log(`[Upload] Preparing file upload: ${absolutePath}`);

  try {
    const uploadEl = await getSelector(page, 'uploadButton');
    const tagName = await uploadEl.evaluate((el) => el.tagName.toLowerCase());

    if (tagName === 'input') {
      // input[type="file"] に直接セット
      await uploadEl.setInputFiles(absolutePath);
    } else {
      // 通常のボタンだった場合は、ファイル選択イベントをトリガーしてセット
      const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 10000 });
      await uploadEl.click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(absolutePath);
    }

    // アップロード処理がWeb側で完了するまで少し待機（プログレスバー反映など）
    await sleep(3000);
    console.log(`[Upload] File successfully attached.`);
  } catch (err: any) {
    throw new QwenGatewayError(
      'invalid_request',
      `Failed to upload file to Qwen Web: ${err.message}`,
      500
    );
  }
}
