'use client';

import { useState, useEffect, KeyboardEvent } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { validatePostcode, normalisePostcode } from '@/lib/utils';
import { RECENT_SEARCHES_KEY, MAX_RECENT_SEARCHES } from '@/lib/constants';

interface PostcodeSearchProps {
  onSearch: (postcode: string) => void;
  isLoading: boolean;
}

export default function PostcodeSearch({ onSearch, isLoading }: PostcodeSearchProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {}
  }, []);

  const addRecentSearch = (postcode: string) => {
    const updated = [
      postcode,
      ...recentSearches.filter((p) => p !== postcode),
    ].slice(0, MAX_RECENT_SEARCHES);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleSearch = (postcode?: string) => {
    const query = normalisePostcode(postcode ?? value);
    if (!validatePostcode(query)) {
      setError('Enter a full postcode (EC1A 1BB) or district code (HA6)');
      return;
    }
    setError('');
    addRecentSearch(query);
    onSearch(query);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  const removeRecent = (postcode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter((p) => p !== postcode);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {}
  };

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value.toUpperCase());
            if (error) setError('');
          }}
          onKeyDown={handleKeyDown}
          placeholder="Postcode or district (e.g. HA6)"
          className="search-input w-full pl-4 pr-12 py-3 rounded-xl text-sm font-medium transition-all"
          style={{
            background: 'var(--bg-tertiary)',
            border: `1px solid ${error ? '#EF4444' : 'var(--border)'}`,
            color: 'var(--text-primary)',
          }}
          aria-label="Enter UK postcode"
          aria-describedby={error ? 'postcode-error' : undefined}
          disabled={isLoading}
        />
        <button
          onClick={() => handleSearch()}
          disabled={isLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: '#3B82F6' }}
          aria-label="Search postcode"
        >
          {isLoading ? (
            <Loader2 size={14} className="text-white animate-spin" />
          ) : (
            <Search size={14} className="text-white" />
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p id="postcode-error" className="text-xs px-1" style={{ color: '#EF4444' }}>
          {error}
        </p>
      )}

      {/* Recent searches */}
      {recentSearches.length > 0 && (
        <div>
          <p className="text-xs mb-2 px-1 font-medium" style={{ color: 'var(--text-muted)' }}>
            Recent
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recentSearches.map((postcode) => (
              <div
                key={postcode}
                className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg text-xs font-mono font-medium cursor-pointer transition-all hover:opacity-80"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}
                onClick={() => {
                  setValue(postcode);
                  handleSearch(postcode);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(postcode)}
                aria-label={`Search ${postcode} again`}
              >
                {postcode}
                <button
                  onClick={(e) => removeRecent(postcode, e)}
                  className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"
                  aria-label={`Remove ${postcode} from recent searches`}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
