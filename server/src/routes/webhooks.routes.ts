import { Router, Request, Response } from 'express';
import { callContextStore, callEvents, callTranscripts } from '../agents/phonecall.agent';
import { env } from '../config/env';

const router = Router();

/**
 * Twilio calls this when the outbound call connects.
 * Returns TwiML that streams audio to ElevenLabs Conversational AI.
 */
router.post('/twilio/voice', (req: Request, res: Response) => {
  const phone = req.query.phone as string;
  const context = callContextStore.get(phone);
  const objective = context?.objective ?? 'Help the caller with their inquiry.';
  const businessName = context?.businessName ?? 'this business';

  // Inject objective into ElevenLabs agent via dynamic variables
  const encodedObjective = encodeURIComponent(objective);
  const encodedBusiness = encodeURIComponent(businessName);

  const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${env.ELEVENLABS_AGENT_ID}&objective=${encodedObjective}&business=${encodedBusiness}`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}" />
  </Connect>
</Response>`;

  res.type('text/xml').send(twiml);
});

/**
 * Twilio calls this when call status changes (completed, failed, busy, no-answer).
 * Emits an event to unblock the PhoneCallAgent's waitForCallCompletion().
 */
router.post('/twilio/status', (req: Request, res: Response) => {
  const callSid = req.body.CallSid as string;
  const callStatus = req.body.CallStatus as string;

  console.log(`[webhook] Call ${callSid} status: ${callStatus}`);

  if (callSid) {
    callEvents.emit(`call:${callSid}`, callStatus);
  }

  res.sendStatus(204);
});

/**
 * ElevenLabs calls this (if configured) with the conversation transcript after call ends.
 * This is optional — configure as a webhook in the ElevenLabs agent dashboard.
 */
router.post('/elevenlabs/transcript', (req: Request, res: Response) => {
  const { call_sid, transcript } = req.body as { call_sid?: string; transcript?: string };

  if (call_sid && transcript) {
    callTranscripts.set(call_sid, transcript);
    console.log(`[webhook] Transcript received for call ${call_sid}`);
  }

  res.sendStatus(204);
});

export default router;
