'use client';

import { useState, useEffect } from 'react';
import { Task, WorkLog, supabase } from '@/lib/supabase';
import PartBadge from './PartBadge';
import StatusBadge from './StatusBadge';

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (expanded && task.id) {
      setLoadingLogs(true);
      fetchWorkLogs();
    }
  }, [expanded]);

  const fetchWorkLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('work_log')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setWorkLogs(data || []);
    } catch (error) {
      console.error('Error fetching work logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'text-neutral-400',
      medium: 'text-yellow-400',
      high: 'text-red-400',
    };
    return colors[priority.toLowerCase()] || 'text-neutral-400';
  };

  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden hover:border-neutral-600 transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 hover:bg-neutral-700/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-base font-semibold text-neutral-100 flex-1">{task.title}</h3>
          <span className="text-2xl flex-shrink-0">{expanded ? '▼' : '▶'}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={task.status} />
          <span className="text-neutral-600">•</span>
          <span className={`text-sm font-semibold uppercase tracking-wide ${getPriorityColor(task.priority)}`}>
            {task.priority} priority
          </span>
          {task.assigned_to && (
            <>
              <span className="text-neutral-600">•</span>
              <span className="text-sm text-neutral-400">Assigned to {task.assigned_to}</span>
            </>
          )}
        </div>

        {task.project && (
          <div className="mt-2">
            <span className="bg-neutral-700 px-2.5 py-1 rounded text-xs text-neutral-300">
              {task.project}
            </span>
          </div>
        )}

        {task.due_date && (
          <p className="text-xs text-neutral-500 mt-2">Due: {formatDate(task.due_date)}</p>
        )}
      </button>

      {expanded && (
        <div className="border-t border-neutral-700 p-4 bg-neutral-700/20 space-y-4">
          {task.description && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-300 mb-2">Description</h4>
              <p className="text-sm text-neutral-400">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-600">
            <div>
              <p className="text-xs text-neutral-500">Status</p>
              <p className="text-sm font-medium text-neutral-300">{task.status}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Priority</p>
              <p className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>{task.priority}</p>
            </div>
            {task.due_date && (
              <div>
                <p className="text-xs text-neutral-500">Due Date</p>
                <p className="text-sm font-medium text-neutral-300">{formatDate(task.due_date)}</p>
              </div>
            )}
            {task.completed_at && (
              <div>
                <p className="text-xs text-neutral-500">Completed</p>
                <p className="text-sm font-medium text-neutral-300">{formatDate(task.completed_at)}</p>
              </div>
            )}
          </div>

          {task.tags && task.tags.length > 0 && (
            <div className="pt-2 border-t border-neutral-600">
              <p className="text-xs text-neutral-500 mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag, idx) => (
                  <span key={idx} className="bg-neutral-700 px-2.5 py-1 rounded text-xs text-neutral-300">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {workLogs.length > 0 && (
            <div className="pt-2 border-t border-neutral-600">
              <h4 className="text-sm font-semibold text-neutral-300 mb-3">Work Log</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {workLogs.map((log) => (
                  <div key={log.id} className="bg-neutral-700/50 p-2 rounded text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-neutral-200">{log.action}</span>
                      <span className="text-neutral-500">{formatDate(log.created_at)}</span>
                    </div>
                    <p className="text-neutral-400">{log.summary}</p>
                    {log.part_name && (
                      <p className="text-neutral-500 mt-1">by {log.part_name}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingLogs && !workLogs.length && (
            <div className="text-center text-sm text-neutral-500 py-4">Loading work logs...</div>
          )}
        </div>
      )}
    </div>
  );
}
