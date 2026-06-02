import { describe, it, expect, vi, beforeAll } from 'vitest';
import { IncomingMessage, ServerResponse } from 'http';
import { handleRoutes, initializeRoutes } from '../src/server/routes';
import { SingleQueue } from '../src/queue/singleQueue';
import { getConfig } from '../src/config';

// ServerResponse のモックを作成するヘルパー
function createMockResponse() {
  const res = {
    writeHead: vi.fn(),
    end: vi.fn(),
    headersSent: false,
  } as unknown as ServerResponse;
  return res;
}

// IncomingMessage のモックを作成するヘルパー
function createMockRequest(url: string, method: string = 'GET', headers: any = {}) {
  const req = {
    url,
    method,
    headers,
    on: vi.fn(),
  } as unknown as IncomingMessage;
  return req;
}

describe('API Routes Tests', () => {
  beforeAll(() => {
    // セレクタ等を使用するゲートウェイモックの設定
    const mockGateway = {};
    const mockQueue = new SingleQueue(0);
    initializeRoutes(mockGateway, mockQueue);
    
    // APIキー認証を空にしておく（テストの簡略化）
    getConfig({ QWEN_LOCAL_API_KEY: '' });
  });

  it('should respond to GET /health with 200 and gateway info', async () => {
    const req = createMockRequest('/health');
    const res = createMockResponse();

    await handleRoutes(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
    expect(res.end).toHaveBeenCalled();
    const responseBody = JSON.parse((res.end as any).mock.calls[0][0]);
    expect(responseBody.status).toBe('ok');
    expect(responseBody.provider).toBe('qwen-chat-web');
  });

  it('should respond to GET /v1/models with available models', async () => {
    const req = createMockRequest('/v1/models');
    const res = createMockResponse();

    await handleRoutes(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
    const responseBody = JSON.parse((res.end as any).mock.calls[0][0]);
    expect(responseBody.object).toBe('list');
    expect(responseBody.data).toHaveLength(3);
    expect(responseBody.data[0].id).toBe('qwen-web');
  });

  it('should block Path Traversal attempts on /artifacts', async () => {
    // 悪意のあるパス走査リクエスト
    const req = createMockRequest('/artifacts/../../../../etc/passwd');
    const res = createMockResponse();

    await handleRoutes(req, res);

    // 403 Forbidden になっていることを確認
    expect(res.writeHead).toHaveBeenCalledWith(403, expect.any(Object));
    const responseBody = JSON.parse((res.end as any).mock.calls[0][0]);
    expect(responseBody.error.message).toContain('Access Denied');
  });

  it('should return 404 for unknown endpoints', async () => {
    const req = createMockRequest('/v1/nonexistent');
    const res = createMockResponse();

    await handleRoutes(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(404, expect.any(Object));
    const responseBody = JSON.parse((res.end as any).mock.calls[0][0]);
    expect(responseBody.error.code).toBe('invalid_request');
  });

  it('should require API key for /artifacts when QWEN_LOCAL_API_KEY is set', async () => {
    // APIキーを設定
    getConfig({ QWEN_LOCAL_API_KEY: 'secret-key' });

    // APIキーなしのリクエスト
    const reqNoKey = createMockRequest('/artifacts/test.png');
    const resNoKey = createMockResponse();
    await handleRoutes(reqNoKey, resNoKey);
    expect(resNoKey.writeHead).toHaveBeenCalledWith(401, expect.any(Object));

    // 正しいAPIキーを持つヘッダーリクエスト
    const reqWithHeader = createMockRequest('/artifacts/test.png', 'GET', {
      'authorization': 'Bearer secret-key'
    });
    const resWithHeader = createMockResponse();
    // 実際にはファイルが存在しないことによる404エラーを期待（＝認証を通過した証拠）
    await handleRoutes(reqWithHeader, resWithHeader);
    expect(resWithHeader.writeHead).toHaveBeenCalledWith(404, expect.any(Object));

    // 正しいAPIキーを持つクエリパラメータリクエスト
    const reqWithQuery = createMockRequest('/artifacts/test.png?api_key=secret-key');
    const resWithQuery = createMockResponse();
    await handleRoutes(reqWithQuery, resWithQuery);
    expect(resWithQuery.writeHead).toHaveBeenCalledWith(404, expect.any(Object));

    // クリーンアップ
    getConfig({ QWEN_LOCAL_API_KEY: '' });
  });
});
