import React from 'react';

export interface SourceItem {
  title: string;
  url: string;
  snippet?: string;
  domain?: string;
}

interface SourceCardGridProps {
  sources: SourceItem[];
  title?: string;
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'web';
  }
}

export function SourceCardGrid({ sources, title = 'Web Sources & References' }: SourceCardGridProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="my-3 space-y-2">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: 'var(--accent)' }}
        />
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
        >
          {title} ({sources.length})
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {sources.map((item, idx) => {
          const domain = item.domain || extractDomain(item.url);
          const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

          return (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-md p-3 flex flex-col justify-between transition-all duration-200 hover:border-accent/40 hover:-translate-y-0.5"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <img
                    src={faviconUrl}
                    alt=""
                    className="w-4 h-4 rounded-xs shrink-0 opacity-80"
                    onError={e => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span
                    className="text-[11px] font-mono truncate"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {domain}
                  </span>
                </div>

                <h5
                  className="text-[13px] font-medium leading-snug line-clamp-2 group-hover:text-accent transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {item.title}
                </h5>

                {item.snippet && (
                  <p
                    className="text-[12px] leading-relaxed line-clamp-2 mt-1.5 opacity-70"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {item.snippet}
                  </p>
                )}
              </div>

              <div className="mt-2.5 flex items-center justify-end text-[11px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                  <span>Visit site</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
