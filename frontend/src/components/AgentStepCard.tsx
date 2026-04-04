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

export interface NotificationMessage {
  content: string;
  type: string;
  createdAt: string;
}

interface Metadata {
  type?: string;
  steps?: AgentStep[];
  options?: ApprovalOption[];
}

type TimelineItem =
  | { kind: 'step'; data: AgentStep; time: number }
  | { kind: 'notification'; data: NotificationMessage; time: number };

const stepColor: Record<string, 'default' | 'accent' | 'success' | 'warning' | 'danger'> = {
  thinking: 'default',
  searching: 'accent',
  calling: 'accent',
  result: 'success',
  waiting_approval: 'warning',
  error: 'danger',
};

const stepLabel: Record<string, string> = {
  thinking: 'Thinking',
  searching: 'Searching',
  calling: 'Calling',
  result: 'Done',
  waiting_approval: 'Waiting',
  error: 'Error',
};

// What to show in the accordion trigger while the step is live
const liveLabel: Record<string, string> = {
  thinking: 'Thinking…',
  searching: 'Searching the web…',
  calling: 'On a call…',
  result: 'Processing results…',
  waiting_approval: 'Waiting for Approval…',
  error: 'Error',
};

const notifColor: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  info: 'default',
  success: 'success',
  error: 'danger',
  waiting: 'warning',
  waiting_approval: 'warning',
};

const notifLabel: Record<string, string> = {
  info: 'Update',
  success: 'Done',
  error: 'Error',
  waiting: 'Waiting',
  waiting_approval: 'Waiting',
};

interface AgentStepCardProps {
  metadata: Metadata;
  threadId: string;
  isRunning?: boolean;
  notifications?: NotificationMessage[];
}

export default function AgentStepCard({ metadata, threadId, isRunning, notifications = [] }: AgentStepCardProps) {
  const [approving, setApproving] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Selection>(new Set(['steps']));

  const isDone = isRunning === undefined
    ? (metadata.type === 'done' || metadata.type === 'final')
    : !isRunning;

  useEffect(() => {
    setExpandedKeys(isDone ? new Set([]) : new Set(['steps']));
  }, [isDone]);

  // Merge steps + notifications into one chronological timeline
  const timeline: TimelineItem[] = [
    ...(metadata.steps ?? []).map(s => ({ kind: 'step' as const, data: s, time: s.timestamp })),
    ...notifications.map(n => ({ kind: 'notification' as const, data: n, time: new Date(n.createdAt).getTime() })),
  ].sort((a, b) => a.time - b.time);

  if (timeline.length === 0 && metadata.type !== 'waiting_approval') return null;

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

  // Header: when running, reflect the last active step type so the user always knows what's happening
  const lastItem = timeline[timeline.length - 1];
  const currentLiveLabel = (() => {
    if (metadata.type === 'waiting_approval') return 'Waiting for Approval…';
    if (!lastItem || lastItem.kind === 'notification') return 'Working…';
    return liveLabel[lastItem.data.type] ?? 'Working…';
  })();

  const headerText = isDone
    ? `${timeline.length} step${timeline.length !== 1 ? 's' : ''}`
    : currentLiveLabel;

  return (
    <div className="space-y-2">
      <Accordion
        className="px-0"
        expandedKeys={expandedKeys}
        onExpandedChange={setExpandedKeys}
      >
        <Accordion.Item key="steps" id="steps">
          <Accordion.Heading>
            <Accordion.Trigger className="text-[13px] font-medium text-[#666] py-1.5 px-2 rounded-lg hover:bg-[#F9F9F9] outline-none transition-colors w-full flex items-center gap-2 w-max">
              {/* Pulsing dot while agent is active */}
              {!isDone && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#111] animate-pulse shrink-0" />
              )}
              {headerText}
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="pb-2 pt-1 px-1">
              {timeline.length > 0 && (
                <div
                  className="mt-1 ml-2 pl-3.5 grid gap-y-2.5 gap-x-3 items-start"
                  style={{ gridTemplateColumns: 'min-content 1fr', borderLeft: '1px solid #E5E5E5' }}
                >
                  {timeline.map((item, i) => {
                    const isLast = !isDone && i === timeline.length - 1;

                    if (item.kind === 'step') {
                      const step = item.data;
                      const prev = timeline[i - 1];
                      const showChip = i === 0 || prev?.kind !== 'step' || prev.data.type !== step.type;
                      return (
                        <div key={i} className="contents">
                          <div className="pt-[1px] animate-step-in">
                            {showChip && (
                              <Chip
                                size="sm"
                                variant="soft"
                                className={`h-[20px] px-1 bg-[#F5F5F5] text-[#111] text-[11px] font-medium transition-opacity ${isLast ? 'opacity-100' : 'opacity-60'}`}
                              >
                                {stepLabel[step.type] ?? step.type}
                              </Chip>
                            )}
                          </div>
                          <div className={`text-[13.5px] leading-[1.6] animate-step-in ${showChip ? 'text-[#333] pt-[3px]' : 'text-[#666]'} ${isLast ? 'font-[450]' : ''}`}>
                            {step.content}
                            {/* Blinking cursor on the active step */}
                            {isLast && (
                              <span className="inline-block w-[1.5px] h-[1em] bg-[#888] ml-1 align-middle animate-pulse" />
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Notification item — always gets its own chip
                    const notif = item.data;
                    const color = notifColor[notif.type] ?? 'default';
                    const label = notifLabel[notif.type] ?? 'Update';
                    return (
                      <div key={i} className="contents">
                        <div className="pt-[1px] animate-step-in">
                          <Chip
                            size="sm"
                            variant="soft"
                            className={`h-[20px] px-1 bg-[#F5F5F5] text-[#111] text-[11px] font-medium transition-opacity ${isLast ? 'opacity-100' : 'opacity-60'}`}
                          >
                            {label}
                          </Chip>
                        </div>
                        <div className={`text-[13.5px] leading-[1.6] animate-step-in text-[#333] pt-[3px] ${isLast ? 'font-[450]' : ''}`}>
                          {notif.content}
                          {isLast && (
                            <span className="inline-block w-[1.5px] h-[1em] bg-[#888] ml-1 align-middle animate-pulse" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {metadata.type === 'waiting_approval' && metadata.options && (
                <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-4 space-y-3 mt-3">
                  <p className="text-[13px] font-medium text-[#111]">Choose an option to continue:</p>
                  <div className="space-y-2">
                    {metadata.options.map((option, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        fullWidth
                        isDisabled={approving}
                        onPress={() => handleApprove(i)}
                        className="justify-between h-auto py-2.5 px-3 rounded-lg border-[#E5E5E5] bg-white hover:bg-[#F5F5F5] transition-colors"
                      >
                        <span className="font-medium text-[13px] text-[#111] flex items-center gap-2">
                          {option.recommended && <span className="text-black">★</span>}
                          {option.label}
                        </span>
                        <span className="flex flex-col items-end gap-0.5 text-right">
                          {option.price && <span className="text-[13px] font-medium tabular-nums text-[#111]">{option.price}</span>}
                          {option.details && <span className="text-[11px] text-[#666] font-normal leading-tight">{option.details}</span>}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </div>
  );
}
