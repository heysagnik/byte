import React, { useState } from 'react';
import { Badge } from '../ui/badge';

export interface CallReportData {
  title?: string;
  recipient?: string;
  phoneNumber?: string;
  durationSecs?: number;
  outcome?: string;
  summary?: string;
  transcript?: string;
  reason?: string;
}

export function CallReportCard({ report }: { report: CallReportData }) {
  const [showTranscript, setShowTranscript] = useState(false);

  if (!report) return null;

  const isSuccess = report.outcome === 'success' || report.outcome === 'done';
  const isNoAnswer = report.outcome === 'no_answer' || report.reason === 'no_answer';

  const badgeColor = isSuccess
    ? 'rgba(34, 197, 94, 0.15)'
    : isNoAnswer
      ? 'rgba(234, 179, 8, 0.15)'
      : 'rgba(239, 68, 68, 0.15)';
  const badgeTextColor = isSuccess ? '#22c55e' : isNoAnswer ? '#eab308' : '#ef4444';
  const badgeText = isSuccess ? 'Call Completed' : isNoAnswer ? 'No Answer' : 'Call Ended';

  return (
    <div
      className="my-3 rounded-lg overflow-hidden transition-all duration-200"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* Top Banner */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            📞
          </div>
          <div className="min-w-0">
            <h4
              className="text-[14px] font-semibold leading-snug truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {report.title || `Call with ${report.recipient || 'Recipient'}`}
            </h4>
            {report.phoneNumber && (
              <p className="text-[12px] font-mono opacity-60 line-clamp-1">
                {report.phoneNumber}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {report.durationSecs !== undefined && report.durationSecs > 0 && (
            <span
              className="text-[11px] font-mono px-2 py-0.5 rounded"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
            >
              ⏱️ {report.durationSecs}s
            </span>
          )}
          <Badge
            className="px-2 py-0.5 text-[11px] font-semibold border-0"
            style={{ background: badgeColor, color: badgeTextColor }}
          >
            {badgeText}
          </Badge>
        </div>
      </div>

      {/* Summary Content */}
      {report.summary && (
        <div className="p-4 space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider opacity-60">
            Call Summary & Takeaways
          </div>
          <p
            className="text-[14px] leading-relaxed whitespace-pre-line"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
          >
            {report.summary}
          </p>
        </div>
      )}

      {/* Transcript Collapsible Toggle */}
      {report.transcript && report.transcript !== 'No transcript available.' && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full px-4 py-2.5 text-left text-[12px] font-mono font-medium flex items-center justify-between transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>📝 {showTranscript ? 'Hide Full Conversation Transcript' : 'View Full Conversation Transcript'}</span>
            <span>{showTranscript ? '▲' : '▼'}</span>
          </button>

          {showTranscript && (
            <div
              className="p-4 text-[13px] leading-relaxed font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                borderTop: '1px solid var(--border)',
              }}
            >
              {report.transcript}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
