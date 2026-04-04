import { z } from 'zod';
import 'dotenv/config';

const EnvSchema = z.object({
  PORT: z.string().default('3001'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),

  MONGODB_URI: z.string().default('mongodb://localhost:27017/byte'),

  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().default('gemini-3-preview'),

  TWILIO_ACCOUNT_SID: z.string().min(1, 'TWILIO_ACCOUNT_SID is required'),
  TWILIO_AUTH_TOKEN: z.string().min(1, 'TWILIO_AUTH_TOKEN is required'),
  TWILIO_PHONE_NUMBER: z.string().min(1, 'TWILIO_PHONE_NUMBER is required'),

  ELEVENLABS_API_KEY: z.string().min(1, 'ELEVENLABS_API_KEY is required'),
  ELEVENLABS_AGENT_ID: z.string().min(1, 'ELEVENLABS_AGENT_ID is required'),
  ELEVENLABS_PHONE_NUMBER_ID: z.string().min(1, 'ELEVENLABS_PHONE_NUMBER_ID is required'),

  SEARCH_API_KEY: z.string().min(1, 'SEARCH_API_KEY is required'),

  SERVER_BASE_URL: z.string().default('http://localhost:3001'),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.errors.map(e => `  ${e.path.join('.')}: ${e.message}`).join('\n');
    console.error(`[env] Missing or invalid environment variables:\n${missing}`);
  }
  return (result.success
    ? result.data
    : EnvSchema.parse({ ...process.env, JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me' })) as Env;
}

export const env = loadEnv();
