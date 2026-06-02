// Run with: npx tsx scratch/inspect-tail-90s.ts
import * as fs from 'fs';

try {
  const html = fs.readFileSync('scratch/qwen-headless-image-90s.html', 'utf-8');
  // 最後の 10000 文字を抽出
  const tail = html.slice(-10000);
  console.log('=== TAIL OF HTML 90s ===');
  console.log(tail);
} catch (err) {
  console.error(err);
}
