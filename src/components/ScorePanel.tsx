'use client';

import { motion } from 'framer-motion';
import { Shield, Train, Coffee, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import ScoreRing from './ScoreRing';
import { Scores } from '@/lib/types';
import { getScoreColor, getScoreLabel } from '@/lib/utils';
import { COLORS } from '@/lib/constants';

interface ScorePanelProps {
  scores: Scores | null;
  isLoading: boolean;
}

function SkeletonRing({ size }: { size: number }) {
  return (
    <div
      className="skeleton rounded-full"
      style={{ width: size, height: size }}
    />
  );
}

export default function ScorePanel({ scores, isLoading }: ScorePanelProps) {
  const [howOpen, setHowOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <SkeletonRing size={100} />
        </div>
        <div className="flex justify-around">
          <SkeletonRing size={64} />
          <SkeletonRing size={64} />
          <SkeletonRing size={64} />
        </div>
      </div>
    );
  }

  if (!scores) {
    return (
      <div
        className="rounded-xl p-4 text-center"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Search a postcode to see scores
        </p>
      </div>
    );
  }

  const overallColor = getScoreColor(scores.overall);
  const overallLabel = getScoreLabel(scores.overall);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* Overall score */}
      <div
        className="rounded-xl p-4 flex flex-col items-center gap-2"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
      >
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Overall Score
        </p>
        <ScoreRing
          score={scores.overall}
          size={100}
          strokeWidth={8}
          color={overallColor}
          large
        />
        <div className="text-center">
          <span
            className="text-sm font-semibold px-3 py-0.5 rounded-full"
            style={{
              background: overallColor + '20',
              color: overallColor,
            }}
          >
            {overallLabel}
          </span>
        </div>
      </div>

      {/* Category scores */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
      >
        <div className="flex justify-around">
          <div className="flex flex-col items-center gap-2">
            <Shield size={14} style={{ color: COLORS.safety }} />
            <ScoreRing
              score={scores.safety}
              size={64}
              strokeWidth={5}
              color={COLORS.safety}
              label="Safety"
              sublabel={getScoreLabel(scores.safety)}
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            <Train size={14} style={{ color: COLORS.transport }} />
            <ScoreRing
              score={scores.transport}
              size={64}
              strokeWidth={5}
              color={COLORS.transport}
              label="Transport"
              sublabel={getScoreLabel(scores.transport)}
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            <Coffee size={14} style={{ color: COLORS.lifestyle }} />
            <ScoreRing
              score={scores.lifestyle}
              size={64}
              strokeWidth={5}
              color={COLORS.lifestyle}
              label="Lifestyle"
              sublabel={getScoreLabel(scores.lifestyle)}
            />
          </div>
        </div>
      </div>

      {/* How scores work */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        <button
          onClick={() => setHowOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium transition-all hover:opacity-80"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
          }}
          aria-expanded={howOpen}
        >
          How scores work
          <ChevronDown
            size={14}
            style={{
              transform: howOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </button>
        {howOpen && (
          <div
            className="px-4 py-3 space-y-2"
            style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}
          >
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              <span style={{ color: COLORS.safety }}>Safety</span> — based on crime incident
              density within 1km (35% weight)
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              <span style={{ color: COLORS.transport }}>Transport</span> — rail stations &amp;
              bus stops within 1km (30% weight)
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              <span style={{ color: COLORS.lifestyle }}>Lifestyle</span> — cafés, gyms, parks,
              shops &amp; restaurants (35% weight)
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
