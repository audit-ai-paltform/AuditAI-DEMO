import { Router } from 'express';
import { healthRoutes } from '../modules/health/health.routes.js';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { clientRoutes } from '../modules/clients/clients.routes.js';
import { agentRoutes } from '../modules/agents/agents.routes.js';
import { parameterRoutes } from '../modules/parameters/parameters.routes.js';
import { scriptRoutes } from '../modules/scripts/scripts.routes.js';
import { callRoutes } from '../modules/calls/calls.routes.js';
import { webhookRoutes } from '../modules/webhook/webhook.routes.js';
import { paymentRoutes } from '../modules/payments/payments.routes.js';
import { flagRoutes } from '../modules/flags/flags.routes.js';
import { notificationRoutes } from '../modules/notifications/notifications.routes.js';
import { settingsRoutes } from '../modules/settings/settings.routes.js';
import { dashboardRoutes } from '../modules/dashboard/dashboard.routes.js';
import { aiOperationRoutes } from '../modules/ai-operations/ai-operations.routes.js';
import { integrationsRoutes } from '../modules/integrations/integrations.routes.js';
import { reportsRoutes } from '../modules/reports/reports.routes.js';
import { adminPortalRoutes } from '../modules/admin-portal/admin-portal.routes.js';
import { billingRoutes } from '../modules/billing/billing.routes.js';
import { emailRoutes } from '../modules/email/email.routes.js';
import { teamRoutes } from '../modules/team/team.routes.js';
import { userActivityRoutes } from '../modules/user-activity/user-activity.routes.js';
import { requireTenantAuth } from '../core/http/middleware/tenant-auth.middleware.js';

export const mainRouter = Router();

mainRouter.use('/', healthRoutes);

// Dedicated Authentication & Admin User Management Endpoints (Unprotected login/register + protected admin routes)
mainRouter.use('/auth', authRoutes);

// User Session Heartbeats & Activity Tracking
mainRouter.use('/', userActivityRoutes);

// Payments & PayU/Razorpay Dual Gateways, Plans & Subscriptions
mainRouter.use('/payments', paymentRoutes);
mainRouter.use('/', billingRoutes);

// Dual Email Engine (Resend & Brevo) & Logs
mainRouter.use('/', emailRoutes);

// Team Behind & Leadership Profiles (Public + Admin)
mainRouter.use('/', teamRoutes);

// Public Home CMS & Admin Portal (CMS Editor, Universal Search, Enquiries, Access Control)
mainRouter.use('/', adminPortalRoutes);

// Webhooks authenticate with their provider contract rather than a user JWT.
mainRouter.use('/webhook', webhookRoutes);
mainRouter.use('/', webhookRoutes);

// Tenant-scoped routes requiring active authenticated session
mainRouter.use(requireTenantAuth);
mainRouter.use('/clients', clientRoutes);
mainRouter.use('/agents', agentRoutes);
mainRouter.use('/parameters', parameterRoutes);
mainRouter.use('/scripts', scriptRoutes);
mainRouter.use('/calls', callRoutes);

// Audit intelligence: flags, notifications, tenant configuration, dashboard KPIs
mainRouter.use('/flags', flagRoutes);
mainRouter.use('/notifications', notificationRoutes);
mainRouter.use('/settings', settingsRoutes);
mainRouter.use('/dashboard', dashboardRoutes);

// Interactive AI operations (RCA etc.) — all AI access is server-side
mainRouter.use('/ai', aiOperationRoutes);
mainRouter.use('/integrations', integrationsRoutes);
mainRouter.use('/reports', reportsRoutes);
