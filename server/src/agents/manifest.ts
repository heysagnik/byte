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
  const phonecallServer = path.join(__dirname, '../mcp-servers/phonecall.mcp.ts');

  await registry.registerMCP('phonecall', {
    type: 'stdio',
    command: 'tsx',
    args: [phonecallServer],
  });

  console.log('[manifest] MCP tools registered');
}
