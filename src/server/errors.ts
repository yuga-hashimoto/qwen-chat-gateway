import { IncomingMessage, ServerResponse } from 'http';
import { QwenGatewayError } from '../models/errors';
import { redact } from '../utils/redact';

/**
 * HTTP レスポンスとしてエラーをJSON形式で送信します。
 */
export function sendError(res: ServerResponse, error: any): void {
  let status = 500;
  let responseBody: any = {
    error: {
      message: 'Internal Server Error',
      type: 'internal_server_error',
      code: 'internal_error',
    },
  };

  if (error instanceof QwenGatewayError) {
    status = error.status;
    responseBody = error.toJSON();
  } else if (error instanceof Error) {
    // Zodバリデーションエラー等の個別ハンドリング
    if (error.name === 'ZodError') {
      status = 400;
      responseBody = {
        error: {
          message: error.message,
          type: 'invalid_request_error',
          code: 'invalid_request',
        },
      };
    } else {
      status = 500;
      responseBody = {
        error: {
          message: error.message,
          type: 'internal_server_error',
          code: 'internal_error',
        },
      };
    }
  }

  // ログ出力時に秘匿情報をマスク
  console.error(`[API Error] Status ${status}:`, redact(responseBody));

  if (!res.headersSent) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
  }
  res.end(JSON.stringify(responseBody));
}

/**
 * 404 Not Found を返します。
 */
export function sendNotFound(res: ServerResponse, message: string = 'Not Found'): void {
  sendError(res, new QwenGatewayError('invalid_request', message, 404));
}

/**
 * 401 Unauthorized を返します。
 */
export function sendUnauthorized(res: ServerResponse, message: string = 'Unauthorized'): void {
  sendError(res, new QwenGatewayError('qwen_not_logged_in', message, 401));
}
