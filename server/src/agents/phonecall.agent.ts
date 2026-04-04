import axios from 'axios';
import { SchemaType } from '@google/generative-ai';
import type { ToolHandler } from './registry';
import { env } from '../config/env';

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
  if (tone === 'friendly')    return `Hey! I'm an AI assistant calling on behalf of your contact. Do you have a moment?`;
  if (tone === 'negotiation') return `Hello, I'm an AI assistant calling regarding ${args.recipient_name}. Am I speaking with someone who can help?`;
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
        { headers: { 'xi-api-key': env.ELEVENLABS_API_KEY }, timeout: 10000 }
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
      // transient — keep polling
    }
  }
  return `Call with ${recipientName} is still in progress. Check the ElevenLabs dashboard for the transcript.`;
}

async function makePhoneCall(args: PhoneCallArgs, reportStep: (s: { type: string; content: string; timestamp: number }) => Promise<void>): Promise<string> {
  await reportStep({ type: 'calling', content: `Calling ${args.recipient_name} at ${args.phone_number}...`, timestamp: Date.now() });

  let conversationId: string;
  try {
    const res = await axios.post<ElevenLabsOutboundResponse>(
      'https://api.elevenlabs.io/v1/convai/twilio/outbound-call',
      {
        agent_id: env.ELEVENLABS_AGENT_ID,
        agent_phone_number_id: env.ELEVENLABS_PHONE_NUMBER_ID,
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
        headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );
    conversationId = res.data.conversation_id;
    console.log('[phonecall] ElevenLabs response:', res.data);
  } catch (err) {
    let msg = err instanceof Error ? err.message : 'Failed to initiate call';
    if (axios.isAxiosError(err) && err.response) {
      msg = `HTTP ${err.response.status} — ${JSON.stringify(err.response.data)}`;
      console.error('[phonecall] ElevenLabs error:', err.response.data);
    }
    await reportStep({ type: 'error', content: `Call failed: ${msg}`, timestamp: Date.now() });
    throw new Error(`Phone call to ${args.recipient_name} failed: ${msg}`);
  }

  await reportStep({ type: 'calling', content: `Connected to ${args.recipient_name}, AI agent is handling the call...`, timestamp: Date.now() });

  const transcript = await pollConversation(conversationId, args.recipient_name);

  await reportStep({ type: 'result', content: `Call with ${args.recipient_name} completed.`, timestamp: Date.now() });

  return `Call with ${args.recipient_name} completed.\n\nTranscript:\n${transcript}`;
}

export const phoneCallTool: ToolHandler = {
  tools: {
    functionDeclarations: [
      {
        name: 'make_phone_call',
        description:
          'Dispatch an AI voice agent to call any phone number — a business, personal contact, or any recipient. ' +
          'Use directly when the user provides a number. Only search first if you need to look up the number. ' +
          'Calls must be sequential. Write a precise objective so the agent knows exactly what to accomplish.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            phone_number: {
              type: SchemaType.STRING,
              description: 'E.164 format phone number (e.g., +12125551234 or +917876628027).',
            },
            recipient_name: {
              type: SchemaType.STRING,
              description: 'Name of the person or business being called.',
            },
            objective: {
              type: SchemaType.STRING,
              description: 'Exact task for the voice agent. Be specific — include what to say, ask, confirm, or negotiate.',
            },
            context: {
              type: SchemaType.STRING,
              description: 'Background the agent needs: relationship, prior conversation, constraints.',
            },
            tone: {
              type: SchemaType.STRING,
              format: 'enum',
              enum: ['professional', 'friendly', 'negotiation'],
              description: '"friendly" for personal contacts, "negotiation" for deals, "professional" (default) for general business.',
            },
          },
          required: ['phone_number', 'recipient_name', 'objective'],
        },
      },
    ],
  },
  async handle(args: Record<string, unknown>, ctx) {
    return makePhoneCall(args as unknown as PhoneCallArgs, ctx.reportStep as Parameters<typeof makePhoneCall>[1]);
  },
};
