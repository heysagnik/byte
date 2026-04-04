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

    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country,countryCode,timezone`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json() as IpApiResponse;
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

// ─── Name detection from message ─────────────────────────────────────────────

function extractNameFromMessage(message: string): string | null {
  const match =
    message.match(/^(?:my name is|i(?:'m| am)|call me)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i) ??
    message.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\.?$/);
  return match?.[1]?.trim() ?? null;
}

// ─── Main resolver ────────────────────────────────────────────────────────────

export async function resolveUserProfile(
  userId: string,
  userMessage: string,
  clientIp?: string,
): Promise<UserProfile | null> {
  // Fallback for unauthenticated / test environments
  if (!userId) {
    const envName = process.env['CALLER_NAME'] ?? null;
    if (!envName) return null;
    return { userName: envName, location: null, timezone: null, country: null, localTime: null };
  }

  try {
    const { User } = await import('../models/User.js');
    const user = await User.findById(userId);
    if (!user) return null;

    // ── Name ──────────────────────────────────────────────────────────────────
    let userName = user.name ?? null;

    if (!userName) {
      const detectedName = extractNameFromMessage(userMessage);
      if (detectedName) {
        userName = detectedName;
        // Persist async — don't block
        User.findByIdAndUpdate(userId, { name: userName }).catch(() => {});
      }
    }

    if (!userName) return null; // still unknown — orchestrator will prompt

    // ── Location ──────────────────────────────────────────────────────────────
    let location = user.location ?? null;
    let timezone = user.timezone ?? null;
    let country = user.country ?? null;

    // Refresh location if we have an IP and no cached location
    if (!location && clientIp) {
      const geo = await resolveLocationFromIp(clientIp);
      if (geo) {
        location = geo.location;
        timezone = geo.timezone;
        country = geo.country;
        // Persist async — non-blocking
        User.findByIdAndUpdate(userId, { location, timezone, country }).catch(() => {});
      }
    }

    // If we already have cached location but new IP available, refresh in background
    // (handles users who travel — updates on their next message)
    if (location && clientIp && !isPrivateIp(clientIp)) {
      resolveLocationFromIp(clientIp).then(geo => {
        if (geo && (geo.location !== location || geo.timezone !== timezone)) {
          User.findByIdAndUpdate(userId, {
            location: geo.location,
            timezone: geo.timezone,
            country: geo.country,
          }).catch(() => {});
        }
      }).catch(() => {});
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
