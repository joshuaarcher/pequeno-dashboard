'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, ThoughtsEntry } from '@/lib/supabase';
import SearchBar from '@/components/SearchBar';

const ITEMS_PER_PAGE = 50;

export default function ThoughtsPage() {
  const [thoughts, setThoughts] = useState<ThoughtsEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedThoughts, setExpandedThoughts] = useState<Map<string, boolean>>(new Map());

  // Filter state
  const [sourceFilter, setSourceFilter] = useState<Set<string>>(new Set());
  const [availableSources, setAvailableSources] = useState<string[]>([]);

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search input
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  // Fetch distinct sources once on mount by paginating through all source values
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const allSources = new Set<string>();
        let from = 0;
        const batchSize = 1000;
        let keepGoing = true;

        while (keepGoing) {
          const { data, error } = await supabase
            .from('thoughts')
            .select('source')
            .range(from, from + batchSize - 1);

          if (error) throw error;

          if (!data || data.length === 0) {
            keepGoing = false;
          } else {
            data.forEach((t: { source: string }) => {
              if (t.source) allSources.add(t.source);
            });
            if (data.length < batchSize) {
              keepGoing = false;
            } else {
              from += batchSize;
            }
          }
        }

        setAvailableSources(Array.from(allSources).sort());
      } catch (err) {
        console.error('Error fetching sources:', err);
      }
    };

    fetchSources();
  }, []);

  // Build a query with current filters applied
  const buildQuery = useCallback(
    (selectStr: string, options?: { count?: 'exact' }) => {
      let query = supabase.from('thoughts').select(selectStr, options);

      if (sourceFilter.size > 0) {
        const sources = Array.from(sourceFilter);
        if (sources.length === 1) {
          query = query.eq('source', sources[0]);
        } else {
          query = query.in('source', sources);
        }
      }

      if (debouncedSearch) {
        query = query.ilike('content', `%${debouncedSearch}%`);
      }

      return query;
    },
    [sourceFilter, debouncedSearch]
  );

  // Fetch thoughts when filters/search change
  useEffect(() => {
    const fetchThoughts = async () => {
      setLoading(true);
      try {
        // Fetch first page + get total count
        const { data, error, count } = await buildQuery('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(0, ITEMS_PER_PAGE - 1);

        if (error) throw error;

        setThoughts((data || []) as ThoughtsEntry[]);
        setTotalCount(count ?? 0);
      } catch (err) {
        console.error('Error fetching thoughts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchThoughts();
  }, [buildQuery]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const start = thoughts.length;
      const end = start + ITEMS_PER_PAGE - 1;

      const { data, error } = await buildQuery('*')
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) throw error;

      setThoughts(prev => [...prev, ...((data || []) as ThoughtsEntry[])]);
    } catch (err) {
      console.error('Error loading more thoughts:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const hasMore = thoughts.length < totalCount;

  const toggleExpanded = (id: string) => {
    const newExpanded = new Map(expandedThoughts);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.set(id, true);
    }
    setExpandedThoughts(newExpanded);
  };

  const toggleSourceFilter = (source: string) => {
    const newFilter = new Set(sourceFilter);
    if (newFilter.has(source)) {
      newFilter.delete(source);
    } else {
      newFilter.add(source);
    }
    setSourceFilter(newFilter);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <main className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Thoughts</h1>
          <p className="text-gray-400">Explored ideas, observations, and insights</p>
        </div>

        <div className="flex gap-6">
          {/* Filter Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700 sticky top-6">
              <h3 className="text-sm font-semibold text-white mb-4">Filters</h3>

              {/* Source Filter */}
              {availableSources.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Source
                  </h4>
                  <div className="space-y-2">
                    {availableSources.map(source => (
                      <label key={source} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sourceFilter.has(source)}
                          onChange={() => toggleSourceFilter(source)}
                          className="w-4 h-4 rounded bg-neutral-700 border-neutral-600 text-amber-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-300">{source}</span>
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
              placeholder="Search thoughts..."
              value={searchQuery}
              onChange={setSearchQuery}
            />

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
                </div>
              </div>
            ) : thoughts.length === 0 && totalCount === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No thoughts found</p>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-400">
                  Showing {thoughts.length} of {totalCount} thoughts
                </div>

                <div className="space-y-3">
                  {thoughts.map(thought => {
                    const isExpanded = expandedThoughts.get(thought.id);
                    return (
                      <div
                        key={thought.id}
                        className="bg-neutral-800 rounded-lg border border-neutral-700 hover:border-neutral-600 transition cursor-pointer"
                        onClick={() => toggleExpanded(thought.id)}
                      >
                        <div className="p-4">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                {thought.source && (
                                  <span className="px-2 py-1 rounded text-xs bg-neutral-700 text-gray-300">
                                    {thought.source}
                                  </span>
                                )}
                              </div>
                              <p className="text-white text-sm line-clamp-2">
                                {thought.content}
                              </p>
                              <div className="text-xs text-gray-500 mt-2">
                                {formatDate(thought.created_at)}
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
                              {thought.content && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-400 mb-1">
                                    Content
                                  </h4>
                                  <p className="text-sm text-gray-200 whitespace-pre-wrap">
                                    {thought.content}
                                  </p>
                                </div>
                              )}
                              {thought.source && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-400 mb-1">
                                    Source
                                  </h4>
                                  <p className="text-sm text-gray-300">{thought.source}</p>
                                </div>
                              )}
                              {thought.metadata && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-400 mb-1">
                                    Metadata
                                  </h4>
                                  <pre className="text-xs bg-neutral-900 rounded p-2 text-gray-300 overflow-auto max-h-48">
                                    {String(JSON.stringify(thought.metadata, null, 2) ?? '')}
                                  </pre>
                                </div>
                              )}
                              {thought.embedding ? (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-400 mb-1">
                                    Has Embedding
                                  </h4>
                                  <p className="text-xs text-gray-400">
                                    {Array.isArray(thought.embedding)
                                      ? `Vector (${(thought.embedding as unknown[]).length} dimensions)`
                                      : 'Embedding stored'}
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {hasMore && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium text-sm transition"
                    >
                      {loadingMore ? 'Loading...' : 'Load More'}
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
