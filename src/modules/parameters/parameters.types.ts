export interface ParameterEntity {
  id: string;
  client_id: string;
  name: string;
  weight: number;
  enabled: boolean;
  ai_suggested: boolean;
  created_at: string;
  updated_at: string;
}

export interface ParameterListResult {
  parameters: ParameterEntity[];
  total: number;
  page: number;
  limit: number;
}
