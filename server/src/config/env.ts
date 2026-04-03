import { z } from 'zod';
import 'dotenv/config';

const EnvSchema = z.object({
  PORT: z.string().default('3001'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),

  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),

  SPACETIMEDB_HOST: z.string().default('maincloud.spacetimedb.com'),
  SPACETIMEDB_MODULE: z.string().default('byte-module-ae78j'),
  SPACETIMEDB_TOKEN: z.string().optional(), // Identity token for server calls

  TWILIO_ACCOUNT_SID: z.string().min(1, 'TWILIO_ACCOUNT_SID is required'),
  TWILIO_AUTH_TOKEN: z.string().min(1, 'TWILIO_AUTH_TOKEN is required'),
  TWILIO_PHONE_NUMBER: z.string().min(1, 'TWILIO_PHONE_NUMBER is required'),

  ELEVENLABS_API_KEY: z.string().min(1, 'ELEVENLABS_API_KEY is required'),
  ELEVENLABS_AGENT_ID: z.string().min(1, 'ELEVENLABS_AGENT_ID is required'),

  SEARCH_API_KEY: z.string().min(1, 'SEARCH_API_KEY is required'),

  SERVER_BASE_URL: z.string().default('http://localhost:3001'),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.errors.map(e => `  ${e.path.join('.')}: ${e.message}`).join('\n');
    console.error(`[env] Missing or invalid environment variables:\n${missing}`);
    // Don't exit — allow partial startup for development
  }
  return (result.success ? result.data : EnvSchema.parse({ ...process.env, JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me' })) as Env;
}

export const env = loadEnv();
