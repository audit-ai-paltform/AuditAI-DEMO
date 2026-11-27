export interface ScriptSection {
  title: string;
  text: string;
}

export interface ScriptEntity {
  id: string;
  client_id: string;
  process: string;
  language: string;
  sections: ScriptSection[];
  created_at: string;
  updated_at: string;
}

export interface ScriptListResult {
  scripts: ScriptEntity[];
  total: number;
  page: number;
  limit: number;
}
