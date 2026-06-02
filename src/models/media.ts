export interface VideoGenerationRequest {
  model: string;
  prompt: string;
  duration?: number;
  size?: string;
  wait?: boolean;
  response_format?: 'path' | 'url';
}

export interface VideoGenerationResponse {
  id: string;
  object: 'video.generation';
  created: number;
  status: 'completed' | 'processing' | 'failed';
  data: {
    path: string;
    url: string;
    metadataPath: string;
  }[];
}

export interface ArtifactMetadata {
  id: string;
  type: 'image' | 'video' | 'import';
  source: 'qwen-chat-web';
  mode: string;
  model: string;
  promptStored: boolean;
  prompt?: string;
  createdAt: string;
  mimeType: string;
  path: string;
  url: string;
}
