'use client';

import { Train, UtensilsCrossed, Shield, Flame, Leaf } from 'lucide-react';
import { FilterState, MarkerCounts } from '@/lib/types';

interface FilterBarProps {
  filters: FilterState;
  counts: MarkerCounts;
  onToggle: (category: keyof FilterState) => void;
}

const FILTER_CONFIG = [
  {
    key: 'transport' as const,
    label: 'Transport',
    icon: Train,
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.2)',
    border: 'rgba(59,130,246,0.4)',
  },
  {
    key: 'amenity' as const,
    label: 'Amenities',
    icon: UtensilsCrossed,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.2)',
    border: 'rgba(245,158,11,0.4)',
  },
  {
    key: 'safety' as const,
    label: 'Safety',
    icon: Shield,
    color: '#10B981',
    bg: 'rgba(16,185,129,0.2)',
    border: 'rgba(16,185,129,0.4)',
  },
  {
    key: 'gentrification' as const,
    label: 'Gentrify',
    icon: Flame,
    color: '#EAB308',
    bg: 'rgba(234,179,8,0.2)',
    border: 'rgba(234,179,8,0.4)',
  },
  {
    key: 'biophilia' as const,
    label: 'Zen',
    icon: Leaf,
    color: '#10B981',
    bg: 'rgba(16,185,129,0.2)',
    border: 'rgba(16,185,129,0.4)',
  },
];

export default function FilterBar({ filters, counts, onToggle }: FilterBarProps) {
  return (
    <div className="flex items-center gap-2">
      {FILTER_CONFIG.map(({ key, label, icon: Icon, color, bg, border }) => {
        const active = filters[key];
        const count = counts[key];
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className="filter-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: active ? bg : 'rgba(0,0,0,0.04)',
              border: `1px solid ${active ? border : 'rgba(0,0,0,0.1)'}`,
              color: active ? color : '#9ca3af',
            }}
            aria-pressed={active}
            aria-label={`Toggle ${label} markers`}
          >
            <Icon size={12} />
            {label}
            {count > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-xs font-bold leading-none"
                style={{
                  background: active ? color + '20' : 'rgba(0,0,0,0.06)',
                  color: active ? color : '#9ca3af',
                  fontSize: '10px',
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
