/**
 * Real-time Google Web Search tool — powered by Serper.dev Google Search API.
 * Returns factual organic web results, titles, snippets, and source links.
 */

import axios from 'axios';
import { z } from 'zod';
import type { ToolHandler } from './registry';
import { env } from '../config/env';

interface SerperOrganicResult {
  title: string;
  link: string;
  snippet: string;
  position?: number;
}

interface SerperSearchResponse {
  organic?: SerperOrganicResult[];
  knowledgeGraph?: {
    title?: string;
    description?: string;
    website?: string;
    attributes?: Record<string, string>;
  };
  answerBox?: {
    answer?: string;
    snippet?: string;
    title?: string;
  };
}

export async function groundedSearch(query: string): Promise<string> {
  const apiKey = env.SEARCH_API_KEY || process.env['SEARCH_API_KEY'];
  if (!apiKey) {
    return `Search API key missing. Could not perform search for: "${query}"`;
  }

  try {
    const response = await axios.post<SerperSearchResponse>(
      'https://google.serper.dev/search',
      { q: query },
      {
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      },
    );

    const data = response.data;
    const lines: string[] = [];

    if (data.answerBox?.answer || data.answerBox?.snippet) {
      lines.push(`Direct Answer: ${data.answerBox.answer || data.answerBox.snippet}`);
    }

    if (data.knowledgeGraph?.title) {
      lines.push(`Knowledge Graph: ${data.knowledgeGraph.title}`);
      if (data.knowledgeGraph.description) lines.push(data.knowledgeGraph.description);
    }

    const organic = data.organic ?? [];
    if (organic.length > 0) {
      lines.push('\nWeb Results:');
      organic.slice(0, 5).forEach((item, idx) => {
        lines.push(`[${idx + 1}] ${item.title}`);
        lines.push(`    URL: ${item.link}`);
        lines.push(`    Snippet: ${item.snippet}`);
      });
    }

    if (lines.length === 0) {
      return `No web results found for: "${query}"`;
    }

    return lines.join('\n');
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[search.agent] Serper search error:', error);
    return `Search failed for "${query}": ${error}`;
  }
}

export const searchTool: ToolHandler = {
  name: 'web_search',
  description:
    'Search the web in real-time for current information. Use for: phone numbers, prices, addresses, ' +
    'business hours, availability, reviews, news, regulations, or any factual lookup. ' +
    'Returns grounded web search results with source links.',
  schema: z.object({
    query: z
      .string()
      .describe(
        'Specific, targeted search query. Include location, date, entity name, or context for best results.',
      ),
  }),
  // Gemini backward-compatible tools spec
  tools: {
    functionDeclarations: [
      {
        name: 'web_search',
        description:
          'Search the web in real-time for current information. Returns web results with sources.',
        parameters: {
          type: 'OBJECT' as never,
          properties: {
            query: { type: 'STRING' as never, description: 'Search query' },
          },
          required: ['query'],
        },
      },
    ],
  },
  async handle(args, ctx) {
    const query = String(args['query'] ?? '');
    await ctx.reportStep({
      type: 'searching',
      content: `Searching web: "${query}"`,
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
