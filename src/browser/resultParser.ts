import { Page } from 'playwright-core';
import { getSelector, waitForSelector, waitForAllSelectors } from './selectors';
import { detectChallenge } from './challengeDetector';
import { sleep } from '../utils/time';
import { QwenGatewayError } from '../models/errors';

/**
 * Qwenの応答が完了するのを待ち、最後のAIの返答テキストを抽出して返します。
 */
export async function waitForResponse(
  page: Page,
  timeoutMs: number = 180000
): Promise<string> {
  const startTime = Date.now();
  console.log('[ResultParser] Waiting for response generation to start...');

  // 1. 送信ボタンが「停止ボタン」に変化する（生成が開始される）のを少し待つ
  let started = false;
  const startCheckTimeout = 5000; // 最大5秒待つ
  const startCheckStart = Date.now();

  while (Date.now() - startCheckStart < startCheckTimeout) {
    await detectChallenge(page);
    try {
      const sendBtn = await getSelector(page, 'sendButton');
      const isStopButton = await sendBtn.evaluate((el) => {
        const cls = el.className.toLowerCase();
        const hasStopClass = cls.includes('stop-button') || cls.includes('stop');
        const hasStopIcon = el.querySelector('.icon-stop, [class*="stop"], [id*="stop"]') !== null || 
                            el.innerHTML.toLowerCase().includes('stop') ||
                            el.innerHTML.includes('fill-stop-011');
        return hasStopClass || hasStopIcon;
      });

      if (isStopButton) {
        console.log('[ResultParser] Generation started (stop button detected).');
        started = true;
        break;
      }
    } catch {
      // セレクタが一時的に見つからない場合は無視して待つ
    }
    await sleep(200);
  }

  if (!started) {
    console.log('[ResultParser] Generation start state not detected within timeout. Proceeding to monitor completion...');
  }

  let complete = false;

  // 定期ポーリングによる応答完了確認
  while (Date.now() - startTime < timeoutMs) {
    // 各ループの最初にチャレンジやエラーが割り込んでいないか検出
    await detectChallenge(page);

    try {
      const sendBtn = await getSelector(page, 'sendButton');
      
      // ボタンが「停止ボタン」（stop-button）または「停止アイコン」を含んでいるかチェック
      const isStopButton = await sendBtn.evaluate((el) => {
        const cls = el.className.toLowerCase();
        const hasStopClass = cls.includes('stop-button') || cls.includes('stop');
        const hasStopIcon = el.querySelector('.icon-stop, [class*="stop"], [id*="stop"]') !== null || 
                            el.innerHTML.toLowerCase().includes('stop') ||
                            el.innerHTML.includes('fill-stop-011');
        return hasStopClass || hasStopIcon;
      });

      // 停止ボタンでなくなった（＝生成が完了して送信ボタンに戻った）場合、完了とみなす
      if (!isStopButton) {
        // わずかに待ってDOMを安定させる
        await sleep(2000);
        complete = true;
        break;
      }
    } catch {
      // 一時的にセレクタが見つからない場合はスキップして待つ
    }

    await sleep(1000);
  }

  if (!complete) {
    throw new QwenGatewayError(
      'qwen_generation_timeout',
      'Qwen AI generation timed out or the send button remained disabled.',
      504
    );
  }

  // ループを抜けた直後に割り込みエラーを検知
  await detectChallenge(page);

  // 2. レスポンスコンテナから最後のテキストを抽出 (出現を最大20秒待機)
  const container = await waitForAllSelectors(page, 'responseContainer', 20000);
  await detectChallenge(page);
  const count = await container.count();
  if (count === 0) {
    throw new QwenGatewayError(
      'qwen_selector_not_found',
      'Could not find any response container on the page.',
      500
    );
  }

  // 最後の応答ブロックを取得
  const lastElement = container.last();
  const text = await lastElement.innerText();
  
  if (!text || text.trim() === '') {
    throw new QwenGatewayError(
      'qwen_selector_not_found',
      'Parsed response text is empty.',
      500
    );
  }

  return text.trim();
}
