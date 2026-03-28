import { PART_BG_COLORS } from '@/lib/constants';

interface PartBadgeProps {
  part: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function PartBadge({ part, size = 'md' }: PartBadgeProps) {
  if (!part) return null;
  const bgColor = PART_BG_COLORS[part.toLowerCase()] || 'bg-neutral-600';
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <span
      className={`${bgColor} ${sizeClasses[size]} rounded-full font-semibold text-white inline-block capitalize`}
    >
      {part}
    </span>
  );
}
