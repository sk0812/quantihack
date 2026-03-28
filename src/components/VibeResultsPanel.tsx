'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Lightbulb, Sparkles } from 'lucide-react';
import ScoreRing from './ScoreRing';
import { VibeResult } from '@/lib/vibeScoring';
import { vibeScoreColor, vibeScoreLabel } from '@/lib/vibeScoring';
import { formatDistance } from '@/lib/utils';

interface VibeResultsPanelProps {
  result: VibeResult | null;
  isLoading: boolean;
  tags: string[];        // extracted tags before results are in
  vibe: string;
}

function TagSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton h-12 rounded-lg" />
      ))}
    </div>
  );
}

export default function VibeResultsPanel({ result, isLoading, tags, vibe }: VibeResultsPanelProps) {
  if (!result && !isLoading && tags.length === 0) {
    return (
      <div
        className="rounded-xl p-4 flex flex-col items-center gap-3 text-center"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(139,92,246,0.15)' }}
        >
          <Sparkles size={18} style={{ color: '#8B5CF6' }} />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Vibe Match
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Describe what you&apos;re looking for and let AI find it in the map data
          </p>
        </div>
      </div>
    );
  }

  const color = result ? vibeScoreColor(result.score) : '#8B5CF6';
  const label = result ? vibeScoreLabel(result.score) : '';

  return (
    <div className="space-y-3">
      {/* Score card */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          Vibe Suitability
        </p>
        {isLoading && !result ? (
          <div className="flex justify-center">
            <div className="skeleton rounded-full w-20 h-20" />
          </div>
        ) : result ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-2"
          >
            <ScoreRing score={result.score} size={80} strokeWidth={7} color={color} large />
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: color + '20', color }}
            >
              {label}
            </span>
            {vibe && (
              <p
                className="text-xs text-center italic leading-relaxed px-2"
                style={{ color: 'var(--text-muted)' }}
              >
                &ldquo;{vibe.length > 60 ? vibe.slice(0, 60) + '…' : vibe}&rdquo;
              </p>
            )}
          </motion.div>
        ) : null}
      </div>

      {/* Extracted tags (shown while loading results) */}
      {tags.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            AI Extracted Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full font-mono"
                style={{
                  background: 'rgba(139,92,246,0.15)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  color: '#8B5CF6',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tag results breakdown */}
      {isLoading && !result ? (
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Matching Amenities…
          </p>
          <TagSkeleton />
        </div>
      ) : result && result.tagResults.length > 0 ? (
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Amenity Breakdown
          </p>
          <div className="space-y-2">
            {result.tagResults.map((r, i) => (
              <motion.div
                key={r.tag}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-lg px-3 py-2.5"
                style={{
                  background: 'var(--bg-secondary)',
                  border: `1px solid ${r.found ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)'}`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {r.found ? (
                      <CheckCircle2 size={13} className="shrink-0" style={{ color: '#10B981' }} />
                    ) : (
                      <XCircle size={13} className="shrink-0" style={{ color: '#EF4444' }} />
                    )}
                    <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {r.label}
                    </span>
                  </div>
                  <span
                    className="text-xs font-mono shrink-0 px-1.5 py-0.5 rounded"
                    style={{
                      background: r.found ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
                      color: r.found ? '#10B981' : '#EF4444',
                    }}
                  >
                    {r.count > 0 ? `${r.count} found` : 'none'}
                  </span>
                </div>

                {/* Top examples */}
                {r.found && r.examples.length > 0 && (
                  <div className="mt-1.5 pl-5 space-y-0.5">
                    {r.examples.slice(0, 2).map((ex, j) => (
                      <div key={j} className="flex items-center justify-between">
                        <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                          {ex.name || r.label}
                        </span>
                        <span className="text-xs font-mono ml-2 shrink-0" style={{ color: '#3B82F6' }}>
                          {formatDistance(ex.distance)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Pivot suggestions */}
      {result && result.pivotSuggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4"
          style={{
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.25)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={13} style={{ color: '#F59E0B' }} />
            <p className="text-xs font-semibold" style={{ color: '#F59E0B' }}>
              Pivot Suggestions
            </p>
          </div>
          <div className="space-y-2">
            {result.pivotSuggestions.map((s, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="text-xs leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                • {s}
              </motion.p>
            ))}
          </div>
        </motion.div>
      )}

      {/* All matched */}
      {result && result.missingTags.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl p-3 text-center"
          style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.25)',
          }}
        >
          <p className="text-xs font-medium" style={{ color: '#10B981' }}>
            All requested amenities found nearby
          </p>
        </motion.div>
      )}
    </div>
  );
}
