import { TeamMember } from './team.types.js';
import { supabaseAdminClient } from '../../core/config/supabase.admin.js';

let memoryTeam: TeamMember[] = [
  {
    id: 'tm_001',
    name: 'Dr. Aris Thorne',
    role: 'Chief Executive Officer & Co-Founder',
    bio: 'Former VP of Conversational AI at Global Telco. 15+ years scaling enterprise speech recognition and natural language architectures.',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    linkedin_url: 'https://linkedin.com/in/aris-thorne',
    twitter_url: 'https://x.com/aris_thorne',
    github_url: 'https://github.com/aristhorne',
    display_order: 1,
    active: true,
  },
  {
    id: 'tm_002',
    name: 'Marcus Vance',
    role: 'Chief Technology Officer',
    bio: 'Speech ML pioneer with deep expertise in Hindi/Indic acoustic models, low-latency DSP, and distributed Cloudflare D1/R2 pipelines.',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    linkedin_url: 'https://linkedin.com/in/marcus-vance',
    twitter_url: 'https://x.com/marcusvance_ml',
    github_url: 'https://github.com/marcusvance',
    display_order: 2,
    active: true,
  },
  {
    id: 'tm_003',
    name: 'Elena Rostova',
    role: 'Head of Product & QA Governance',
    bio: 'Certified ISO 9001/27001 Lead Auditor. Specialized in translating corporate operational playbooks into mathematical AI scoring logic.',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    linkedin_url: 'https://linkedin.com/in/elena-rostova',
    twitter_url: 'https://x.com/elena_qa',
    github_url: 'https://github.com/elenarostova',
    display_order: 3,
    active: true,
  },
  {
    id: 'tm_004',
    name: 'David Sterling',
    role: 'Head of Enterprise Solutions & Customer Success',
    bio: 'Architected 500+ seat contact center transformations across North America, EMEA, and APAC fintech & telecom ecosystems.',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    linkedin_url: 'https://linkedin.com/in/david-sterling-telecom',
    twitter_url: 'https://x.com/davidsterling',
    github_url: 'https://github.com/davidsterling',
    display_order: 4,
    active: true,
  },
];

export class TeamService {
  static async getAll(onlyActive = true): Promise<TeamMember[]> {
    try {
      const { data, error } = await supabaseAdminClient
        .from('team_members')
        .select('*')
        .order('display_order', { ascending: true });

      if (!error && data && data.length > 0) {
        return onlyActive ? data.filter((m) => m.active !== false) : data;
      }
    } catch {}

    return onlyActive
      ? memoryTeam.filter((m) => m.active !== false).sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      : [...memoryTeam].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }

  static async create(memberData: Partial<TeamMember>): Promise<TeamMember> {
    const newMember: TeamMember = {
      id: `tm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: memberData.name || 'Team Member',
      role: memberData.role || 'Solutions Engineer',
      bio: memberData.bio || '',
      avatar_url: memberData.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
      linkedin_url: memberData.linkedin_url || '',
      twitter_url: memberData.twitter_url || '',
      github_url: memberData.github_url || '',
      display_order: memberData.display_order || memoryTeam.length + 1,
      active: memberData.active !== undefined ? memberData.active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    memoryTeam.push(newMember);

    try {
      await supabaseAdminClient.from('team_members').insert(newMember);
    } catch {}

    return newMember;
  }

  static async update(id: string, updates: Partial<TeamMember>): Promise<TeamMember | null> {
    const existing = memoryTeam.find((m) => m.id === id);
    if (!existing) return null;

    const updated: TeamMember = {
      ...existing,
      ...updates,
      id: existing.id,
      name: updates.name ?? existing.name,
      role: updates.role ?? existing.role,
      updated_at: new Date().toISOString(),
    };

    const idx = memoryTeam.findIndex((m) => m.id === id);
    if (idx !== -1) {
      memoryTeam[idx] = updated;
    }

    try {
      await supabaseAdminClient.from('team_members').update(updates).eq('id', id);
    } catch {}

    return updated;
  }

  static async delete(id: string): Promise<boolean> {
    const initialLen = memoryTeam.length;
    memoryTeam = memoryTeam.filter((m) => m.id !== id);

    try {
      await supabaseAdminClient.from('team_members').delete().eq('id', id);
    } catch {}

    return memoryTeam.length < initialLen;
  }
}
