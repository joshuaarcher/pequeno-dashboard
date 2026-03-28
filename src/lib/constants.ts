export const PART_COLORS: Record<string, string> = {
  forge: '#f59e0b',
  loom: '#8b5cf6',
  mercury: '#3b82f6',
  thoth: '#10b981',
  nyx: '#ec4899',
  josh: '#ffffff',
  apollo: '#ef4444',
  coyote: '#f97316',
  athena: '#6366f1',
};

export const PART_BG_COLORS: Record<string, string> = {
  forge: 'bg-amber-600',
  loom: 'bg-purple-600',
  mercury: 'bg-blue-600',
  thoth: 'bg-green-600',
  nyx: 'bg-pink-600',
  josh: 'bg-neutral-500',
  apollo: 'bg-red-600',
  coyote: 'bg-orange-600',
  athena: 'bg-indigo-600',
};

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-neutral-700 text-neutral-100',
  in_progress: 'bg-blue-900 text-blue-100',
  blocked: 'bg-red-900 text-red-100',
  completed: 'bg-green-900 text-green-100',
  deferred: 'bg-yellow-900 text-yellow-100',
  sent: 'bg-blue-900 text-blue-100',
  read: 'bg-neutral-700 text-neutral-100',
  acknowledged: 'bg-green-900 text-green-100',
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-neutral-700 text-neutral-100',
  medium: 'bg-yellow-900 text-yellow-100',
  high: 'bg-red-900 text-red-100',
};

export const TASK_STATUS_ORDER = ['pending', 'in_progress', 'blocked', 'completed', 'deferred'];

export const PAGINATION_SIZE = 50;
