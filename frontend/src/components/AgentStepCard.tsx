import { useState, useEffect, useRef } from 'react';
import { Button, Chip } from '@heroui/react';
import { ChevronRight } from 'lucide-react';
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

const stepColor: Record<string, 'default' | 'accent' | 'success' | 'warning' | 'danger'> = {
  thinking:         'default',
  searching:        'accent',
  calling:          'accent',
  result:           'success',
  waiting_approval: 'warning',
  error:            'danger',
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
  isRunning?: boolean;
}

export default function AgentStepCard({ metadata, threadId, isRunning }: AgentStepCardProps) {
  const [approving, setApproving] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const isDone = isRunning === undefined
    ? (metadata.type === 'done' || metadata.type === 'final')
    : !isRunning;

  // Imperatively drive open/close so it works regardless of user interaction.
  // React's `open` prop on <details> only sets the initial state; it doesn't
  // re-control the element after the browser toggles it.
  useEffect(() => {
    const el = detailsRef.current;
    if (!el) return;
    if (!isDone) {
      el.open = true;   // running → force open so new steps are visible
    } else {
      el.open = false;  // done → collapse to summary
    }
  }, [isDone]);

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
    <div className="space-y-3">
      {/* ux-progressive-disclosure — steps collapsed, native <details> = no extra styling */}
      {metadata.steps && metadata.steps.length > 0 && (
        <details className="group" ref={detailsRef}>
          <summary className="flex items-center gap-1 text-xs text-[--muted] cursor-pointer select-none list-none w-fit">
            <ChevronRight
              size={12}
              className="transition-transform duration-150 group-open:rotate-90"
              aria-hidden="true"
            />
            {isDone
              ? `${metadata.steps.length} step${metadata.steps.length !== 1 ? 's' : ''}`
              : 'Working…'}
          </summary>

          <div className="mt-2 ml-1 pl-3 space-y-1.5" style={{ borderLeft: '2px solid var(--border)' }}>
            {metadata.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <Chip size="sm" color={stepColor[step.type] ?? 'default'} variant="soft" className="shrink-0">
                  {stepLabel[step.type] ?? step.type}
                </Chip>
                <span className="text-[--muted] leading-5 pt-0.5">{step.content}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* ux-von-restorff-emphasis — approval card visually distinct */}
      {metadata.type === 'waiting_approval' && metadata.options && (
        <div
          className="rounded-lg p-4 space-y-2"
          style={{ border: '1px solid rgba(245,158,11,0.25)', backgroundColor: 'rgba(245,158,11,0.04)' }}
        >
          <p className="text-sm font-medium">Choose an option to continue:</p>
          {metadata.options.map((option, i) => (
            <Button
              key={i}
              variant="secondary"
              fullWidth
              isDisabled={approving}
              onPress={() => handleApprove(i)}
              className="justify-between h-auto py-3 px-4 rounded-md"
            >
              <span className="font-medium text-sm">
                {option.recommended && <span className="text-warning mr-1">★</span>}
                {option.label}
              </span>
              <span className="flex flex-col items-end gap-0.5">
                {option.price && <span className="text-sm tabular-nums text-[--muted]">{option.price}</span>}
                {option.details && <span className="text-xs text-[--muted] font-normal">{option.details}</span>}
              </span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
