// Run with: npx tsx examples/openai-sdk-image.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://127.0.0.1:8787/v1',
  apiKey: 'dummy-local-key',
});

async function main() {
  console.log('Requesting image generation from local Qwen Chat Gateway...');
  try {
    const response = await openai.images.generate({
      model: 'qwen-web-image',
      prompt: 'A futuristic tech developer room with neon lights and AI charts on screens, 3D render.',
      n: 1,
      size: '1024x1024',
      // response_format: 'path' | 'url' | 'b64_json' (Qwen Chat Gateway custom support)
      response_format: 'path',
    } as any);

    console.log('\n--- Generation Success ---');
    const imageInfo = response.data[0] as any;
    console.log(`Saved Local Path: ${imageInfo.path}`);
    console.log(`Local static URL: ${imageInfo.url}`);
    console.log('--------------------------\n');
  } catch (err: any) {
    console.error('Error during image generation:', err.message);
  }
}

main();
