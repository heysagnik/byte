import { useState } from 'react';
import { Button, Chip, Accordion, AccordionItem } from '@heroui/react';
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

const stepColors: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'> = {
  thinking: 'default',
  searching: 'primary',
  calling: 'secondary',
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
        <Accordion variant="light" className="p-0">
          <AccordionItem
            key="steps"
            aria-label="Agent steps"
            title={
              <span className="text-xs text-default-500">
                {metadata.steps.length} step{metadata.steps.length !== 1 ? 's' : ''}
              </span>
            }
            className="py-1"
          >
            <div className="space-y-1.5 pb-2">
              {metadata.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <Chip
                    size="sm"
                    color={stepColors[step.type] ?? 'default'}
                    variant="flat"
                    className="text-xs shrink-0"
                  >
                    {stepIcons[step.type]} {step.type}
                  </Chip>
                  <span className="text-default-600 leading-5">{step.content}</span>
                </div>
              ))}
            </div>
          </AccordionItem>
        </Accordion>
      )}

      {metadata.type === 'waiting_approval' && metadata.options && (
        <div className="mt-3 border border-warning-200 rounded-xl p-3 bg-warning-50 dark:bg-warning-50/10">
          <p className="text-sm font-medium mb-3">Choose an option to continue:</p>
          <div className="space-y-2">
            {metadata.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleApprove(i)}
                disabled={approving}
                className="w-full text-left p-3 rounded-lg border border-default-200 hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {option.recommended && <span className="text-success mr-1">★</span>}
                    {option.label}
                  </span>
                  {option.price && (
                    <span className="text-sm text-default-500">{option.price}</span>
                  )}
                </div>
                {option.details && (
                  <p className="text-xs text-default-500 mt-1">{option.details}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
