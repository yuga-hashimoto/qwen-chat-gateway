import { ServerResponse } from 'http';
import { ChatCompletionResponse, ImageGenerationResponse } from '../models/openai';
import { VideoGenerationResponse, ArtifactMetadata } from '../models/media';
import { redact } from '../utils/redact';

/**
 * JSON データをレスポンスとして返します。
 */
export function sendJson(res: ServerResponse, data: any, status: number = 200): void {
  // ログ出力時に秘匿情報をマスク
  console.log(`[API Response] Status ${status}`);

  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  });
  res.end(JSON.stringify(data));
}

/**
 * Qwen チャット結果を OpenAI Chat Completion 互換のレスポンスに正規化します。
 */
export function normalizeChatResponse(params: {
  chatId: string;
  model: string;
  text: string;
}): ChatCompletionResponse {
  return {
    id: params.chatId,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: params.model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: params.text,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: null,
      completion_tokens: null,
      total_tokens: null,
    },
  };
}

/**
 * 画像生成結果を OpenAI Image Generation 互換のレスポンスに正規化します。
 */
export function normalizeImageResponse(params: {
  created: number;
  path?: string;
  url?: string;
  b64_json?: string | null;
  revisedPrompt?: string;
}): ImageGenerationResponse {
  return {
    created: params.created,
    data: [
      {
        path: params.path,
        url: params.url,
        b64_json: params.b64_json || null,
        revised_prompt: params.revisedPrompt,
      },
    ],
  };
}

/**
 * 動画生成結果をカスタムの Video Generation レスポンスに正規化します。
 */
export function normalizeVideoResponse(params: {
  id: string;
  created: number;
  status: 'completed' | 'processing' | 'failed';
  path: string;
  url: string;
  metadataPath: string;
}): VideoGenerationResponse {
  return {
    id: params.id,
    object: 'video.generation',
    created: params.created,
    status: params.status,
    data: [
      {
        path: params.path,
        url: params.url,
        metadataPath: params.metadataPath,
      },
    ],
  };
}
