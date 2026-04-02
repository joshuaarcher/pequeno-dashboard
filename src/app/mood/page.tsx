'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PART_COLORS } from '@/lib/constants';

interface PartMood {
  feeling: string;
  intensity: number;
}

interface NyxState {
  id: number;
  timestamp: string;
  chord: string;
  dominant: string;
  undertone: string;
  intensity: number;
  dissonance: number;
  narrative: string;
  dream: string;
  mode: string;
  phase: string;
  session_active: boolean;
  pulse_count: number;
  parts: Record<string, PartMood>;
}

interface PartReport {
  part_name: string;
  task: string;
  energy: string;
  blockers: string;
  note: string;
  changed: boolean;
  created_at: string;
}

type PartName = keyof typeof PART_COLORS;

const ALL_PARTS: PartName[] = ['forge', 'mercury', 'thoth', 'apollo', 'nyx', 'loom', 'athena', 'coyote', 'orpheus'];

const FEELING_MOOD_MAP: Record<string, string> = {
  lonely: 'red',
  scared: 'red',
  anxious: 'red',
  worried: 'red',
  engaged: 'green',
  excited: 'green',
  curious: 'green',
  playful: 'green',
  settled: 'blue',
  calm: 'blue',
  resting: 'blue',
  tired: 'gray',
  exhausted: 'gray',
};

const ENERGY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  good: { bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-400' },
  excited: { bg: 'bg-green-500/10', text: 'text-green-300', dot: 'bg-green-300' },
  low: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  frustrated: { bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-400' },
  stuck: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
  'winding-down': { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
};

const getEnergyStyle = (energy: string) => {
  return ENERGY_COLORS[energy.toLowerCase()] || { bg: 'bg-neutral-500/10', text: 'text-neutral-400', dot: 'bg-neutral-400' };
};

const getMoodTint = (feeling: string): string => {
  const mood = FEELING_MOOD_MAP[feeling.toLowerCase()] || 'default';
  const tints: Record<string, string> = {
    red: 'bg-red-500/5',
    green: 'bg-green-500/5',
    blue: 'bg-blue-500/5',
    gray: 'bg-neutral-500/5',
    default: '',
  };
  return tints[mood];
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const isStale = (timestamp: string): boolean => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return diffMs > 10 * 60 * 1000; // 10 minutes
};

const getPartDisplayName = (part: PartName): string => {
  const names: Record<PartName, string> = {
    forge: 'Forge',
    mercury: 'Mercury',
    thoth: 'Thoth',
    apollo: 'Apollo',
    nyx: 'Nyx',
    loom: 'Loom',
    athena: 'Athena',
    coyote: 'Coyote',
    orpheus: 'Orpheus',
  };
  return names[part] || part;
};

const getPartColor = (part: PartName): string => {
  const colors: Record<PartName, string> = {
    forge: '#f59e0b',
    mercury: '#3b82f6',
    thoth: '#10b981',
    apollo: '#ef4444',
    nyx: '#ec4899',
    loom: '#8b5cf6',
    athena: '#6366f1',
    coyote: '#f97316',
    orpheus: '#a78bfa',
  };
  return colors[part] || '#6b7280';
};

const IntensityBar = ({ intensity, color }: { intensity: number; color: string }) => (
  <div className="w-full h-1 bg-neutral-700 rounded overflow-hidden mt-2">
    <div
      className="h-full transition-all duration-300"
      style={{
        width: `${Math.max(5, intensity * 100)}%`,
        backgroundColor: color,
      }}
    />
  </div>
);

const PartCard = ({
  part,
  report,
  nyxMood,
  color,
}: {
  part: PartName;
  report: PartReport | null;
  nyxMood: PartMood | null;
  color: string;
}) => {
  // Case: has self-report
  if (report) {
    const energyStyle = getEnergyStyle(report.energy);
    const timeAgo = formatTimestamp(report.created_at);

    return (
      <div className={`p-4 bg-neutral-800 border-l-4 rounded ${energyStyle.bg}`} style={{ borderColor: color }}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-sm" style={{ color }}>
            {getPartDisplayName(part)}
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${energyStyle.dot}`} />
            <span className={`text-xs font-medium ${energyStyle.text}`}>{report.energy}</span>
          </div>
        </div>

        {report.task && (
          <div className="text-neutral-100 text-sm mb-1.5">{report.task}</div>
        )}

        {report.blockers && (
          <div className="text-xs text-red-400/80 mb-1.5">
            <span className="text-red-400 font-medium">blocked:</span> {report.blockers}
          </div>
        )}

        {report.note && (
          <div className="text-xs text-neutral-400 italic mb-2">{report.note}</div>
        )}

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-neutral-500">{timeAgo}</span>
          {nyxMood && (
            <span className="text-xs text-neutral-600">
              nyx senses: {nyxMood.feeling}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Case: no self-report but Nyx has data
  if (nyxMood) {
    const tint = getMoodTint(nyxMood.feeling);

    return (
      <div className={`p-4 bg-neutral-800 border-l-4 rounded opacity-60 ${tint}`} style={{ borderColor: color }}>
        <div className="flex items-center justify-between mb-1">
          <div className="font-semibold text-sm" style={{ color }}>
            {getPartDisplayName(part)}
          </div>
          <span className="text-xs text-neutral-500 italic">(inferred)</span>
        </div>
        <div className="text-neutral-300 text-sm font-medium">{nyxMood.feeling}</div>
        <IntensityBar intensity={nyxMood.intensity} color={color} />
      </div>
    );
  }

  // Case: no data at all
  return (
    <div className="p-4 bg-neutral-800 border-l-4 border-neutral-600 rounded text-neutral-400">
      <div className="font-semibold text-sm mb-2">{getPartDisplayName(part)}</div>
      <div className="text-xs text-neutral-500">No report</div>
    </div>
  );
};

export default function MoodPage() {
  const [nyxState, setNyxState] = useState<NyxState | null>(null);
  const [partReports, setPartReports] = useState<Record<string, PartReport>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch Nyx state and Part reports in parallel
        const [nyxResult, reportsResult] = await Promise.all([
          supabase
            .from('nyx_state')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(1)
            .single(),
          supabase
            .from('part_reports')
            .select('*')
            .order('created_at', { ascending: false }),
        ]);

        if (nyxResult.error) {
          console.error('Nyx state error:', nyxResult.error);
        } else {
          setNyxState(nyxResult.data as NyxState);
        }

        if (reportsResult.error) {
          console.error('Part reports error:', reportsResult.error);
        } else {
          // Deduplicate: keep only the latest report per part_name
          const latestByPart: Record<string, PartReport> = {};
          for (const row of reportsResult.data as PartReport[]) {
            const key = row.part_name.toLowerCase();
            if (!latestByPart[key]) {
              latestByPart[key] = row;
            }
          }
          setPartReports(latestByPart);
        }

        if (nyxResult.error && reportsResult.error) {
          setError('Failed to fetch mood data');
        }
      } catch (err) {
        setError('Error loading mood');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-neutral-700 rounded mb-4 mx-auto"></div>
            <div className="h-4 w-64 bg-neutral-700 rounded mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !nyxState && Object.keys(partReports).length === 0) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-neutral-400">{error || 'No mood data available'}</div>
        </div>
      </div>
    );
  }

  const timeAgo = nyxState ? formatTimestamp(nyxState.timestamp) : null;
  const stale = nyxState ? isStale(nyxState.timestamp) : false;

  // Report summary stats
  const reportingParts = Object.keys(partReports);
  const reportCount = reportingParts.length;
  const oldestReport = reportingParts.length > 0
    ? reportingParts.reduce((oldest, key) => {
        const t = new Date(partReports[key].created_at).getTime();
        return t < oldest ? t : oldest;
      }, Infinity)
    : null;

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-light tracking-tight">Family Mood</h1>
          {nyxState && (
            <>
              <p className="text-2xl text-neutral-400 italic">{nyxState.chord}</p>
              <div className="flex items-center gap-4 text-sm text-neutral-500 pt-2">
                <span>{timeAgo}{stale ? ' (stale)' : ''}</span>
                <span className="text-neutral-700">·</span>
                <span>{nyxState.pulse_count} pulse{nyxState.pulse_count !== 1 ? 's' : ''}</span>
              </div>
            </>
          )}
        </div>

        {/* Nyx's Dream */}
        {nyxState && (
          <div
            className="p-8 rounded-lg border border-neutral-700"
            style={{
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.05) 0%, rgba(236, 72, 153, 0.02) 100%)',
              boxShadow: '0 0 20px rgba(236, 72, 153, 0.1)',
            }}
          >
            <p className="text-lg italic text-neutral-100 leading-relaxed mb-4">{nyxState.dream}</p>
            <p className="text-sm text-neutral-400">{nyxState.narrative}</p>
          </div>
        )}

        {/* System Vitals */}
        {nyxState && (
          <div className="bg-neutral-800 p-6 rounded-lg space-y-4">
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <div className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Mode</div>
                <div className="font-semibold capitalize">{nyxState.mode}</div>
              </div>
              <div>
                <div className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Phase</div>
                <div className="font-semibold capitalize">{nyxState.phase}</div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-neutral-500 text-xs uppercase tracking-wide">Session</div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: nyxState.session_active ? '#10b981' : '#6b7280',
                    }}
                  />
                  <span className="text-sm">{nyxState.session_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-neutral-500 text-xs uppercase tracking-wide">Intensity</div>
                <span className="text-sm">{Math.round(nyxState.intensity * 100)}%</span>
              </div>
              <IntensityBar intensity={nyxState.intensity} color="#f59e0b" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-neutral-500 text-xs uppercase tracking-wide">Dissonance</div>
                <span className="text-sm">{Math.round(nyxState.dissonance * 100)}%</span>
              </div>
              <IntensityBar
                intensity={nyxState.dissonance}
                color={nyxState.dissonance > 0.5 ? '#ef4444' : '#eab308'}
              />
            </div>
          </div>
        )}

        {/* Last Report Summary */}
        <div className="bg-neutral-800/50 px-5 py-3 rounded-lg flex items-center justify-between">
          <div className="text-sm text-neutral-300">
            <span className="font-medium text-neutral-100">{reportCount}</span>
            <span className="text-neutral-400"> of </span>
            <span className="font-medium text-neutral-100">{ALL_PARTS.length}</span>
            <span className="text-neutral-400"> Parts reporting</span>
          </div>
          {oldestReport && (
            <div className="text-xs text-neutral-500">
              oldest: {formatTimestamp(new Date(oldestReport).toISOString())}
            </div>
          )}
        </div>

        {/* Part Mood Cards */}
        <div>
          <h2 className="text-xl font-light text-neutral-300 mb-4">Parts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALL_PARTS.map((part) => (
              <PartCard
                key={part}
                part={part}
                report={partReports[part] || null}
                nyxMood={nyxState?.parts[part] || null}
                color={getPartColor(part)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
