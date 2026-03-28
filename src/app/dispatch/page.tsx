'use client';

import { useEffect, useState } from 'react';
import { supabase, DispatchMessage, RelayMessage, CombinedMessage } from '@/lib/supabase';
import SearchBar from '@/components/SearchBar';
import PartBadge from '@/components/PartBadge';
import StatusBadge from '@/components/StatusBadge';
import { PART_COLORS } from '@/lib/constants';

interface ExpandedMessage {
  id: string;
  type: 'dispatch' | 'relay';
}

export default function DispatchPage() {
  const [messages, setMessages] = useState<CombinedMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<CombinedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMessages, setExpandedMessages] = useState<Map<string, boolean>>(new Map());
  const [page, setPage] = useState(0);
  
  // Filter state
  const [fromPartFilter, setFromPartFilter] = useState<Set<string>>(new Set());
  const [toPartFilter, setToPartFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set(['dispatch', 'relay']));
  const [availableParts, setAvailableParts] = useState<string[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);

  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        // Fetch dispatch messages
        const { data: dispatchData, error: dispatchError } = await supabase
          .from('dispatch')
          .select('*')
          .order('created_at', { ascending: false });

        if (dispatchError) throw dispatchError;

        // Fetch relay messages
        const { data: relayData, error: relayError } = await supabase
          .from('relay_messages')
          .select('*')
          .order('created_at', { ascending: false });

        if (relayError) throw relayError;

        // Combine messages
        const combined: CombinedMessage[] = [
          ...((dispatchData || []) as DispatchMessage[]).map(m => ({
            ...m,
            _type: 'dispatch' as const,
          })),
          ...((relayData || []) as RelayMessage[]).map(m => ({
            ...m,
            _type: 'relay' as const,
          })),
        ];

        // Sort by timestamp
        combined.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );

        setMessages(combined);

        // Extract available parts and statuses
        const parts = new Set<string>();
        const statuses = new Set<string>();

        combined.forEach(msg => {
          if ('from_part' in msg && msg.from_part) parts.add(msg.from_part);
          if ('to_part' in msg && msg.to_part) parts.add(msg.to_part);
          if ('status' in msg && msg.status) statuses.add(msg.status);
        });

        setAvailableParts(Array.from(parts).sort());
        setAvailableStatuses(Array.from(statuses).sort());
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  useEffect(() => {
    let results = messages;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        msg =>
          ('subject' in msg && msg.subject?.toLowerCase().includes(query)) ||
          ('body' in msg && msg.body?.toLowerCase().includes(query))
      );
    }

    // Apply from_part filter
    if (fromPartFilter.size > 0) {
      results = results.filter(
        msg =>
          'from_part' in msg &&
          msg.from_part &&
          fromPartFilter.has(msg.from_part)
      );
    }

    // Apply to_part filter
    if (toPartFilter.size > 0) {
      results = results.filter(
        msg =>
          'to_part' in msg &&
          msg.to_part &&
          toPartFilter.has(msg.to_part)
      );
    }

    // Apply status filter
    if (statusFilter.size > 0) {
      results = results.filter(
        msg => 'status' in msg && msg.status && statusFilter.has(msg.status)
      );
    }

    // Apply type filter
    if (typeFilter.size > 0 && typeFilter.size < 2) {
      const types = Array.from(typeFilter);
      results = results.filter(msg => types.includes(msg._type));
    }

    setFilteredMessages(results);
    setPage(0);
  }, [searchQuery, fromPartFilter, toPartFilter, statusFilter, typeFilter, messages]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Map(expandedMessages);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.set(id, true);
    }
    setExpandedMessages(newExpanded);
  };

  const toggleFromPartFilter = (part: string) => {
    const newFilter = new Set(fromPartFilter);
    if (newFilter.has(part)) {
      newFilter.delete(part);
    } else {
      newFilter.add(part);
    }
    setFromPartFilter(newFilter);
  };

  const toggleToPartFilter = (part: string) => {
    const newFilter = new Set(toPartFilter);
    if (newFilter.has(part)) {
      newFilter.delete(part);
    } else {
      newFilter.add(part);
    }
    setToPartFilter(newFilter);
  };

  const toggleStatusFilter = (status: string) => {
    const newFilter = new Set(statusFilter);
    if (newFilter.has(status)) {
      newFilter.delete(status);
    } else {
      newFilter.add(status);
    }
    setStatusFilter(newFilter);
  };

  const toggleTypeFilter = (type: string) => {
    const newFilter = new Set(typeFilter);
    if (newFilter.has(type)) {
      newFilter.delete(type);
    } else {
      newFilter.add(type);
    }
    setTypeFilter(newFilter);
  };

  const displayedMessages = filteredMessages.slice(0, (page + 1) * ITEMS_PER_PAGE);
  const canLoadMore = (page + 1) * ITEMS_PER_PAGE < filteredMessages.length;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <main className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Dispatch</h1>
          <p className="text-gray-400">Inter-Part communication and relay messages</p>
        </div>

        <div className="flex gap-6">
          {/* Filter Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700 sticky top-6">
              <h3 className="text-sm font-semibold text-white mb-4">Filters</h3>

              {/* Type Filter */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Type
                </h4>
                <div className="space-y-2">
                  {['dispatch', 'relay'].map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={typeFilter.has(type)}
                        onChange={() => toggleTypeFilter(type)}
                        className="w-4 h-4 rounded bg-neutral-700 border-neutral-600 text-amber-500 cursor-pointer"
                      />
                      <span className="text-sm text-gray-300 capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* From Part Filter */}
              {availableParts.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    From Part
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {availableParts.map(part => (
                      <label key={`from-${part}`} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fromPartFilter.has(part)}
                          onChange={() => toggleFromPartFilter(part)}
                          className="w-4 h-4 rounded bg-neutral-700 border-neutral-600 text-amber-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-300">
                          <PartBadge part={part} />
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* To Part Filter */}
              {availableParts.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    To Part
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {availableParts.map(part => (
                      <label key={`to-${part}`} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={toPartFilter.has(part)}
                          onChange={() => toggleToPartFilter(part)}
                          className="w-4 h-4 rounded bg-neutral-700 border-neutral-600 text-amber-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-300">
                          <PartBadge part={part} />
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Filter */}
              {availableStatuses.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Status
                  </h4>
                  <div className="space-y-2">
                    {availableStatuses.map(status => (
                      <label key={status} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={statusFilter.has(status)}
                          onChange={() => toggleStatusFilter(status)}
                          className="w-4 h-4 rounded bg-neutral-700 border-neutral-600 text-amber-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-300">
                          <StatusBadge status={status} />
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <SearchBar
              placeholder="Search messages..."
              value={searchQuery}
              onChange={setSearchQuery}
            />

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
                </div>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No messages found</p>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-400">
                  Showing {displayedMessages.length} of {filteredMessages.length} messages
                </div>

                <div className="space-y-3">
                  {displayedMessages.map(msg => {
                    const isExpanded = expandedMessages.get(msg.id);
                    const isDispatch = msg._type === 'dispatch';

                    return (
                      <div
                        key={`${msg._type}-${msg.id}`}
                        className="bg-neutral-800 rounded-lg border border-neutral-700 hover:border-neutral-600 transition cursor-pointer"
                        onClick={() => toggleExpanded(msg.id)}
                      >
                        <div className="p-4">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="px-2 py-1 rounded text-xs bg-neutral-700 text-gray-300 font-mono">
                                  {msg._type.toUpperCase()}
                                </span>
                                {isDispatch && 'from_part' in msg && msg.from_part && (
                                  <>
                                    <PartBadge part={msg.from_part} />
                                    <span className="text-gray-500">→</span>
                                    {msg.to_part && <PartBadge part={msg.to_part} />}
                                  </>
                                )}
                                {!isDispatch && 'from_part' in msg && msg.from_part && (
                                  <>
                                    <PartBadge part={msg.from_part} />
                                    {msg.to_part && (
                                      <>
                                        <span className="text-gray-500">→</span>
                                        <PartBadge part={msg.to_part} />
                                      </>
                                    )}
                                  </>
                                )}
                                {isDispatch && 'status' in msg && msg.status && (
                                  <StatusBadge status={msg.status} />
                                )}
                              </div>
                              {isDispatch && 'subject' in msg && msg.subject && (
                                <p className="text-white font-medium text-sm mb-1">{msg.subject}</p>
                              )}
                              {'body' in msg && msg.body && (
                                <p className="text-gray-300 text-sm line-clamp-2">{String(msg.body)}</p>
                              )}
                              <div className="text-xs text-gray-500 mt-2">
                                {formatDate(msg.created_at)}
                              </div>
                            </div>
                            <div className="flex-shrink-0 mt-1">
                              <div
                                className={`w-5 h-5 flex items-center justify-center transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              >
                                <svg
                                  className="w-4 h-4 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                                  />
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-neutral-700 space-y-3">
                              {isDispatch && (
                                <>
                                  {('subject' in msg && msg.subject) && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-gray-400 mb-1">
                                        Subject
                                      </h4>
                                      <p className="text-sm text-gray-200">{msg.subject}</p>
                                    </div>
                                  )}
                                  {('body' in msg && msg.body) && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-gray-400 mb-1">
                                        Body
                                      </h4>
                                      <p className="text-sm text-gray-200 whitespace-pre-wrap">
                                        {msg.body}
                                      </p>
                                    </div>
                                  )}
                                  {('priority' in msg && msg.priority) && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-gray-400 mb-1">
                                        Priority
                                      </h4>
                                      <p className="text-sm text-gray-300">{msg.priority}</p>
                                    </div>
                                  )}
                                  {('metadata' in msg && msg.metadata) && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-gray-400 mb-1">
                                        Metadata
                                      </h4>
                                      <pre className="text-xs bg-neutral-900 rounded p-2 text-gray-300 overflow-auto max-h-48">
                                        {JSON.stringify(msg.metadata, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </>
                              )}
                              {!isDispatch && (
                                <>
                                  {('content' in msg && msg.content) && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-gray-400 mb-1">
                                        Content
                                      </h4>
                                      <p className="text-sm text-gray-200 whitespace-pre-wrap">
                                        {msg.content as React.ReactNode}
                                      </p>
                                    </div>
                                  )}
                                  {('relay_type' in msg && msg.relay_type) && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-gray-400 mb-1">
                                        Relay Type
                                      </h4>
                                      <p className="text-sm text-gray-300">{String(msg.relay_type)}</p>
                                    </div>
                                  )}
                                </>
                              )}
                              <div>
                                <h4 className="text-xs font-semibold text-gray-400 mb-1">
                                  Created At
                                </h4>
                                <p className="text-sm text-gray-300">
                                  {formatDate(msg.created_at)}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {canLoadMore && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setPage(page + 1)}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
