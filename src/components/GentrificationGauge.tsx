'use client';

import { motion } from 'framer-motion';
import { Flame, AlertTriangle, TrendingUp, Building2 } from 'lucide-react';
import type { ElementType } from 'react';
import type { GentrificationResult } from '@/lib/gentrification';
import { gentrificationLabel, gentrificationColor } from '@/lib/gentrification';

interface TierInfo {
  icon: ElementType;
  title: string;
  text: string;
  bg: string;
  border: string;
  textColor: string;
  iconColor: string;
}

function getTierInfo(score: number, L: number, S: number): TierInfo {
  if (score >= 7) return {
    icon: AlertTriangle,
    title: 'High Displacement',
    text: `${L} lifestyle amenities vs ${S} legacy services. Late-stage transition — traditional businesses are being pushed out.`,
    bg: 'rgba(234,179,8,0.08)',
    border: 'rgba(234,179,8,0.3)',
    textColor: '#78350F',
    iconColor: '#EAB308',
  };
  if (score >= 4) return {
    icon: TrendingUp,
    title: 'Active Transition',
    text: `${L} lifestyle vs ${S} legacy amenities. Mixed signals — the neighbourhood is currently "hot" and shifting.`,
    bg: 'rgba(245,158,11,0.07)',
    border: 'rgba(245,158,11,0.25)',
    textColor: '#92400E',
    iconColor: '#F59E0B',
  };
  return {
    icon: Building2,
    title: 'Legacy Core',
    text: `${S} traditional service${S === 1 ? '' : 's'} vs ${L} lifestyle amenity${L === 1 ? '' : 's'}. Established working neighbourhood — low gentrification pressure.`,
    bg: 'rgba(107,114,128,0.07)',
    border: 'rgba(107,114,128,0.2)',
    textColor: '#374151',
    iconColor: '#6B7280',
  };
}

interface Props {
  result: GentrificationResult | null;
  isLoading: boolean;
}

export default function GentrificationGauge({ result, isLoading }: Props) {
  if (isLoading) {
    return (
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
            style={{ background: 'rgba(234,179,8,0.15)' }}>
            <Flame size={12} style={{ color: '#EAB308' }} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Gentrification Pulse
          </span>
        </div>
        <div className="skeleton h-16 rounded-lg" />
        <div className="skeleton h-10 rounded-lg" />
        <div className="skeleton h-12 rounded-lg" />
      </div>
    );
  }

  if (!result) return null;

  const { score, lifestyleCount: L, legacyCount: S } = result;
  const color = score !== null ? gentrificationColor(score) : '#9CA3AF';
  const label = score !== null ? gentrificationLabel(score) : 'Insufficient Data';
  const total = L + S;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{ background: 'rgba(234,179,8,0.15)' }}>
          <Flame size={12} style={{ color: '#EAB308' }} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Gentrification Pulse
        </span>
      </div>

      <div className="px-4 py-4 space-y-4" style={{ background: 'var(--bg-secondary)' }}>
        {score === null ? (
          <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
            No lifestyle or legacy amenities found nearby
          </p>
        ) : (
          <>
            {/* Score row */}
            <div className="flex items-center justify-between">
              <div>
                <span
                  className="text-4xl font-black leading-none"
                  style={{ color }}
                >
                  {score.toFixed(1)}
                </span>
                <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>/10</span>
              </div>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: `${color}22`, color }}
              >
                {label}
              </span>
            </div>

            {/* Mix bar */}
            {total > 0 && (
              <div className="space-y-1.5">
                <div className="flex rounded-full overflow-hidden" style={{ height: 8 }}>
                  <div style={{ width: `${(S / total) * 100}%`, background: '#9CA3AF', minWidth: S > 0 ? 4 : 0 }} />
                  <div style={{ width: `${(L / total) * 100}%`, background: color, minWidth: L > 0 ? 4 : 0 }} />
                </div>
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: '#6B7280' }}>{S} legacy</span>
                  <span className="text-xs" style={{ color }}>{L} lifestyle</span>
                </div>
              </div>
            )}

            {/* Tier insight */}
            {(() => {
              const tier = getTierInfo(score, L, S);
              const Icon = tier.icon;
              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-start gap-2.5 p-3 rounded-xl"
                  style={{ background: tier.bg, border: `1px solid ${tier.border}` }}
                >
                  <Icon size={13} style={{ color: tier.iconColor, marginTop: 1, flexShrink: 0 }} />
                  <p className="text-xs leading-relaxed" style={{ color: tier.textColor }}>
                    <span className="font-semibold">{tier.title}:</span>{' '}
                    {tier.text}
                  </p>
                </motion.div>
              );
            })()}
          </>
        )}
      </div>
    </motion.div>
  );
}
