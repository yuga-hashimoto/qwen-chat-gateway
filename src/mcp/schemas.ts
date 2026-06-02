import { z } from 'zod';

// --- Zod Schemas for Validation ---

export const qwenChatSchema = z.object({
  prompt: z.string(),
  mode: z.enum(['auto', 'thinking', 'fast']).optional().default('auto'),
  webSearch: z.boolean().optional().default(false),
});

export const qwenChatWithFileSchema = z.object({
  prompt: z.string(),
  filePath: z.string(),
  mode: z.enum(['auto', 'thinking', 'fast']).optional().default('auto'),
});

export const qwenGenerateImageSchema = z.object({
  prompt: z.string(),
  size: z.string().optional().default('1024x1024'),
  mode: z.enum(['auto', 'thinking', 'fast']).optional().default('auto'),
  responseFormat: z.enum(['path', 'url', 'b64_json']).optional().default('path'),
});

export const qwenGenerateVideoSchema = z.object({
  prompt: z.string(),
  duration: z.number().optional().default(5),
  size: z.string().optional().default('1280x720'),
  wait: z.boolean().optional().default(true),
});

export const qwenImportLatestSchema = z.object({
  downloadsDir: z.string().optional(),
});

export const qwenBrowserDoctorSchema = z.object({});


// --- Plain JSON Schemas for MCP SDK ---

export const qwenChatJsonSchema = {
  type: 'object',
  properties: {
    prompt: { type: 'string', description: 'The chat prompt to send to Qwen.' },
    mode: { type: 'string', enum: ['auto', 'thinking', 'fast'], description: 'The thinking mode for Qwen.' },
    webSearch: { type: 'boolean', description: 'Whether to enable web search for Qwen.' },
  },
  required: ['prompt'],
};

export const qwenChatWithFileJsonSchema = {
  type: 'object',
  properties: {
    prompt: { type: 'string', description: 'The chat prompt to send to Qwen alongside the file.' },
    filePath: { type: 'string', description: 'The absolute local path to the file to upload.' },
    mode: { type: 'string', enum: ['auto', 'thinking', 'fast'], description: 'The thinking mode for Qwen.' },
  },
  required: ['prompt', 'filePath'],
};

export const qwenGenerateImageJsonSchema = {
  type: 'object',
  properties: {
    prompt: { type: 'string', description: 'Detailed prompt describing the image to generate.' },
    size: { type: 'string', description: 'Desired size of the generated image (e.g., 1024x1024).' },
    mode: { type: 'string', enum: ['auto', 'thinking', 'fast'], description: 'The thinking mode for Qwen.' },
    responseFormat: { type: 'string', enum: ['path', 'url', 'b64_json'], description: 'Format of the response.' },
  },
  required: ['prompt'],
};

export const qwenGenerateVideoJsonSchema = {
  type: 'object',
  properties: {
    prompt: { type: 'string', description: 'Detailed prompt describing the video to generate.' },
    duration: { type: 'number', description: 'Desired duration of the video in seconds.' },
    size: { type: 'string', description: 'Desired resolution/size of the video (e.g., 1280x720).' },
    wait: { type: 'boolean', description: 'Whether to block and wait for video generation to complete.' },
  },
  required: ['prompt'],
};

export const qwenImportLatestJsonSchema = {
  type: 'object',
  properties: {
    downloadsDir: { type: 'string', description: 'Custom downloads directory path to scan. Defaults to user Downloads.' },
  },
};

export const qwenBrowserDoctorJsonSchema = {
  type: 'object',
  properties: {},
};
