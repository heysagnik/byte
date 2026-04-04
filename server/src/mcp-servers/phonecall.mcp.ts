/**
 * Phone Call MCP Server
 *
 * Exposes a single tool: make_phone_call
 * Registered by the main server via registry.registerMCP('phonecall', { type: 'stdio', ... })
 * The tool is then available to PersonalAgent as "mcp_phonecall_make_phone_call".
 *
 * Run standalone: tsx src/mcp-servers/phonecall.mcp.ts
 * (env vars are inherited from parent process or loaded from .env)
 */

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

// ── Env ──────────────────────────────────────────────────────────────────────

const ELEVENLABS_API_KEY       = process.env['ELEVENLABS_API_KEY'] ?? '';
const ELEVENLABS_AGENT_ID      = process.env['ELEVENLABS_AGENT_ID'] ?? '';
const ELEVENLABS_PHONE_NUMBER_ID = process.env['ELEVENLABS_PHONE_NUMBER_ID'] ?? '';

// ── Phone call helpers ────────────────────────────────────────────────────────

interface PhoneCallArgs {
  phone_number: string;
  recipient_name: string;
  objective: string;
  context?: string;
  tone?: string;
}

interface ElevenLabsOutboundResponse {
  call_sid: string;
  conversation_id: string;
}

function buildFirstMessage(args: PhoneCallArgs): string {
  const tone = args.tone ?? 'professional';
  if (tone === 'friendly')     return `Hey! I'm an AI assistant calling on behalf of your contact. Do you have a moment?`;
  if (tone === 'negotiation')  return `Hello, I'm an AI assistant calling regarding ${args.recipient_name}. Am I speaking with someone who can help?`;
  return `Hello, I'm an AI assistant calling on behalf of your contact. Is this a good time to talk?`;
}

function buildSystemPrompt(args: PhoneCallArgs): string {
  const tone = args.tone ?? 'professional';
  const toneGuide =
    tone === 'friendly'
      ? `- Be warm, casual, and conversational\n- Keep it brief and natural\n- Match the energy of the person you're speaking to`
      : tone === 'negotiation'
      ? `- Be polite but assertive\n- Anchor on the user's preferred terms early\n- Ask for discounts, upgrades, or better terms proactively\n- Confirm all commitments before ending`
      : `- Be clear, courteous, and efficient\n- State your purpose within the first two sentences\n- Confirm key details before hanging up`;

  return `You are Byte, an AI assistant making a call on behalf of the user.

Recipient: ${args.recipient_name}
Objective: ${args.objective}
${args.context ? `Context: ${args.context}` : ''}

Tone: ${tone}
Guidelines:
${toneGuide}
- If you reach voicemail, leave a concise message covering the objective and hang up
- Never claim to be a human if directly asked`;
}

async function pollConversation(conversationId: string, recipientName: string): Promise<string> {
  const POLL_INTERVAL_MS = 5000;
  const MAX_WAIT_MS = 5 * 60 * 1000;
  const start = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    try {
      const res = await axios.get(
        `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
        { headers: { 'xi-api-key': ELEVENLABS_API_KEY }, timeout: 10000 }
      );
      const data = res.data as {
        status: string;
        transcript?: Array<{ role: string; message: string }>;
      };
      if (data.status === 'done' || data.status === 'failed') {
        if (!data.transcript?.length) return 'No transcript available.';
        return data.transcript
          .map(t => `${t.role === 'agent' ? 'Byte' : recipientName}: ${t.message}`)
          .join('\n');
      }
    } catch {
      // transient error — keep polling
    }
  }
  return `Call with ${recipientName} is still in progress. Check the ElevenLabs dashboard for the transcript.`;
}

async function makePhoneCall(args: PhoneCallArgs): Promise<string> {
  let conversationId: string;

  try {
    const res = await axios.post<ElevenLabsOutboundResponse>(
      'https://api.elevenlabs.io/v1/convai/twilio/outbound-call',
      {
        agent_id: ELEVENLABS_AGENT_ID,
        agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID,
        to_number: args.phone_number,
        conversation_initiation_client_data: {
          conversation_config_override: {
            agent: {
              prompt: { prompt: buildSystemPrompt(args) },
              first_message: buildFirstMessage(args),
            },
          },
          dynamic_variables: {
            recipient_name: args.recipient_name,
            objective: args.objective,
            context: args.context ?? '',
          },
        },
      },
      {
        headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );
    conversationId = res.data.conversation_id;
  } catch (err) {
    let msg = err instanceof Error ? err.message : 'Failed to initiate call';
    if (axios.isAxiosError(err) && err.response) {
      msg = `HTTP ${err.response.status} — ${JSON.stringify(err.response.data)}`;
    }
    throw new Error(`Phone call to ${args.recipient_name} failed: ${msg}`);
  }

  const transcript = await pollConversation(conversationId, args.recipient_name);
  return `Call with ${args.recipient_name} completed.\n\nTranscript:\n${transcript}`;
}

// ── MCP Server definition ─────────────────────────────────────────────────────

const server = new Server(
  { name: 'phonecall-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'make_phone_call',
      description:
        'Dispatch an AI voice agent to call any phone number — a business, personal contact, or any recipient. ' +
        'Use directly when the user provides a number. Only search first if you need to look up the number. ' +
        'Calls must be sequential. Write a precise objective so the agent knows exactly what to accomplish.',
      inputSchema: {
        type: 'object',
        properties: {
          phone_number: {
            type: 'string',
            description: 'E.164 format phone number (e.g., +12125551234 or +917876628027).',
          },
          recipient_name: {
            type: 'string',
            description: 'Name of the person or business being called.',
          },
          objective: {
            type: 'string',
            description:
              'Exact task for the voice agent. Be specific — include what to say, ask, confirm, or negotiate.',
          },
          context: {
            type: 'string',
            description: 'Background the agent needs: relationship, prior conversation, constraints.',
          },
          tone: {
            type: 'string',
            enum: ['professional', 'friendly', 'negotiation'],
            description:
              '"friendly" for personal contacts, "negotiation" for price/deal discussions, "professional" (default) for general business.',
          },
        },
        required: ['phone_number', 'recipient_name', 'objective'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'make_phone_call') {
    try {
      const result = await makePhoneCall(args as unknown as PhoneCallArgs);
      return { content: [{ type: 'text', text: result }] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Phone call failed';
      return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// ── Start ─────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('[phonecall-mcp] Fatal error:', err);
  process.exit(1);
});
