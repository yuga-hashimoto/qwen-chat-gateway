export interface ChatCompletionMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatCompletionMessage[];
  stream?: boolean;
  extra_body?: {
    mode?: 'auto' | 'thinking' | 'fast';
    web_search?: boolean;
  };
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatCompletionMessage;
    finish_reason: 'stop' | 'length' | 'content_filter' | null;
  }[];
  usage?: {
    prompt_tokens: number | null;
    completion_tokens: number | null;
    total_tokens: number | null;
  };
}

export interface ImageGenerationRequest {
  model: string;
  prompt: string;
  n?: number;
  size?: string;
  response_format?: 'path' | 'url' | 'b64_json';
}

export interface ImageGenerationResponse {
  created: number;
  data: {
    path?: string;
    url?: string;
    b64_json?: string | null;
    revised_prompt?: string;
  }[];
}
