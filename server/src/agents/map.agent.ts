/**
 * Google Maps & Places Search tool — powered by Serper Places API & Nominatim.
 * Allows searching for places, restaurants, addresses, ratings, and map coordinates.
 */

import axios from 'axios';
import { z } from 'zod';
import type { ToolHandler } from './registry';
import { env } from '../config/env';

interface SerperPlaceItem {
  position?: number;
  title: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  ratingCount?: number;
  priceLevel?: string;
  category?: string;
  phoneNumber?: string;
  website?: string;
  cid?: string;
}

interface SerperPlacesResponse {
  places?: SerperPlaceItem[];
}

export async function mapSearch(query: string, location?: string): Promise<string> {
  const apiKey = env.SEARCH_API_KEY || process.env['SEARCH_API_KEY'];
  const fullQuery = location ? `${query} near ${location}` : query;

  if (apiKey) {
    try {
      const response = await axios.post<SerperPlacesResponse>(
        'https://google.serper.dev/places',
        { q: fullQuery },
        {
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      const places = response.data.places ?? [];
      if (places.length > 0) {
        const lines: string[] = [`Map search results for "${fullQuery}":`];
        places.slice(0, 5).forEach((p, idx) => {
          lines.push(`\n📍 [${idx + 1}] ${p.title}`);
          if (p.category) lines.push(`    Category: ${p.category}`);
          if (p.address) lines.push(`    Address: ${p.address}`);
          if (p.rating) lines.push(`    Rating: ⭐ ${p.rating} (${p.ratingCount ?? 0} reviews)`);
          if (p.priceLevel) lines.push(`    Price: ${p.priceLevel}`);
          if (p.phoneNumber) lines.push(`    Phone: ${p.phoneNumber}`);
          if (p.website) lines.push(`    Website: ${p.website}`);
          if (p.latitude && p.longitude) {
            lines.push(`    Coordinates: ${p.latitude}, ${p.longitude}`);
            lines.push(
              `    Google Maps Link: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.title + ' ' + (p.address || ''))}`,
            );
          }
        });
        return lines.join('\n');
      }
    } catch (err) {
      console.warn('[map.agent] Serper Places failed, falling back to OSM Nominatim:', err);
    }
  }

  // Fallback to OpenStreetMap Nominatim API
  try {
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullQuery)}&format=json&limit=5`,
      {
        headers: { 'User-Agent': 'byte-agent/1.0' },
        timeout: 8000,
      },
    );

    const items = res.data as Array<{
      display_name: string;
      lat: string;
      lon: string;
      type: string;
    }>;

    if (items && items.length > 0) {
      const lines: string[] = [`Map search results for "${fullQuery}":`];
      items.forEach((item, idx) => {
        lines.push(`\n📍 [${idx + 1}] ${item.display_name}`);
        lines.push(`    Coordinates: ${item.lat}, ${item.lon}`);
        lines.push(`    Map Link: https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lon}`);
      });
      return lines.join('\n');
    }
  } catch (err) {
    console.error('[map.agent] Nominatim search error:', err);
  }

  return `No map/place results found for "${fullQuery}".`;
}

export const mapTool: ToolHandler = {
  name: 'map_search',
  description:
    'Search Google Maps & Places for locations, businesses, restaurants, services, addresses, and coordinates. ' +
    'Returns full place names, addresses, ratings, phone numbers, and map links.',
  schema: z.object({
    query: z
      .string()
      .describe(
        'What place or service to search for (e.g. "Italian restaurants", "gas station", "Central Park").',
      ),
    location: z
      .string()
      .optional()
      .describe('Optional city, region, neighborhood, or user location to center the search.'),
  }),
  tools: {
    functionDeclarations: [
      {
        name: 'map_search',
        description: 'Search Google Maps for places, businesses, addresses, ratings, and map links.',
        parameters: {
          type: 'OBJECT' as never,
          properties: {
            query: { type: 'STRING' as never, description: 'Search target' },
            location: { type: 'STRING' as never, description: 'Optional location' },
          },
          required: ['query'],
        },
      },
    ],
  },
  async handle(args, ctx) {
    const query = String(args['query'] ?? '');
    const location = args['location'] ? String(args['location']) : ctx.user?.location ?? undefined;

    await ctx.reportStep({
      type: 'searching',
      content: `Searching map for "${query}"${location ? ` near ${location}` : ''}`,
      timestamp: Date.now(),
    });

    const result = await mapSearch(query, location);
    await ctx.reportStep({
      type: 'result',
      content: `Map search complete`,
      timestamp: Date.now(),
    });
    return result;
  },
};
