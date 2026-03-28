'use client';

import { useEffect, useRef, useState } from 'react';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label?: string;
  sublabel?: string;
  large?: boolean;
}

export default function ScoreRing({
  score,
  size = 64,
  strokeWidth = 6,
  color,
  label,
  sublabel,
  large = false,
}: ScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const duration = 1000;

  useEffect(() => {
    startTimeRef.current = null;
    const target = score;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(eased * target);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (animatedScore / 10) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.05s linear' }}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: 'rotate(0deg)' }}
        >
          <span
            className={`font-bold leading-none ${large ? 'text-2xl' : 'text-sm'}`}
            style={{ color }}
          >
            {animatedScore.toFixed(1)}
          </span>
        </div>
      </div>
      {(label || sublabel) && (
        <div className="text-center">
          {label && (
            <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {label}
            </div>
          )}
          {sublabel && (
            <div className="text-xs font-semibold" style={{ color }}>
              {sublabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
