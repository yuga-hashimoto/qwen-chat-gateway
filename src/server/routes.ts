import { IncomingMessage, ServerResponse } from 'http';
import { z } from 'zod';
import { getConfig } from '../config';
import { sendError, sendNotFound, sendUnauthorized } from './errors';
import { sendJson, normalizeChatResponse, normalizeImageResponse, normalizeVideoResponse } from './responses';
import { serveArtifact } from './staticArtifacts';
import { SingleQueue } from '../queue/singleQueue';
import { QwenGatewayError } from '../models/errors';
import { generateChatId } from '../utils/ids';

// 遅延インポートによる循環参照回避のため、必要時にインポートされるか
// または外部から初期化されたインスタンスをバインドする構造にします。
let gatewayInstance: any = null;
let queueInstance: SingleQueue = new SingleQueue(60000);

export function initializeRoutes(gateway: any, queue: SingleQueue) {
  gatewayInstance = gateway;
  queueInstance = queue;
}

// Zod スキーマによるリクエスト検証
const chatRequestSchema = z.object({
  model: z.string().default('qwen-web'),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    })
  ),
  stream: z.boolean().optional().default(false),
  extra_body: z
    .object({
      mode: z.enum(['auto', 'thinking', 'fast']).optional(),
      web_search: z.boolean().optional(),
    })
    .optional(),
});

const imageRequestSchema = z.object({
  model: z.string().default('qwen-web-image'),
  prompt: z.string(),
  n: z.number().int().positive().optional().default(1),
  size: z.string().optional().default('1024x1024'),
  response_format: z.enum(['path', 'url', 'b64_json']).optional().default('path'),
});

const videoRequestSchema = z.object({
  model: z.string().default('qwen-web-video'),
  prompt: z.string(),
  duration: z.number().optional().default(5),
  size: z.string().optional().default('1280x720'),
  wait: z.boolean().optional().default(true),
  response_format: z.enum(['path', 'url']).optional().default('path'),
});

/**
 * 簡易的な認証ミドルウェア
 */
function authenticate(req: IncomingMessage, res: ServerResponse): boolean {
  const config = getConfig();
  if (!config.QWEN_LOCAL_API_KEY) {
    return true; // 認証なし
  }

  const authHeader = req.headers['authorization'];
  const apiKeyHeader = req.headers['x-api-key'];

  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (typeof apiKeyHeader === 'string') {
    token = apiKeyHeader;
  }

  if (token !== config.QWEN_LOCAL_API_KEY) {
    sendUnauthorized(res, 'Invalid API Key');
    return false;
  }

  return true;
}

/**
 * メインルーティングハンドラー
 */
export async function handleRoutes(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = req.url || '/';
  const method = req.method || 'GET';

  // OPTIONS プリフライトの処理
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    });
    res.end();
    return;
  }

  // 静的アーティファクトの配信 (認証不要とする)
  if (url.startsWith('/artifacts/')) {
    if (method !== 'GET') {
      return sendError(res, new QwenGatewayError('invalid_request', 'Method Not Allowed', 405));
    }
    return serveArtifact(url, res);
  }

  // 以降のAPIは認証チェックを行う
  if (!authenticate(req, res)) {
    return;
  }

  // GET /health
  if (url === '/health' && method === 'GET') {
    const config = getConfig();
    return sendJson(res, {
      status: 'ok',
      version: '0.1.0',
      name: 'Qwen Chat Gateway',
      provider: 'qwen-chat-web',
      artifactsDir: config.QWEN_ARTIFACTS_DIR,
    });
  }

  // GET /v1/models
  if (url === '/v1/models' && method === 'GET') {
    return sendJson(res, {
      object: 'list',
      data: [
        {
          id: 'qwen-web',
          object: 'model',
          created: 0,
          owned_by: 'qwen-chat-web',
        },
        {
          id: 'qwen-web-image',
          object: 'model',
          created: 0,
          owned_by: 'qwen-chat-web',
        },
        {
          id: 'qwen-web-video',
          object: 'model',
          created: 0,
          owned_by: 'qwen-chat-web',
        },
      ],
    });
  }

  // POST /v1/chat/completions (OpenAI 互換)
  if (url === '/v1/chat/completions' && method === 'POST') {
    try {
      const { readJsonBody } = require('./body');
      const body = await readJsonBody(req);
      const parsed = chatRequestSchema.parse(body);

      // 対話履歴からQwenに送る最後の入力プロンプトを構築
      // 単純化のため、messagesの最後の要素をプロンプトとし、それ以前をコンテキストと見なせるが、
      // 既存のWebチャットセッションの都合上、最後のユーザーメッセージをそのままQwenの入力欄に入力します。
      const userMessages = parsed.messages.filter((m) => m.role === 'user');
      if (userMessages.length === 0) {
        throw new QwenGatewayError('invalid_request', 'No user messages provided', 400);
      }
      const prompt = userMessages[userMessages.length - 1].content;

      // SingleQueue経由でQwenBrowserGatewayを実行
      const result = await queueInstance.enqueue(async () => {
        if (!gatewayInstance) {
          throw new QwenGatewayError('browser_launch_failed', 'Qwen Browser Gateway not initialized', 500);
        }
        await gatewayInstance.ensureReady();

        // モード変更があれば反映
        if (parsed.extra_body?.mode) {
          await gatewayInstance.setMode(parsed.extra_body.mode);
        }

        // Web検索設定があれば反映
        if (parsed.extra_body?.web_search !== undefined) {
          await gatewayInstance.setWebSearch(parsed.extra_body.web_search);
        }

        return await gatewayInstance.chat({
          prompt,
          mode: parsed.extra_body?.mode,
          webSearch: parsed.extra_body?.web_search,
        });
      });

      const response = normalizeChatResponse({
        chatId: generateChatId(),
        model: parsed.model,
        text: result.text,
      });

      return sendJson(res, response);
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  // POST /v1/images/generations (OpenAI 互換)
  if (url === '/v1/images/generations' && method === 'POST') {
    try {
      const { readJsonBody } = require('./body');
      const body = await readJsonBody(req);
      const parsed = imageRequestSchema.parse(body);

      const result = await queueInstance.enqueue(async () => {
        if (!gatewayInstance) {
          throw new QwenGatewayError('browser_launch_failed', 'Qwen Browser Gateway not initialized', 500);
        }
        await gatewayInstance.ensureReady();

        return await gatewayInstance.generateImage({
          prompt: parsed.prompt,
          size: parsed.size,
          responseFormat: parsed.response_format,
        });
      });

      const response = normalizeImageResponse({
        created: Math.floor(Date.now() / 1000),
        path: result.path,
        url: result.url,
        b64_json: result.b64_json,
        revisedPrompt: result.revisedPrompt || parsed.prompt,
      });

      return sendJson(res, response);
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  // POST /v1/videos/generations (カスタム)
  if (url === '/v1/videos/generations' && method === 'POST') {
    try {
      const { readJsonBody } = require('./body');
      const body = await readJsonBody(req);
      const parsed = videoRequestSchema.parse(body);

      const result = await queueInstance.enqueue(async () => {
        if (!gatewayInstance) {
          throw new QwenGatewayError('browser_launch_failed', 'Qwen Browser Gateway not initialized', 500);
        }
        await gatewayInstance.ensureReady();

        return await gatewayInstance.generateVideo({
          prompt: parsed.prompt,
          duration: parsed.duration,
          size: parsed.size,
          wait: parsed.wait,
        });
      });

      // ジョブ結果か完了結果か判定
      if ('status' in result && result.status === 'processing') {
        return sendJson(res, {
          id: result.id,
          object: 'video.generation',
          created: Math.floor(Date.now() / 1000),
          status: 'processing',
          data: [],
          message: 'Video generation has started. Please query later or check artifacts.',
        });
      } else {
        const response = normalizeVideoResponse({
          id: result.id,
          created: Math.floor(Date.now() / 1000),
          status: 'completed',
          path: result.path,
          url: result.url,
          metadataPath: result.metadataPath,
        });
        return sendJson(res, response);
      }
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  // マッチしないルート
  sendNotFound(res, `Endpoint not found: ${method} ${url}`);
}
