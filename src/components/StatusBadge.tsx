import { STATUS_COLORS, PRIORITY_COLORS } from '@/lib/constants';

interface StatusBadgeProps {
  status: string;
  type?: 'status' | 'priority';
}

export default function StatusBadge({ status, type = 'status' }: StatusBadgeProps) {
  const colors = type === 'priority' ? PRIORITY_COLORS : STATUS_COLORS;
  const bgColor = colors[status.toLowerCase()] || 'bg-neutral-700 text-neutral-100';

  return (
    <span className={`${bgColor} px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
