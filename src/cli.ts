#!/usr/bin/env node

import { cac } from 'cac';
import { getConfig, Config } from './config';
import { defaultHttpServer } from './server/httpServer';
import { initializeRoutes } from './server/routes';
import { defaultQwenGateway } from './browser/qwenGateway';
import { defaultBrowserSession } from './browser/browserSession';
import { SingleQueue } from './queue/singleQueue';
import { openBrowser } from './utils/openBrowser';
import { importLatest, getDefaultDownloadsDir } from './artifacts/importLatest';
import { defaultArtifactStore } from './artifacts/artifactStore';
import { runMcpServer, printMcpConfig } from './mcp/mcpServer';
import { redact } from './utils/redact';

const cli = cac('qwen-gateway');

// ヘルプ情報の設定
cli.help();
cli.version('0.1.0');

/**
 * 共通の設定オーバーライド処理
 */
function applyConfigOverrides(options: any) {
  const overrides: Partial<Config> = {};
  if (options.host) overrides.QWEN_HOST = String(options.host);
  if (options.port) overrides.QWEN_PORT = Number(options.port);
  if (options.headless !== undefined) overrides.QWEN_BROWSER_HEADLESS = options.headless === true || options.headless === 'true';
  if (options.minInterval !== undefined) overrides.QWEN_MIN_INTERVAL_MS = Number(options.minInterval);
  if (options.browserExecutable) overrides.QWEN_BROWSER_EXECUTABLE_PATH = String(options.browserExecutable);
  if (options.userDataDir) overrides.QWEN_BROWSER_USER_DATA_DIR = String(options.userDataDir);
  
  // 設定の更新
  getConfig(overrides);
}

// 1. serve コマンド
cli
  .command('serve', 'Start the local HTTP API gateway server')
  .option('--host <host>', 'Host to bind the server to')
  .option('--port <port>', 'Port to bind the server to')
  .option('--headless <boolean>', 'Run browser in headless mode')
  .option('--min-interval <ms>', 'Minimum interval in ms between browser tasks')
  .option('--browser-executable <path>', 'Path to Chrome/Edge executable')
  .option('--user-data-dir <path>', 'Path to browser persistent user profile')
  .action(async (options) => {
    applyConfigOverrides(options);
    const config = getConfig();
    
    const queue = new SingleQueue(config.QWEN_MIN_INTERVAL_MS);
    initializeRoutes(defaultQwenGateway, queue);

    console.log('[CLI] Starting local API server...');
    try {
      await defaultHttpServer.start();
    } catch (err: any) {
      console.error('[CLI Error] Failed to start server:', redact(err.message));
      process.exit(1);
    }
  });

// 2. browser コマンド (open / doctor)
cli
  .command('browser <action>', 'Browser operations: open | doctor')
  .action(async (action) => {
    const config = getConfig();
    if (action === 'open') {
      console.log(`[CLI] Launching Qwen Browser Session for manual login...`);
      console.log(`[CLI] User Data Directory: ${config.QWEN_BROWSER_USER_DATA_DIR}`);
      try {
        const page = await defaultBrowserSession.ensurePage();
        await page.goto(config.QWEN_WEB_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        console.log('\n======================================================');
        console.log('[CLI] Visible browser window has been opened.');
        console.log('[CLI] Please MANUALLY LOG IN to Qwen in this window.');
        console.log('[CLI] Once logged in, close the browser window to complete.');
        console.log('======================================================\n');

        // ユーザーがブラウザウィンドウ（ページまたはコンテキスト）を閉じるまでプロセスを待機させる
        await new Promise<void>((resolve) => {
          page.on('close', () => resolve());
          defaultBrowserSession.getContext()?.on('close', () => resolve());
        });
        
        console.log('[CLI] Browser session window closed. Login state saved successfully.');
      } catch (err: any) {
        console.error('[CLI Error] Failed to launch login session:', redact(err.message));
        process.exit(1);
      } finally {
        await defaultBrowserSession.close();
      }
    } else if (action === 'doctor') {
      console.log('[CLI] Diagnosing browser session...');
      try {
        const report = await defaultBrowserSession.checkHealth();
        console.log('\n--- Qwen Chat Gateway Doctor Report ---');
        console.log(`Browser Executable Path: ${report.browserPath || 'Not Found'}`);
        console.log(`Qwen Web Reachable:     ${report.reachable ? 'YES' : 'NO'}`);
        console.log(`User Logged In:         ${report.loggedIn ? 'YES' : 'NO'}`);
        console.log(`Challenge Detected:     ${report.challenge ? 'YES' : 'NO'}`);
        console.log('--------------------------------------\n');
      } catch (err: any) {
        console.error('[CLI Error] Doctor diagnostics failed:', redact(err.message));
        process.exit(1);
      } finally {
        await defaultBrowserSession.close();
      }
    } else {
      console.error(`[CLI Error] Unknown browser action: ${action}. Use "open" or "doctor".`);
      process.exit(1);
    }
  });

// 4. chat コマンド
cli
  .command('chat <prompt>', 'Send a chat prompt directly to Qwen Chat Web')
  .option('--mode <mode>', 'Thinking mode: auto | thinking | fast')
  .option('--web-search', 'Enable web search mode')
  .option('--file <path>', 'Local file path to upload with chat prompt')
  .option('--json', 'Output results in JSON format')
  .action(async (prompt, options) => {
    applyConfigOverrides(options);
    try {
      await defaultQwenGateway.ensureReady();
      
      if (options.mode) {
        await defaultQwenGateway.setMode(options.mode);
      }
      if (options.webSearch !== undefined) {
        await defaultQwenGateway.setWebSearch(options.webSearch === true || options.webSearch === 'true');
      }

      let result;
      if (options.file) {
        result = await defaultQwenGateway.uploadAndChat({
          prompt,
          filePath: options.file,
          mode: options.mode,
        });
      } else {
        result = await defaultQwenGateway.chat({
          prompt,
          mode: options.mode,
          webSearch: options.webSearch,
        });
      }

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(result.text);
      }
    } catch (err: any) {
      console.error('[CLI Error] Chat operation failed:', redact(err.message));
      process.exit(1);
    } finally {
      await defaultBrowserSession.close();
    }
  });

// 5. image コマンド
cli
  .command('image <prompt>', 'Generate an image using Qwen Chat Web')
  .option('--size <size>', 'Image size option (e.g. 1024x1024)')
  .option('--response-format <format>', 'Response format: path | url | b64_json', { default: 'path' })
  .option('--mode <mode>', 'Thinking mode: auto | thinking | fast')
  .option('--json', 'Output results in JSON format')
  .action(async (prompt, options) => {
    applyConfigOverrides(options);
    try {
      await defaultQwenGateway.ensureReady();
      const result = await defaultQwenGateway.generateImage({
        prompt,
        size: options.size,
        responseFormat: options.responseFormat,
        mode: options.mode,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (options.responseFormat === 'b64_json') {
          console.log(result.b64_json);
        } else if (options.responseFormat === 'url') {
          console.log(result.url);
        } else {
          console.log(result.path);
        }
      }
    } catch (err: any) {
      console.error('[CLI Error] Image generation failed:', redact(err.message));
      process.exit(1);
    } finally {
      await defaultBrowserSession.close();
    }
  });

// 6. video コマンド
cli
  .command('video <prompt>', 'Generate a video using Qwen Chat Web')
  .option('--duration <seconds>', 'Video duration in seconds', { default: 5 })
  .option('--size <size>', 'Video size (e.g. 1280x720)', { default: '1280x720' })
  .option('--wait', 'Wait for video generation completion')
  .option('--response-format <format>', 'Response format: path | url', { default: 'path' })
  .option('--json', 'Output results in JSON format')
  .action(async (prompt, options) => {
    applyConfigOverrides(options);
    try {
      await defaultQwenGateway.ensureReady();
      const result = await defaultQwenGateway.generateVideo({
        prompt,
        duration: Number(options.duration),
        size: options.size,
        wait: options.wait === true || options.wait === 'true',
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if ('status' in result && result.status === 'processing') {
          console.log(`Video job created. Status: processing, ID: ${result.id}`);
        } else {
          // VideoResult
          console.log(options.responseFormat === 'url' ? result.url : result.path);
        }
      }
    } catch (err: any) {
      console.error('[CLI Error] Video generation failed:', redact(err.message));
      process.exit(1);
    } finally {
      await defaultBrowserSession.close();
    }
  });

// 7. import コマンド (latest)
cli
  .command('import <action>', 'Import operations: latest')
  .option('--type <type>', 'Type of file: image | video')
  .option('--downloads-dir <dir>', 'Custom path to downloads directory')
  .option('--json', 'Output results in JSON format')
  .action(async (action, options) => {
    if (action !== 'latest') {
      console.error(`[CLI Error] Unknown import action: ${action}. Use "latest".`);
      process.exit(1);
    }
    if (!options.type || (options.type !== 'image' && options.type !== 'video')) {
      console.error('[CLI Error] Option --type is required (must be "image" or "video")');
      process.exit(1);
    }
    
    applyConfigOverrides(options);
    try {
      console.log(`[CLI] Scanning downloads directory for latest ${options.type}...`);
      const meta = await importLatest({
        downloadsDir: options.downloadsDir,
        type: options.type,
        store: defaultArtifactStore,
      });

      if (options.json) {
        console.log(JSON.stringify(meta, null, 2));
      } else {
        console.log(`Successfully imported and cleaned original file.`);
        console.log(`Imported path: ${meta.path}`);
        console.log(`Local URL:     ${meta.url}`);
      }
    } catch (err: any) {
      console.error('[CLI Error] Import failed:', redact(err.message));
      process.exit(1);
    }
  });

// 8. mcp コマンド (serve / install-config)
cli
  .command('mcp <action>', 'MCP server operations: serve | install-config')
  .action(async (action) => {
    if (action === 'serve') {
      console.error('[CLI] Starting MCP server...');
      try {
        await runMcpServer();
      } catch (err: any) {
        console.error('[CLI Error] MCP server crashed:', redact(err.message));
        process.exit(1);
      }
    } else if (action === 'install-config') {
      printMcpConfig();
    } else {
      console.error(`[CLI Error] Unknown MCP action: ${action}. Use "serve" or "install-config".`);
      process.exit(1);
    }
  });

// 解析の実行
cli.parse(process.argv);
