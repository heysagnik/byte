import React from 'react';
import { Badge } from '../ui/badge';

export interface PlaceItem {
  title: string;
  category?: string;
  address?: string;
  rating?: number;
  ratingCount?: number;
  priceLevel?: string;
  phoneNumber?: string;
  website?: string;
  mapsUrl?: string;
  latitude?: number;
  longitude?: number;
}

interface PlaceCardGridProps {
  places: PlaceItem[];
  title?: string;
}

export function PlaceCardGrid({ places, title = 'Locations & Places' }: PlaceCardGridProps) {
  if (!places || places.length === 0) return null;

  return (
    <div className="my-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: 'var(--accent)' }}
        />
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
        >
          {title} ({places.length})
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {places.map((place, idx) => {
          const mapsLink =
            place.mapsUrl ||
            (place.latitude && place.longitude
              ? `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${place.title} ${place.address || ''}`,
                )}`);

          return (
            <div
              key={idx}
              className="rounded-lg p-3.5 flex flex-col justify-between transition-all duration-200 hover:border-accent/40"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div>
                {/* Header row with badges */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4
                    className="font-medium text-[15px] leading-snug line-clamp-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {place.title}
                  </h4>
                  {place.rating && (
                    <Badge
                      className="px-1.5 py-0.5 text-[11px] font-semibold flex items-center gap-1 border-0 shrink-0"
                      style={{
                        background: 'rgba(234, 179, 8, 0.15)',
                        color: '#eab308',
                      }}
                    >
                      <span>⭐</span>
                      <span>{place.rating}</span>
                      {place.ratingCount && (
                        <span className="opacity-70 font-normal">({place.ratingCount})</span>
                      )}
                    </Badge>
                  )}
                </div>

                {/* Tags row */}
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  {place.category && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded uppercase font-mono tracking-wider"
                      style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
                    >
                      {place.category}
                    </span>
                  )}
                  {place.priceLevel && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded uppercase font-mono tracking-wider font-semibold"
                      style={{ background: 'var(--bg-surface)', color: 'var(--accent)' }}
                    >
                      {place.priceLevel}
                    </span>
                  )}
                </div>

                {/* Address */}
                {place.address && (
                  <p
                    className="text-[13px] leading-relaxed line-clamp-2 mb-3"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    📍 {place.address}
                  </p>
                )}
              </div>

              {/* Actions footer */}
              <div
                className="pt-2.5 mt-auto flex items-center gap-2"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                {mapsLink && (
                  <a
                    href={mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center py-1.5 px-2 rounded text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5"
                    style={{
                      background: 'var(--accent)',
                      color: '#ffffff',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                      <circle cx="12" cy="9" r="2.5"/>
                    </svg>
                    <span>Google Maps</span>
                  </a>
                )}
                {place.phoneNumber && (
                  <a
                    href={`tel:${place.phoneNumber.replace(/\s+/g, '')}`}
                    className="py-1.5 px-2.5 rounded text-[12px] font-medium transition-colors flex items-center justify-center gap-1"
                    style={{
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    📞 {place.phoneNumber}
                  </a>
                )}
                {place.website && (
                  <a
                    href={place.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-1.5 px-2.5 rounded text-[12px] font-medium transition-colors flex items-center justify-center gap-1"
                    style={{
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    🌐 Web
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
