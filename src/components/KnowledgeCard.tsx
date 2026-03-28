'use client';

import { useState } from 'react';
import { KnowledgeEntry } from '@/lib/supabase';
import StatusBadge from './StatusBadge';
import PartBadge from './PartBadge';

interface KnowledgeCardProps {
  entry: KnowledgeEntry;
}

export default function KnowledgeCard({ entry }: KnowledgeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const tags = Array.isArray(entry.tags) ? entry.tags : Object.keys(entry.tags || {});

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden hover:border-neutral-600 transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 hover:bg-neutral-700/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-100 mb-2">{entry.topic}</h3>
            <p className="text-neutral-400 text-sm line-clamp-2">{entry.summary}</p>
          </div>
          <span className="text-2xl flex-shrink-0">{expanded ? '▼' : '▶'}</span>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="bg-neutral-700 px-2.5 py-1 rounded text-xs text-neutral-300">
              {typeof tag === 'string' ? tag : Object.keys(tag)[0]}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="bg-neutral-700 px-2.5 py-1 rounded text-xs text-neutral-400">
              +{tags.length - 3} more
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-xs text-neutral-500">Confidence:</span>
            <span className="text-sm font-semibold text-amber-400">
              {Math.round(entry.confidence * 100)}%
            </span>
          </div>
          <span className="text-neutral-600">•</span>
          <PartBadge part={entry.part_owner} size="sm" />
          <span className="text-neutral-600">•</span>
          <span className="text-xs text-neutral-500">{formatDate(entry.modified)}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-neutral-700 p-4 bg-neutral-700/20 space-y-4">
          {entry.detail && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-300 mb-2">Detail</h4>
              <p className="text-sm text-neutral-400">{entry.detail}</p>
            </div>
          )}

          {entry.full_text && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-300 mb-2">Full Text</h4>
              <p className="text-sm text-neutral-400 max-h-48 overflow-y-auto">{entry.full_text}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-600">
            <div>
              <p className="text-xs text-neutral-500">Evidence Type</p>
              <p className="text-sm font-medium text-neutral-300">{entry.evidence_type}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Verified</p>
              <p className="text-sm font-medium text-neutral-300">{entry.verified ? '✓ Yes' : '✗ No'}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Asserted By</p>
              <p className="text-sm font-medium text-neutral-300">{entry.asserted_by}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Importance</p>
              <p className="text-sm font-medium text-neutral-300">{entry.importance_weight.toFixed(2)}</p>
            </div>
          </div>

          {entry.source && (
            <div className="pt-2 border-t border-neutral-600">
              <p className="text-xs text-neutral-500">Source</p>
              <p className="text-sm text-neutral-300 break-all">{entry.source}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
