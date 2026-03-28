import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface KnowledgeEntry {
  id: string;
  topic: string;
  summary: string;
  detail: string;
  full_text: string;
  source: string;
  tags: Record<string, unknown>;
  confidence: number;
  evidence_type: string;
  verified: boolean;
  asserted_by: string;
  importance_weight: number;
  part_owner: string;
  created: string;
  modified: string;
  access_count: number;
  last_accessed: string;
}

export interface ThoughtsEntry {
  id: string;
  content: string;
  embedding: unknown;
  metadata: Record<string, unknown>;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface JoshuaMindEntry {
  id: string;
  content: string;
  media_type?: string;
  media_url?: string;
  media_path?: string;
  source: string;
  type: string;
  topics: string[];
  people: string[];
  associations: string[];
  embedding?: unknown;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DispatchMessage {
  id: string;
  created_at: string;
  from_part: string;
  to_part: string;
  subject: string;
  body: string;
  priority: string;
  status: string;
  read_at?: string;
  acknowledged_at?: string;
  thread_id?: string;
  metadata?: Record<string, unknown>;
}

export interface RelayMessage {
  id: string;
  from_part: string;
  to_part: string;
  subject: string;
  body: string;
  status: string;
  response?: string;
  created_at: string;
  read_at?: string;
  responded_at?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigned_to?: string;
  created_by: string;
  project?: string;
  tags: string[];
  blocked_by?: string;
  parent_id?: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface WorkLog {
  id: string;
  task_id?: string;
  part_name: string;
  action: string;
  summary: string;
  detail?: string;
  source_session?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export type CombinedMessage =
  | (DispatchMessage & { _type: 'dispatch' })
  | (RelayMessage & { _type: 'relay' });
