import { defaultQwenGateway } from '../browser/qwenGateway';
import { defaultBrowserSession } from '../browser/browserSession';
import { defaultArtifactStore } from '../artifacts/artifactStore';
import { importLatest } from '../artifacts/importLatest';
import { SingleQueue } from '../queue/singleQueue';
import { getConfig } from '../config';
import * as schemas from './schemas';
import { redact } from '../utils/redact';

// routes で使われるものと同じキュー設定を共用するためにシングルトンで生成
const config = getConfig();
const mcpQueue = new SingleQueue(config.QWEN_MIN_INTERVAL_MS);

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<{ content: Array<{ type: 'text'; text: string }> }>;
}

export const MCP_TOOLS: Record<string, McpToolDefinition> = {
  qwen_chat: {
    name: 'qwen_chat',
    description: 'Send a text prompt to Qwen Chat Web (supports thinking and web search modes).',
    inputSchema: schemas.qwenChatJsonSchema,
    handler: async (args) => {
      const parsed = schemas.qwenChatSchema.parse(args);
      const result = await mcpQueue.enqueue(async () => {
        await defaultQwenGateway.ensureReady();
        if (parsed.mode) {
          await defaultQwenGateway.setMode(parsed.mode);
        }
        if (parsed.webSearch !== undefined) {
          await defaultQwenGateway.setWebSearch(parsed.webSearch);
        }
        return await defaultQwenGateway.chat({
          prompt: parsed.prompt,
          mode: parsed.mode,
          webSearch: parsed.webSearch,
        });
      });
      return {
        content: [{ type: 'text', text: result.text }],
      };
    },
  },

  qwen_chat_with_file: {
    name: 'qwen_chat_with_file',
    description: 'Upload a local file and send a text prompt to Qwen Chat Web.',
    inputSchema: schemas.qwenChatWithFileJsonSchema,
    handler: async (args) => {
      const parsed = schemas.qwenChatWithFileSchema.parse(args);
      const result = await mcpQueue.enqueue(async () => {
        await defaultQwenGateway.ensureReady();
        if (parsed.mode) {
          await defaultQwenGateway.setMode(parsed.mode);
        }
        return await defaultQwenGateway.uploadAndChat({
          prompt: parsed.prompt,
          filePath: parsed.filePath,
          mode: parsed.mode,
        });
      });
      return {
        content: [{ type: 'text', text: result.text }],
      };
    },
  },

  qwen_generate_image: {
    name: 'qwen_generate_image',
    description: 'Generate an image using Qwen Chat Web and save as a local artifact.',
    inputSchema: schemas.qwenGenerateImageJsonSchema,
    handler: async (args) => {
      const parsed = schemas.qwenGenerateImageSchema.parse(args);
      const result = await mcpQueue.enqueue(async () => {
        await defaultQwenGateway.ensureReady();
        if (parsed.mode) {
          await defaultQwenGateway.setMode(parsed.mode);
        }
        return await defaultQwenGateway.generateImage({
          prompt: parsed.prompt,
          size: parsed.size,
          responseFormat: parsed.responseFormat,
          mode: parsed.mode,
        });
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  },

  qwen_generate_video: {
    name: 'qwen_generate_video',
    description: 'Generate a video using Qwen Chat Web and save as a local artifact.',
    inputSchema: schemas.qwenGenerateVideoJsonSchema,
    handler: async (args) => {
      const parsed = schemas.qwenGenerateVideoSchema.parse(args);
      const result = await mcpQueue.enqueue(async () => {
        await defaultQwenGateway.ensureReady();
        return await defaultQwenGateway.generateVideo({
          prompt: parsed.prompt,
          duration: parsed.duration,
          size: parsed.size,
          wait: parsed.wait,
        });
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  },

  qwen_import_latest_image: {
    name: 'qwen_import_latest_image',
    description: 'Scan the downloads directory, copy the newest image to artifacts, and delete the original.',
    inputSchema: schemas.qwenImportLatestJsonSchema,
    handler: async (args) => {
      const parsed = schemas.qwenImportLatestSchema.parse(args);
      const meta = await importLatest({
        downloadsDir: parsed.downloadsDir,
        type: 'image',
        store: defaultArtifactStore,
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(meta, null, 2),
          },
        ],
      };
    },
  },

  qwen_import_latest_video: {
    name: 'qwen_import_latest_video',
    description: 'Scan the downloads directory, copy the newest video to artifacts, and delete the original.',
    inputSchema: schemas.qwenImportLatestJsonSchema,
    handler: async (args) => {
      const parsed = schemas.qwenImportLatestSchema.parse(args);
      const meta = await importLatest({
        downloadsDir: parsed.downloadsDir,
        type: 'video',
        store: defaultArtifactStore,
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(meta, null, 2),
          },
        ],
      };
    },
  },

  qwen_browser_doctor: {
    name: 'qwen_browser_doctor',
    description: 'Check Qwen Web browser health, login, and challenge status.',
    inputSchema: schemas.qwenBrowserDoctorJsonSchema,
    handler: async () => {
      const report = await defaultBrowserSession.checkHealth();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(report, null, 2),
          },
        ],
      };
    },
  },
};
