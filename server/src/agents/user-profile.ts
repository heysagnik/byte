/**
 * User profile resolver — builds a rich UserProfile from the DB + IP geolocation.
 *
 * Location is resolved from the client's IP using ip-api.com (free, no key needed,
 * 45 req/min limit). The result is cached on the User document so subsequent
 * requests skip the geolocation call entirely.
 *
 * Resolution order:
 *   1. Load user from DB (name, location, timezone, country)
 *   2. If location is missing AND a client IP is available → call ip-api.com
 *   3. Persist new location data back to DB (fire-and-forget)
 *   4. Derive localTime from timezone using Intl.DateTimeFormat
 */

import type { UserProfile } from './context';

// ─── IP Geolocation ───────────────────────────────────────────────────────────

interface IpApiResponse {
  status: 'success' | 'fail';
  city?: string;
  regionName?: string;
  country?: string;
  countryCode?: string;
  timezone?: string;
  query?: string;
}

async function resolveLocationFromIp(ip: string): Promise<{
  location: string | null;
  timezone: string | null;
  country: string | null;
} | null> {
  // Skip private/loopback IPs — geolocation won't work for them
  if (!ip || isPrivateIp(ip)) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,city,regionName,country,countryCode,timezone`,
      {
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = (await res.json()) as IpApiResponse;
    if (data.status !== 'success') return null;

    const locationParts = [data.city, data.regionName].filter(Boolean);
    const location = locationParts.length > 0 ? locationParts.join(', ') : (data.country ?? null);

    return {
      location: location ?? null,
      timezone: data.timezone ?? null,
      country: data.countryCode ?? null,
    };
  } catch {
    return null; // geolocation is best-effort — never block the agent
  }
}

function isPrivateIp(ip: string): boolean {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip === 'localhost'
  );
}

// ─── Local time derivation ────────────────────────────────────────────────────

function getLocalTime(timezone: string | null): string | null {
  if (!timezone) return null;
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date());
  } catch {
    return null;
  }
}

// ─── Name detection & formatting from message ─────────────────────────────────────

function formatName(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function extractNameFromMessage(message: string): string | null {
  const cleaned = message.trim().replace(/^["']|["']$/g, '');
  if (!cleaned) return null;

  // 1. Explicit prefixes: "my name is...", "i am...", "i'm...", "call me...", "it's...", "this is..."
  const prefixMatch = cleaned.match(
    /^(?:my name is|i(?:'m|\s+am)|call me|it'?s|this is)\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/i,
  );
  if (prefixMatch?.[1]) {
    return formatName(prefixMatch[1]);
  }

  // 2. Direct 1–3 word name reply (case insensitive), e.g. "manas", "manas kumar", "manas."
  const directMatch = cleaned.match(/^([A-Za-z]+(?:\s+[A-Za-z]+){0,2})[\.!\?]?$/i);
  if (directMatch?.[1]) {
    const raw = directMatch[1].trim();
    const stopWords = new Set([
      'hi',
      'hello',
      'hey',
      'no',
      'yes',
      'none',
      'help',
      'ok',
      'okay',
      'bye',
      'cancel',
      'what',
      'why',
      'who',
      'how',
      'stop',
      'test',
      'sure',
    ]);
    if (!stopWords.has(raw.toLowerCase())) {
      return formatName(raw);
    }
  }

  return null;
}

// ─── Main resolver ────────────────────────────────────────────────────────────

export async function resolveUserProfile(
  userId: string,
  userMessage: string,
  clientIp?: string,
  threadId?: string,
): Promise<UserProfile | null> {
  // Fallback for unauthenticated / test environments
  if (!userId) {
    const envName = process.env['CALLER_NAME'] ?? 'User';
    return { userName: envName, location: null, timezone: null, country: null, localTime: null };
  }

  try {
    const { User } = await import('../models/User.js');
    const user = await User.findById(userId);
    if (!user) return null;

    // ── Name ──────────────────────────────────────────────────────────────────
    let userName = user.name?.trim() ? user.name.trim() : null;

    if (!userName) {
      const detectedName = extractNameFromMessage(userMessage);
      if (detectedName) {
        userName = detectedName;
        // Persist to MongoDB
        await User.findByIdAndUpdate(userId, { name: userName }).catch(() => {});
      } else if (threadId) {
        // Fallback guard: if user was already prompted for name, assign fallback to break loop
        const { getMessagesByThread } = await import('../services/db.service.js');
        const messages = await getMessagesByThread(threadId);
        const lastAgentMsg = [...messages].reverse().find(m => m.role === 'agent' && m.content);
        if (lastAgentMsg && lastAgentMsg.content.includes("what's your name")) {
          userName = 'User';
          await User.findByIdAndUpdate(userId, { name: userName }).catch(() => {});
        }
      }
    }

    if (!userName) return null; // still unknown — orchestrator will prompt

    // ── Location — only resolve when user has opted in ────────────────────────
    let location = user.location ?? null;
    let timezone = user.timezone ?? null;
    let country = user.country ?? null;

    if (user.autoLocation && clientIp) {
      // Refresh location if we have an IP and no cached location
      if (!location) {
        const geo = await resolveLocationFromIp(clientIp);
        if (geo) {
          location = geo.location;
          timezone = geo.timezone;
          country = geo.country;
          // Persist async — non-blocking
          User.findByIdAndUpdate(userId, { location, timezone, country }).catch(() => {});
        }
      } else if (!isPrivateIp(clientIp)) {
        // Already have cached location — refresh in background (handles travel)
        resolveLocationFromIp(clientIp)
          .then(geo => {
            if (geo && (geo.location !== location || geo.timezone !== timezone)) {
              User.findByIdAndUpdate(userId, {
                location: geo.location,
                timezone: geo.timezone,
                country: geo.country,
              }).catch(() => {});
            }
          })
          .catch(() => {});
      }
    }

    return {
      userName,
      location,
      timezone,
      country,
      localTime: getLocalTime(timezone),
    };
  } catch {
    return null;
  }
}

// ─── Reverse geocoding from coordinates ──────────────────────────────────────

interface NominatimResponse {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

export async function resolveLocationFromCoords(
  lat: number,
  lon: number,
): Promise<{ location: string | null; country: string | null } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      {
        signal: controller.signal,
        headers: { 'User-Agent': 'byte-agent/1.0' },
      },
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResponse;
    const a = data.address;
    if (!a) return null;
    const city = a.city ?? a.town ?? a.village ?? a.county ?? null;
    const state = a.state ?? null;
    const locationParts = [city, state].filter(Boolean);
    return {
      location: locationParts.length > 0 ? locationParts.join(', ') : (a.country ?? null),
      country: a.country_code?.toUpperCase() ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Standalone geo resolver — called directly by the settings endpoint
 * to immediately fetch and persist location for the current user/IP.
 */
export async function refreshUserLocation(
  userId: string,
  clientIp: string,
): Promise<{ location: string | null; timezone: string | null; country: string | null }> {
  const geo = await resolveLocationFromIp(clientIp);
  if (!geo) return { location: null, timezone: null, country: null };

  try {
    const { User } = await import('../models/User.js');
    await User.findByIdAndUpdate(userId, {
      location: geo.location,
      timezone: geo.timezone,
      country: geo.country,
    });
  } catch {
    /* non-fatal */
  }

  return geo;
}
