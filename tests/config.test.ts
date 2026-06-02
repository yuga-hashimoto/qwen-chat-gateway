import { describe, it, expect } from 'vitest';
import { getConfig } from '../src/config';

describe('Configuration Tests', () => {
  it('should load default configuration settings', () => {
    const config = getConfig();
    expect(config.QWEN_WEB_URL).toBe('https://chat.qwen.ai');
    expect(config.QWEN_HOST).toBe('127.0.0.1');
    expect(config.QWEN_PORT).toBe(8787);
    expect(config.QWEN_BROWSER_HEADLESS).toBe(false);
    expect(config.QWEN_BROWSER_USER_DATA_DIR).toBe('./browser_data/qwen');
    expect(config.QWEN_MAX_CONCURRENCY).toBe(1);
    expect(config.QWEN_MIN_INTERVAL_MS).toBe(60000);
    expect(config.QWEN_STOP_ON_CHALLENGE).toBe(true);
    expect(config.QWEN_STORE_PROMPTS).toBe(false);
  });

  it('should not contain any daily limit properties or environment variables', () => {
    const config = getConfig() as any;
    
    // Config スキーマおよびオブジェクトに daily limit 関連のパラメータが無いことを検証
    expect(config.QWEN_BROWSER_DAILY_LIMIT).toBeUndefined();
    expect(config.QWEN_DAILY_LIMIT).toBeUndefined();
    expect(config.QWEN_USAGE_DAILY_LIMIT).toBeUndefined();

    // 環境変数 process.env にも無いことを検証
    expect(process.env.QWEN_BROWSER_DAILY_LIMIT).toBeUndefined();
    expect(process.env.QWEN_DAILY_LIMIT).toBeUndefined();
    expect(process.env.QWEN_USAGE_DAILY_LIMIT).toBeUndefined();
  });
});
