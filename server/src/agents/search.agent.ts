/**
 * Grounded web search tool — uses a dedicated Gemini model instance with
 * googleSearch enabled. This is the only way to use Google Search grounding
 * alongside function calling in Gemini 2.5, since the two cannot be combined
 * in the same request.
 *
 * The main agent (with functionDeclarations) calls this as a regular tool.
 * This handler spins up a one-shot Gemini call with ONLY googleSearch, then
 * returns the grounded answer as a string back to the main agent.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { SchemaType } from '@google/generative-ai';
import type { ToolHandler } from './registry';
import { geminiLimiter } from './rate-limiter';
import { env } from '../config/env';

// Singleton — reuse across calls, no need to recreate
const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// Dedicated model with ONLY googleSearch — no functionDeclarations
const searchModel = genAI.getGenerativeModel({
  model: env.GEMINI_MODEL,
  tools: [{ googleSearch: {} } as never],
});

async function groundedSearch(query: string): Promise<string> {
  const response = await geminiLimiter.schedule(() =>
    searchModel.generateContent(
      `You are a research assistant. Search for factual, current information and return a concise, structured answer.\n\nQuery: ${query}`
    )
  );

  let text = '';
  try { text = response.response.text(); } catch { /* empty */ }

  if (!text) return `No results found for: "${query}"`;

  // Append grounding sources if available
  const groundingMetadata = response.response.candidates?.[0]?.groundingMetadata;
  const chunks = (groundingMetadata as { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> } | undefined)
    ?.groundingChunks ?? [];

  if (chunks.length > 0) {
    const sources = chunks
      .filter(c => c.web?.uri)
      .slice(0, 5)
      .map((c, i) => `[${i + 1}] ${c.web!.title ?? c.web!.uri} — ${c.web!.uri}`)
      .join('\n');
    return `${text}\n\nSources:\n${sources}`;
  }

  return text;
}

export const searchTool: ToolHandler = {
  tools: {
    functionDeclarations: [{
      name: 'web_search',
      description:
        'Search the web in real-time for current information. Use for: phone numbers, prices, addresses, ' +
        'business hours, availability, reviews, news, regulations, or any factual lookup. ' +
        'Returns a grounded answer with sources. ' +
        'Run multiple independent searches in the SAME turn. ' +
        'Do NOT search for information the user already provided.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          query: {
            type: SchemaType.STRING,
            description:
              'Specific, targeted search query. Include location, date, entity name, or context for best results.',
          },
        },
        required: ['query'],
      },
    }],
  },
  async handle(args, ctx) {
    const query = args['query'] as string;
    await ctx.reportStep({
      type: 'searching',
      content: `Searching: "${query}"`,
      timestamp: Date.now(),
    });
    const result = await groundedSearch(query);
    await ctx.reportStep({
      type: 'result',
      content: `Search complete`,
      timestamp: Date.now(),
    });
    return result;
  },
};
