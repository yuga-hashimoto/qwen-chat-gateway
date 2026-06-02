import { randomUUID, randomBytes } from 'crypto';

export function generateId(prefix: string): string {
  const randomStr = randomBytes(12).toString('hex');
  return `${prefix}-${randomStr}`;
}

export function generateChatId(): string {
  return generateId('chatcmpl');
}

export function generateImageId(): string {
  return generateId('img');
}

export function generateVideoId(): string {
  return generateId('vid');
}

export function generateVideoJobId(): string {
  return generateId('vidgen');
}

export function generateUploadId(): string {
  return generateId('upload');
}
