'use client';

import { useEffect, useState } from 'react';
import { supabase, KnowledgeEntry } from '@/lib/supabase';
import SearchBar from '@/components/SearchBar';
import KnowledgeCard from '@/components/KnowledgeCard';
import { PAGINATION_SIZE } from '@/lib/constants';

type SortBy = 'modified' | 'importance' | 'access_count';

export default function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<KnowledgeEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [confidenceRange, setConfidenceRange] = useState([0, 100]);
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('modified');
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [displayedCount, setDisplayedCount] = useState(PAGINATION_SIZE);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [owners, setOwners] = useState<string[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [entries, searchQuery, selectedTags, confidenceRange, selectedOwner, sortBy]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('knowledge')
        .select('*')
        .order('modified', { ascending: false });

      if (error) throw error;

      setEntries(data || []);

      const tags = new Set<string>();
      const ownerSet = new Set<string>();
      (data || []).forEach((entry) => {
        if (entry.part_owner) ownerSet.add(entry.part_owner);
        const entryTags = Array.isArray(entry.tags) ? entry.tags : Object.keys(entry.tags || {});
        entryTags.forEach((tag: string) => {
          const tagStr = typeof tag === 'string' ? tag : Object.keys(tag)[0];
          if (tagStr) tags.add(tagStr);
        });
      });

      setAllTags(Array.from(tags).sort());
      setOwners(Array.from(ownerSet).sort());
    } catch (error) {
      console.error('Error fetching knowledge entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...entries];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          (entry.topic || '').toLowerCase().includes(query) ||
          (entry.summary || '').toLowerCase().includes(query)
      );
    }

    filtered = filtered.filter(
      (entry) => entry.confidence >= confidenceRange[0] / 100 && entry.confidence <= confidenceRange[1] / 100
    );

    if (selectedTags.length > 0) {
      filtered = filtered.filter((entry) => {
        const entryTags = Array.isArray(entry.tags) ? entry.tags : Object.keys(entry.tags || {});
        const tagStrings = entryTags.map((t: string) => (typeof t === 'string' ? t : Object.keys(t)[0]));
        return selectedTags.some((tag) => tagStrings.includes(tag));
      });
    }

    if (selectedOwner) {
      filtered = filtered.filter((entry) => entry.part_owner === selectedOwner);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'importance':
          return b.importance_weight - a.importance_weight;
        case 'access_count':
          return b.access_count - a.access_count;
        case 'modified':
        default:
          return new Date(b.modified).getTime() - new Date(a.modified).getTime();
      }
    });

    setFilteredEntries(filtered);
    setOffset(0);
    setDisplayedCount(PAGINATION_SIZE);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleLoadMore = () => {
    setDisplayedCount((prev) => prev + PAGINATION_SIZE);
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-neutral-400">Loading knowledge entries...</p>
      </div>
    );
  }

  const displayedEntries = filteredEntries.slice(0, displayedCount);
  const hasMore = displayedCount < filteredEntries.length;

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

          <div className="space-y-4">
            {displayedEntries.length > 0 ? (
              <>
                {displayedEntries.map((entry) => (
                  <KnowledgeCard key={entry.id} entry={entry} />
                ))}
                {hasMore && (
                  <button
                    onClick={handleLoadMore}
                    className="w-full py-3 bg-neutral-700 hover:bg-neutral-600 text-neutral-100 rounded-lg font-medium transition-colors"
                  >
                    Load More ({filteredEntries.length - displayedCount} remaining)
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
              Showing {displayedEntries.length} of {filteredEntries.length} entries
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
