import { Page, Download } from 'playwright-core';
import { getSelector } from './selectors';
import { QwenGatewayError } from '../models/errors';

/**
 * ページ上のダウンロードボタンをクリックし、ダウンロードされたファイルをメモリバッファとして直接取得します。
 * 取得後はブラウザ上の一時ファイルを直ちに削除します。
 */
export async function downloadLatestFile(
  page: Page,
  selectorKey: 'downloadButton' = 'downloadButton',
  timeoutMs: number = 60000
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  console.log('[Download] Waiting for download button click event...');

  let downloadButton;
  try {
    downloadButton = await getSelector(page, selectorKey);
  } catch (err: any) {
    throw new QwenGatewayError(
      'qwen_selector_not_found',
      `Download button not found: ${err.message}`,
      500
    );
  }

  // ダウンロードイベントの待機を設定
  const downloadPromise = page.waitForEvent('download', { timeout: timeoutMs });

  // ダウンロードボタンをクリック
  await downloadButton.click();

  let download: Download;
  try {
    download = await downloadPromise;
  } catch (err: any) {
    throw new QwenGatewayError(
      'qwen_generation_timeout',
      `Download session timed out or failed: ${err.message}`,
      504
    );
  }

  const filename = download.suggestedFilename();
  console.log(`[Download] Download started: ${filename}`);

  // ダウンロードストリームの読み込み
  const stream = await download.createReadStream();
  if (!stream) {
    throw new QwenGatewayError(
      'qwen_download_not_found',
      'Could not retrieve content stream from the downloaded file.',
      500
    );
  }

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);

  // ブラウザが保存した一時ファイルを削除してディスクをクリーンアップ
  try {
    await download.delete();
    console.log(`[Download] Cleaned up temporary browser download file for: ${filename}`);
  } catch (err: any) {
    console.warn(`[Download Warning] Failed to delete temporary download: ${err.message}`);
  }

  // ファイル名からMIMEタイプを推定する
  const ext = filename.split('.').pop()?.toLowerCase();
  let mimeType = 'application/octet-stream';
  if (ext === 'png') mimeType = 'image/png';
  else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
  else if (ext === 'gif') mimeType = 'image/gif';
  else if (ext === 'webp') mimeType = 'image/webp';
  else if (ext === 'mp4') mimeType = 'video/mp4';

  return {
    buffer,
    filename,
    mimeType,
  };
}
