import { sleep } from '../utils/time';

export class MinIntervalManager {
  private lastEndTime: number = 0;
  private minIntervalMs: number;

  constructor(minIntervalMs: number = 60000) {
    this.minIntervalMs = minIntervalMs;
  }

  /**
   * 前回の実行終了から最小インターバル時間が経過していない場合、待機します。
   */
  async waitIfNeeded(): Promise<void> {
    if (this.lastEndTime === 0) {
      return;
    }
    const elapsed = Date.now() - this.lastEndTime;
    const remaining = this.minIntervalMs - elapsed;
    if (remaining > 0) {
      await sleep(remaining);
    }
  }

  /**
   * 実行終了時刻を記録します。
   */
  recordExecutionEnd(): void {
    this.lastEndTime = Date.now();
  }

  /**
   * インターバル設定を動的に更新します。
   */
  setMinInterval(ms: number): void {
    this.minIntervalMs = ms;
  }
}
