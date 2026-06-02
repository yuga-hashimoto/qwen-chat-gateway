// Run with: npx tsx scratch/inspect-tail.ts
import * as fs from 'fs';

try {
  const html = fs.readFileSync('scratch/qwen-menu-dump.html', 'utf-8');
  // 最後の 10000 文字を抽出
  const tail = html.slice(-10000);
  console.log('=== TAIL OF HTML ===');
  console.log(tail);
} catch (err) {
  console.error(err);
}
