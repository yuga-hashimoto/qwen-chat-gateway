import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

export async function ensureDir(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

export async function safeWriteFile(
  filePath: string,
  content: string | Buffer
): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  await fs.writeFile(filePath, content);
}

export async function safeReadFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8');
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
