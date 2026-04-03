import { useState } from 'react';
import { Chip, Accordion } from '@heroui/react';
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

const stepIcons: Record<string, string> = {
  thinking: '🤔',
  searching: '🔍',
  calling: '📞',
  result: '✅',
  waiting_approval: '⏳',
  error: '❌',
};

const stepColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
  thinking: 'default',
  searching: 'primary',
  calling: 'default',
  result: 'success',
  waiting_approval: 'warning',
  error: 'danger',
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
    <div className="mt-3 space-y-2">
      {metadata.steps && metadata.steps.length > 0 && (
        <Accordion variant="default" className="p-0">
          <Accordion.Item id="steps" className="py-1">
            <Accordion.Heading>
              <Accordion.Trigger>
                <span className="text-xs text-[--color-muted]">
                  {metadata.steps.length} step{metadata.steps.length !== 1 ? 's' : ''}
                </span>
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body>
                <div className="space-y-1.5 pb-2">
                  {metadata.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <Chip
                        size="sm"
                        color={stepColors[step.type] ?? 'default'}
                        variant="flat"
                        className="shrink-0"
                      >
                        {stepIcons[step.type]} {step.type}
                      </Chip>
                      <span className="text-[--color-muted] leading-5">{step.content}</span>
                    </div>
                  ))}
                </div>
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      )}

      {/* ux-von-restorff-emphasis — approval card is visually distinct from chat bubbles */}
      {metadata.type === 'waiting_approval' && metadata.options && (
        <div
          className="mt-3 rounded-xl p-3"
          style={{
            border: '1px solid rgba(245, 158, 11, 0.3)',
            backgroundColor: 'rgba(245, 158, 11, 0.05)',
          }}
        >
          <p className="text-sm font-medium mb-3 text-[--color-fg]">Choose an option to continue:</p>
          <div className="space-y-2">
            {metadata.options.map((option, i) => (
              /* ux-fitts-target-size — min 44px height via p-3; physics-active-state via global CSS */
              <button
                key={i}
                onClick={() => handleApprove(i)}
                disabled={approving}
                className="w-full text-left p-3 rounded-xl bg-[--color-surface] disabled:opacity-50 transition-all duration-150 ease-out"
                style={{
                  boxShadow: '0 0 0 1px var(--color-border)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 1.5px var(--color-fg)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 1px var(--color-border)';
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-[--color-fg]">
                    {option.recommended && <span className="text-warning-500 mr-1">★</span>}
                    {option.label}
                  </span>
                  {/* type-tabular-nums-for-data — pricing columns */}
                  {option.price && (
                    <span className="text-sm text-[--color-muted] tabular-nums">{option.price}</span>
                  )}
                </div>
                {option.details && (
                  <p className="text-xs text-[--color-muted] mt-1">{option.details}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
