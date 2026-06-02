import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { ArtifactStore } from '../src/artifacts/artifactStore';
import { getConfig } from '../src/config';

const TEST_DIR = path.resolve(__dirname, 'temp_artifacts');

describe('Artifact Store Tests', () => {
  let store: ArtifactStore;

  beforeAll(async () => {
    // テスト用の artifacts ディレクトリを用意し、環境設定を一時オーバーライド
    getConfig({ QWEN_ARTIFACTS_DIR: TEST_DIR });
    store = new ArtifactStore(TEST_DIR);
  });

  afterAll(async () => {
    // テスト後の一時ファイル削除
    if (existsSync(TEST_DIR)) {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should write image file and json metadata', async () => {
    const dummyPng = Buffer.from('dummy-image-bytes');
    const imageId = 'testimg123';
    const prompt = 'A beautiful cute cat';

    const meta = await store.saveImage(imageId, dummyPng, prompt);

    const fullFilePath = path.resolve(TEST_DIR, meta.path);
    const fullMetaPath = fullFilePath.replace(/\.png$/, '.json');

    // ファイルの実在確認
    expect(existsSync(fullFilePath)).toBe(true);
    expect(existsSync(fullMetaPath)).toBe(true);

    const fileContent = await fs.readFile(fullFilePath, 'utf-8');
    expect(fileContent).toBe('dummy-image-bytes');

    const metaContent = JSON.parse(await fs.readFile(fullMetaPath, 'utf-8'));
    expect(metaContent.id).toBe(imageId);
    expect(metaContent.type).toBe('image');
    expect(metaContent.mimeType).toBe('image/png');
    
    // QWEN_STORE_PROMPTS デフォルトは false のため prompt は保存されないことを確認
    expect(metaContent.promptStored).toBe(false);
    expect(metaContent.prompt).toBeUndefined();
  });

  it('should store prompt when QWEN_STORE_PROMPTS is true', async () => {
    getConfig({ QWEN_STORE_PROMPTS: true });
    const dummyPng = Buffer.from('dummy-image-bytes2');
    const imageId = 'testimg456';
    const prompt = 'A beautiful dog';

    const meta = await store.saveImage(imageId, dummyPng, prompt);
    const fullMetaPath = path.resolve(TEST_DIR, meta.path).replace(/\.png$/, '.json');

    const metaContent = JSON.parse(await fs.readFile(fullMetaPath, 'utf-8'));
    expect(metaContent.promptStored).toBe(true);
    expect(metaContent.prompt).toBe(prompt);

    // 元に戻す
    getConfig({ QWEN_STORE_PROMPTS: false });
  });

  it('should write video file and json metadata', async () => {
    const dummyMp4 = Buffer.from('dummy-video-bytes');
    const videoId = 'testvid123';
    const prompt = 'A flying bird';

    const meta = await store.saveVideo(videoId, dummyMp4, prompt);
    const fullFilePath = path.resolve(TEST_DIR, meta.path);

    expect(existsSync(fullFilePath)).toBe(true);
    const metaContent = JSON.parse(await fs.readFile(fullFilePath.replace(/\.mp4$/, '.json'), 'utf-8'));
    expect(metaContent.id).toBe(videoId);
    expect(metaContent.type).toBe('video');
    expect(metaContent.mimeType).toBe('video/mp4');
  });
});
