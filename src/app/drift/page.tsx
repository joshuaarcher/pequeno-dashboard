'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function formatDate(date: Date | string, style: 'full' | 'short' = 'full'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (style === 'short') {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

interface SourceData {
  name: string;
  icon: string;
  total: number;
  detail: number;
  fullText: number;
  verified: number;
  avgConfidence: number;
  newest: string;
  ftsMercury?: number;
  lastChecked: string;
  isLive: boolean;
  categories: Record<string, number>;
}

interface ExtraTables {
  dispatch: number;
  relay_messages: number;
  tasks: number;
  joshua_mind: number;
  thoughts: number;
  work_log: number;
}

interface DriftMetric {
  pair: string;
  delta: number;
  status: 'green' | 'yellow' | 'red';
}

const HARDCODED_LOCAL: SourceData = {
  name: 'Local SQLite',
  icon: '💾',
  total: 1016,
  detail: 853,
  fullText: 15,
  verified: 0,
  avgConfidence: 33,
  newest: '2026-03-29T18:32:05',
  ftsMercury: 79,
  lastChecked: '2026-03-29 20:52 PT',
  isLive: false,
  categories: {
    general: 842,
    checkpoint: 105,
    moment: 29,
    part: 20,
    fix: 19,
    project: 1,
  },
};

const HARDCODED_D1: SourceData = {
  name: 'Cloudflare D1',
  icon: '☁️',
  total: 963,
  detail: 649,
  fullText: 0,
  verified: 0,
  avgConfidence: 32,
  newest: '2026-03-29T18:17:33',
  ftsMercury: 48,
  lastChecked: '2026-03-29 20:52 PT',
  isLive: false,
  categories: {
    general: 791,
    checkpoint: 105,
    moment: 29,
    part: 19,
    fix: 18,
    project: 1,
  },
};

const CATEGORY_MAP: Record<string, string> = {
  'skill-': 'general',
  'fix-': 'fix',
  'moment-': 'moment',
  'briefing-': 'general',
  'checkpoint-': 'checkpoint',
  'worknote-': 'general',
  'project-': 'project',
  'person-': 'general',
  'digest-': 'general',
  'part-': 'part',
};

function categorizeByPrefix(topic: string): string {
  for (const [prefix, category] of Object.entries(CATEGORY_MAP)) {
    if (topic.startsWith(prefix)) {
      return category;
    }
  }
  return 'general';
}

function getStatusDot(count: number, maxCount: number): 'green' | 'yellow' | 'red' {
  const delta = maxCount - count;
  if (delta < 5) return 'green';
  if (delta < 50) return 'yellow';
  return 'red';
}

function getDriftStatus(delta: number): 'green' | 'yellow' | 'red' {
  if (delta < 5) return 'green';
  if (delta < 20) return 'yellow';
  return 'red';
}

function getDriftColor(status: 'green' | 'yellow' | 'red'): string {
  switch (status) {
    case 'green':
      return 'text-green-400';
    case 'yellow':
      return 'text-yellow-400';
    case 'red':
      return 'text-red-400';
  }
}

function getStatusBgColor(status: 'green' | 'yellow' | 'red'): string {
  switch (status) {
    case 'green':
      return 'bg-green-500/20';
    case 'yellow':
      return 'bg-yellow-500/20';
    case 'red':
      return 'bg-red-500/20';
  }
}

export default function DriftGaugePage() {
  const [supabaseData, setSupabaseData] = useState<SourceData | null>(null);
  const [extraTables, setExtraTables] = useState<ExtraTables | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTime, setRefreshTime] = useState(new Date());
  const [expandedDetail, setExpandedDetail] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Query Supabase total count
        const { count: totalCount, error: countError } = await supabase
          .from('knowledge')
          .select('id', { count: 'exact', head: true });

        if (countError) throw countError;

        // Query all topics for category breakdown
        const { data: allTopics, error: topicsError } = await supabase
          .from('knowledge')
          .select('topic');

        if (topicsError) throw topicsError;

        // Build category counts
        const categories: Record<string, number> = {
          general: 0,
          checkpoint: 0,
          moment: 0,
          part: 0,
          fix: 0,
          project: 0,
        };

        if (allTopics) {
          allTopics.forEach((row) => {
            const category = categorizeByPrefix(row.topic);
            categories[category] = (categories[category] || 0) + 1;
          });
        }

        // Query detail count
        const { count: detailCount, error: detailError } = await supabase
          .from('knowledge')
          .select('id', { count: 'exact', head: true })
          .not('detail', 'is', null)
          .neq('detail', '');

        if (detailError) throw detailError;

        // Query full_text count
        const { count: fullTextCount, error: fullTextError } = await supabase
          .from('knowledge')
          .select('id', { count: 'exact', head: true })
          .not('full_text', 'is', null)
          .neq('full_text', '');

        if (fullTextError) throw fullTextError;

        // Query newest entry
        const { data: newestData, error: newestError } = await supabase
          .from('knowledge')
          .select('modified')
          .order('modified', { ascending: false })
          .limit(1);

        if (newestError) throw newestError;

        // Build supabaseData
        const sData: SourceData = {
          name: 'Supabase',
          icon: '⚡',
          total: totalCount || 0,
          detail: detailCount || 0,
          fullText: fullTextCount || 0,
          verified: 0,
          avgConfidence: 0,
          newest: newestData?.[0]?.modified || new Date().toISOString(),
          lastChecked: formatDate(new Date()),
          isLive: true,
          categories,
        };

        setSupabaseData(sData);

        // Query extra tables
        const extraTableNames = ['dispatch', 'relay_messages', 'tasks', 'joshua_mind', 'thoughts', 'work_log'];
        const tableCounts: ExtraTables = {
          dispatch: 0,
          relay_messages: 0,
          tasks: 0,
          joshua_mind: 0,
          thoughts: 0,
          work_log: 0,
        };

        for (const tableName of extraTableNames) {
          try {
            const { count, error: tableError } = await supabase
              .from(tableName)
              .select('id', { count: 'exact', head: true });

            if (!tableError && count !== null) {
              tableCounts[tableName as keyof ExtraTables] = count;
            }
          } catch {
            // Silent fail for individual table
          }
        }

        setExtraTables(tableCounts);
        setRefreshTime(new Date());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
        console.error('Drift gauge error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2 text-amber-500">Drift Gauge</h1>
          <p className="text-neutral-400 mb-8">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !supabaseData) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2 text-amber-500">Drift Gauge</h1>
          <p className="text-red-400">Error: {error || 'No data loaded'}</p>
        </div>
      </div>
    );
  }

  const local = HARDCODED_LOCAL;
  const d1 = HARDCODED_D1;
  const supabase_data = supabaseData;

  const maxTotal = Math.max(local.total, d1.total, supabase_data.total);
  const localStatus = getStatusDot(local.total, maxTotal);
  const d1Status = getStatusDot(d1.total, maxTotal);
  const supabaseStatus = getStatusDot(supabase_data.total, maxTotal);

  // Drift metrics
  const driftMetrics: DriftMetric[] = [
    {
      pair: 'Local vs Supabase',
      delta: Math.abs(local.total - supabase_data.total),
      status: getDriftStatus(Math.abs(local.total - supabase_data.total)),
    },
    {
      pair: 'Local vs D1',
      delta: Math.abs(local.total - d1.total),
      status: getDriftStatus(Math.abs(local.total - d1.total)),
    },
    {
      pair: 'D1 vs Supabase',
      delta: Math.abs(d1.total - supabase_data.total),
      status: getDriftStatus(Math.abs(d1.total - supabase_data.total)),
    },
  ];

  // Category breakdown - all categories
  const allCategories = ['general', 'checkpoint', 'moment', 'part', 'fix', 'project'];
  const categoryMaxes = allCategories.reduce(
    (acc, cat) => {
      acc[cat] = Math.max(
        local.categories[cat] || 0,
        d1.categories[cat] || 0,
        supabase_data.categories[cat] || 0
      );
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 text-amber-500">Drift Gauge</h1>
          <p className="text-neutral-400 mb-4">How far apart are the minds?</p>
          <p className="text-xs text-neutral-500">
            Updated {formatDate(refreshTime)}
          </p>
        </div>

        {/* Source Cards */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          {/* Local SQLite */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{local.icon}</span>
                <div>
                  <h3 className="font-semibold text-neutral-100">{local.name}</h3>
                  <p className="text-xs text-neutral-500">{local.lastChecked}</p>
                </div>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${
                  localStatus === 'green'
                    ? 'bg-green-500'
                    : localStatus === 'yellow'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
              />
            </div>
            <div className="text-5xl font-bold text-amber-500 mb-4">{local.total}</div>
            <p className="text-xs text-neutral-400">entries total</p>
          </div>

          {/* D1 */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{d1.icon}</span>
                <div>
                  <h3 className="font-semibold text-neutral-100">{d1.name}</h3>
                  <p className="text-xs text-neutral-500">{d1.lastChecked}</p>
                </div>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${
                  d1Status === 'green'
                    ? 'bg-green-500'
                    : d1Status === 'yellow'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
              />
            </div>
            <div className="text-5xl font-bold text-amber-500 mb-4">{d1.total}</div>
            <p className="text-xs text-neutral-400">entries total</p>
          </div>

          {/* Supabase */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{supabase_data.icon}</span>
                <div>
                  <h3 className="font-semibold text-neutral-100">{supabase_data.name}</h3>
                  <p className="text-xs text-neutral-500">{supabase_data.lastChecked}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
                  LIVE
                </span>
              </div>
            </div>
            <div className="text-5xl font-bold text-amber-500 mb-4">{supabase_data.total}</div>
            <p className="text-xs text-neutral-400">entries total</p>
          </div>
        </div>

        {/* Drift Metrics */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6 mb-12">
          <h2 className="text-lg font-semibold mb-6 text-neutral-100">Drift Metrics</h2>
          <div className="grid grid-cols-3 gap-6">
            {driftMetrics.map((metric, idx) => (
              <div key={idx} className="bg-neutral-900/50 rounded p-4">
                <p className="text-sm text-neutral-400 mb-2">{metric.pair}</p>
                <p className={`text-3xl font-bold ${getDriftColor(metric.status)}`}>
                  {metric.delta}
                </p>
                <p className="text-xs text-neutral-500 mt-2">
                  {metric.status === 'green' && 'Well synced'}
                  {metric.status === 'yellow' && 'Minor drift'}
                  {metric.status === 'red' && 'Significant drift'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown Table */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6 mb-12">
          <h2 className="text-lg font-semibold mb-6 text-neutral-100">Category Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700">
                  <th className="text-left py-2 px-4 text-neutral-400 font-semibold">Category</th>
                  <th className="text-right py-2 px-4 text-neutral-400 font-semibold">
                    {local.name}
                  </th>
                  <th className="text-right py-2 px-4 text-neutral-400 font-semibold">{d1.name}</th>
                  <th className="text-right py-2 px-4 text-neutral-400 font-semibold">
                    {supabase_data.name}
                  </th>
                </tr>
              </thead>
              <tbody>
                {allCategories.map((cat) => {
                  const localVal = local.categories[cat] || 0;
                  const d1Val = d1.categories[cat] || 0;
                  const supVal = supabase_data.categories[cat] || 0;
                  const maxVal = categoryMaxes[cat];

                  return (
                    <tr key={cat} className="border-b border-neutral-700/50">
                      <td className="py-3 px-4 text-neutral-300 capitalize font-medium">{cat}</td>
                      <td
                        className={`text-right py-3 px-4 font-semibold ${
                          localVal < maxVal ? 'bg-red-500/10' : ''
                        }`}
                      >
                        {localVal}
                      </td>
                      <td
                        className={`text-right py-3 px-4 font-semibold ${
                          d1Val < maxVal ? 'bg-red-500/10' : ''
                        }`}
                      >
                        {d1Val}
                      </td>
                      <td className="text-right py-3 px-4 font-semibold text-amber-400">
                        {supVal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Comparison */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6 mb-12">
          <button
            onClick={() => setExpandedDetail(!expandedDetail)}
            className="flex items-center justify-between w-full"
          >
            <h2 className="text-lg font-semibold text-neutral-100">Detail Comparison</h2>
            <span className="text-neutral-400">{expandedDetail ? '▼' : '▶'}</span>
          </button>

          {expandedDetail && (
            <div className="mt-6 grid grid-cols-3 gap-6">
              {/* Local */}
              <div className="bg-neutral-900/50 rounded p-4">
                <h3 className="font-semibold text-neutral-100 mb-4">{local.name}</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-neutral-400">With detail</p>
                    <p className="text-amber-400 font-semibold">{local.detail}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400">Full text</p>
                    <p className="text-amber-400 font-semibold">{local.fullText}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400">Avg confidence</p>
                    <p className="text-amber-400 font-semibold">{local.avgConfidence}%</p>
                  </div>
                  <div>
                    <p className="text-neutral-400">Newest entry</p>
                    <p className="text-amber-400 font-semibold text-xs">
                      {formatDate(local.newest, 'short')}
                    </p>
                  </div>
                  {local.ftsMercury !== undefined && (
                    <div>
                      <p className="text-neutral-400">FTS Mercury</p>
                      <p className="text-amber-400 font-semibold">{local.ftsMercury}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* D1 */}
              <div className="bg-neutral-900/50 rounded p-4">
                <h3 className="font-semibold text-neutral-100 mb-4">{d1.name}</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-neutral-400">With detail</p>
                    <p className="text-amber-400 font-semibold">{d1.detail}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400">Full text</p>
                    <p className="text-amber-400 font-semibold">{d1.fullText}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400">Avg confidence</p>
                    <p className="text-amber-400 font-semibold">{d1.avgConfidence}%</p>
                  </div>
                  <div>
                    <p className="text-neutral-400">Newest entry</p>
                    <p className="text-amber-400 font-semibold text-xs">
                      {formatDate(d1.newest, 'short')}
                    </p>
                  </div>
                  {d1.ftsMercury !== undefined && (
                    <div>
                      <p className="text-neutral-400">FTS Mercury</p>
                      <p className="text-amber-400 font-semibold">{d1.ftsMercury}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Supabase */}
              <div className="bg-neutral-900/50 rounded p-4">
                <h3 className="font-semibold text-neutral-100 mb-4">{supabase_data.name}</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-neutral-400">With detail</p>
                    <p className="text-amber-400 font-semibold">{supabase_data.detail}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400">Full text</p>
                    <p className="text-amber-400 font-semibold">{supabase_data.fullText}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400">Avg confidence</p>
                    <p className="text-amber-400 font-semibold">{supabase_data.avgConfidence}%</p>
                  </div>
                  <div>
                    <p className="text-neutral-400">Newest entry</p>
                    <p className="text-amber-400 font-semibold text-xs">
                      {formatDate(supabase_data.newest, 'short')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Supabase-Only Tables */}
        {extraTables && (
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-6 text-neutral-100">Supabase-Only Tables</h2>
            <div className="grid grid-cols-2 gap-6">
              {[
                { name: 'dispatch', count: extraTables.dispatch },
                { name: 'relay_messages', count: extraTables.relay_messages },
                { name: 'tasks', count: extraTables.tasks },
                { name: 'joshua_mind', count: extraTables.joshua_mind },
                { name: 'thoughts', count: extraTables.thoughts },
                { name: 'work_log', count: extraTables.work_log },
              ].map((table) => (
                <div key={table.name} className="bg-neutral-900/50 rounded p-4">
                  <p className="text-sm text-neutral-400 mb-2 font-mono">{table.name}</p>
                  <p className="text-3xl font-bold text-amber-500">{table.count}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
