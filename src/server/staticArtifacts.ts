import { ServerResponse } from 'http';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { getConfig } from '../config';
import { getMimeType } from '../utils/mime';
import { QwenGatewayError } from '../models/errors';
import { sendError } from './errors';

/**
 * artifacts ディレクトリ配下のファイルを安全にクライアントに返却します。
 * パストレーバーサル対策として、解決された絶対パスが artifacts のルートディレクトリ配下にあるかを検証します。
 */
export async function serveArtifact(
  urlPath: string,
  res: ServerResponse
): Promise<void> {
  const config = getConfig();
  const artifactsBase = path.resolve(config.QWEN_ARTIFACTS_DIR);

  // "/artifacts/" プレフィックスを取り除く
  const subPath = decodeURIComponent(urlPath.replace(/^\/artifacts\/?/, ''));
  const resolvedPath = path.resolve(artifactsBase, subPath);

  // パストレーバーサル攻撃のチェック
  if (!resolvedPath.startsWith(artifactsBase)) {
    return sendError(
      res,
      new QwenGatewayError('invalid_request', 'Access Denied: Path Traversal Detected', 403)
    );
  }

  if (!existsSync(resolvedPath)) {
    return sendError(
      res,
      new QwenGatewayError('qwen_download_not_found', `Artifact file not found: ${subPath}`, 404)
    );
  }

  try {
    const stat = await fs.stat(resolvedPath);
    if (!stat.isFile()) {
      return sendError(
        res,
        new QwenGatewayError('invalid_request', `Path is not a file: ${subPath}`, 400)
      );
    }

    const contentType = getMimeType(resolvedPath);
    const content = await fs.readFile(resolvedPath);

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': content.length,
      'Access-Control-Allow-Origin': '*',
    });
    res.end(content);
  } catch (err: any) {
    sendError(res, err);
  }
}
