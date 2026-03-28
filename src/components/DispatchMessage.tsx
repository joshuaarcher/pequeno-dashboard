'use client';

import { useState } from 'react';
import { CombinedMessage } from '@/lib/supabase';
import PartBadge from './PartBadge';
import StatusBadge from './StatusBadge';

interface DispatchMessageProps {
  message: CombinedMessage;
}

export default function DispatchMessage({ message }: DispatchMessageProps) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const bodyPreview = message.body.length > 120 ? message.body.substring(0, 120) + '...' : message.body;

  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden hover:border-neutral-600 transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 hover:bg-neutral-700/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <PartBadge part={message.from_part} size="sm" />
            <span className="text-neutral-500 text-sm">→</span>
            <PartBadge part={message.to_part} size="sm" />
            <span className="text-neutral-600">•</span>
            <StatusBadge status={message.status} />
          </div>
          <span className="text-2xl flex-shrink-0">{expanded ? '▼' : '▶'}</span>
        </div>

        <div className="mb-2">
          <h3 className="text-base font-semibold text-neutral-100">{message.subject}</h3>
          <p className="text-sm text-neutral-400 mt-1">{bodyPreview}</p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-neutral-500">{formatDate(message.created_at)}</span>
          {'priority' in message && message.priority && (
            <span className="text-xs font-semibold text-amber-400 uppercase">{message.priority}</span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-neutral-700 p-4 bg-neutral-700/20">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-neutral-300 mb-2">Full Message</h4>
              <p className="text-sm text-neutral-400 whitespace-pre-wrap">{message.body}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-600">
              <div>
                <p className="text-xs text-neutral-500">From</p>
                <p className="text-sm font-medium text-neutral-300 capitalize">{message.from_part}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">To</p>
                <p className="text-sm font-medium text-neutral-300 capitalize">{message.to_part}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Status</p>
                <p className="text-sm font-medium text-neutral-300">{message.status}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Created</p>
                <p className="text-sm font-medium text-neutral-300">{formatDate(message.created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
