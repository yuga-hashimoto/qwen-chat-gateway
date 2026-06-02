import { describe, it, expect } from 'vitest';
import { SingleQueue } from '../src/queue/singleQueue';
import { sleep } from '../src/utils/time';

describe('Queue and Interval Tests', () => {
  it('should enforce sequential execution (concurrency = 1)', async () => {
    // インターバルなしで動作を検証
    const queue = new SingleQueue(0);
    const executionOrder: number[] = [];

    const task1 = async () => {
      await sleep(100);
      executionOrder.push(1);
    };

    const task2 = async () => {
      executionOrder.push(2);
    };

    // 同時にエンキュー
    const p1 = queue.enqueue(task1);
    const p2 = queue.enqueue(task2);

    await Promise.all([p1, p2]);

    // task1 は非同期で待機するが、キューにより必ず task1 -> task2 の順番で実行される
    expect(executionOrder).toEqual([1, 2]);
  });

  it('should wait for minimum interval between tasks', async () => {
    // 150ms の最小インターバルを設定
    const intervalMs = 150;
    const queue = new SingleQueue(intervalMs);
    const timestamps: number[] = [];

    const task = async () => {
      timestamps.push(Date.now());
    };

    // 同時にエンキュー
    await Promise.all([
      queue.enqueue(task),
      queue.enqueue(task),
    ]);

    const difference = timestamps[1] - timestamps[0];
    
    // 2つのタスクの実行間隔が、設定したインターバル（150ms）以上であることを検証
    expect(difference).toBeGreaterThanOrEqual(intervalMs - 10); // タイマー誤差を考慮して-10msのバッファ
  });
});
