/**
 * PersonalAgent — thin re-export.
 * The actual implementation lives in orchestrator.ts.
 * This file exists so import paths in the rest of the codebase don't need to change.
 */

import { registerCoreTools } from './manifest';
import { registry } from './registry';
import { SchemaType } from '@google/generative-ai';
import type { AgentContext } from './context';
import * as db from '../services/db.service';

// Register core tools (web_search, send_notification)
registerCoreTools();

// Register request_user_approval here — orchestrator-only tool, not available to sub-agents
registry.register('request_user_approval', {
  tools: {
    functionDeclarations: [
      {
        name: 'request_user_approval',
        description:
          'Pause execution and present the user with 2–4 options to choose from. ' +
          'Use ONLY when a commitment is about to be made and you genuinely cannot determine which option the user would prefer. ' +
          'Do NOT use for check-ins, progress updates, or asking for missing information.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            summary: {
              type: SchemaType.STRING,
              description:
                'What was found and what decision needs to be made. Include key tradeoffs.',
            },
            options: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  label: { type: SchemaType.STRING, description: 'Short option name.' },
                  details: {
                    type: SchemaType.STRING,
                    description: 'Full specifics — time, location, terms, what happens next.',
                  },
                  price: { type: SchemaType.STRING, description: 'Cost if applicable.' },
                  recommended: {
                    type: SchemaType.BOOLEAN,
                    description: 'True for the option you recommend (at most one).',
                  },
                },
                required: ['label', 'details'],
              },
            },
          },
          required: ['summary', 'options'],
        },
      },
    ],
  },
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
