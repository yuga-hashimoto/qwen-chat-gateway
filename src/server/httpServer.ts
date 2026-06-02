import * as http from 'http';
import { getConfig } from '../config';
import { handleRoutes } from './routes';
import { redact } from '../utils/redact';

export class HttpServer {
  private server: http.Server | null = null;
  private host: string;
  private port: number;

  constructor() {
    const config = getConfig();
    this.host = config.QWEN_HOST;
    this.port = config.QWEN_PORT;
  }

  /**
   * API サーバーを起動します。
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        return resolve();
      }

      this.server = http.createServer((req, res) => {
        // 全体のエラーハンドリング
        try {
          handleRoutes(req, res).catch((err) => {
            console.error('[HttpServer Error]:', redact(err));
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: { message: 'Internal server error', type: 'server_error', code: 'internal_error' } }));
            }
          });
        } catch (err) {
          console.error('[HttpServer Critical Error]:', redact(err));
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { message: 'Internal server error', type: 'server_error', code: 'internal_error' } }));
          }
        }
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(this.port, this.host, () => {
        console.log(`[API Server] Running at http://${this.host}:${this.port}`);
        console.log(`[API Server] Health endpoint: http://${this.host}:${this.port}/health`);
        console.log(`[API Server] OpenAI base URL: http://${this.host}:${this.port}/v1`);
        resolve();
      });
    });
  }

  /**
   * API サーバーを停止します。
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        return resolve();
      }
      this.server.close((err?: Error) => {
        if (err) {
          console.error('[HttpServer Close Error]:', redact(err.message));
        }
        this.server = null;
        console.log('[API Server] Stopped.');
        resolve();
      });
    });
  }
}
export const defaultHttpServer = new HttpServer();
