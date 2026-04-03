/**
 * In-memory approval pause/resume for the orchestrator.
 * When the agent calls request_user_approval, it suspends here until
 * the user picks an option from the frontend.
 */

interface PendingApproval {
  resolve: (optionIndex: number) => void;
  reject: (reason: Error) => void;
  timer: NodeJS.Timeout;
}

const pending = new Map<string, PendingApproval>();

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function waitForApproval(threadId: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(threadId);
      reject(new Error('Approval timeout — user did not respond within 10 minutes'));
    }, TIMEOUT_MS);

    pending.set(threadId, { resolve, reject, timer });
  });
}

export function resolveApproval(threadId: string, optionIndex: number): boolean {
  const p = pending.get(threadId);
  if (!p) return false;
  clearTimeout(p.timer);
  p.resolve(optionIndex);
  pending.delete(threadId);
  return true;
}

export function hasPendingApproval(threadId: string): boolean {
  return pending.has(threadId);
}
