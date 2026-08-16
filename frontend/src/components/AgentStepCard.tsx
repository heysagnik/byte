import { useState, useEffect, useRef } from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/accordion';
import { Badge } from './ui/badge';
import { api } from '../lib/api';
import { parseCardsFromText } from '../lib/cardParser';
import { PlaceCardGrid } from './cards/PlaceCardGrid';
import { CallReportCard } from './cards/CallReportCard';
import { SourceCardGrid } from './cards/SourceCardGrid';

interface AgentStep {
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

const liveLabel: Record<string, string> = {
  thinking: 'Thinking…',
  searching: 'Searching the web & maps…',
  calling: 'On a call…',
  result: 'Processing results…',
  waiting_approval: 'Waiting for Approval…',
  error: 'Error',
  agent_spawn: 'Spawning agents…',
  agent_done: 'Agent completed',
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

export default function AgentStepCard({
  metadata,
  threadId,
  isRunning,
  notifications = [],
}: AgentStepCardProps) {
  const [expandedValue, setExpandedValue] = useState<string>('steps');

  const isDone =
    isRunning === undefined ? metadata.type === 'done' || metadata.type === 'final' : !isRunning;

  useEffect(() => {
    setExpandedValue(isDone ? '' : 'steps');
  }, [isDone]);

  const timeline: TimelineItem[] = [
    ...(metadata.steps ?? []).map(s => ({ kind: 'step' as const, data: s, time: s.timestamp })),
    ...notifications.map(n => ({
      kind: 'notification' as const,
      data: n,
      time: new Date(n.createdAt).getTime(),
    })),
  ].sort((a, b) => a.time - b.time);

  if (timeline.length === 0 && metadata.type !== 'waiting_approval') return null;

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
        type="single"
        collapsible
        className="px-0"
        value={expandedValue}
        onValueChange={setExpandedValue}
      >
        <AccordionItem value="steps" className="border-b-0">
          <AccordionTrigger
            showChevron={false}
            className="py-1.5 px-2 rounded-md outline-none transition-colors max-w-full !flex-none inline-flex items-center gap-2 w-fit"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              color: 'var(--text-primary)',
              letterSpacing: '0.04em',
            }}
          >
            {!isDone && (
              <span className="glyph-meter shrink-0" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </span>
            )}
            {headerText}
          </AccordionTrigger>
          <AccordionContent className="pb-2 pt-1 px-1">
            <>
              {timeline.length > 0 && (
                <div
                  className="mt-1 ml-2 pl-3.5 flex flex-col gap-y-2.5"
                  style={{ borderLeft: '1px dashed var(--border)' }}
                >
                  {timeline.map((item, i) => {
                    const isLast = !isDone && i === timeline.length - 1;

                    if (item.kind === 'step') {
                      const step = item.data;
                      const prev = timeline[i - 1];
                      const showChip =
                        i === 0 ||
                        prev?.kind !== 'step' ||
                        prev.data.type !== step.type ||
                        prev.data.agentLabel !== step.agentLabel;
                      const chipLabel = step.agentLabel
                        ? step.agentLabel
                        : (stepLabel[step.type] ?? step.type);
                      const isAgentStep = step.type === 'agent_spawn' || step.type === 'agent_done';

                      const parsed = parseCardsFromText(step.content);

                      return (
                        <div key={i} className="flex flex-col gap-1 animate-step-in">
                          {showChip && (
                            <Badge
                              className={`h-[20px] px-1 rounded-sm gap-1 text-[11px] font-medium transition-opacity whitespace-nowrap w-fit border-0 ${isLast ? 'opacity-100' : 'opacity-50'}`}
                              style={{
                                background: isAgentStep ? 'var(--accent)' : 'var(--bg-surface)',
                                color: isAgentStep ? '#fff' : 'var(--text-muted)',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              <span className="font-dot text-[10px] opacity-70">
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              {chipLabel}
                            </Badge>
                          )}

                          {parsed.cleanText && (
                            <div
                              className={`text-[14px] leading-[1.6] ${isLast ? 'font-medium' : ''}`}
                              style={{
                                color: showChip ? 'var(--text-primary)' : 'var(--text-muted)',
                                fontFamily: 'var(--font-body)',
                              }}
                            >
                              {parsed.cleanText}
                              {isLast && (
                                <span
                                  className="inline-block w-[1.5px] h-[1em] ml-1 align-middle animate-pulse"
                                  style={{ background: 'var(--accent)' }}
                                />
                              )}
                            </div>
                          )}

                          {/* Render dynamic cards inside step timelines if extracted */}
                          {parsed.places.length > 0 && <PlaceCardGrid places={parsed.places} />}
                          {parsed.callReport && <CallReportCard report={parsed.callReport} />}
                          {parsed.sources.length > 0 && <SourceCardGrid sources={parsed.sources} />}
                        </div>
                      );
                    }

                    // Notification item
                    const notif = item.data;
                    const label = notifLabel[notif.type] ?? 'Update';
                    const parsedNotif = parseCardsFromText(notif.content);

                    return (
                      <div key={i} className="flex flex-col gap-1 animate-step-in">
                        <Badge
                          className={`h-[20px] px-1 rounded-sm text-[11px] font-medium transition-opacity whitespace-nowrap w-fit border-0 ${isLast ? 'opacity-100' : 'opacity-50'}`}
                          style={{
                            background: 'var(--bg-surface)',
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {label}
                        </Badge>
                        {parsedNotif.cleanText && (
                          <div
                            className={`text-[14px] leading-[1.6] ${isLast ? 'font-medium' : ''}`}
                            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
                          >
                            {parsedNotif.cleanText}
                            {isLast && (
                              <span
                                className="inline-block w-[1.5px] h-[1em] ml-1 align-middle animate-pulse"
                                style={{ background: 'var(--accent)' }}
                              />
                            )}
                          </div>
                        )}
                        {parsedNotif.places.length > 0 && <PlaceCardGrid places={parsedNotif.places} />}
                        {parsedNotif.callReport && <CallReportCard report={parsedNotif.callReport} />}
                        {parsedNotif.sources.length > 0 && <SourceCardGrid sources={parsedNotif.sources} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          </AccordionContent>
        </AccordionItem>
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

    setConfirmed(true);
    setTimeout(() => setVisible(false), 900);
  };

  if (!visible) return null;

  return (
    <div
      className="corner-ticks relative mt-3 rounded-md overflow-hidden transition-opacity duration-500"
      style={{
        opacity: confirmed ? 0 : 1,
        border: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
      }}
    >
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
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            letterSpacing: '0.12em',
          }}
        >
          {confirmed ? 'Confirmed' : 'Choose an option'}
        </span>
      </div>

      {summary && (
        <p
          className="px-4 pt-3 text-[14px] leading-[1.6]"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
        >
          {summary}
        </p>
      )}

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
              className="w-full text-left rounded-md px-4 py-3 transition-all duration-200 outline-none"
              style={{
                background: isSelected ? 'var(--text-primary)' : 'var(--bg-surface)',
                border: `1.5px solid ${isSelected ? 'var(--text-primary)' : 'var(--border)'}`,
                opacity: isOther ? 0.35 : 1,
                cursor: selected !== null ? 'default' : 'pointer',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="shrink-0 w-[16px] h-[16px] rounded-full flex items-center justify-center transition-all duration-200"
                    style={{
                      border: isSelected ? 'none' : '1.5px solid var(--border)',
                      background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                    }}
                  >
                    {isSelected && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path
                          d="M1.5 4L3.5 6L6.5 2"
                          stroke="var(--text-primary)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {option.recommended && (
                        <span
                          className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm"
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
                        className="text-[14px] font-medium leading-snug"
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
                        className="text-[13px] leading-[1.5] mt-0.5"
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
                    className="shrink-0 text-[14px] font-semibold tabular-nums"
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
