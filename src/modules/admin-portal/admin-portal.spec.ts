import { describe, it, expect } from 'vitest';
import { AdminPortalService } from './admin-portal.service.js';

describe('AdminPortalService & Public CMS', () => {
  it('should retrieve default home page CMS configuration with all required sections', () => {
    const cms = AdminPortalService.getHomePageCMS();
    expect(cms).toBeDefined();
    expect(cms.hero.headline).toContain('Autonomous Call Quality Assurance');
    expect(cms.pricing.length).toBeGreaterThanOrEqual(3);
    expect(cms.team.length).toBeGreaterThanOrEqual(4);
    expect(cms.faqs.length).toBeGreaterThanOrEqual(6);
    expect(cms.legal.privacyPolicy).toBeDefined();
    expect(cms.legal.termsConditions).toBeDefined();
    expect(cms.legal.platformUsageRights).toBeDefined();
    expect(cms.legal.refundPolicy).toBeDefined();
    expect(cms.footer.copyright).toContain('2026');
  });

  it('should allow admin to update home page CMS configuration', () => {
    const updated = AdminPortalService.updateHomePageCMS({
      hero: {
        ...AdminPortalService.getHomePageCMS().hero,
        badge: 'Enterprise Qalyzer v2.4 Sky Edition',
      },
    });
    expect(updated.hero.badge).toBe('Enterprise Qalyzer v2.4 Sky Edition');
    expect(AdminPortalService.getHomePageCMS().hero.badge).toBe('Enterprise Qalyzer v2.4 Sky Edition');
  });

  it('should allow public visitors to submit an inbound enquiry', () => {
    const enquiry = AdminPortalService.createEnquiry({
      name: 'Pooja Hegde',
      email: 'pooja@fintech-express.example.com',
      phone: '+91 99887 76655',
      company_name: 'Fintech Express Corp',
      team_size: '50-200 Agents',
      service_interest: 'Enterprise Ultra + Custom Hindi NLP',
      message: 'Need high-throughput speech QA for loan collection calls.',
      preferred_schedule: 'Monday 10 AM',
    });

    expect(enquiry).toBeDefined();
    expect(enquiry.id).toMatch(/^enq_/);
    expect(enquiry.status).toBe('NEW');

    const list = AdminPortalService.listEnquiries('NEW');
    expect(list.some(e => e.id === enquiry.id)).toBe(true);
  });

  it('should support lifecycle filtering for enquiries (NEW, SCHEDULED, IN_PROGRESS, RESOLVED)', () => {
    const newEnquiries = AdminPortalService.listEnquiries('NEW');
    const scheduled = AdminPortalService.listEnquiries('SCHEDULED');
    const inProgress = AdminPortalService.listEnquiries('IN_PROGRESS');
    const all = AdminPortalService.listEnquiries('ALL');

    expect(Array.isArray(newEnquiries)).toBe(true);
    expect(Array.isArray(scheduled)).toBe(true);
    expect(Array.isArray(inProgress)).toBe(true);
    expect(all.length).toBeGreaterThanOrEqual(newEnquiries.length);
  });

  it('should grant and revoke client and employee access', () => {
    const user = AdminPortalService.addUser({
      name: 'Devraj Patil',
      email: 'devraj@telecom-qa.example.com',
      phone: '+91 98450 11223',
      company_name: 'Telecom QA Partners',
      user_type: 'client',
      role: 'Partner Supervisor',
    });

    expect(user.status).toBe('ACTIVE');

    // Revoke access
    const revoked = AdminPortalService.updateUserAccess(user.id, { status: 'REVOKED' });
    expect(revoked?.status).toBe('REVOKED');

    // Re-grant access
    const granted = AdminPortalService.updateUserAccess(user.id, { status: 'ACTIVE' });
    expect(granted?.status).toBe('ACTIVE');
  });

  it('should perform universal search across Name, Email, Company Name, and Phone', () => {
    // Search by Name
    const byName = AdminPortalService.universalSearch('Priya');
    expect(byName.length).toBeGreaterThan(0);
    expect(byName[0]!.name).toContain('Priya');

    // Search by Email
    const byEmail = AdminPortalService.universalSearch('acmecorp');
    expect(byEmail.length).toBeGreaterThan(0);

    // Search by Company Name
    const byCompany = AdminPortalService.universalSearch('Zenith');
    expect(byCompany.length).toBeGreaterThan(0);
    expect(byCompany[0]!.company_name).toContain('Zenith');

    // Search by Phone
    const byPhone = AdminPortalService.universalSearch('98765');
    expect(byPhone.length).toBeGreaterThan(0);

    // Verify dossier structure: login_history, organization_team, subscription_tier
    const dossier = byCompany[0]!;
    expect(Array.isArray(dossier.login_history)).toBe(true);
    expect(Array.isArray(dossier.organization_team)).toBe(true);
    expect(dossier.subscription_tier).toBeDefined();
  });

  it('should trigger one-click automated payment reminder', () => {
    const clients = AdminPortalService.listUsers('client');
    const target = clients[0]!;

    const reminder = AdminPortalService.sendPaymentReminder(target.id);
    expect(reminder.success).toBe(true);
    expect(reminder.message).toContain('Automated payment reminder successfully sent');
    expect(target.last_payment_reminder_sent).toBeDefined();
  });
});
