'use client';

import { useEffect, useState } from 'react';
import { supabase, Task, WorkLog } from '@/lib/supabase';
import PartBadge from '@/components/PartBadge';
import { PRIORITY_COLORS, TASK_STATUS_ORDER } from '@/lib/constants';

interface ExpandedTask {
  id: string;
  isExpanded: boolean;
}

interface TaskWithWorkLog extends Task {
  work_logs?: WorkLog[];
}

const TASK_STATUSES = ['pending', 'in_progress', 'blocked', 'completed', 'deferred'];

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithWorkLog[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });

        if (tasksError) throw tasksError;

        // Fetch work logs
        const { data: workLogsData, error: workLogsError } = await supabase
          .from('work_log')
          .select('*')
          .order('created_at', { ascending: false });

        if (workLogsError) throw workLogsError;

        const typedTasks = (tasksData || []) as Task[];
        const typedWorkLogs = (workLogsData || []) as WorkLog[];

        // Attach work logs to tasks
        const tasksWithLogs = typedTasks.map(task => ({
          ...task,
          work_logs: typedWorkLogs.filter(log => log.task_id === task.id),
        }));

        setTasks(tasksWithLogs);
        setWorkLogs(typedWorkLogs);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Map(expandedTasks);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.set(id, true);
    }
    setExpandedTasks(newExpanded);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriorityColor = (priority: string | null) => {
    if (!priority) return 'bg-neutral-700 text-gray-300';
    return PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || 'bg-neutral-700 text-gray-300';
  };

  const groupTasksByStatus = () => {
    const grouped: Record<string, TaskWithWorkLog[]> = {};
    TASK_STATUSES.forEach(status => {
      grouped[status] = tasks.filter(t => t.status === status);
    });
    return grouped;
  };

  const groupedTasks = groupTasksByStatus();

  if (loading) {
    return (
      <main className="flex-1 overflow-auto">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-auto">
      <div className="p-6 h-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Tasks</h1>
          <p className="text-gray-400">Kanban board for project task management</p>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No tasks yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[calc(100vh-180px)] overflow-hidden">
            {TASK_STATUSES.map(status => (
              <div key={status} className="flex flex-col bg-neutral-900 rounded-lg border border-neutral-700">
                {/* Column Header */}
                <div className="p-4 border-b border-neutral-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white capitalize">
                      {status.replace('_', ' ')}
                    </h2>
                    <span className="px-2 py-1 rounded text-xs bg-neutral-700 text-gray-300">
                      {groupedTasks[status].length}
                    </span>
                  </div>
                </div>

                {/* Tasks List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {groupedTasks[status].length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-xs">No tasks</p>
                    </div>
                  ) : (
                    groupedTasks[status].map(task => {
                      const isExpanded = expandedTasks.get(task.id);
                      return (
                        <div
                          key={task.id}
                          className="bg-neutral-800 rounded-lg border border-neutral-700 hover:border-neutral-600 transition"
                        >
                          <div
                            className="p-3 cursor-pointer"
                            onClick={() => toggleExpanded(task.id)}
                          >
                            {/* Task Header */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="text-sm font-medium text-white flex-1 line-clamp-2">
                                {task.title}
                              </h3>
                              <div
                                className={`w-4 h-4 flex items-center justify-center flex-shrink-0 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              >
                                <svg
                                  className="w-3 h-3 text-gray-400"
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

                            {/* Badges */}
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {task.priority && (
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                              )}
                              {task.assigned_to && (
                                <PartBadge part={task.assigned_to} />
                              )}
                            </div>

                            {/* Due Date */}
                            {task.due_date && (
                              <div className="text-xs text-gray-400">
                                Due: {formatDate(task.due_date)}
                              </div>
                            )}

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-neutral-700 space-y-3 text-xs">
                                {task.project && (
                                  <div>
                                    <h4 className="font-semibold text-gray-400 mb-1">Project</h4>
                                    <p className="text-gray-300">{task.project}</p>
                                  </div>
                                )}

                                {task.description && (
                                  <div>
                                    <h4 className="font-semibold text-gray-400 mb-1">Description</h4>
                                    <p className="text-gray-300 whitespace-pre-wrap text-xs">
                                      {task.description}
                                    </p>
                                  </div>
                                )}

                                {task.assigned_to && (
                                  <div>
                                    <h4 className="font-semibold text-gray-400 mb-1">Assigned To</h4>
                                    <p className="text-gray-300">
                                      <PartBadge part={task.assigned_to} />
                                    </p>
                                  </div>
                                )}

                                {task.priority && (
                                  <div>
                                    <h4 className="font-semibold text-gray-400 mb-1">Priority</h4>
                                    <p className={`${getPriorityColor(task.priority)} inline-block px-2 py-1 rounded text-xs font-medium`}>
                                      {task.priority}
                                    </p>
                                  </div>
                                )}

                                {task.due_date && (
                                  <div>
                                    <h4 className="font-semibold text-gray-400 mb-1">Due Date</h4>
                                    <p className="text-gray-300">{formatDate(task.due_date)}</p>
                                  </div>
                                )}

                                {task.tags && Array.isArray(task.tags) && task.tags.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-gray-400 mb-1">Tags</h4>
                                    <div className="flex flex-wrap gap-1">
                                      {task.tags.map((tag: string) => (
                                        <span
                                          key={tag}
                                          className="px-2 py-1 rounded text-xs bg-neutral-700 text-gray-300"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {task.work_logs && task.work_logs.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-gray-400 mb-2">Work Log ({task.work_logs.length})</h4>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                      {task.work_logs.map((log, idx) => (
                                        <div
                                          key={`${task.id}-log-${idx}`}
                                          className="bg-neutral-900 rounded p-2 border border-neutral-700"
                                        >
                                          <div className="flex items-start justify-between mb-1">
                                            <p className="text-gray-300 font-medium">{log.summary}</p>
                                            <span className="text-gray-500 text-xs">
                                              {formatDateTime(log.created_at)}
                                            </span>
                                          </div>
                                          {log.detail && (
                                            <p className="text-gray-400 text-xs whitespace-pre-wrap">
                                              {log.detail}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="text-gray-500">
                                  Created: {formatDateTime(task.created_at)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
