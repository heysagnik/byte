import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Always load top-level root .env file from workspace root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const EnvSchema = z.object({
  PORT: z.string().default('3001'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),

  MONGODB_URI: z.string().default('mongodb://localhost:27017/byte'),

  LLM_PROVIDER: z.enum(['nvidia', 'openrouter', 'gemini', 'openai']).default('nvidia'),
  NVIDIA_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('nvidia/nemotron-3-ultra-550b-a55b'),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.6-flash'),

  TWILIO_ACCOUNT_SID: z.string().min(1, 'TWILIO_ACCOUNT_SID is required'),
  TWILIO_AUTH_TOKEN: z.string().min(1, 'TWILIO_AUTH_TOKEN is required'),
  TWILIO_PHONE_NUMBER: z.string().min(1, 'TWILIO_PHONE_NUMBER is required'),

  ELEVENLABS_API_KEY: z.string().min(1, 'ELEVENLABS_API_KEY is required'),
  ELEVENLABS_AGENT_ID: z.string().min(1, 'ELEVENLABS_AGENT_ID is required'),
  ELEVENLABS_PHONE_NUMBER_ID: z.string().min(1, 'ELEVENLABS_PHONE_NUMBER_ID is required'),

  GROQ_API_KEY: z.string().optional(),
  SEARCH_API_KEY: z.string().optional(),

  SERVER_BASE_URL: z.string().default('http://localhost:3001'),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map(e => `  ${e.path.join('.')}: ${e.message}`).join('\n');
    console.error(`[env] Missing or invalid environment variables:\n${missing}`);
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
