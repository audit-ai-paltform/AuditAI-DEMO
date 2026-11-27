export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio?: string;
  avatar_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  github_url?: string;
  display_order?: number;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}
