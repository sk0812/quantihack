'use client';

import { useState } from 'react';
import { Home, ExternalLink, Search, Flame, BadgeCheck, Info } from 'lucide-react';
import { motion } from 'framer-motion';

const PROPERTY_TYPES: Array<{ key: string; label: string; rm: string }> = [
  { key: 'flats',                label: 'Flat',       rm: 'flat' },
  { key: 'detached-houses',      label: 'Detached',   rm: 'detached' },
  { key: 'semi-detached-houses', label: 'Semi-Det.',  rm: 'semi-detached' },
  { key: 'terraced-houses',      label: 'Terraced',   rm: 'terraced' },
];

interface PropertyFinderProps {
  outcode: string;
  gentrificationScore: number | null;
  lifestyleScore: number | null;
  transportScore: number | null;
}

function buildRightmoveUrl(
  mode: 'buy' | 'rent',
  outcode: string,
  types: string[],
  minPrice: string,
  maxPrice: string,
  minBeds: number,
): string {
  const base = mode === 'buy'
    ? 'https://www.rightmove.co.uk/property-for-sale/find.html'
    : 'https://www.rightmove.co.uk/property-to-rent/find.html';
  const p = new URLSearchParams({ searchType: mode === 'buy' ? 'SALE' : 'RENT', searchLocation: outcode });
  if (minPrice) p.set('minPrice', minPrice);
  if (maxPrice) p.set('maxPrice', maxPrice);
  if (minBeds > 0) p.set('minBedrooms', String(minBeds));
  const rmTypes = types.map(t => PROPERTY_TYPES.find(pt => pt.key === t)?.rm).filter(Boolean) as string[];
  if (rmTypes.length > 0 && rmTypes.length < 4) p.set('propertyTypes', rmTypes.join(','));
  p.set('sortType', '6');
  return `${base}?${p.toString()}`;
}

function buildZooplaUrl(
  mode: 'buy' | 'rent',
  outcode: string,
  types: string[],
  minPrice: string,
  maxPrice: string,
  minBeds: number,
): string {
  const code = outcode.toLowerCase().replace(/\s+/g, '-');
  const base = mode === 'buy'
    ? `https://www.zoopla.co.uk/for-sale/property/${code}/`
    : `https://www.zoopla.co.uk/to-rent/property/${code}/`;
  const p = new URLSearchParams();
  if (minPrice) p.set('price_min', minPrice);
  if (maxPrice) p.set('price_max', maxPrice);
  if (minBeds > 0) p.set('beds_min', String(minBeds));
  if (types.length > 0 && types.length < 4) p.set('property_sub_type', types.join(','));
  p.set('results_sort', 'newest_listings');
  return `${base}?${p.toString()}`;
}

export default function PropertyFinder({
  outcode,
  gentrificationScore,
  lifestyleScore,
  transportScore,
}: PropertyFinderProps) {
  const [mode, setMode] = useState<'buy' | 'rent'>('buy');
  const [types, setTypes] = useState<string[]>(['flats', 'semi-detached-houses']);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minBeds, setMinBeds] = useState(1);

  const toggleType = (key: string) =>
    setTypes(prev => prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]);

  const suitability =
    lifestyleScore !== null && transportScore !== null
      ? Math.round((lifestyleScore * 0.55 + transportScore * 0.45) * 10) / 10
      : null;

  const suitabilityColor =
    suitability === null ? '#9CA3AF'
    : suitability >= 7 ? '#10B981'
    : suitability >= 4 ? '#F59E0B'
    : '#EF4444';

  const isHighGent = gentrificationScore !== null && gentrificationScore > 7;
  const rmUrl = buildRightmoveUrl(mode, outcode, types, minPrice, maxPrice, minBeds);
  const zooplaUrl = buildZooplaUrl(mode, outcode, types, minPrice, maxPrice, minBeds);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-3"
    >
      {/* Area overview cards */}
      <div className="grid grid-cols-2 gap-2">
        {suitability !== null && (
          <div className="rounded-xl p-3 flex flex-col gap-1"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1.5">
              <BadgeCheck size={12} style={{ color: suitabilityColor }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Area Fit</span>
            </div>
            <span className="text-xl font-black leading-none" style={{ color: suitabilityColor }}>
              {suitability.toFixed(1)}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>out of 10</span>
          </div>
        )}
        {gentrificationScore !== null && (
          <div className="rounded-xl p-3 flex flex-col gap-1"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1.5">
              <Flame size={12} style={{ color: '#EAB308' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Gentrify</span>
            </div>
            <span className="text-xl font-black leading-none" style={{ color: '#EAB308' }}>
              {gentrificationScore.toFixed(1)}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>out of 10</span>
          </div>
        )}
      </div>

      {isHighGent && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="flex items-start gap-2 p-3 rounded-xl"
          style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }}>
          <Flame size={12} style={{ color: '#EAB308', marginTop: 1, flexShrink: 0 }} />
          <p className="text-xs leading-relaxed" style={{ color: '#78350F' }}>
            <span className="font-semibold">Gentrification Premium:</span>{' '}
            Prices in {outcode} are rising faster than the borough average. Budget above asking.
          </p>
        </motion.div>
      )}

      {/* Search form */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-3 flex items-center gap-2"
          style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)' }}>
          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
            style={{ background: 'rgba(59,130,246,0.15)' }}>
            <Home size={12} style={{ color: '#3B82F6' }} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Find Your Home in {outcode}
          </span>
        </div>

        <div className="px-4 py-4 space-y-4" style={{ background: 'var(--bg-secondary)' }}>
          {/* Buy / Rent */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {(['buy', 'rent'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className="flex-1 py-2 text-xs font-semibold capitalize transition-all"
                style={{ background: mode === m ? '#3B82F6' : 'var(--bg-tertiary)', color: mode === m ? 'white' : 'var(--text-muted)' }}>
                {m === 'buy' ? 'Buy' : 'Rent'}
              </button>
            ))}
          </div>

          {/* Property types */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Property type</p>
            <div className="flex flex-wrap gap-1.5">
              {PROPERTY_TYPES.map(({ key, label }) => {
                const active = types.includes(key);
                return (
                  <button key={key} onClick={() => toggleType(key)}
                    className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
                    style={{
                      background: active ? 'rgba(59,130,246,0.12)' : 'var(--bg-tertiary)',
                      border: `1px solid ${active ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`,
                      color: active ? '#3B82F6' : 'var(--text-muted)',
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Budget{mode === 'rent' ? ' (pcm)' : ''}
            </p>
            <div className="flex items-center gap-2">
              <input type="number" placeholder="Min £" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                className="flex-1 min-w-0 text-xs px-3 py-2 rounded-lg"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
              <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>–</span>
              <input type="number" placeholder="Max £" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                className="flex-1 min-w-0 text-xs px-3 py-2 rounded-lg"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
          </div>

          {/* Min bedrooms */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Min bedrooms</p>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setMinBeds(n)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: minBeds === n ? '#3B82F6' : 'var(--bg-tertiary)',
                    border: `1px solid ${minBeds === n ? '#3B82F6' : 'var(--border)'}`,
                    color: minBeds === n ? 'white' : 'var(--text-muted)',
                  }}>
                  {n === 0 ? 'Any' : n === 5 ? '5+' : n}
                </button>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-2">
            <a href={rmUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
              style={{ background: '#10B981', color: 'white' }}>
              <Search size={12} />
              Search on Rightmove
              <ExternalLink size={11} />
            </a>
            <a href={zooplaUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <Search size={11} />
              Search on Zoopla
              <ExternalLink size={10} />
            </a>
          </div>

          <p className="flex items-center gap-1 text-center justify-center" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            <Info size={9} />
            Opens with your filters pre-applied
          </p>
        </div>
      </div>
    </motion.div>
  );
}
