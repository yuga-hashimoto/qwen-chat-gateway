import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';

const README_PATH = path.resolve(__dirname, '../README.md');

describe('README Compliance Tests', () => {
  it('should exist', () => {
    expect(existsSync(README_PATH)).toBe(true);
  });

  it('should contain the required sections and safety declarations', async () => {
    const content = await fs.readFile(README_PATH, 'utf-8');

    // 1. "Why Qwen?" セクションの存在確認
    expect(content).toContain('## Why Qwen?');
    expect(content).toContain('Qwen is still less widely adopted than some other AI chat platforms');
    expect(content).toContain('Qwen Chat Gateway makes Qwen easier to integrate');

    // 2. "Responsible Use" セクションの存在確認
    expect(content).toContain('## Responsible Use');
    expect(content).toContain('Qwen Chat Gateway is an unofficial local browser gateway');
    expect(content).toContain('does not bypass CAPTCHA');
    expect(content).toContain('not designed for abuse, mass automation, account farming');

    // 3. スパム・回避等の悪用目的ではないことの宣言
    expect(content).toContain('avoiding stealth, bypass, or abuse-oriented automation');
    expect(content).toContain('intended to abuse Qwen or bypass protections');
  });
});
