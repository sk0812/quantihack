'use client';

import { motion } from 'framer-motion';
import { Leaf, Waves, AlertTriangle, TreePine } from 'lucide-react';
import type { ElementType } from 'react';
import type { BiophiliaResult } from '@/lib/biophilia';
import { biophiliaLabel, biophiliaColor } from '@/lib/biophilia';

interface TierInfo {
  icon: ElementType;
  title: string;
  bg: string;
  border: string;
  textColor: string;
  iconColor: string;
}

function getTierInfo(score: number): TierInfo {
  if (score >= 8) return {
    icon: TreePine,
    title: 'Deep Sanctuary',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.3)',
    textColor: '#065F46',
    iconColor: '#10B981',
  };
  if (score >= 5) return {
    icon: Waves,
    title: 'Balanced Urban',
    bg: 'rgba(245,158,11,0.07)',
    border: 'rgba(245,158,11,0.25)',
    textColor: '#92400E',
    iconColor: '#F59E0B',
  };
  return {
    icon: AlertTriangle,
    title: 'Grey Desert',
    bg: 'rgba(107,114,128,0.07)',
    border: 'rgba(107,114,128,0.2)',
    textColor: '#374151',
    iconColor: '#6B7280',
  };
}

interface Props {
  result: BiophiliaResult | null;
  isLoading: boolean;
}

export default function BiophiliaPanel({ result, isLoading }: Props) {
  if (isLoading) {
    return (
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
            style={{ background: 'rgba(16,185,129,0.15)' }}
          >
            <Leaf size={12} style={{ color: '#10B981' }} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Biophilic Restorative Score
          </span>
        </div>
        <div className="skeleton h-16 rounded-lg" />
        <div className="skeleton h-8 rounded-lg" />
        <div className="skeleton h-12 rounded-lg" />
      </div>
    );
  }

  if (!result) return null;

  const { score, mathScore, aiScore, aiReason, natureWeight, stressorPenalty } = result;
  const color = biophiliaColor(score);
  const label = biophiliaLabel(score);
  const tier = getTierInfo(score);
  const Icon = tier.icon;

  // Nature-to-Noise ratio for the bar
  const total = natureWeight + stressorPenalty;
  const natureRatio = total > 0 ? natureWeight / total : 0.5;
  const stressorRatio = total > 0 ? stressorPenalty / total : 0.5;

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
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{ background: 'rgba(16,185,129,0.15)' }}
        >
          <Leaf size={12} style={{ color: '#10B981' }} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Biophilic Restorative Score
        </span>
      </div>

      <div className="px-4 py-4 space-y-4" style={{ background: 'var(--bg-secondary)' }}>
        {/* Score row */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-4xl font-black leading-none" style={{ color }}>
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

        {/* Nature-to-Noise ratio bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>Nature</span>
            <span>Noise</span>
          </div>
          <div className="flex rounded-full overflow-hidden" style={{ height: 8 }}>
            <div
              style={{
                width: `${natureRatio * 100}%`,
                background: '#10B981',
                minWidth: natureWeight > 0 ? 4 : 0,
                transition: 'width 0.6s ease',
              }}
            />
            <div
              style={{
                width: `${stressorRatio * 100}%`,
                background: '#EF4444',
                minWidth: stressorPenalty > 0 ? 4 : 0,
              }}
            />
          </div>
          <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: '#10B981' }}>+{natureWeight.toFixed(1)} pts</span>
            <span style={{ color: '#EF4444' }}>−{stressorPenalty.toFixed(1)} pts</span>
          </div>
        </div>

        {/* Score breakdown (math vs AI) */}
        {aiScore !== null && (
          <div
            className="grid grid-cols-2 gap-2 p-3 rounded-xl"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
          >
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {mathScore.toFixed(1)}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Math balance</div>
            </div>
            <div className="text-center border-l" style={{ borderColor: 'var(--border)' }}>
              <div className="text-lg font-bold" style={{ color: '#8B5CF6' }}>
                {aiScore.toFixed(1)}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Psych score</div>
            </div>
          </div>
        )}

        {/* AI insight */}
        {aiReason && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-start gap-2.5 p-3 rounded-xl"
            style={{ background: tier.bg, border: `1px solid ${tier.border}` }}
          >
            <Icon size={13} style={{ color: tier.iconColor, marginTop: 1, flexShrink: 0 }} />
            <p className="text-xs leading-relaxed" style={{ color: tier.textColor }}>
              <span className="font-semibold">Environmental Psychologist:</span>{' '}
              {aiReason}
            </p>
          </motion.div>
        )}

        {/* No-AI fallback insight */}
        {!aiReason && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-start gap-2.5 p-3 rounded-xl"
            style={{ background: tier.bg, border: `1px solid ${tier.border}` }}
          >
            <Icon size={13} style={{ color: tier.iconColor, marginTop: 1, flexShrink: 0 }} />
            <p className="text-xs leading-relaxed" style={{ color: tier.textColor }}>
              <span className="font-semibold">{tier.title}:</span>{' '}
              {score >= 8
                ? 'High nature, low noise — this area scores well for mental restoration.'
                : score >= 5
                ? 'Standard city greenery with moderate noise friction.'
                : 'Dominated by roads and concrete — limited restorative potential.'}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
