import { describe, it, expect } from 'vitest';
import { MCP_TOOLS } from '../src/mcp/tools';

describe('MCP Tools Tests', () => {
  const expectedTools = [
    'qwen_chat',
    'qwen_chat_with_file',
    'qwen_generate_image',
    'qwen_generate_video',
    'qwen_import_latest_image',
    'qwen_import_latest_video',
    'qwen_browser_doctor',
  ];

  it('should expose all required MCP tools', () => {
    for (const name of expectedTools) {
      expect(MCP_TOOLS[name]).toBeDefined();
      expect(MCP_TOOLS[name].name).toBe(name);
      expect(typeof MCP_TOOLS[name].description).toBe('string');
      expect(MCP_TOOLS[name].inputSchema).toBeDefined();
      expect(typeof MCP_TOOLS[name].handler).toBe('function');
    }
  });

  it('should validate inputs using defined schemas', async () => {
    // qwen_chat は prompt が必須であるため、無い場合はパースエラーになることを検証
    const chatTool = MCP_TOOLS['qwen_chat'];
    await expect(chatTool.handler({})).rejects.toThrow();

    // qwen_chat_with_file は filePath と prompt が必須
    const uploadTool = MCP_TOOLS['qwen_chat_with_file'];
    await expect(uploadTool.handler({ prompt: 'hello' })).rejects.toThrow();
  });
});
