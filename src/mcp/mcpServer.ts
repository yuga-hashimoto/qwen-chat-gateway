import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MCP_TOOLS } from './tools';
import { redact } from '../utils/redact';

/**
 * MCP サーバーを stdio 経由で起動します。
 * 標準出力を JSON-RPC 通信で占有するため、サーバー内のログ出力は console.error を使用する必要があります。
 */
export async function runMcpServer(): Promise<void> {
  const server = new Server(
    {
      name: 'qwen-chat-gateway',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 1. 利用可能なツール一覧を返却
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: Object.values(MCP_TOOLS).map((t: any) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    };
  });

  // 2. ツール呼び出し要求の処理
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const tool = MCP_TOOLS[toolName];

    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    try {
      console.error(`[MCP Server] Executing tool: ${toolName}`);
      const args = request.params.arguments || {};
      const response = await tool.handler(args);
      return response;
    } catch (err: any) {
      console.error(`[MCP Server Error] Tool execution failed for "${toolName}":`, redact(err));
      
      // クライアント側に構造化エラーをテキストで返す
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: {
                message: err.message,
                type: 'mcp_tool_error',
                code: err.code || 'mcp_execution_failed',
              },
            }),
          },
        ],
      };
    }
  });

  // stdio トランスポートに接続して起動
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP Server] Listening on stdio transport.');
}

/**
 * Claude Code 向けの設定 JSON スニペットを出力します。
 */
export function printMcpConfig(): void {
  const configJson = {
    mcpServers: {
      'qwen-chat-gateway': {
        command: 'qwen-gateway',
        args: ['mcp', 'serve'],
        env: {
          QWEN_WEB_URL: 'https://chat.qwen.ai',
          QWEN_BROWSER_USER_DATA_DIR: './browser_data/qwen',
        },
      },
    },
  };
  console.log(JSON.stringify(configJson, null, 2));
}
