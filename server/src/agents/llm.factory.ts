import { ChatOpenAI } from '@langchain/openai';
import { env } from '../config/env';

/**
 * Creates a standard ChatOpenAI instance configured for NVIDIA NIM, OpenRouter, or OpenAI.
 */
export function createLLMClient(temperature: number = 0.2): ChatOpenAI {
  const provider = env.LLM_PROVIDER || (env.OPENROUTER_API_KEY ? 'openrouter' : 'nvidia');

  if (provider === 'openrouter') {
    const apiKey = env.OPENROUTER_API_KEY || process.env['OPENROUTER_API_KEY'] || 'free';
    const modelName = env.LLM_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free';
    return new ChatOpenAI({
      apiKey,
      modelName,
      temperature,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://byte-agent.vercel.app',
          'X-Title': 'Byte Agent',
        },
      },
    });
  }

  if (provider === 'openai') {
    const apiKey = process.env['OPENAI_API_KEY'] || 'sk-dummy';
    return new ChatOpenAI({
      apiKey,
      modelName: env.LLM_MODEL || 'gpt-4o',
      temperature,
    });
  }

  // Default: NVIDIA NIM API (free tier endpoint for Nemotron models)
  const nvidiaKey =
    env.NVIDIA_API_KEY ||
    process.env['NVIDIA_API_KEY'] ||
    env.OPENROUTER_API_KEY ||
    process.env['OPENROUTER_API_KEY'] ||
    'nvapi-dummy';
  const modelName = env.LLM_MODEL || 'nvidia/nemotron-4-340b-instruct';

  return new ChatOpenAI({
    apiKey: nvidiaKey,
    modelName,
    temperature,
    configuration: {
      baseURL: 'https://integrate.api.nvidia.com/v1',
    },
  });
}
