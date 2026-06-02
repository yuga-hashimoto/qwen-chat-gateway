import { IncomingMessage } from 'http';
import { QwenGatewayError } from '../models/errors';

/**
 * リクエストボディを読み込み、JSONとしてデコードします。
 */
export function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      if (!body) {
        return resolve({} as T);
      }
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err: any) {
        reject(
          new QwenGatewayError(
            'invalid_request',
            `Invalid JSON payload: ${err.message}`,
            400
          )
        );
      }
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}
