import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { importLatest } from '../src/artifacts/importLatest';
import { ArtifactStore } from '../src/artifacts/artifactStore';
import { sleep } from '../src/utils/time';

const DUMMY_DOWNLOADS = path.resolve(__dirname, 'temp_downloads');
const TEST_ARTIFACTS = path.resolve(__dirname, 'temp_artifacts_import');

describe('Import Latest Tests', () => {
  let store: ArtifactStore;

  beforeAll(async () => {
    // フォルダのクリーン準備
    await fs.mkdir(DUMMY_DOWNLOADS, { recursive: true });
    await fs.mkdir(TEST_ARTIFACTS, { recursive: true });
    store = new ArtifactStore(TEST_ARTIFACTS);
  });

  afterAll(async () => {
    // フォルダの削除
    await fs.rm(DUMMY_DOWNLOADS, { recursive: true, force: true });
    await fs.rm(TEST_ARTIFACTS, { recursive: true, force: true });
  });

  it('should scan, import the newest image, and delete the original from downloads', async () => {
    const fileOld = path.join(DUMMY_DOWNLOADS, 'qwen_old.png');
    const fileNew = path.join(DUMMY_DOWNLOADS, 'qwen_new.png');
    const unrelatedFile = path.join(DUMMY_DOWNLOADS, 'some_doc.txt');

    // タイムスタンプを変えてファイルを書き込み
    await fs.writeFile(fileOld, 'old-image');
    await sleep(200); // タイムスタンプの差を作るため微小スリープ
    await fs.writeFile(fileNew, 'new-image');
    await fs.writeFile(unrelatedFile, 'text-data');

    // mtime の更新を確実にする
    const now = new Date();
    await fs.utimes(fileOld, now, new Date(now.getTime() - 10000)); // 10秒古くする
    await fs.utimes(fileNew, now, now);

    // インポート実行
    const meta = await importLatest({
      downloadsDir: DUMMY_DOWNLOADS,
      type: 'image',
      store,
    });

    // 1. 最新の画像（fileNew）が取り込まれたことを検証
    const importedPath = path.resolve(TEST_ARTIFACTS, meta.path);
    expect(existsSync(importedPath)).toBe(true);
    expect(await fs.readFile(importedPath, 'utf-8')).toBe('new-image');

    // 2. 元のファイルが削除されたことを検証 (重要！)
    expect(existsSync(fileNew)).toBe(false);

    // 3. 古い画像や関係ないファイルは削除されずに残っていることを検証
    expect(existsSync(fileOld)).toBe(true);
    expect(existsSync(unrelatedFile)).toBe(true);
  });
});
