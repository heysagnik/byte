import axios from 'axios';
import { BaseAgent } from './base.agent';
import { env } from '../config/env';

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
  position?: number;
}

interface SerperResponse {
  organic: SerperResult[];
}

export class WebSearchAgent extends BaseAgent<string> {
  async run(query: string, numResults = 5): Promise<string> {
    await this.reportStep({
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
        await this.reportStep({
          type: 'result',
          content: 'No results found',
          timestamp: Date.now(),
        });
        return 'No search results found for this query.';
      }

      const formatted = results
        .slice(0, numResults)
        .map(
          (r, i) =>
            `[${i + 1}] ${r.title}\nURL: ${r.link}\nSnippet: ${r.snippet}`
        )
        .join('\n\n');

      await this.reportStep({
        type: 'result',
        content: `Found ${results.length} results`,
        timestamp: Date.now(),
      });

      return formatted;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      await this.reportStep({ type: 'error', content: `Search error: ${msg}`, timestamp: Date.now() });
      throw new Error(`Web search failed: ${msg}`);
    }
  }
}
