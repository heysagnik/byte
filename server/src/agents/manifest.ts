/**
 * Tool manifest — single place to register all built-in tools.
 *
 * registerCoreTools()  — sync, in-process tools (send_notification)
 * registerMCPTools()   — async, MCP subprocess tools (make_phone_call, …)
 *
 * To add a new in-process tool:  export a ToolHandler and add to registerCoreTools()
 * To add a new MCP tool:         create an MCP server under src/mcp-servers/ and add to registerMCPTools()
 */
import path from 'path';
import { registry } from './registry';
import { notificationTool } from './notification.agent';
import { searchTool } from './search.agent';

export function registerCoreTools(): void {
  registry.register('web_search', searchTool);
  registry.register('send_notification', notificationTool);
}

export async function registerMCPTools(): Promise<void> {
  const isProd = process.env['NODE_ENV'] === 'production';

  // In production: TypeScript is compiled — run the .js file with node.
  // In development: run the .ts source directly with tsx.
  const command = isProd ? 'node' : 'tsx';
  const mcpFile = isProd
    ? path.join(__dirname, '../mcp-servers/phonecall.mcp.js')
    : path.join(__dirname, '../mcp-servers/phonecall.mcp.ts');

  await registry.registerMCP('phonecall', {
    type: 'stdio',
    command,
    args: [mcpFile],
  });

  console.log('[manifest] MCP tools registered');
}
