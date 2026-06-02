import { describe, it, expect } from 'vitest';
import { normalizeMessagesToPrompt } from '../src/server/routes';

describe('OpenAI Chat Message Normalization', () => {
  it('should format a single user message simply', () => {
    const messages = [
      { role: 'user' as const, content: 'Hello' }
    ];
    const result = normalizeMessagesToPrompt(messages);
    expect(result).toBe("Conversation:\nUser: Hello");
  });

  it('should preserve multi-turn assistant and user messages', () => {
    const messages = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there!' },
      { role: 'user' as const, content: 'How are you?' }
    ];
    const result = normalizeMessagesToPrompt(messages);
    
    expect(result).toContain('Conversation:');
    expect(result).toContain('User: Hello');
    expect(result).toContain('Assistant: Hi there!');
    expect(result).toContain('User: How are you?');
  });

  it('should separate system messages at the top', () => {
    const messages = [
      { role: 'system' as const, content: 'You are a helpful assistant.' },
      { role: 'user' as const, content: 'Hello' }
    ];
    const result = normalizeMessagesToPrompt(messages);
    
    expect(result.startsWith('System:\nYou are a helpful assistant.')).toBe(true);
    expect(result).toContain('Conversation:\nUser: Hello');
  });

  it('should handle complex mixed messages in correct order', () => {
    const messages = [
      { role: 'system' as const, content: 'System instruction 1' },
      { role: 'user' as const, content: 'User msg 1' },
      { role: 'assistant' as const, content: 'Assistant reply 1' },
      { role: 'system' as const, content: 'System instruction 2' },
      { role: 'user' as const, content: 'User msg 2' }
    ];
    const result = normalizeMessagesToPrompt(messages);
    
    // システムメッセージが上にまとめられているか確認
    expect(result).toContain('System:\nSystem instruction 1\nSystem instruction 2');
    
    // 会話履歴の順番が崩れていないか確認
    const convIndex = result.indexOf('Conversation:');
    const user1Index = result.indexOf('User: User msg 1');
    const assistant1Index = result.indexOf('Assistant: Assistant reply 1');
    const user2Index = result.indexOf('User: User msg 2');
    
    expect(convIndex).toBeLessThan(user1Index);
    expect(user1Index).toBeLessThan(assistant1Index);
    expect(assistant1Index).toBeLessThan(user2Index);
  });
});
