/**
 * PersonalAgent — thin re-export.
 * The actual implementation lives in orchestrator.ts.
 * This file exists so import paths in the rest of the codebase don't need to change.
 */

import { registerCoreTools } from './manifest';
import { registry } from './registry';
import { z } from 'zod';
import type { AgentContext } from './context';
import * as db from '../services/db.service';

// Register core tools (web_search, map_search, send_notification)
registerCoreTools();

const OptionSchema = z.object({
  label: z.string().describe('Short option name.'),
  details: z.string().describe('Full specifics — time, location, terms, what happens next.'),
  price: z.string().optional().describe('Cost if applicable.'),
  recommended: z.boolean().optional().describe('True for the option you recommend (at most one).'),
});

// Register request_user_approval here — orchestrator-only tool, not available to sub-agents
registry.register('request_user_approval', {
  name: 'request_user_approval',
  description:
    'Pause execution and present the user with 2–4 options to choose from. ' +
    'Use ONLY when a commitment is about to be made and you genuinely cannot determine which option the user would prefer. ' +
    'Do NOT use for check-ins, progress updates, or asking for missing information.',
  schema: z.object({
    summary: z
      .string()
      .describe('What was found and what decision needs to be made. Include key tradeoffs.'),
    options: z.array(OptionSchema).describe('Array of 2 to 4 distinct options.'),
  }),
  handle: async (args: Record<string, unknown>, ctx: AgentContext) => {
    const { waitForApproval } = await import('../services/approval.service.js');

    const summary = String(args['summary'] ?? '');
    const rawOptions = Array.isArray(args['options']) ? args['options'] : [];
    const options = rawOptions.map((o: Record<string, unknown>) => ({
      label: String(o['label'] ?? ''),
      details: String(o['details'] ?? ''),
      price: o['price'] ? String(o['price']) : undefined,
      recommended: Boolean(o['recommended']),
    }));

    await db.insertMessage(ctx.threadId, 'system', summary, {
      type: 'waiting_approval',
      options,
      summary,
    });

    const selectedIndex = await waitForApproval(ctx.threadId);
    const selected = options[selectedIndex];
    if (!selected) return `User selected option ${selectedIndex + 1}.`;
    return `User selected option ${selectedIndex + 1}: "${selected.label}". ${selected.details}`;
  },
});

export { OrchestratorAgent as PersonalAgent } from './orchestrator';
