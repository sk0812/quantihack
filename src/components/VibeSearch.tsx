'use client';

import { useState, useRef } from 'react';
import { Sparkles, Loader2, ChevronDown } from 'lucide-react';

interface VibeSearchProps {
  hasPostcode: boolean;
  isLoading: boolean;
  onSearch: (vibe: string) => void;
}

export default function VibeSearch({ hasPostcode, isLoading, onSearch }: VibeSearchProps) {
  const [expanded, setExpanded] = useState(false);
  const [vibe, setVibe] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSearch = () => {
    if (!vibe.trim() || isLoading || !hasPostcode) return;
    onSearch(vibe.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSearch();
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {/* Header toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 transition-all hover:opacity-80"
        style={{ background: 'var(--bg-tertiary)' }}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.15)' }}
          >
            <Sparkles size={12} style={{ color: '#8B5CF6' }} />
          </div>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            Vibe Match
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}
          >
            AI
          </span>
        </div>
        <ChevronDown
          size={14}
          style={{
            color: 'var(--text-muted)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {expanded && (
        <div
          className="px-4 py-3 space-y-3"
          style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}
        >
          <div>
            <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>
              Describe your ideal neighbourhood
            </label>
            <textarea
              ref={textareaRef}
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='e.g. "quiet place near a library with good sourdough and parks"'
              rows={3}
              className="w-full text-xs rounded-lg px-3 py-2.5 resize-none transition-all"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                lineHeight: '1.5',
              }}
              disabled={isLoading}
              aria-label="Neighbourhood vibe description"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              ⌘+Enter to search
            </p>
          </div>

          <button
            onClick={handleSearch}
            disabled={isLoading || !vibe.trim() || !hasPostcode}
            className="w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#8B5CF6', color: 'white' }}
            aria-label="Run vibe match"
          >
            {isLoading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Analysing vibe…
              </>
            ) : (
              <>
                <Sparkles size={13} />
                {!hasPostcode ? 'Search a postcode first' : 'Match My Vibe'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
