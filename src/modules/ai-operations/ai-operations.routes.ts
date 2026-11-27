import { Router } from 'express';
import { aiOperationController } from './ai-operations.controller.js';
import { asyncHandler } from '../../core/http/middleware/async-handler.js';

const router = Router();

// Core AI Infrastructure & RCA
router.post('/rca', asyncHandler(aiOperationController.generateRca));
router.get('/providers', asyncHandler(aiOperationController.getProviders));
router.post('/test-providers', asyncHandler(aiOperationController.testProviders));

// Qalyzer v2.0 AI Sales & Conversion Forecasting
router.get('/sales-forecasting', asyncHandler(aiOperationController.getSalesForecasting));

// Qalyzer v2.0 "Data Fishing" (Semantic Search & Trend Discovery)
router.post('/ask-qalyzer', asyncHandler(aiOperationController.askQalyzer));
router.get('/trends/clusters', asyncHandler(aiOperationController.getTrendClusters));

// Qalyzer v2.0 "What Could Have Been Done Better" Coaching Engine
router.get('/coaching/calls/:id', asyncHandler(aiOperationController.getCallCoaching));
router.post('/coaching/dispatch', asyncHandler(aiOperationController.dispatchCoachingDigest));

// Qalyzer v2.0 Dynamic Product/Process Updates (Settings > Products & Processes)
router.get('/knowledge-hub', asyncHandler(aiOperationController.getKnowledgeHub));
router.post('/knowledge-hub', asyncHandler(aiOperationController.createKnowledgeDocument));

// Qalyzer v2.0 Executive Before & After Business Impact Reports
router.get('/reports/business-impact', asyncHandler(aiOperationController.getBusinessImpactReport));

export const aiOperationRoutes = router;
