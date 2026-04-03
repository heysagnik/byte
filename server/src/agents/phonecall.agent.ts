import twilio from 'twilio';
import { EventEmitter } from 'events';
import { BaseAgent } from './base.agent';
import { env } from '../config/env';

interface PhoneCallArgs {
  phone_number: string;
  business_name: string;
  objective: string;
  context?: string;
}

interface CallResult {
  transcript: string;
  outcome: string;
  callSid: string;
}

// Global event emitter for call completion signals from the Twilio webhook
export const callEvents = new EventEmitter();
callEvents.setMaxListeners(50);

// Store call context so the webhook can inject it into ElevenLabs
export const callContextStore = new Map<string, { objective: string; context?: string; businessName: string }>();

// Store call transcripts from ElevenLabs (set by webhook handler after call ends)
export const callTranscripts = new Map<string, string>();

const CALL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max for a call

export class PhoneCallAgent extends BaseAgent<PhoneCallArgs> {
  private twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

  async run(args: PhoneCallArgs): Promise<string> {
    await this.reportStep({
      type: 'calling',
      content: `Calling ${args.business_name} at ${args.phone_number}...`,
      timestamp: Date.now(),
    });

    // Store context for the webhook handler
    callContextStore.set(args.phone_number, {
      objective: args.objective,
      context: args.context,
      businessName: args.business_name,
    });

    let callSid: string;
    try {
      const call = await this.twilioClient.calls.create({
        to: args.phone_number,
        from: env.TWILIO_PHONE_NUMBER,
        url: `${env.SERVER_BASE_URL}/api/webhooks/twilio/voice?phone=${encodeURIComponent(args.phone_number)}`,
        statusCallback: `${env.SERVER_BASE_URL}/api/webhooks/twilio/status`,
        statusCallbackMethod: 'POST',
        statusCallbackEvent: ['completed', 'failed', 'no-answer', 'busy'],
      });
      callSid = call.sid;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initiate call';
      await this.reportStep({ type: 'error', content: `Call failed: ${msg}`, timestamp: Date.now() });
      throw new Error(`Phone call to ${args.business_name} failed: ${msg}`);
    }

    await this.reportStep({
      type: 'calling',
      content: `Connected to ${args.business_name}. AI agent is negotiating...`,
      timestamp: Date.now(),
    });

    // Wait for the call to complete
    const result = await this.waitForCallCompletion(callSid, args);

    callContextStore.delete(args.phone_number);
    callTranscripts.delete(callSid);

    await this.reportStep({
      type: 'result',
      content: `Call with ${args.business_name} completed. ${result.outcome}`,
      timestamp: Date.now(),
    });

    return result.transcript;
  }

  private waitForCallCompletion(callSid: string, args: PhoneCallArgs): Promise<CallResult> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        callEvents.removeAllListeners(`call:${callSid}`);
        reject(new Error(`Call to ${args.business_name} timed out after 5 minutes`));
      }, CALL_TIMEOUT_MS);

      callEvents.once(`call:${callSid}`, (status: string) => {
        clearTimeout(timer);

        if (status === 'completed') {
          const transcript = callTranscripts.get(callSid) ?? 'No transcript available';
          resolve({
            transcript: `Call with ${args.business_name} completed.\n\nTranscript:\n${transcript}`,
            outcome: 'Call completed successfully',
            callSid,
          });
        } else {
          reject(new Error(`Call to ${args.business_name} ended with status: ${status}`));
        }
      });
    });
  }
}
