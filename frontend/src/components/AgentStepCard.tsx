import { useState, useEffect } from 'react';
import { Button, Chip, Accordion } from '@heroui/react';
import type { Selection } from '@heroui/react';
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
  const [expandedKeys, setExpandedKeys] = useState<Selection>(new Set(["steps"]));

  const isDone = isRunning === undefined
    ? (metadata.type === 'done' || metadata.type === 'final')
    : !isRunning;

  useEffect(() => {
    if (!isDone) {
      setExpandedKeys(new Set(["steps"]));
    } else {
      setExpandedKeys(new Set([]));
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
      <Accordion
        className="px-0"
        expandedKeys={expandedKeys}
        onExpandedChange={setExpandedKeys}
      >
        <Accordion.Item key="steps" id="steps">
          <Accordion.Heading>
            <Accordion.Trigger className="text-xs font-medium text-[#666] py-2 px-1 rounded-md hover:bg-black/5 outline-none focus-visible:ring-2 focus-visible:ring-black">
              {isDone 
                ? `${metadata.steps?.length || 0} step${metadata.steps?.length !== 1 ? 's' : ''}` 
                : (metadata.type === 'waiting_approval' ? 'Waiting for Approval…' : 'Working…')}
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="pb-2">
              {metadata.steps && metadata.steps.length > 0 && (
                <div className="mt-1 ml-1.5 pl-4 grid gap-y-2.5 gap-x-3 items-start" style={{ gridTemplateColumns: 'min-content 1fr', borderLeft: '2px solid #EBEBEB' }}>
                  {metadata.steps.map((step, i) => {
                    const showChip = i === 0 || metadata.steps![i - 1].type !== step.type;
                    return (
                      <div key={i} className="contents">
                        <div className="pt-[1px] animate-step-in">
                          {showChip && (
                            <Chip size="sm" color={stepColor[step.type] ?? 'default'} variant="soft" className="h-[22px] px-1 text-[11.5px] font-medium">
                              {stepLabel[step.type] ?? step.type}
                            </Chip>
                          )}
                        </div>
                        <div className={`text-[13.5px] leading-[1.6] animate-step-in ${showChip ? 'text-[#333] pt-[3px]' : 'text-[#666]'}`}>
                          {step.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {metadata.type === 'waiting_approval' && metadata.options && (
                <div
                  className="rounded-lg p-4 space-y-2 mt-4"
                  style={{ border: '1px solid rgba(245,158,11,0.25)', backgroundColor: 'rgba(245,158,11,0.04)' }}
                >
                  <p className="text-sm font-medium text-[#1a1a1a]">Choose an option to continue:</p>
                  {metadata.options.map((option, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      fullWidth
                      isDisabled={approving}
                      onPress={() => handleApprove(i)}
                      className="justify-between h-auto py-3 px-4 rounded-md border border-[#EBEBEB] bg-white hover:bg-gray-50"
                    >
                      <span className="font-medium text-[13.5px] text-[#1a1a1a] flex items-center gap-2">
                        {option.recommended && <span className="text-warning">★</span>}
                        {option.label}
                      </span>
                      <span className="flex flex-col items-end gap-0.5 text-right">
                        {option.price && <span className="text-sm tabular-nums text-[#666]">{option.price}</span>}
                        {option.details && <span className="text-[12px] text-[#999] font-normal leading-tight">{option.details}</span>}
                      </span>
                    </Button>
                  ))}
                </div>
              )}
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </div>
  );
}
