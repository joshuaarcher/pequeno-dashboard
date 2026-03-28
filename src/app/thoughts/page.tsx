'use client';

import { useEffect, useState } from 'react';
import { supabase, ThoughtsEntry } from '@/lib/supabase';
import SearchBar from '@/components/SearchBar';

interface ExpandedThought {
  id: string;
  isExpanded: boolean;
}

export default function ThoughtsPage() {
  const [thoughts, setThoughts] = useState<ThoughtsEntry[]>([]);
  const [filteredThoughts, setFilteredThoughts] = useState<ThoughtsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedThoughts, setExpandedThoughts] = useState<Map<string, boolean>>(new Map());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Filter state
  const [sourceFilter, setSourceFilter] = useState<Set<string>>(new Set());
  const [availableSources, setAvailableSources] = useState<string[]>([]);

  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    const fetchThoughts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('thoughts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const typedData = (data || []) as ThoughtsEntry[];
        setThoughts(typedData);

        // Extract unique sources
        const sources = Array.from(new Set(typedData.map(t => t.source).filter(Boolean)));

        setAvailableSources(sources.sort());
      } catch (err) {
        console.error('Error fetching thoughts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchThoughts();
  }, []);

  useEffect(() => {
    let results = thoughts;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        thought =>
          thought.content?.toLowerCase().includes(query) ||
          thought.source?.toLowerCase().includes(query)
      );
    }

    // Apply source filter
    if (sourceFilter.size > 0) {
      results = results.filter(t => t.source && sourceFilter.has(t.source));
    }

    setFilteredThoughts(results);
    setPage(0);
    setHasMore(results.length > ITEMS_PER_PAGE);
  }, [searchQuery, sourceFilter, thoughts]);

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

  const displayedThoughts = filteredThoughts.slice(0, (page + 1) * ITEMS_PER_PAGE);
  const canLoadMore = (page + 1) * ITEMS_PER_PAGE < filteredThoughts.length;

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
            ) : filteredThoughts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No thoughts found</p>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-400">
                  Showing {displayedThoughts.length} of {filteredThoughts.length} thoughts
                </div>

                <div className="space-y-3">
                  {displayedThoughts.map(thought => {
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
