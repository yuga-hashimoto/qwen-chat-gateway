import { MinIntervalManager } from './minInterval';

export class SingleQueue {
  private chain: Promise<any> = Promise.resolve();
  private intervalManager: MinIntervalManager;

  constructor(minIntervalMs: number = 60000) {
    this.intervalManager = new MinIntervalManager(minIntervalMs);
  }

  /**
   * タスクをキューに追加し、順番が来たら実行します。
   * 同時実行数は常に1となり、タスク間には最小インターバルが確保されます。
   */
  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    const nextPromise = this.chain.then(async () => {
      await this.intervalManager.waitIfNeeded();
      try {
        return await task();
      } finally {
        this.intervalManager.recordExecutionEnd();
      }
    });

    // 次のタスクのためにチェーンを更新。エラーが発生してもチェーンが途切れないようにする。
    this.chain = nextPromise.catch(() => {});

    return nextPromise;
  }

  /**
   * インターバル設定を動的に更新します。
   */
  setMinInterval(ms: number): void {
    this.intervalManager.setMinInterval(ms);
  }
}
