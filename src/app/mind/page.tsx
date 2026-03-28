'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase, JoshuaMindEntry } from '@/lib/supabase';
import SearchBar from '@/components/SearchBar';
import { PAGINATION_SIZE } from '@/lib/constants';

const ENTRY_TYPES = ['memory', 'fact', 'reflection', 'idea', 'observation', 'dream', 'quote', 'note'];

export default function MindPage() {
  const [entries, setEntries] = useState<JoshuaMindEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JoshuaMindEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayedCount, setDisplayedCount] = useState(PAGINATION_SIZE);
  const [allTypes, setAllTypes] = useState<string[]>([]);
  const [allTopics, setAllTopics] = useState<string[]>([]);
  const [allPeople, setAllPeople] = useState<string[]>([]);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formContent, setFormContent] = useState('');
  const [formType, setFormType] = useState('memory');
  const [formTopics, setFormTopics] = useState('');
  const [formPeople, setFormPeople] = useState('');
  const [formAssociations, setFormAssociations] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [entries, searchQuery, selectedTypes, selectedTopics, selectedPeople]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('joshua_mind')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEntries(data || []);

      const types = new Set<string>();
      const topics = new Set<string>();
      const people = new Set<string>();

      (data || []).forEach((entry) => {
        if (entry.type) types.add(entry.type);
        entry.topics?.forEach((topic: string) => topics.add(topic));
        entry.people?.forEach((person: string) => people.add(person));
      });

      setAllTypes(Array.from(types).sort());
      setAllTopics(Array.from(topics).sort());
      setAllPeople(Array.from(people).sort());
    } catch (error) {
      console.error('Error fetching joshua mind entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...entries];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((entry) =>
        entry.content.toLowerCase().includes(query)
      );
    }

    if (selectedTypes.length > 0) {
      filtered = filtered.filter((entry) => selectedTypes.includes(entry.type));
    }

    if (selectedTopics.length > 0) {
      filtered = filtered.filter((entry) =>
        selectedTopics.some((topic) => entry.topics?.includes(topic))
      );
    }

    if (selectedPeople.length > 0) {
      filtered = filtered.filter((entry) =>
        selectedPeople.some((person) => entry.people?.includes(person))
      );
    }

    setFilteredEntries(filtered);
    setDisplayedCount(PAGINATION_SIZE);
  };

  const toggleFilter = (
    filter: string,
    setFilter: React.Dispatch<React.SetStateAction<string[]>>,
    currentFilter: string[]
  ) => {
    setFilter((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleLoadMore = () => {
    setDisplayedCount((prev) => prev + PAGINATION_SIZE);
  };

  const parseTagString = (str: string): string[] => {
    return str.split(',').map(s => s.trim()).filter(Boolean);
  };

  const handleSubmit = async () => {
    if (!formContent.trim()) return;
    setSubmitting(true);
    setSubmitMessage(null);

    try {
      const { error } = await supabase.from('joshua_mind').insert({
        content: formContent.trim(),
        type: formType,
        media_type: 'text',
        source: 'dashboard',
        topics: parseTagString(formTopics),
        people: parseTagString(formPeople),
        associations: parseTagString(formAssociations),
      });

      if (error) throw error;

      setSubmitMessage({ text: 'Saved.', type: 'success' });
      setFormContent('');
      setFormTopics('');
      setFormPeople('');
      setFormAssociations('');
      setFormType('memory');
      fetchEntries();

      setTimeout(() => setSubmitMessage(null), 3000);
    } catch (error) {
      console.error('Error inserting mind entry:', error);
      setSubmitMessage({ text: 'Failed to save. Check console.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormToggle = () => {
    setFormOpen(!formOpen);
    if (!formOpen) {
      setTimeout(() => contentRef.current?.focus(), 100);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-neutral-400">Loading joshua mind entries...</p>
      </div>
    );
  }

  const displayedEntries = filteredEntries.slice(0, displayedCount);
  const hasMore = displayedCount < filteredEntries.length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-neutral-100 mb-2">Josh's Mind</h1>
        <p className="text-neutral-400">Personal thoughts, observations, and memories</p>
      </div>

      {/* Add Entry Form */}
      <div className="mb-8">
        <button
          onClick={handleFormToggle}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg font-medium transition-colors text-sm"
        >
          <span className={`transition-transform ${formOpen ? 'rotate-45' : ''}`}>+</span>
          {formOpen ? 'Close' : 'Add something to your mind'}
        </button>

        {formOpen && (
          <div className="mt-4 bg-neutral-800 border border-amber-500/30 rounded-lg p-5 space-y-4">
            <textarea
              ref={contentRef}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-neutral-100 placeholder-neutral-500 focus:border-amber-500/50 focus:outline-none resize-y text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) handleSubmit();
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 text-sm focus:border-amber-500/50 focus:outline-none"
                >
                  {ENTRY_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Topics <span className="text-neutral-600">(comma-separated)</span></label>
                <input
                  type="text"
                  value={formTopics}
                  onChange={(e) => setFormTopics(e.target.value)}
                  placeholder="philosophy, music, ..."
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-600 text-sm focus:border-amber-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">People <span className="text-neutral-600">(comma-separated)</span></label>
                <input
                  type="text"
                  value={formPeople}
                  onChange={(e) => setFormPeople(e.target.value)}
                  placeholder="Sarah, Dmitry, ..."
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-600 text-sm focus:border-amber-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Associations <span className="text-neutral-600">(comma-separated)</span></label>
                <input
                  type="text"
                  value={formAssociations}
                  onChange={(e) => setFormAssociations(e.target.value)}
                  placeholder="pequeno, covenant, ..."
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-600 text-sm focus:border-amber-500/50 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-600">⌘+Enter to save</p>
              <div className="flex items-center gap-3">
                {submitMessage && (
                  <span className={`text-sm ${submitMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {submitMessage.text}
                  </span>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !formContent.trim()}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-700 disabled:text-neutral-500 text-neutral-900 rounded-lg font-medium text-sm transition-colors"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="mb-6">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search mind entries..."
            />
          </div>

          <div className="space-y-4">
            {displayedEntries.length > 0 ? (
              <>
                {displayedEntries.map((entry) => (
                  <div key={entry.id} className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 hover:border-neutral-600 transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        {entry.type && (
                          <span className="bg-amber-500/20 text-amber-400 text-xs font-semibold px-2.5 py-1 rounded mr-2">
                            {entry.type}
                          </span>
                        )}
                        <span className="text-xs text-neutral-500">{formatDate(entry.created_at)}</span>
                      </div>
                    </div>

                    <p className="text-neutral-300 text-sm mb-3 whitespace-pre-wrap">{entry.content}</p>

                    {entry.media_type && (
                      <div className="mb-3 p-2 bg-neutral-700/50 rounded text-xs">
                        <span className="text-neutral-400">Media: {entry.media_type}</span>
                        {entry.media_url && (
                          <p className="text-amber-400 text-xs break-all">{entry.media_url}</p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-700">
                      {entry.topics && entry.topics.length > 0 && (
                        <>
                          {entry.topics.map((topic, idx) => (
                            <span key={idx} className="bg-blue-900/30 text-blue-300 text-xs px-2 py-1 rounded">
                              {topic}
                            </span>
                          ))}
                        </>
                      )}
                      {entry.people && entry.people.length > 0 && (
                        <>
                          {entry.people.map((person, idx) => (
                            <span key={idx} className="bg-pink-900/30 text-pink-300 text-xs px-2 py-1 rounded">
                              {person}
                            </span>
                          ))}
                        </>
                      )}
                    </div>

                    {entry.source && (
                      <p className="text-xs text-neutral-600 mt-2">Source: {entry.source}</p>
                    )}
                  </div>
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
                <p className="text-neutral-500">No entries found</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-neutral-100 mb-3">Filters</h3>

            {allTypes.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm text-neutral-400 mb-2">Type</label>
                <div className="space-y-2">
                  {allTypes.map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type)}
                        onChange={() =>
                          toggleFilter(type, setSelectedTypes, selectedTypes)
                        }
                        className="w-4 h-4 bg-neutral-700 border border-neutral-600 rounded cursor-pointer"
                      />
                      <span className="text-sm text-neutral-300">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {allTopics.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm text-neutral-400 mb-2">Topics</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {allTopics.map((topic) => (
                    <label key={topic} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTopics.includes(topic)}
                        onChange={() =>
                          toggleFilter(topic, setSelectedTopics, selectedTopics)
                        }
                        className="w-4 h-4 bg-neutral-700 border border-neutral-600 rounded cursor-pointer"
                      />
                      <span className="text-sm text-neutral-300">{topic}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {allPeople.length > 0 && (
              <div>
                <label className="block text-sm text-neutral-400 mb-2">People</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {allPeople.map((person) => (
                    <label key={person} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPeople.includes(person)}
                        onChange={() =>
                          toggleFilter(person, setSelectedPeople, selectedPeople)
                        }
                        className="w-4 h-4 bg-neutral-700 border border-neutral-600 rounded cursor-pointer"
                      />
                      <span className="text-sm text-neutral-300">{person}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
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
