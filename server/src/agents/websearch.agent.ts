import axios from 'axios';
import { SchemaType } from '@google/generative-ai';
import type { ToolHandler, ToolContext } from './registry';
import { env } from '../config/env';

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
}

interface SerperResponse {
  organic: SerperResult[];
}

async function webSearch(query: string, numResults: number, ctx: ToolContext): Promise<string> {
  await ctx.reportStep({
    type: 'searching',
    content: `Searching the web: "${query}"`,
    timestamp: Date.now(),
  });

  try {
    const response = await axios.post<SerperResponse>(
      'https://google.serper.dev/search',
      { q: query, num: Math.min(numResults, 10) },
      {
        headers: {
          'X-API-KEY': env.SEARCH_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const results = response.data.organic ?? [];
    if (results.length === 0) {
      await ctx.reportStep({ type: 'result', content: 'No results found', timestamp: Date.now() });
      return 'No search results found for this query.';
    }

    const formatted = results
      .slice(0, numResults)
      .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.link}\nSnippet: ${r.snippet}`)
      .join('\n\n');

    await ctx.reportStep({
      type: 'result',
      content: `Found ${results.length} results`,
      timestamp: Date.now(),
    });

    return formatted;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Search failed';
    await ctx.reportStep({ type: 'error', content: `Search error: ${msg}`, timestamp: Date.now() });
    throw new Error(`Web search failed: ${msg}`);
  }
}

export const webSearchTool: ToolHandler = {
  tools: {
    functionDeclarations: [
      {
        name: 'web_search',
        description:
          'Search the web for current, real-time information. Use to find: phone numbers, prices, availability, addresses, hours, reviews, or any factual data needed. ' +
          'Run multiple independent searches in the same turn when gathering info on several targets at once. ' +
          'Only search for a number if the user did not already provide one.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: {
              type: SchemaType.STRING,
              description: 'Specific, targeted search query. Include location, date, or entity name for best results.',
            },
            num_results: {
              type: SchemaType.NUMBER,
              description: 'Number of results to return. Default: 5. Max: 10.',
            },
          },
          required: ['query'],
        },
      },
    ],
  },
  async handle(args, ctx) {
    return webSearch(args.query as string, (args.num_results as number) ?? 5, ctx);
  },
};
