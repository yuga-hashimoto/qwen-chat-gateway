export interface ChatInput {
  prompt: string;
  mode?: 'auto' | 'thinking' | 'fast';
  webSearch?: boolean;
}

export interface ChatResult {
  text: string;
  error?: string;
}

export interface ImageInput {
  prompt: string;
  size?: string;
  mode?: 'auto' | 'thinking' | 'fast';
  responseFormat?: 'path' | 'url' | 'b64_json';
}

export interface ImageResult {
  path: string;
  url: string;
  b64_json?: string | null;
  revisedPrompt?: string;
}

export interface VideoInput {
  prompt: string;
  duration?: number;
  size?: string;
  wait?: boolean;
}

export interface VideoResult {
  id: string;
  status: 'completed';
  path: string;
  url: string;
  metadataPath: string;
}

export interface VideoJob {
  id: string;
  status: 'processing';
  prompt: string;
  createdAt: string;
}

export interface UploadChatInput {
  prompt: string;
  filePath: string;
  mode?: 'auto' | 'thinking' | 'fast';
}
