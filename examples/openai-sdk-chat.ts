// Run with: npx tsx examples/openai-sdk-chat.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://127.0.0.1:8787/v1',
  apiKey: 'dummy-local-key', // QWEN_LOCAL_API_KEY is not set or use dummy
});

async function main() {
  console.log('Sending chat request to local Qwen Chat Gateway...');
  try {
    const completion = await openai.chat.completions.create({
      model: 'qwen-web',
      messages: [
        {
          role: 'user',
          content: 'こんにちは！Qwenの強みについて3つの箇条書きで教えてください。',
        },
      ],
      // カスタムモードの指定 (オプション)
      extra_body: {
        mode: 'thinking', // auto | thinking | fast
        web_search: true, // true | false
      } as any,
    });

    console.log('\n--- Qwen Response ---');
    console.log(completion.choices[0].message.content);
    console.log('---------------------\n');
  } catch (err: any) {
    console.error('Error during chat completion:', err.message);
  }
}

main();
