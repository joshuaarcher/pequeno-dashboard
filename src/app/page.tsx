'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Stats {
  knowledge: number;
  thoughts: number;
  mind: number;
  dispatch: number;
  relay: number;
  tasks: number;
}

interface RecentActivity {
  type: string;
  title: string;
  timestamp: string;
  source: string;
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({
    knowledge: 0,
    thoughts: 0,
    mind: 0,
    dispatch: 0,
    relay: 0,
    tasks: 0,
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [
        { count: knowledgeCount },
        { count: thoughtsCount },
        { count: mindCount },
        { count: dispatchCount },
        { count: relayCount },
        { count: tasksCount },
      ] = await Promise.all([
        supabase.from('knowledge').select('id', { count: 'exact', head: true }),
        supabase.from('thoughts').select('id', { count: 'exact', head: true }),
        supabase.from('joshua_mind').select('id', { count: 'exact', head: true }),
        supabase.from('dispatch').select('id', { count: 'exact', head: true }),
        supabase.from('relay_messages').select('id', { count: 'exact', head: true }),
        supabase.from('tasks').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        knowledge: knowledgeCount || 0,
        thoughts: thoughtsCount || 0,
        mind: mindCount || 0,
        dispatch: dispatchCount || 0,
        relay: relayCount || 0,
        tasks: tasksCount || 0,
      });

      await fetchRecentActivity();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const [dispatchData, workLogData] = await Promise.all([
        supabase
          .from('dispatch')
          .select('created_at, subject, from_part')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('work_log')
          .select('created_at, summary, action, part_name')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const activities: RecentActivity[] = [];

      if (dispatchData.data) {
        dispatchData.data.forEach((item) => {
          activities.push({
            type: 'Dispatch',
            title: item.subject,
            timestamp: item.created_at,
            source: item.from_part,
          });
        });
      }

      if (workLogData.data) {
        workLogData.data.forEach((item) => {
          activities.push({
            type: 'Work Log',
            title: item.summary,
            timestamp: item.created_at,
            source: item.part_name || 'Unknown',
          });
        });
      }

      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 10));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const StatCard = ({ label, value }: { label: string; value: number }) => (
    <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
      <p className="text-neutral-400 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-amber-400">{value}</p>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-neutral-100 mb-2">Pequeno Dashboard</h1>
        <p className="text-neutral-400">System overview and recent activity</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-neutral-400">Loading dashboard...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatCard label="Knowledge Entries" value={stats.knowledge} />
            <StatCard label="Thoughts" value={stats.thoughts} />
            <StatCard label="Joshua Mind" value={stats.mind} />
            <StatCard label="Dispatch Messages" value={stats.dispatch} />
            <StatCard label="Relay Messages" value={stats.relay} />
            <StatCard label="Tasks" value={stats.tasks} />
          </div>

          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-neutral-100 mb-4">Recent Activity</h2>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-4 p-3 bg-neutral-700/30 rounded-lg hover:bg-neutral-700/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-amber-500/20 text-amber-400 text-xs font-semibold px-2.5 py-1 rounded">
                          {activity.type}
                        </span>
                        <span className="text-xs text-neutral-500 capitalize">{activity.source}</span>
                      </div>
                      <p className="text-neutral-300 text-sm truncate">{activity.title}</p>
                    </div>
                    <span className="text-xs text-neutral-500 flex-shrink-0 whitespace-nowrap">
                      {formatDate(activity.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 text-center py-8">No recent activity</p>
            )}
          </div>

          <div className="mt-8 bg-neutral-800 border border-neutral-700 rounded-lg p-6">
            <h3 className="text-xl font-bold text-neutral-100 mb-3">Family Status</h3>
            <p className="text-neutral-400">Heartbeat monitoring and system health data coming soon.</p>
          </div>
        </>
      )}
    </div>
  );
}
