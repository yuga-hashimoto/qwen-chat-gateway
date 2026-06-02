import { Page } from 'playwright-core';
import { getSelector } from './selectors';
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
  let complete = false;

  // 定期ポーリングによる応答完了確認
  while (Date.now() - startTime < timeoutMs) {
    // 1. 各ループの最初にチャレンジやエラーが割り込んでいないか検出
    await detectChallenge(page);

    try {
      const sendBtn = await getSelector(page, 'sendButton');
      
      // 送信ボタンが活性化している（disabled 属性がない、または false）かチェック
      const isDisabled = await sendBtn.getAttribute('disabled');
      const hasDisabledClass = (await sendBtn.getAttribute('class'))?.includes('disabled');

      // 送信ボタンがクリック可能（disabledもクラス指定の無効化もされていない）かつ、
      // 停止ボタンのような生成中表示がなければ完了とみなす
      if (isDisabled === null && !hasDisabledClass) {
        // わずかに待ってDOMを安定させる
        await sleep(1500);
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

  // 2. レスポンスコンテナから最後のテキストを抽出
  const container = await getSelector(page, 'responseContainer');
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
