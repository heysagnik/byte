/**
 * Generic OAuth 2.0 service.
 *
 * Supports any service that follows the OAuth 2.0 Authorization Code + PKCE flow.
 * Currently wired for Twitter (X). Adding a new service = add its config to SERVICE_CONFIGS.
 *
 * Flow:
 *   1. generateAuthUrl(service, userId, threadId) → { url, state }
 *   2. waitForOAuth(state) — suspends until callback arrives (or times out)
 *   3. Callback: exchangeCode(service, code, state) → saves credential to DB
 *   4. resolveOAuth(state, credential) — unblocks step 2
 */

import crypto from 'crypto';
import axios from 'axios';
import { Types } from 'mongoose';
import { ServiceCredential } from '../models/ServiceCredential';
import { env } from '../config/env';

// ── Service registry ──────────────────────────────────────────────────────────

interface ServiceConfig {
  authUrl: string;
  tokenUrl: string;
  scopes: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

function getServiceConfig(service: string): ServiceConfig {
  const configs: Record<string, ServiceConfig> = {
    twitter: {
      authUrl:      'https://twitter.com/i/oauth2/authorize',
      tokenUrl:     'https://api.twitter.com/2/oauth2/token',
      scopes:       'tweet.read tweet.write users.read offline.access',
      clientId:     env.TWITTER_CLIENT_ID,
      clientSecret: env.TWITTER_CLIENT_SECRET,
      redirectUri:  `${env.SERVER_BASE_URL}/api/oauth/twitter/callback`,
    },
  };

  const config = configs[service];
  if (!config) throw new Error(`Unsupported OAuth service: "${service}". Supported: ${Object.keys(configs).join(', ')}`);
  if (!config.clientId || !config.clientSecret) {
    throw new Error(`OAuth credentials for "${service}" are not configured. Set ${service.toUpperCase()}_CLIENT_ID and ${service.toUpperCase()}_CLIENT_SECRET in .env`);
  }
  return config;
}

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// ── Pending OAuth state ───────────────────────────────────────────────────────

interface OAuthResult {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string;
}

interface PendingOAuth {
  resolve: (result: OAuthResult) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
  userId: string;
  threadId: string;
  service: string;
  codeVerifier: string;
}

const pendingOAuth = new Map<string, PendingOAuth>();

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function waitForOAuth(state: string): Promise<OAuthResult> {
  // The pending entry is already stored by generateAuthUrl — just return its promise
  const existing = pendingOAuth.get(state);
  if (!existing) return Promise.reject(new Error('Unknown OAuth state'));
  return new Promise<OAuthResult>((resolve, reject) => {
    // Replace resolvers (the entry was created in generateAuthUrl without a promise)
    existing.resolve = resolve;
    existing.reject = reject;
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface AuthUrlResult {
  url: string;
  state: string;
}

/**
 * Generate an OAuth authorization URL for the given service.
 * Stores PKCE verifier and caller context keyed by state.
 */
export function generateAuthUrl(service: string, userId: string, threadId: string): AuthUrlResult {
  const config = getServiceConfig(service);

  const state        = crypto.randomBytes(16).toString('hex');
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Placeholder resolvers — replaced when waitForOAuth is called
  let resolve: (r: OAuthResult) => void = () => {};
  let reject: (e: Error) => void = () => {};

  const timer = setTimeout(() => {
    const p = pendingOAuth.get(state);
    if (p) {
      pendingOAuth.delete(state);
      p.reject(new Error(`OAuth for "${service}" timed out after 10 minutes`));
    }
  }, TIMEOUT_MS);

  pendingOAuth.set(state, { resolve, reject, timer, userId, threadId, service, codeVerifier });

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             config.clientId,
    redirect_uri:          config.redirectUri,
    scope:                 config.scopes,
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256',
  });

  return { url: `${config.authUrl}?${params.toString()}`, state };
}

/**
 * Exchange the authorization code for tokens and save to DB.
 * Called by the OAuth callback route.
 * Returns the threadId so the caller can redirect the user back.
 */
export async function handleOAuthCallback(
  service: string,
  code: string,
  state: string
): Promise<{ threadId: string; userId: string }> {
  const pending = pendingOAuth.get(state);
  if (!pending) throw new Error('Invalid or expired OAuth state');

  const config = getServiceConfig(service);

  // Exchange code for tokens
  const tokenRes = await axios.post<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  }>(
    config.tokenUrl,
    new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  config.redirectUri,
      code_verifier: pending.codeVerifier,
    }).toString(),
    {
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      },
      timeout: 15000,
    }
  );

  const { access_token, refresh_token, expires_in, scope } = tokenRes.data;

  const expiresAt = expires_in
    ? new Date(Date.now() + expires_in * 1000)
    : null;

  // Upsert credential in DB
  await ServiceCredential.findOneAndUpdate(
    { userId: new Types.ObjectId(pending.userId), service },
    {
      accessToken:  access_token,
      refreshToken: refresh_token ?? null,
      expiresAt,
      scope:        scope ?? config.scopes,
    },
    { upsert: true, new: true }
  );

  const result: OAuthResult = {
    accessToken:  access_token,
    refreshToken: refresh_token ?? null,
    expiresAt,
    scope:        scope ?? config.scopes,
  };

  // Unblock waitForOAuth
  clearTimeout(pending.timer);
  pending.resolve(result);
  pendingOAuth.delete(state);

  return { threadId: pending.threadId, userId: pending.userId };
}

// ── Credential helpers (used by in-process tools) ─────────────────────────────

export async function getCredential(userId: string, service: string) {
  return ServiceCredential.findOne({
    userId: new Types.ObjectId(userId),
    service,
  });
}

export async function isConnected(userId: string, service: string): Promise<boolean> {
  const cred = await getCredential(userId, service);
  return !!cred?.accessToken;
}
