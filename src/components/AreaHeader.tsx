'use client';

import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { PostcodeData } from '@/lib/types';

interface AreaHeaderProps {
  postcodeData: PostcodeData | null;
}

export default function AreaHeader({ postcodeData }: AreaHeaderProps) {
  if (!postcodeData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="px-4 py-3 rounded-xl border"
      style={{
        background: 'var(--bg-tertiary)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-start gap-2">
        <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: '#3B82F6' }} />
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
            {postcodeData.adminWard || postcodeData.district}
          </div>
          <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
            {[postcodeData.adminDistrict, postcodeData.region]
              .filter(Boolean)
              .join(', ')}
          </div>
          <div className="mt-1 text-xs font-mono font-medium" style={{ color: '#3B82F6' }}>
            {postcodeData.postcode}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
