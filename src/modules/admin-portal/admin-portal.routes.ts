import { Router } from 'express';
import { AdminPortalController } from './admin-portal.controller.js';

export const adminPortalRoutes = Router();

// Publicly accessible endpoints for the Home Landing Page
adminPortalRoutes.get('/public/home-cms', AdminPortalController.getPublicHomePageCMS);
adminPortalRoutes.post('/public/enquiries', AdminPortalController.submitPublicEnquiry);

// Admin-scoped endpoints for CMS management
adminPortalRoutes.get('/admin-portal/home-cms', AdminPortalController.getAdminHomePageCMS);
adminPortalRoutes.put('/admin-portal/home-cms', AdminPortalController.updateAdminHomePageCMS);

// Admin Inbound Enquiries Lifecycle Management
adminPortalRoutes.get('/admin-portal/enquiries', AdminPortalController.listEnquiries);
adminPortalRoutes.patch('/admin-portal/enquiries/:id', AdminPortalController.updateEnquiry);

// Admin Access Control (Clients & Employees)
adminPortalRoutes.get('/admin-portal/access-control', AdminPortalController.listAccessUsers);
adminPortalRoutes.post('/admin-portal/access-control', AdminPortalController.addAccessUser);
adminPortalRoutes.patch('/admin-portal/access-control/:id', AdminPortalController.updateUserAccess);

// Universal Search across Name / Email / Company Name / Phone
adminPortalRoutes.get('/admin-portal/universal-search', AdminPortalController.universalSearch);

// One-Click Automated Payment Reminder
adminPortalRoutes.post('/admin-portal/send-payment-reminder', AdminPortalController.sendPaymentReminder);
