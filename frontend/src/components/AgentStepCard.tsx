import { useState } from 'react';
import { api } from '../lib/api';

interface AgentStep {
  type: 'thinking' | 'searching' | 'calling' | 'result' | 'waiting_approval' | 'error';
  content: string;
  timestamp: number;
}

interface ApprovalOption {
  label: string;
  details: string;
  price?: string;
  recommended?: boolean;
}

interface Metadata {
  type?: string;
  steps?: AgentStep[];
  options?: ApprovalOption[];
}

const stepDot: Record<string, string> = {
  thinking:         'rgba(0,0,0,0.25)',
  searching:        '#3b82f6',
  calling:          '#6366f1',
  result:           '#22c55e',
  waiting_approval: '#f59e0b',
  error:            '#ef4444',
};

const stepLabel: Record<string, string> = {
  thinking:         'Thinking',
  searching:        'Searching',
  calling:          'Calling',
  result:           'Done',
  waiting_approval: 'Waiting',
  error:            'Error',
};

interface AgentStepCardProps {
  metadata: Metadata;
  threadId: string;
}

export default function AgentStepCard({ metadata, threadId }: AgentStepCardProps) {
  const [approving, setApproving] = useState(false);

  if (!metadata.steps?.length && metadata.type !== 'waiting_approval') return null;

  const handleApprove = async (optionIndex: number) => {
    setApproving(true);
    try {
      await api.post(`/threads/${threadId}/approve`, { optionIndex });
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="mt-3 space-y-3">
      {/* ── Steps disclosure — native <details> matches Claude's collapsed steps ── */}
      {metadata.steps && metadata.steps.length > 0 && (
        <details className="group">
          <summary
            className="flex items-center gap-1.5 text-xs cursor-pointer select-none list-none w-fit"
            style={{ color: 'var(--color-muted)' }}
          >
            {/* Chevron — rotates open */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-3 h-3 transition-transform duration-150 group-open:rotate-90"
              aria-hidden="true"
            >
              <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L9.19 8 6.22 5.03a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
            <span>
              {metadata.steps.length} step{metadata.steps.length !== 1 ? 's' : ''}
            </span>
          </summary>

          <div className="mt-2 pl-4 space-y-2" style={{ borderLeft: '1.5px solid var(--color-border)' }}>
            {metadata.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                {/* Colored dot instead of emoji */}
                <span
                  className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: stepDot[step.type] ?? stepDot.thinking }}
                  aria-label={stepLabel[step.type] ?? step.type}
                />
                <div>
                  <span className="font-medium mr-1.5" style={{ color: 'var(--color-fg)' }}>
                    {stepLabel[step.type] ?? step.type}
                  </span>
                  <span style={{ color: 'var(--color-muted)' }}>{step.content}</span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* ── Approval card — ux-von-restorff-emphasis: visually distinct ── */}
      {metadata.type === 'waiting_approval' && metadata.options && (
        <div
          className="rounded-2xl p-4"
          style={{
            border: '1px solid rgba(245, 158, 11, 0.25)',
            backgroundColor: 'rgba(245, 158, 11, 0.04)',
          }}
        >
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-fg)' }}>
            Choose an option to continue:
          </p>
          <div className="space-y-2">
            {metadata.options.map((option, i) => (
              // ux-fitts-target-size — min 44px via p-3; physics-active-state via global CSS
              <button
                key={i}
                onClick={() => handleApprove(i)}
                disabled={approving}
                className="w-full text-left p-3 rounded-xl transition-all duration-150 ease-out disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  boxShadow: '0 0 0 1px var(--color-border)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 1.5px var(--color-fg)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 1px var(--color-border)';
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-sm" style={{ color: 'var(--color-fg)' }}>
                    {option.recommended && (
                      <span style={{ color: '#f59e0b' }} className="mr-1">★</span>
                    )}
                    {option.label}
                  </span>
                  {/* type-tabular-nums-for-data — pricing alignment */}
                  {option.price && (
                    <span className="text-sm tabular-nums shrink-0" style={{ color: 'var(--color-muted)' }}>
                      {option.price}
                    </span>
                  )}
                </div>
                {option.details && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                    {option.details}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
