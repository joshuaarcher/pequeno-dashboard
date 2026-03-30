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
  return names[part];
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
  return colors[part];
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

const PartCard = ({ part, mood, color }: { part: PartName; mood: PartMood | null; color: string }) => {
  if (!mood) {
    return (
      <div className="p-4 bg-neutral-800 border-l-4 border-neutral-600 rounded text-neutral-400">
        <div className="font-semibold text-sm mb-2">{getPartDisplayName(part)}</div>
        <div className="text-xs text-neutral-500">Not sensed</div>
      </div>
    );
  }

  const tint = getMoodTint(mood.feeling);

  return (
    <div className={`p-4 bg-neutral-800 border-l-4 rounded ${tint}`} style={{ borderColor: color }}>
      <div className="font-semibold text-sm mb-1" style={{ color }}>
        {getPartDisplayName(part)}
      </div>
      <div className="text-neutral-100 text-sm font-medium">{mood.feeling}</div>
      <IntensityBar intensity={mood.intensity} color={color} />
    </div>
  );
};

export default function MoodPage() {
  const [nyxState, setNyxState] = useState<NyxState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNyxState = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from('nyx_state')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        if (err) {
          setError('Failed to fetch mood data');
          console.error(err);
          return;
        }

        setNyxState(data as NyxState);
      } catch (err) {
        setError('Error loading mood');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNyxState();
    const interval = setInterval(fetchNyxState, 30000); // Refresh every 30 seconds

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

  if (error || !nyxState) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-neutral-400">{error || 'No mood data available'}</div>
        </div>
      </div>
    );
  }

  const timeAgo = formatTimestamp(nyxState.timestamp);
  const stale = isStale(nyxState.timestamp);

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-light tracking-tight">Family Mood</h1>
          <p className="text-2xl text-neutral-400 italic">{nyxState.chord}</p>
          <div className="flex items-center gap-4 text-sm text-neutral-500 pt-2">
            <span>{timeAgo}{stale ? ' (stale)' : ''}</span>
            <span className="text-neutral-700">·</span>
            <span>{nyxState.pulse_count} pulse{nyxState.pulse_count !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Nyx's Dream */}
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

        {/* System Vitals */}
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

        {/* Part Mood Cards */}
        <div>
          <h2 className="text-xl font-light text-neutral-300 mb-4">Parts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALL_PARTS.map((part) => (
              <PartCard
                key={part}
                part={part}
                mood={nyxState.parts[part] || null}
                color={getPartColor(part)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
