import React from 'react';

interface ChipStackProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function formatChips(amount: number): string {
  if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (amount >= 1_000) {
    return (amount / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return amount.toLocaleString();
}

export const ChipStack: React.FC<ChipStackProps> = ({
  amount,
  size = 'md',
  showLabel = true,
  className = '',
}) => {
  const getChipColors = () => {
    if (amount >= 10000) return 'from-amber-400 to-amber-600 border-amber-300 text-amber-950';
    if (amount >= 1000) return 'from-emerald-400 to-emerald-600 border-emerald-300 text-emerald-950';
    if (amount >= 100) return 'from-rose-500 to-rose-700 border-rose-300 text-rose-950';
    return 'from-sky-400 to-sky-600 border-sky-300 text-sky-950';
  };

  const sizeClasses = {
    sm: 'w-4 h-4 text-[9px] border',
    md: 'w-6 h-6 text-[11px] border-[1.5px]',
    lg: 'w-8 h-8 text-xs border-2',
  }[size];

  return (
    <div className={`inline-flex items-center gap-1.5 font-bold ${className}`}>
      {/* 3D Chip Icon */}
      <div
        className={`${sizeClasses} ${getChipColors()} rounded-full shadow-chip bg-gradient-to-b flex items-center justify-center font-extrabold select-none shrink-0 relative`}
      >
        <div className="absolute inset-[2px] rounded-full border border-white/40 border-dashed" />
        <span className="relative z-10 leading-none">♦</span>
      </div>

      {showLabel && (
        <span className="font-['JetBrains_Mono'] tracking-tight text-white drop-shadow font-extrabold">
          {formatChips(amount)}
        </span>
      )}
    </div>
  );
};
