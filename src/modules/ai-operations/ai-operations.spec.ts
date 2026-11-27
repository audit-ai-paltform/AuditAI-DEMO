import { describe, it, expect, vi } from 'vitest';
import { aiOperationController } from './ai-operations.controller.js';
import { CloudflareD1Service } from '../../database/cloudflare-d1.service.js';
import { callRepository } from '../calls/calls.repository.js';
import { dualAIProvider } from '../../providers/dual-ai.provider.js';

describe('Qalyzer v2.0 AI Operations & PRD Intelligence Engine', () => {
  it('Cloudflare D1 tables engine has initialized seeds for all 5 v2.0 tables', async () => {
    const sales = await CloudflareD1Service.query('SELECT * FROM call_sales_forecasts');
    expect(sales.success).toBe(true);
    expect(sales.results.length).toBeGreaterThanOrEqual(1);

    const coaching = await CloudflareD1Service.query('SELECT * FROM agent_coaching_insights');
    expect(coaching.success).toBe(true);
    expect(coaching.results.length).toBeGreaterThanOrEqual(1);

    const trends = await CloudflareD1Service.query('SELECT * FROM trend_clusters');
    expect(trends.success).toBe(true);
    expect(trends.results.length).toBeGreaterThanOrEqual(1);

    const csat = await CloudflareD1Service.query('SELECT * FROM predictive_csat_metrics');
    expect(csat.success).toBe(true);
    expect(csat.results.length).toBeGreaterThanOrEqual(1);

    const knowledge = await CloudflareD1Service.query('SELECT * FROM knowledge_products_processes');
    expect(knowledge.success).toBe(true);
    expect(knowledge.results.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /ai/sales-forecasting returns Commit, Best Case, At-Risk buckets and projected totals', async () => {
    const mockReq: any = { query: {}, headers: {}, body: {} };
    let jsonResult: any = null;
    let statusCode = 200;
    const mockRes: any = {
      status: (code: number) => { statusCode = code; return mockRes; },
      json: (data: any) => { jsonResult = data; return mockRes; },
      locals: {},
    };

    await aiOperationController.getSalesForecasting(mockReq, mockRes);
    expect(statusCode).toBe(200);
    expect(jsonResult).toBeDefined();
    expect(jsonResult.success).toBe(true);
    expect(jsonResult.data.buckets).toBeDefined();
    expect(jsonResult.data.buckets.commit).toBeDefined();
    expect(jsonResult.data.buckets.best_case).toBeDefined();
    expect(jsonResult.data.buckets.at_risk).toBeDefined();
    expect(jsonResult.data.totalPipelineRevenue).toBeGreaterThan(0);
  });

  it('GET /ai/trends/clusters returns ranked objections, bugs, and cancellation reasons', async () => {
    const mockReq: any = { query: {}, headers: {}, body: {} };
    let jsonResult: any = null;
    let statusCode = 200;
    const mockRes: any = {
      status: (code: number) => { statusCode = code; return mockRes; },
      json: (data: any) => { jsonResult = data; return mockRes; },
      locals: {},
    };

    await aiOperationController.getTrendClusters(mockReq, mockRes);
    expect(statusCode).toBe(200);
    expect(jsonResult.success).toBe(true);
    expect(Array.isArray(jsonResult.data.clusters)).toBe(true);
    expect(jsonResult.data.total_clusters).toBeGreaterThanOrEqual(1);
    expect(jsonResult.data.summary.recurring_objections).toBeGreaterThanOrEqual(1);
  });

  it('GET /ai/coaching/calls/:id returns side-by-side agent coaching comparisons', async () => {
    const mockReq: any = { params: { id: 'call_seed_001' }, query: {}, headers: {}, body: {} };
    let jsonResult: any = null;
    let statusCode = 200;
    const mockRes: any = {
      status: (code: number) => { statusCode = code; return mockRes; },
      json: (data: any) => { jsonResult = data; return mockRes; },
      locals: {},
    };

    await aiOperationController.getCallCoaching(mockReq, mockRes);
    expect(statusCode).toBe(200);
    expect(jsonResult.success).toBe(true);
    expect(Array.isArray(jsonResult.data.moments)).toBe(true);
    expect(jsonResult.data.moments[0].agent_statement).toBeDefined();
    expect(jsonResult.data.moments[0].ideal_rewrite).toBeDefined();
  });

  it('POST /ai/coaching/dispatch dispatches a 1-click micro-coaching digest', async () => {
    const mockReq: any = {
      body: {
        call_id: 'call-101',
        agent_id: 'AGT-882',
        agent_name: 'Rahul Sharma',
        channel: 'slack',
        digest_title: 'Weekly Objection Coaching',
        feedback_notes: 'Great opening, focus on discount deflection.',
      },
      headers: {},
      query: {},
    };
    let jsonResult: any = null;
    let statusCode = 200;
    const mockRes: any = {
      status: (code: number) => { statusCode = code; return mockRes; },
      json: (data: any) => { jsonResult = data; return mockRes; },
      locals: {},
    };

    await aiOperationController.dispatchCoachingDigest(mockReq, mockRes);
    expect(statusCode).toBe(200);
    expect(jsonResult.success).toBe(true);
    expect(jsonResult.data.channel).toBe('slack');
    expect(jsonResult.data.agent_name).toBe('Rahul Sharma');
  });

  it('GET /ai/reports/business-impact produces executive Before/After metrics and delta', async () => {
    vi.spyOn(callRepository, 'findAll').mockResolvedValue({
      calls: [
        {
          id: 'call-pre-1',
          client_id: '00000000-0000-0000-0000-000000000001',
          score: 72,
          created_at: '2026-02-01T10:00:00Z',
          status: 'COMPLETED',
        } as any,
        {
          id: 'call-post-1',
          client_id: '00000000-0000-0000-0000-000000000001',
          score: 91,
          created_at: '2026-02-20T10:00:00Z',
          status: 'COMPLETED',
        } as any,
      ],
      total: 2,
      page: 1,
      limit: 100,
    });

    const mockReq: any = { query: { effectiveDate: '2026-02-15' }, headers: {}, body: {} };
    let jsonResult: any = null;
    let statusCode = 200;
    const mockRes: any = {
      status: (code: number) => { statusCode = code; return mockRes; },
      json: (data: any) => { jsonResult = data; return mockRes; },
      locals: {},
    };

    await aiOperationController.getBusinessImpactReport(mockReq, mockRes);
    expect(statusCode).toBe(200);
    expect(jsonResult.success).toBe(true);
    expect(jsonResult.data.comparison.overall_compliance).toBeDefined();
    expect(jsonResult.data.comparison.objection_handling).toBeDefined();
    expect(jsonResult.data.comparison.fatal_violations).toBeDefined();
    expect(jsonResult.data.comparison.predictive_csat).toBeDefined();
  });

  it('POST /ai/knowledge-hub persists effective-dated documentation into versioned rule engine', async () => {
    vi.spyOn(dualAIProvider, 'extractAuditRules').mockResolvedValue([
      { rule: 'Offer store credit first', suggestedWeight: 50 },
      { rule: 'Verify purchase date within 14 days', suggestedWeight: 50 },
    ]);

    const mockReq: any = {
      body: {
        title: 'New Refund Policy SOP 2026',
        category: 'process',
        version: '3.0',
        effective_from: '2026-03-01',
        content: 'Customers requesting a refund within 14 days must be offered store credit first before processing full refund.',
      },
      headers: {},
      query: {},
    };
    let jsonResult: any = null;
    let statusCode = 200;
    const mockRes: any = {
      status: (code: number) => { statusCode = code; return mockRes; },
      json: (data: any) => { jsonResult = data; return mockRes; },
      locals: {},
    };

    await aiOperationController.createKnowledgeDocument(mockReq, mockRes);
    expect(statusCode).toBe(200);
    expect(jsonResult.success).toBe(true);
    expect(jsonResult.data.rules).toBeDefined();
    expect(jsonResult.data.rules.length).toBe(2);
  });
});
