import axios from 'axios';
import { BaseAgent } from './base.agent';
import { env } from '../config/env';

interface PhoneCallArgs {
  phone_number: string;
  business_name: string;
  objective: string;
  context?: string;
}

interface ElevenLabsOutboundResponse {
  callSid: string;
  conversationId: string;
}

export class PhoneCallAgent extends BaseAgent<PhoneCallArgs> {
  async run(args: PhoneCallArgs): Promise<string> {
    await this.reportStep({
      type: 'calling',
      content: `Calling ${args.business_name} at ${args.phone_number}...`,
      timestamp: Date.now(),
    });

    let conversationId: string;
    try {
      // ElevenLabs native Twilio integration — one API call, no WebSocket bridge needed
      const res = await axios.post<ElevenLabsOutboundResponse>(
        'https://api.elevenlabs.io/v1/convai/twilio/outbound-call',
        {
          agent_phone_number_id: env.ELEVENLABS_PHONE_NUMBER_ID,
          to_number: args.phone_number,
          conversation_initiation_client_data: {
            conversation_config_override: {
              agent: {
                prompt: {
                  prompt: this.buildSystemPrompt(args),
                },
                first_message: `Hello, I'm calling from a booking service regarding ${args.business_name}. Am I speaking with someone who can help with reservations?`,
              },
            },
            dynamic_variables: {
              business_name: args.business_name,
              objective: args.objective,
              context: args.context ?? '',
            },
          },
        },
        {
          headers: {
            'xi-api-key': env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      conversationId = res.data.conversationId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initiate call';
      await this.reportStep({ type: 'error', content: `Call failed: ${msg}`, timestamp: Date.now() });
      throw new Error(`Phone call to ${args.business_name} failed: ${msg}`);
    }

    await this.reportStep({
      type: 'calling',
      content: `Connected to ${args.business_name}. AI agent is negotiating... (conversation: ${conversationId})`,
      timestamp: Date.now(),
    });

    // Poll ElevenLabs for conversation status until it completes
    const transcript = await this.pollConversation(conversationId, args.business_name);

    await this.reportStep({
      type: 'result',
      content: `Call with ${args.business_name} completed.`,
      timestamp: Date.now(),
    });

    return `Call with ${args.business_name} completed.\n\nTranscript:\n${transcript}`;
  }

  private buildSystemPrompt(args: PhoneCallArgs): string {
    return `You are a professional AI negotiation agent calling ${args.business_name} on behalf of a customer.

Objective: ${args.objective}
${args.context ? `Context: ${args.context}` : ''}

Guidelines:
- Be polite and professional at all times
- Clearly state your purpose early in the conversation
- Ask about current rates, availability, and any special deals
- Try to negotiate the best price possible for the customer
- Confirm all key details before ending the call
- If you reach a voicemail, leave a brief, clear message and end the call`;
  }

  private async pollConversation(conversationId: string, businessName: string): Promise<string> {
    const POLL_INTERVAL_MS = 5000;
    const MAX_WAIT_MS = 5 * 60 * 1000; // 5 minutes
    const start = Date.now();

    while (Date.now() - start < MAX_WAIT_MS) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

      try {
        const res = await axios.get(
          `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
          {
            headers: { 'xi-api-key': env.ELEVENLABS_API_KEY },
            timeout: 10000,
          }
        );

        const data = res.data as {
          status: string;
          transcript?: Array<{ role: string; message: string }>;
        };

        if (data.status === 'done' || data.status === 'failed') {
          if (!data.transcript?.length) return 'No transcript available.';
          return data.transcript
            .map(t => `${t.role === 'agent' ? 'AI Agent' : 'Human'}: ${t.message}`)
            .join('\n');
        }
      } catch {
        // transient error — keep polling
      }
    }

    return `Call with ${businessName} is still in progress. Check the ElevenLabs dashboard for the transcript.`;
  }
}
