import { Router } from 'express';
import { WebhookController } from './webhook.controller.js';

export const webhookRoutes = Router();

// Primary endpoint specified in handoff doc section 3.2
webhookRoutes.post('/call-complete', WebhookController.handleCallComplete);

// Knowlarity provider alias route
webhookRoutes.post('/knowlarity', WebhookController.handleCallComplete);

// Client-facing status check for onboarding & settings
webhookRoutes.get('/knowlarity/status', WebhookController.getIntegrationStatus);

