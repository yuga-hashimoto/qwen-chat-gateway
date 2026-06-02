import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

// 簡単な .env ファイルローダー（依存パッケージ削減のため）
export function loadEnv(projectRoot: string = process.cwd()) {
  const envPath = path.join(projectRoot, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const index = trimmed.indexOf('=');
      if (index === -1) continue;
      const key = trimmed.substring(0, index).trim();
      const val = trimmed.substring(index + 1).trim();
      // クォート除去
      const cleanVal = val.replace(/^["']|["']$/g, '');
      if (!(key in process.env)) {
        process.env[key] = cleanVal;
      }
    }
  }
}

// .env を最初にロード
loadEnv();

const configSchema = z.object({
  QWEN_WEB_URL: z.string().url().default('https://chat.qwen.ai'),
  QWEN_HOST: z.string().default('127.0.0.1'),
  QWEN_PORT: z.preprocess(
    (val) => (val ? parseInt(String(val), 10) : undefined),
    z.number().int().positive().default(8787)
  ),
  QWEN_BROWSER_HEADLESS: z.preprocess(
    (val) => val === undefined ? true : String(val).toLowerCase() !== 'false',
    z.boolean().default(true)
  ),
  QWEN_BROWSER_USER_DATA_DIR: z.string().default('./browser_data/qwen'),
  QWEN_BROWSER_EXECUTABLE_PATH: z.string().optional().or(z.literal('')),
  QWEN_MAX_CONCURRENCY: z.preprocess(
    (val) => (val ? parseInt(String(val), 10) : undefined),
    z.number().int().positive().default(1)
  ),
  QWEN_MIN_INTERVAL_MS: z.preprocess(
    (val) => (val ? parseInt(String(val), 10) : undefined),
    z.number().int().nonnegative().default(60000)
  ),
  QWEN_STOP_ON_CHALLENGE: z.preprocess(
    (val) => String(val).toLowerCase() !== 'false',
    z.boolean().default(true)
  ),
  QWEN_ARTIFACTS_DIR: z.string().default('./artifacts'),
  QWEN_LOCAL_API_KEY: z.string().optional().or(z.literal('')),
  QWEN_STORE_PROMPTS: z.preprocess(
    (val) => String(val).toLowerCase() === 'true',
    z.boolean().default(false)
  ),

  // セレクタ設定
  QWEN_SELECTOR_CHAT_INPUT: z.string().optional().or(z.literal('')),
  QWEN_SELECTOR_SEND_BUTTON: z.string().optional().or(z.literal('')),
  QWEN_SELECTOR_IMAGE_MODE_BUTTON: z.string().optional().or(z.literal('')),
  QWEN_SELECTOR_VIDEO_MODE_BUTTON: z.string().optional().or(z.literal('')),
  QWEN_SELECTOR_WEB_SEARCH_BUTTON: z.string().optional().or(z.literal('')),
  QWEN_SELECTOR_THINKING_MODE_BUTTON: z.string().optional().or(z.literal('')),
  QWEN_SELECTOR_FAST_MODE_BUTTON: z.string().optional().or(z.literal('')),
  QWEN_SELECTOR_AUTO_MODE_BUTTON: z.string().optional().or(z.literal('')),
  QWEN_SELECTOR_UPLOAD_BUTTON: z.string().optional().or(z.literal('')),
  QWEN_SELECTOR_DOWNLOAD_BUTTON: z.string().optional().or(z.literal('')),
  QWEN_SELECTOR_RESPONSE_CONTAINER: z.string().optional().or(z.literal('')),
});

export type Config = z.infer<typeof configSchema>;

let cachedConfig: Config | null = null;

export function getConfig(override: Partial<Config> = {}): Config {
  if (Object.keys(override).length > 0) {
    cachedConfig = null;
  }
  if (cachedConfig) {
    return cachedConfig;
  }
  const parsed = configSchema.parse({
    QWEN_WEB_URL: process.env.QWEN_WEB_URL,
    QWEN_HOST: process.env.QWEN_HOST,
    QWEN_PORT: process.env.QWEN_PORT,
    QWEN_BROWSER_HEADLESS: process.env.QWEN_BROWSER_HEADLESS,
    QWEN_BROWSER_USER_DATA_DIR: process.env.QWEN_BROWSER_USER_DATA_DIR,
    QWEN_BROWSER_EXECUTABLE_PATH: process.env.QWEN_BROWSER_EXECUTABLE_PATH,
    QWEN_MAX_CONCURRENCY: process.env.QWEN_MAX_CONCURRENCY,
    QWEN_MIN_INTERVAL_MS: process.env.QWEN_MIN_INTERVAL_MS,
    QWEN_STOP_ON_CHALLENGE: process.env.QWEN_STOP_ON_CHALLENGE,
    QWEN_ARTIFACTS_DIR: process.env.QWEN_ARTIFACTS_DIR,
    QWEN_LOCAL_API_KEY: process.env.QWEN_LOCAL_API_KEY,
    QWEN_STORE_PROMPTS: process.env.QWEN_STORE_PROMPTS,
    
    QWEN_SELECTOR_CHAT_INPUT: process.env.QWEN_SELECTOR_CHAT_INPUT,
    QWEN_SELECTOR_SEND_BUTTON: process.env.QWEN_SELECTOR_SEND_BUTTON,
    QWEN_SELECTOR_IMAGE_MODE_BUTTON: process.env.QWEN_SELECTOR_IMAGE_MODE_BUTTON,
    QWEN_SELECTOR_VIDEO_MODE_BUTTON: process.env.QWEN_SELECTOR_VIDEO_MODE_BUTTON,
    QWEN_SELECTOR_WEB_SEARCH_BUTTON: process.env.QWEN_SELECTOR_WEB_SEARCH_BUTTON,
    QWEN_SELECTOR_THINKING_MODE_BUTTON: process.env.QWEN_SELECTOR_THINKING_MODE_BUTTON,
    QWEN_SELECTOR_FAST_MODE_BUTTON: process.env.QWEN_SELECTOR_FAST_MODE_BUTTON,
    QWEN_SELECTOR_AUTO_MODE_BUTTON: process.env.QWEN_SELECTOR_AUTO_MODE_BUTTON,
    QWEN_SELECTOR_UPLOAD_BUTTON: process.env.QWEN_SELECTOR_UPLOAD_BUTTON,
    QWEN_SELECTOR_DOWNLOAD_BUTTON: process.env.QWEN_SELECTOR_DOWNLOAD_BUTTON,
    QWEN_SELECTOR_RESPONSE_CONTAINER: process.env.QWEN_SELECTOR_RESPONSE_CONTAINER,
    ...override,
  });

  cachedConfig = parsed;
  return parsed;
}
