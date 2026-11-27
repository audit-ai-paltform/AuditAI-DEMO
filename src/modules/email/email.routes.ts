import { Router } from 'express';
import { EmailController } from './email.controller.js';

export const emailRoutes = Router();

emailRoutes.get('/admin/v1/email/config', EmailController.getConfig);
emailRoutes.put('/admin/v1/email/config', EmailController.updateConfig);
emailRoutes.post('/admin/v1/email/test', EmailController.sendTestEmail);
emailRoutes.post('/admin/v1/email/send-reminder', EmailController.sendPaymentReminder);
emailRoutes.get('/admin/v1/email/logs', EmailController.getLogs);
