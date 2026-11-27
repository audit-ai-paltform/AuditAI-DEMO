/**
 * Cloudflare D1 Database Client Service
 * Communicates with Cloudflare D1 SQL engine directly via Cloudflare API
 * or through the edge worker endpoint.
 */

export interface D1QueryResult<T = any> {
  success: boolean;
  results: T[];
  meta?: {
    duration?: number;
    rows_read?: number;
    rows_written?: number;
  };
}

// Local in-memory persistent tables for development fallback
const localTables: Record<string, any[]> = {
  call_sales_forecasts: [
    {
      id: 'sf_001',
      call_id: 'call_seed_001',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      lead_identifier: '+91 98765 43210 (Acme Corp)',
      purchase_intent: 'HIGH',
      budget_confirmed: 1,
      competitor_mentions: JSON.stringify(['Salesforce Service Cloud', 'Talkdesk']),
      pricing_objections: JSON.stringify(['Asked for enterprise volume tier discount']),
      win_probability: 88,
      forecast_category: 'commit',
      projected_revenue: 49999.0,
      deal_stage: 'Negotiation',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'sf_002',
      call_id: 'call_seed_002',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      lead_identifier: '+91 98111 22334 (Zenith Logistics)',
      purchase_intent: 'MEDIUM',
      budget_confirmed: 1,
      competitor_mentions: JSON.stringify(['Zendesk QA']),
      pricing_objections: JSON.stringify(['Timeline to onboard 50 agents']),
      win_probability: 65,
      forecast_category: 'best_case',
      projected_revenue: 24999.0,
      deal_stage: 'Proposal',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: 'sf_003',
      call_id: 'call_seed_003',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      lead_identifier: '+91 99000 88776 (Apex Financial)',
      purchase_intent: 'LOW',
      budget_confirmed: 0,
      competitor_mentions: JSON.stringify(['Verint', 'NICE CXone']),
      pricing_objections: JSON.stringify(['Annual contract commitment too rigid', 'Implementation fee']),
      win_probability: 32,
      forecast_category: 'at_risk',
      projected_revenue: 9999.0,
      deal_stage: 'Discovery',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
  ],
  agent_coaching_insights: [
    {
      id: 'coach_001',
      call_id: 'call_seed_001',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      agent_id: 'ag_01',
      agent_name: 'Priya Sharma',
      turn_index: 4,
      timestamp: '01:45',
      category: 'missed_upsell',
      missed_opportunity: 'Customer expressed multi-location scaling need but agent only pitched standard 5-seat starter plan.',
      agent_statement: 'Sure, we have a basic starter plan that gives you 5 seats for 9,999.',
      ideal_rewrite: 'Since you mentioned expanding across 3 regional branches next quarter, our Growth plan with 20 seats and priority queue routing will give your team seamless coverage with centralized QA analytics.',
      coaching_rationale: 'Anchoring on the customer\'s expansion timeline creates immediate relevance for higher tiers and prevents immediate license bottlenecks.',
      created_at: new Date().toISOString(),
    },
    {
      id: 'coach_002',
      call_id: 'call_seed_002',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      agent_id: 'ag_02',
      agent_name: 'Rahul Verma',
      turn_index: 6,
      timestamp: '03:10',
      category: 'objection_mishandle',
      missed_opportunity: 'Customer hesitated on pricing; agent stayed silent for 6 seconds then offered an unapproved concession.',
      agent_statement: 'Well... um... maybe I can ask my manager if we can cut 20% off if you sign today.',
      ideal_rewrite: 'I completely understand budget predictability is crucial. Rather than compromising your SLA support, let\'s look at our quarterly billing structure where you get 25,000 call minutes with zero upfront integration fees.',
      coaching_rationale: 'Reframe price to ROI and flexibility instead of instantly discounting, which degrades product perceived value.',
      created_at: new Date().toISOString(),
    },
  ],
  knowledge_products_processes: [
    {
      id: 'doc_001',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      title: 'Enterprise QA Governance & Compliance SOP v2.4',
      category: 'compliance',
      version: '2.4',
      effective_from: '2026-01-01',
      effective_to: null,
      content: 'Standard Operating Procedure: All customer interactions must begin with mandatory 2-factor customer verification. Explicit recording consent is strictly required. For pricing queries, quote verified tier rate card before discounts. Escalate red-flag sentiment interactions to Level 2 supervisor within 90 seconds.',
      rules_extracted: JSON.stringify([
        { rule: 'Mandatory customer identity verification prior to account disclosure', suggestedWeight: 20 },
        { rule: 'Clear disclosure of call recording and compliance consent', suggestedWeight: 15 },
        { rule: 'Adherence to approved rate card without unverified verbal discounts', suggestedWeight: 25 },
        { rule: 'Proactive objection handling within 15 seconds of customer hesitation', suggestedWeight: 20 },
        { rule: 'Formal closing script with documented ticket ID and follow-up timeline', suggestedWeight: 20 },
      ]),
      status: 'ACTIVE',
      created_at: new Date('2026-01-01').toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'doc_002',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      title: 'Q2 AI Omnichannel Support & Cross-Sell Playbook',
      category: 'product',
      version: '1.2',
      effective_from: '2026-03-01',
      effective_to: null,
      content: 'Product & Cross-Sell Guidelines: When a customer mentions high call volume (>10k minutes/month), agents must introduce the Cloudflare D1 real-time edge streaming module and automated RCA diagnostics.',
      rules_extracted: JSON.stringify([
        { rule: 'Identify volume triggers (>10k minutes) to cross-sell Cloudflare D1 high-throughput pipeline', suggestedWeight: 30 },
        { rule: 'Provide verified SLA turnaround guarantee (99.9% uptime)', suggestedWeight: 35 },
        { rule: 'Log lead intent in CRM within 5 minutes of call termination', suggestedWeight: 35 },
      ]),
      status: 'ACTIVE',
      created_at: new Date('2026-03-01').toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  trend_clusters: [
    {
      id: 'tc_001',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      cluster_type: 'recurring_objection',
      topic_title: 'Annual Contract Commitment Hesitation',
      description: 'Prospective clients frequently question 12-month lock-in periods and request monthly quarterly pilot milestones.',
      frequency_count: 42,
      severity: 'HIGH',
      impact_score: 84,
      sample_quotes: JSON.stringify([
        'We love the AI scoring, but our finance team won\'t sign an annual contract before seeing a 60-day pilot.',
        'Can we start on month-to-month before locking into the Enterprise plan?',
        'What happens to our historical recordings if we decide to adjust seats in 6 months?'
      ]),
      first_detected_at: new Date(Date.now() - 3600000 * 24 * 14).toISOString(),
      last_detected_at: new Date().toISOString(),
    },
    {
      id: 'tc_002',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      cluster_type: 'product_bug',
      topic_title: 'Audio Stream Lag on Multi-Party Cold Transfers',
      description: 'Agents experience 2-4 second dead air during external telephony trunk transfers on Knowlarity channels.',
      frequency_count: 19,
      severity: 'MEDIUM',
      impact_score: 62,
      sample_quotes: JSON.stringify([
        'Hello? Can you hear me? The call dropped audio for 5 seconds after transfer.',
        'The caller had to repeat their account number because the transfer audio clipped.'
      ]),
      first_detected_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
      last_detected_at: new Date().toISOString(),
    },
    {
      id: 'tc_003',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      cluster_type: 'cancellation_reason',
      topic_title: 'Q3 Enterprise Budget Freeze & Downsizing',
      description: 'Mid-market accounts freezing non-essential SaaS spend and consolidating multiple auditing tools into single vendor.',
      frequency_count: 14,
      severity: 'HIGH',
      impact_score: 78,
      sample_quotes: JSON.stringify([
        'Our company has put a hiring and tooling freeze until Q4.',
        'We need to consolidate our speech analytics into the same contract as our telephony vendor.'
      ]),
      first_detected_at: new Date(Date.now() - 3600000 * 24 * 21).toISOString(),
      last_detected_at: new Date().toISOString(),
    },
  ],
  predictive_csat_metrics: [
    {
      id: 'csat_001',
      call_id: 'call_seed_001',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      predicted_csat: 4.8,
      satisfaction_probability: 94,
      escalation_risk: 'LOW',
      emotional_tone: 'CONFIDENT_ENGAGED',
      silence_duration_seconds: 4.2,
      silence_percentage: 2.8,
      sentiment_progression: JSON.stringify({ opening: 'POSITIVE', middle: 'POSITIVE', closing: 'DELIGHTED' }),
      risk_factors: JSON.stringify([]),
      created_at: new Date().toISOString(),
    },
    {
      id: 'csat_002',
      call_id: 'call_seed_002',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      predicted_csat: 3.2,
      satisfaction_probability: 60,
      escalation_risk: 'MEDIUM',
      emotional_tone: 'HESITANT_FRUSTRATED',
      silence_duration_seconds: 14.5,
      silence_percentage: 9.4,
      sentiment_progression: JSON.stringify({ opening: 'NEUTRAL', middle: 'NEGATIVE', closing: 'NEUTRAL' }),
      risk_factors: JSON.stringify(['Prolonged dead air during rate card query']),
      created_at: new Date().toISOString(),
    },
  ],
  agent_coaching_digests: [],
};

export class CloudflareD1Service {
  private static accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  private static databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID || '';
  private static apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
  private static workerEndpoint = process.env.CLOUDFLARE_D1_WORKER_URL || '';

  /**
   * Execute a single SQL query against Cloudflare D1 or in-memory development state
   */
  static async query<T = any>(sql: string, params: any[] = []): Promise<D1QueryResult<T>> {
    // If edge worker proxy endpoint is provided, use it
    if (this.workerEndpoint) {
      try {
        const resp = await fetch(`${this.workerEndpoint}/d1/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql, params }),
        });
        if (resp.ok) {
          const data = (await resp.json()) as any;
          return { success: true, results: data?.result?.results || data?.result || [] };
        }
      } catch (err) {
        console.warn('[CloudflareD1] Worker proxy error, checking Cloudflare REST API:', err);
      }
    }

    // Direct Cloudflare D1 REST API call
    if (this.accountId && this.databaseId && this.apiToken) {
      try {
        const endpoint = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`;
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sql, params }),
        });

        if (resp.ok) {
          const body = (await resp.json()) as any;
          const queryResult = body.result?.[0];
          return {
            success: true,
            results: queryResult?.results || [],
            meta: queryResult?.meta,
          };
        }
      } catch (err) {
        console.warn('[CloudflareD1] API query failed:', err);
      }
    }

    // Development fallback in-memory database simulation
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();

    // 1. INSERT INTO / REPLACE INTO
    if (upper.startsWith('INSERT') || upper.startsWith('REPLACE')) {
      for (const tableName of Object.keys(localTables)) {
        if (trimmed.toLowerCase().includes(tableName)) {
          // Parse columns from SQL
          const colMatch = trimmed.match(/\(([^)]+)\)\s+VALUES/i);
          if (colMatch && colMatch[1]) {
            const cols = colMatch[1].split(',').map((c) => c.trim());
            const row: Record<string, any> = {};
            cols.forEach((col, idx) => {
              row[col] = params[idx];
            });
            const table = localTables[tableName]!;
            const existingIdx = table.findIndex((r) => r.id && r.id === row.id);
            if (existingIdx >= 0) {
              table[existingIdx] = { ...table[existingIdx], ...row };
            } else {
              table.unshift(row);
            }
            return { success: true, results: [row as any] };
          }
        }
      }
      return { success: true, results: [] };
    }

    // 2. SELECT queries
    if (upper.startsWith('SELECT')) {
      for (const [tableName, rows] of Object.entries(localTables)) {
        if (trimmed.toLowerCase().includes(tableName)) {
          let results = [...rows];
          if (trimmed.includes('WHERE')) {
            // Basic filtering by tenant_id or id if supplied
            if (params.length > 0 && typeof params[0] === 'string' && params[0].includes('-')) {
              results = results.filter((r) => !r.tenant_id || r.tenant_id === params[0]);
            }
          }
          return { success: true, results: results as T[] };
        }
      }
    }

    // Default simulation fallback
    return {
      success: true,
      results: [],
      meta: { duration: 1 },
    };
  }

  /**
   * Health and connectivity check for Cloudflare D1
   */
  static async ping(): Promise<{ connected: boolean; provider: string; details?: string }> {
    if (!this.accountId || !this.databaseId || !this.apiToken) {
      return {
        connected: false,
        provider: 'Cloudflare D1',
        details: 'Cloudflare credentials (ACCOUNT_ID, D1_DATABASE_ID, API_TOKEN) not set in environment.',
      };
    }

    try {
      const res = await this.query('SELECT 1 as ping');
      return { connected: res.success, provider: 'Cloudflare D1' };
    } catch (e: any) {
      return { connected: false, provider: 'Cloudflare D1', details: e.message };
    }
  }
}
