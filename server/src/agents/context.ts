/**
 * Shared context and step types used across all agents and tools.
 * Single source of truth — import from here, not from types.ts.
 */

export interface AgentStep {
  type:
    | 'thinking'
    | 'searching'
    | 'calling'
    | 'result'
    | 'waiting_approval'
    | 'error'
    | 'agent_spawn'
    | 'agent_done';
  content: string;
  timestamp: number;
  /** Optional label for sub-agent steps (e.g. "Research Agent") */
  agentLabel?: string;
}

/** Rich user profile resolved at the start of every agent run */
export interface UserProfile {
  /** User's preferred name (stored in DB after first resolution) */
  userName: string;
  /** City or region derived from IP geolocation (e.g. "Bengaluru, Karnataka") */
  location: string | null;
  /** IANA timezone string derived from IP (e.g. "Asia/Kolkata") */
  timezone: string | null;
  /** Country code (e.g. "IN") */
  country: string | null;
  /** Local time at the user's location when the agent run started */
  localTime: string | null;
}

/** Passed to every tool handler and sub-agent */
export interface AgentContext {
  threadId: string;
  userId: string;
  agentMessageId: string | null;
  /** Full resolved user profile */
  user: UserProfile;
  reportStep: (step: AgentStep) => Promise<void>;
}

/** Result returned by a sub-agent after completing its task */
export interface SubAgentResult {
  agentName: string;
  task: string;
  result: string;
  error?: string;
}
