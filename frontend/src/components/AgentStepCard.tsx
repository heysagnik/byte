import { useState, useEffect, useRef } from 'react';
import { Chip, Accordion } from '@heroui/react';
import type { Selection } from '@heroui/react';
import { api } from '../lib/api';

interface AgentStep {
  type: 'thinking' | 'searching' | 'calling' | 'result' | 'waiting_approval' | 'error' | 'agent_spawn' | 'agent_done';
  content: string;
  timestamp: number;
  agentLabel?: string;
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

const stepLabel: Record<string, string> = {
  thinking: 'Thinking',
  searching: 'Searching',
  calling: 'Calling',
  result: 'Done',
  waiting_approval: 'Waiting',
  error: 'Error',
  agent_spawn: 'Agent',
  agent_done: 'Agent',
};

// What to show in the accordion trigger while the step is live
const liveLabel: Record<string, string> = {
  thinking: 'Thinking…',
  searching: 'Searching the web…',
  calling: 'On a call…',
  result: 'Processing results…',
  waiting_approval: 'Waiting for Approval…',
  error: 'Error',
  agent_spawn: 'Spawning agents…',
  agent_done: 'Agent completed',
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
            <Accordion.Trigger
              className="py-1.5 px-2 rounded-lg outline-none transition-colors w-full flex items-center gap-2 w-max"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}
            >
              {/* Pulsing dot while agent is active */}
              {!isDone && (
                <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0 animate-accent-ping" style={{ background: 'var(--accent)' }} />
              )}
              {headerText}
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="pb-2 pt-1 px-1">
              {timeline.length > 0 && (
                <div
                  className="mt-1 ml-2 pl-3.5 grid gap-y-2.5 gap-x-3 items-start"
                  style={{ gridTemplateColumns: 'max-content 1fr', borderLeft: '1px solid var(--border)' }}
                >
                  {timeline.map((item, i) => {
                    const isLast = !isDone && i === timeline.length - 1;

                    if (item.kind === 'step') {
                      const step = item.data;
                      const prev = timeline[i - 1];
                      const showChip = i === 0 || prev?.kind !== 'step' || prev.data.type !== step.type || prev.data.agentLabel !== step.agentLabel;
                      const chipLabel = step.agentLabel
                        ? step.agentLabel
                        : (stepLabel[step.type] ?? step.type);
                      const isAgentStep = step.type === 'agent_spawn' || step.type === 'agent_done';
                      return (
                        <div key={i} className="contents">
                          <div className="pt-[1px] animate-step-in">
                            {showChip && (
                              <Chip
                                size="sm"
                                variant="soft"
                                className={`h-[20px] px-1 text-[11px] font-medium transition-opacity whitespace-nowrap ${isLast ? 'opacity-100' : 'opacity-50'}`}
                                style={{
                                  background: isAgentStep ? 'var(--accent)' : 'var(--bg-surface)',
                                  color: isAgentStep ? '#fff' : 'var(--text-muted)',
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                {chipLabel}
                              </Chip>
                            )}
                          </div>
                          <div
                            className={`text-[13px] leading-[1.6] animate-step-in ${isLast ? 'font-medium' : ''}`}
                            style={{ color: showChip ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: 'var(--font-body)', paddingTop: showChip ? '3px' : undefined }}
                          >
                            {step.content}
                            {isLast && (
                              <span className="inline-block w-[1.5px] h-[1em] ml-1 align-middle animate-pulse" style={{ background: 'var(--accent)' }} />
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
                            className={`h-[20px] px-1 text-[11px] font-medium transition-opacity whitespace-nowrap ${isLast ? 'opacity-100' : 'opacity-50'}`}
                            style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                          >
                            {label}
                          </Chip>
                        </div>
                        <div
                          className={`text-[13px] leading-[1.6] animate-step-in pt-[3px] ${isLast ? 'font-medium' : ''}`}
                          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
                        >
                          {notif.content}
                          {isLast && (
                            <span className="inline-block w-[1.5px] h-[1em] ml-1 align-middle animate-pulse" style={{ background: 'var(--accent)' }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {metadata.type === 'waiting_approval' && metadata.options && (
        <ApprovalCard
          options={metadata.options}
          summary={(metadata as { summary?: string }).summary}
          threadId={threadId}
        />
      )}
    </div>
  );
}

// ─── ApprovalCard ─────────────────────────────────────────────────────────────

interface ApprovalCardProps {
  options: ApprovalOption[];
  summary?: string;
  threadId: string;
}

function ApprovalCard({ options, summary, threadId }: ApprovalCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [visible, setVisible] = useState(true);
  const submitRef = useRef(false);

  const handleSelect = async (i: number) => {
    if (submitRef.current) return;
    submitRef.current = true;
    setSelected(i);

    try {
      await api.post(`/threads/${threadId}/approve`, { optionIndex: i });
    } catch (err) {
      console.error('Approval failed:', err);
      submitRef.current = false;
      setSelected(null);
      return;
    }

    // Brief confirmation flash, then fade out
    setConfirmed(true);
    setTimeout(() => setVisible(false), 900);
  };

  if (!visible) return null;

  return (
    <div
      className="mt-3 rounded-2xl overflow-hidden transition-opacity duration-500"
      style={{
        opacity: confirmed ? 0 : 1,
        border: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span
          className="w-[5px] h-[5px] rounded-full shrink-0"
          style={{ background: 'var(--accent)' }}
        />
        <span
          className="text-[10px] uppercase tracking-widest"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.12em' }}
        >
          {confirmed ? 'Confirmed' : 'Choose an option'}
        </span>
      </div>

      {/* Summary */}
      {summary && (
        <p
          className="px-4 pt-3 text-[13px] leading-[1.6]"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
        >
          {summary}
        </p>
      )}

      {/* Options */}
      <div className="p-3 flex flex-col gap-2">
        {options.map((option, i) => {
          const isSelected = selected === i;
          const isOther = selected !== null && !isSelected;

          return (
            <button
              key={i}
              type="button"
              disabled={selected !== null}
              onClick={() => handleSelect(i)}
              className="w-full text-left rounded-xl px-4 py-3 transition-all duration-200 outline-none"
              style={{
                background: isSelected ? 'var(--text-primary)' : 'var(--bg-surface)',
                border: `1.5px solid ${isSelected ? 'var(--text-primary)' : 'var(--border)'}`,
                opacity: isOther ? 0.35 : 1,
                cursor: selected !== null ? 'default' : 'pointer',
                transform: isSelected ? 'scale(1)' : undefined,
              }}
              onMouseEnter={e => {
                if (selected !== null) return;
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--text-primary)';
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-page)';
              }}
              onMouseLeave={e => {
                if (selected !== null) return;
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)';
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Selection indicator */}
                  <span
                    className="shrink-0 w-[16px] h-[16px] rounded-full flex items-center justify-center transition-all duration-200"
                    style={{
                      border: isSelected ? 'none' : '1.5px solid var(--border)',
                      background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                    }}
                  >
                    {isSelected && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3.5 6L6.5 2" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {option.recommended && (
                        <span
                          className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            background: isSelected ? 'rgba(255,255,255,0.15)' : 'var(--accent)',
                            color: isSelected ? 'rgba(255,255,255,0.8)' : '#fff',
                            letterSpacing: '0.1em',
                          }}
                        >
                          Recommended
                        </span>
                      )}
                      <span
                        className="text-[13px] font-medium leading-snug"
                        style={{
                          color: isSelected ? 'var(--bg-elevated)' : 'var(--text-primary)',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {option.label}
                      </span>
                    </div>
                    {option.details && (
                      <p
                        className="text-[12px] leading-[1.5] mt-0.5"
                        style={{
                          color: isSelected ? 'rgba(247,246,244,0.6)' : 'var(--text-muted)',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {option.details}
                      </p>
                    )}
                  </div>
                </div>

                {option.price && (
                  <span
                    className="shrink-0 text-[13px] font-semibold tabular-nums"
                    style={{
                      color: isSelected ? 'var(--bg-elevated)' : 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {option.price}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
