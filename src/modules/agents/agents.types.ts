export type AgentStatus = 'Active' | 'Training' | 'Inactive';

export interface AgentEntity {
  id: string;
  client_id: string;
  name: string;
  code: string;
  process: string;
  tenure_minutes: number;
  tenure_months?: number;
  status: AgentStatus;
  created_at: string;
  updated_at: string;
}

export interface AgentListResult {
  agents: AgentEntity[];
  total: number;
  page: number;
  limit: number;
}
