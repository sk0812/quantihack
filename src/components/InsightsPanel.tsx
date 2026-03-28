'use client';

import { motion } from 'framer-motion';
import {
  Train, Coffee, Trees, ShoppingCart, Dumbbell,
  UtensilsCrossed, Shield, ShieldCheck, ShieldAlert,
  Bus, MapPin, Clock, Lock, GraduationCap
} from 'lucide-react';
import { Insight, AmenityPoint } from '@/lib/types';
import { formatDistance, walkingTime } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  Train, Coffee, Trees, ShoppingCart, Dumbbell,
  UtensilsCrossed, Shield, ShieldCheck, ShieldAlert, Bus, MapPin, Clock, Lock, GraduationCap,
};

const SENTIMENT_COLORS = {
  positive: '#10B981',
  neutral: '#F59E0B',
  negative: '#EF4444',
};

interface NearbyHighlight {
  name: string;
  type: string;
  distance: number;
}

interface InsightsPanelProps {
  insights: Insight[];
  nearbyHighlights: NearbyHighlight[];
  nearestStation: AmenityPoint | null;
  isLoading: boolean;
}

function InsightSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl">
          <div className="skeleton rounded-full w-8 h-8 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-3/4 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    cafe: 'Café', restaurant: 'Restaurant', pub: 'Pub',
    supermarket: 'Supermarket', convenience: 'Convenience Store',
    gym: 'Gym', park: 'Park', station: 'Station', subway: 'Tube Station',
    bus_stop: 'Bus Stop', school: 'School', college: 'College', university: 'University',
  };
  return map[type] ?? type;
}

export default function InsightsPanel({
  insights,
  nearbyHighlights,
  nearestStation,
  isLoading,
}: InsightsPanelProps) {
  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1">
      {/* Insights */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
      >
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          Area Insights
        </h3>
        {isLoading ? (
          <InsightSkeleton />
        ) : insights.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Search a postcode to see insights
          </p>
        ) : (
          <div className="space-y-2">
            {insights.map((insight, i) => {
              const Icon = ICON_MAP[insight.icon] ?? Shield;
              const color = SENTIMENT_COLORS[insight.sentiment];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.35 }}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: color + '20' }}
                  >
                    <Icon size={14} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {insight.text}
                    </p>
                  </div>
                  <div
                    className="w-2 h-2 rounded-full shrink-0 mt-1"
                    style={{ background: color }}
                    aria-label={`${insight.sentiment} indicator`}
                  />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Nearby highlights */}
      {(isLoading || nearbyHighlights.length > 0) && (
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Nearby Highlights
          </h3>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-10 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {nearbyHighlights.slice(0, 3).map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center justify-between p-2.5 rounded-lg"
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {item.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {typeLabel(item.type)}
                    </p>
                  </div>
                  <span className="text-xs font-mono ml-2 shrink-0" style={{ color: '#3B82F6' }}>
                    {formatDistance(item.distance)}
                  </span>
                </motion.div>
              ))}

              {nearestStation && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center justify-between p-2.5 rounded-lg mt-1"
                  style={{
                    background: 'rgba(59,130,246,0.08)',
                    border: '1px solid rgba(59,130,246,0.2)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Train size={12} className="shrink-0" style={{ color: '#3B82F6' }} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {nearestStation.name || 'Nearest Station'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {typeLabel(nearestStation.type)} ·{' '}
                        {walkingTime(nearestStation.distance ?? 0)} min walk
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono ml-2 shrink-0" style={{ color: '#3B82F6' }}>
                    {formatDistance(nearestStation.distance ?? 0)}
                  </span>
                </motion.div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Compare CTA */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
      >
        <button
          disabled
          className="w-full py-2.5 rounded-lg text-xs font-medium opacity-40 cursor-not-allowed"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          Compare areas — coming soon
        </button>
      </div>
    </div>
  );
}
