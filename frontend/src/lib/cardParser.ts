import type { PlaceItem } from '../components/cards/PlaceCardGrid';
import type { CallReportData } from '../components/cards/CallReportCard';
import type { SourceItem } from '../components/cards/SourceCardGrid';

export interface ParsedCardData {
  cleanText: string;
  places: PlaceItem[];
  callReport: CallReportData | null;
  sources: SourceItem[];
}

/**
 * Parses raw agent response text or step outputs for structured card payloads:
 * - JSON Code Blocks (```json:place_card, ```json:call_report, ```json:sources, ```json:cards)
 * - Map Places (`📍 [1] Place Title ... Address: ... Rating: ...`)
 * - Markdown Tables containing URLs or ratings (`Platform | Link | Notes`)
 * - Bullet / Numbered lists containing links (`[Title](url)`)
 * - Call Reports (`📞 Call with ... SUMMARY: ... TRANSCRIPT: ...`)
 */
export function parseCardsFromText(text: string): ParsedCardData {
  let cleanText = text;
  const places: PlaceItem[] = [];
  let callReport: CallReportData | null = null;
  const sources: SourceItem[] = [];

  if (!text) {
    return { cleanText: '', places: [], callReport: null, sources: [] };
  }

  // 1. Parse JSON Code blocks if present (e.g. ```json:place_card, ```json:cards, ```json:sources)
  const jsonBlockRegex = /```json:(place_card|call_report|sources|cards)\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = jsonBlockRegex.exec(text)) !== null) {
    const type = match[1];
    const rawJson = match[2];
    try {
      const parsed = JSON.parse(rawJson);
      if (type === 'place_card') {
        if (Array.isArray(parsed)) places.push(...parsed);
        else if (typeof parsed === 'object') places.push(parsed);
      } else if (type === 'call_report') {
        callReport = parsed;
      } else if (type === 'sources') {
        if (Array.isArray(parsed)) sources.push(...parsed);
      } else if (type === 'cards') {
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item.type === 'place' || item.mapsUrl) {
              places.push(item);
            } else {
              sources.push({
                title: item.title || item.name || 'Link',
                url: item.url || item.link || '',
                snippet: item.snippet || item.subtitle || item.notes || '',
              });
            }
          }
        }
      }
      cleanText = cleanText.replace(match[0], '');
    } catch {
      /* ignore invalid JSON */
    }
  }

  // 2. Parse Map Place Results (`📍 [1] ...`)
  if (places.length === 0 && text.includes('📍 [')) {
    const placeBlocks = text.split(/(?=📍\s*\[\d+\])/g);
    for (const block of placeBlocks) {
      if (!block.startsWith('📍')) continue;

      const titleMatch = block.match(/📍\s*\[\d+\]\s*([^\n]+)/);
      const categoryMatch = block.match(/Category:\s*([^\n]+)/);
      const addressMatch = block.match(/Address:\s*([^\n]+)/);
      const ratingMatch = block.match(/Rating:\s*⭐\s*([\d\.]+)(?:\s*\(([\d,]+)\s*reviews\))?/);
      const priceMatch = block.match(/Price:\s*([^\n]+)/);
      const phoneMatch = block.match(/Phone:\s*([^\n]+)/);
      const websiteMatch = block.match(/Website:\s*([^\n]+)/);
      const mapsMatch = block.match(/(?:Google Maps Link|Map Link):\s*(https?:\/\/[^\s\n]+)/);
      const coordsMatch = block.match(/Coordinates:\s*([\-\d\.]+),\s*([\-\d\.]+)/);

      if (titleMatch?.[1]) {
        places.push({
          title: titleMatch[1].trim(),
          category: categoryMatch?.[1]?.trim(),
          address: addressMatch?.[1]?.trim(),
          rating: ratingMatch?.[1] ? parseFloat(ratingMatch[1]) : undefined,
          ratingCount: ratingMatch?.[2] ? parseInt(ratingMatch[2].replace(/,/g, ''), 10) : undefined,
          priceLevel: priceMatch?.[1]?.trim(),
          phoneNumber: phoneMatch?.[1]?.trim(),
          website: websiteMatch?.[1]?.trim(),
          mapsUrl: mapsMatch?.[1]?.trim(),
          latitude: coordsMatch?.[1] ? parseFloat(coordsMatch[1]) : undefined,
          longitude: coordsMatch?.[2] ? parseFloat(coordsMatch[2]) : undefined,
        });
      }
    }

    if (places.length > 0) {
      cleanText = cleanText.replace(/Map search results for[^\n]*\n?/i, '');
      cleanText = cleanText.replace(/📍\s*\[\d+\][\s\S]*?(?=\n\n|$)/g, '').trim();
    }
  }

  // 3. Universal Markdown Table Parser (Parses ALL Markdown tables with links or ratings)
  const lines = cleanText.split('\n');
  const remainingLines: string[] = [];

  let inTable = false;
  let tableHeaders: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cols = line
        .split('|')
        .map(c => c.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

      // Header or Separator line
      if (line.includes('---')) {
        inTable = true;
        continue;
      }
      if (!inTable) {
        tableHeaders = cols;
        inTable = true;
        continue;
      }

      // Data row in table!
      const linkMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/);
      const urlOnlyMatch = line.match(/(https?:\/\/[^\s\)\|\s]+)/);
      const ratingMatch = line.match(/⭐\s*([\d\.]+)(?:\s*\(([\d,]+)\s*reviews\))?/);

      if (linkMatch || urlOnlyMatch) {
        const url = linkMatch ? linkMatch[2] : urlOnlyMatch![1];
        const linkAnchor = linkMatch ? linkMatch[1] : '';
        const titleCandidate = cols[0]?.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/[\*#]/g, '').trim();
        const title = (titleCandidate && titleCandidate !== linkAnchor && !titleCandidate.startsWith('http'))
          ? titleCandidate
          : (linkAnchor || 'Link');

        const snippetCandidate = cols[cols.length - 1]?.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').trim();
        const snippet = snippetCandidate !== title ? snippetCandidate : cols[1] || '';

        if (url.includes('google.com/maps') || ratingMatch) {
          places.push({
            title,
            address: cols[1]?.replace(/⭐\s*[\d\.]+\s*\([\d,]+\s*reviews\)/g, '').trim(),
            rating: ratingMatch?.[1] ? parseFloat(ratingMatch[1]) : undefined,
            ratingCount: ratingMatch?.[2] ? parseInt(ratingMatch[2].replace(/,/g, ''), 10) : undefined,
            mapsUrl: url,
          });
        } else {
          sources.push({
            title,
            url,
            snippet,
          });
        }
        // Don't include this table row in cleanText
        continue;
      }
    } else {
      if (inTable) {
        inTable = false;
        tableHeaders = [];
      }
    }

    remainingLines.push(line);
  }

  cleanText = remainingLines.join('\n');

  // 4. Parse Call Reports (`📞 Call with ...`)
  if (!callReport && (cleanText.includes('📞 Call with') || cleanText.includes('📋 SUMMARY:'))) {
    const titleMatch = cleanText.match(/📞\s*Call with\s*([^\n]+)/);
    const durationMatch = cleanText.match(/Duration:\s*(\d+)s/);
    const outcomeMatch = cleanText.match(/Outcome:\s*([^\n|]+)/);
    const reasonMatch = cleanText.match(/Reason:\s*([^\n]+)/);
    const summaryMatch = cleanText.match(/📋\s*SUMMARY:\s*([\s\S]*?)(?=\n\n📝|\n📝|$)/);
    const transcriptMatch = cleanText.match(/📝\s*TRANSCRIPT:\s*([\s\S]*?)$/);

    if (titleMatch || summaryMatch) {
      callReport = {
        title: titleMatch ? `Call with ${titleMatch[1].trim()}` : undefined,
        recipient: titleMatch ? titleMatch[1].split('—')[0].trim() : undefined,
        durationSecs: durationMatch ? parseInt(durationMatch[1], 10) : undefined,
        outcome: outcomeMatch ? outcomeMatch[1].trim() : undefined,
        reason: reasonMatch ? reasonMatch[1].trim() : undefined,
        summary: summaryMatch ? summaryMatch[1].trim() : undefined,
        transcript: transcriptMatch ? transcriptMatch[1].trim() : undefined,
      };

      cleanText = cleanText
        .replace(/📞\s*Call with[\s\S]*$/g, '')
        .replace(/📋\s*SUMMARY:[\s\S]*$/g, '')
        .trim();
    }
  }

  // 5. Parse Web Search Results (`[1] Title ... URL: ... Snippet: ...`)
  if (sources.length === 0 && (cleanText.includes('Web Results:') || cleanText.includes('URL: http'))) {
    const sourceBlocks = cleanText.split(/(?=\[\d+\]\s+)/g);
    for (const block of sourceBlocks) {
      const titleMatch = block.match(/\[\d+\]\s*([^\n]+)/);
      const urlMatch = block.match(/URL:\s*(https?:\/\/[^\s\n]+)/);
      const snippetMatch = block.match(/Snippet:\s*([^\n]+)/);

      if (titleMatch?.[1] && urlMatch?.[1]) {
        sources.push({
          title: titleMatch[1].trim(),
          url: urlMatch[1].trim(),
          snippet: snippetMatch?.[1]?.trim(),
        });
      }
    }

    if (sources.length > 0) {
      cleanText = cleanText.replace(/Web Results:\s*/i, '');
      cleanText = cleanText.replace(/\[\d+\]\s*[^\n]+\n\s*URL:\s*https?:\/\/[^\s\n]+\n\s*Snippet:[^\n]+/g, '').trim();
    }
  }

  // 6. Clean up empty table header remnants or stray separators
  cleanText = cleanText
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\|[^\n]+\|\n\|[^\n-]+\|\n?/gm, '')
    .trim();

  return { cleanText, places, callReport, sources };
}
