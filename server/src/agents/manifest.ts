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
import { mapTool } from './map.agent';

export function registerCoreTools(): void {
  registry.register('web_search', searchTool);
  registry.register('map_search', mapTool);
  registry.register('send_notification', notificationTool);
}

export async function registerMCPTools(): Promise<void> {
  const fs = await import('fs');

  // __dirname is .../dist/agents in production, .../src/agents in dev via tsx
  const compiledJs = path.join(__dirname, '../mcp-servers/phonecall.mcp.js');
  const isProd = fs.existsSync(compiledJs);

  const command = isProd ? 'node' : 'tsx';
  const mcpFile = isProd ? compiledJs : path.join(__dirname, '../mcp-servers/phonecall.mcp.ts');

  await registry.registerMCP('phonecall', {
    type: 'stdio',
    command,
    args: [mcpFile],
  });

  console.log('[manifest] MCP tools registered');
}
