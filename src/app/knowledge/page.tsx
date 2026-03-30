'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, KnowledgeEntry } from '@/lib/supabase';
import SearchBar from '@/components/SearchBar';
import KnowledgeCard from '@/components/KnowledgeCard';

const ITEMS_PER_PAGE = 50;

type SortBy = 'modified' | 'importance' | 'access_count';

export default function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [confidenceRange, setConfidenceRange] = useState([0, 100]);
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('modified');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [owners, setOwners] = useState<string[]>([]);

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

  // Fetch all unique tags and part_owners on mount by paginating through all rows
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const tagSet = new Set<string>();
        const ownerSet = new Set<string>();
        let from = 0;
        const batchSize = 1000;
        let keepGoing = true;

        while (keepGoing) {
          const { data, error } = await supabase
            .from('knowledge')
            .select('tags,part_owner')
            .range(from, from + batchSize - 1);

          if (error) throw error;

          if (!data || data.length === 0) {
            keepGoing = false;
          } else {
            data.forEach((entry: { tags: unknown; part_owner: string | null }) => {
              if (entry.part_owner) ownerSet.add(entry.part_owner);
              const entryTags = Array.isArray(entry.tags) ? entry.tags : Object.keys(entry.tags || {});
              entryTags.forEach((tag: unknown) => {
                const tagStr = typeof tag === 'string' ? tag : Object.keys(tag as Record<string, unknown>)[0];
                if (tagStr) tagSet.add(tagStr);
              });
            });
            if (data.length < batchSize) {
              keepGoing = false;
            } else {
              from += batchSize;
            }
          }
        }

        setAllTags(Array.from(tagSet).sort());
        setOwners(Array.from(ownerSet).sort());
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    };

    fetchFilterOptions();
  }, []);

  // Build a query with current filters applied
  const buildQuery = useCallback(
    (selectStr: string, options?: { count?: 'exact' }) => {
      let query = supabase.from('knowledge').select(selectStr, options);

      // Confidence filter
      query = query.gte('confidence', confidenceRange[0] / 100).lte('confidence', confidenceRange[1] / 100);

      // Part owner filter
      if (selectedOwner) {
        query = query.eq('part_owner', selectedOwner);
      }

      // Tags filter — use contains for array columns
      if (selectedTags.length > 0) {
        // Filter entries that contain any of the selected tags using overlaps
        query = query.overlaps('tags', selectedTags);
      }

      // Search filter
      if (debouncedSearch) {
        query = query.or(`topic.ilike.%${debouncedSearch}%,summary.ilike.%${debouncedSearch}%`);
      }

      // Sort
      switch (sortBy) {
        case 'importance':
          query = query.order('importance_weight', { ascending: false });
          break;
        case 'access_count':
          query = query.order('access_count', { ascending: false });
          break;
        case 'modified':
        default:
          query = query.order('modified', { ascending: false });
          break;
      }

      return query;
    },
    [confidenceRange, selectedOwner, selectedTags, debouncedSearch, sortBy]
  );

  // Fetch entries when filters/search/sort change
  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      try {
        const { data, error, count } = await buildQuery('*', { count: 'exact' })
          .range(0, ITEMS_PER_PAGE - 1);

        if (error) throw error;

        setEntries((data || []) as KnowledgeEntry[]);
        setTotalCount(count ?? 0);
      } catch (err) {
        console.error('Error fetching knowledge entries:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [buildQuery]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const start = entries.length;
      const end = start + ITEMS_PER_PAGE - 1;

      const { data, error } = await buildQuery('*')
        .range(start, end);

      if (error) throw error;

      setEntries(prev => [...prev, ...((data || []) as KnowledgeEntry[])]);
    } catch (err) {
      console.error('Error loading more entries:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const hasMore = entries.length < totalCount;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  if (loading && entries.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
        <p className="text-neutral-400 mt-2">Loading knowledge entries...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-neutral-100 mb-2">Knowledge Browser</h1>
        <p className="text-neutral-400">Search and explore the knowledge base</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="mb-6">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by topic or summary..."
            />
          </div>

          <div className="mb-4 text-sm text-neutral-400">
            Showing {entries.length} of {totalCount} entries
          </div>

          <div className="space-y-4">
            {entries.length > 0 ? (
              <>
                {entries.map((entry) => (
                  <KnowledgeCard key={entry.id} entry={entry} />
                ))}
                {hasMore && (
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full py-3 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 text-neutral-100 rounded-lg font-medium transition-colors"
                  >
                    {loadingMore ? 'Loading...' : `Load More (${totalCount - entries.length} remaining)`}
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-12 bg-neutral-800 border border-neutral-700 rounded-lg">
                <p className="text-neutral-500">No knowledge entries found</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-neutral-100 mb-3">Filters</h3>

            <div className="mb-4">
              <label className="block text-sm text-neutral-400 mb-2">Confidence Level</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={confidenceRange[0]}
                  onChange={(e) => setConfidenceRange([parseInt(e.target.value), confidenceRange[1]])}
                  className="flex-1 h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                {confidenceRange[0]}% - {confidenceRange[1]}%
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-neutral-400 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-neutral-100 text-sm"
              >
                <option value="modified">Recently Modified</option>
                <option value="importance">Importance Weight</option>
                <option value="access_count">Access Count</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-neutral-400 mb-2">Part Owner</label>
              <select
                value={selectedOwner || ''}
                onChange={(e) => setSelectedOwner(e.target.value || null)}
                className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-neutral-100 text-sm"
              >
                <option value="">All Owners</option>
                {owners.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-2">Tags</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {allTags.map((tag) => (
                  <label key={tag} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag)}
                      onChange={() => toggleTag(tag)}
                      className="w-4 h-4 bg-neutral-700 border border-neutral-600 rounded cursor-pointer"
                    />
                    <span className="text-sm text-neutral-300">{tag}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-neutral-100 mb-2">Summary</h3>
            <p className="text-sm text-neutral-400">
              Showing {entries.length} of {totalCount} entries
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
