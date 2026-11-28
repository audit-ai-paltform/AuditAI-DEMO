export interface HomePageCMS {
  hero: {
    badge: string;
    headline: string;
    subheadline: string;
    ctaPrimaryText: string;
    ctaPrimaryLink: string;
    ctaSecondaryText: string;
    ctaSecondaryLink: string;
    stats: Array<{ label: string; value: string }>;
  };
  about: {
    badge: string;
    title: string;
    description: string;
    mission: string;
    highlights: string[];
    yearsInBusiness: string;
    complianceStandard: string;
  };
  features: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    icon: string;
    badge?: string;
  }>;
  team: Array<{
    id: string;
    name: string;
    role: string;
    bio: string;
    avatar: string;
    linkedin?: string;
    twitter?: string;
  }>;
  pricing: Array<{
    id: string;
    name: string;
    price: number;
    interval: string;
    callMinutes: number;
    agentSeats: number;
    popular?: boolean;
    features: string[];
  }>;
  faqs: Array<{
    id: string;
    question: string;
    answer: string;
    category: string;
  }>;
  contactInfo: {
    companyName: string;
    email: string;
    phone: string;
    salesEmail: string;
    address: string;
    supportHours: string;
    emergencyHotline: string;
  };
  legal: {
    privacyPolicy: string;
    termsConditions: string;
    platformUsageRights: string;
    refundPolicy: string;
  };
  footer: {
    tagline: string;
    copyright: string;
    disclaimer: string;
    links: Array<{ label: string; href: string }>;
  };
  enquirySettings: {
    notifyEmail: string;
    autoReplySubject: string;
    autoReplyMessage: string;
    requirePhone: boolean;
  };
  clientsWithUs: Array<{
    id: string;
    name: string;
    industry: string;
    seats: string;
    badge: string;
    active: boolean;
  }>;
  updated_at: string;
}

export interface InboundEnquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name: string;
  team_size: string;
  service_interest: string;
  message: string;
  preferred_schedule: string;
  status: 'NEW' | 'SCHEDULED' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';
  notes?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformUserAccess {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name: string;
  user_type: 'client' | 'employee' | 'admin';
  role: string;
  status: 'ACTIVE' | 'REVOKED' | 'SUSPENDED';
  subscription_tier: string;
  subscription_status: 'ACTIVE' | 'PAYMENT_DUE' | 'EXPIRED' | 'TRIAL';
  amount_due: number;
  due_date: string;
  last_login_at: string;
  last_logout_at: string;
  login_count: number;
  last_payment_reminder_sent?: string;
  login_history: Array<{
    timestamp: string;
    ip: string;
    userAgent: string;
    type: 'LOGIN' | 'LOGOUT';
    status: 'SUCCESS' | 'FAILED';
  }>;
  organization_team: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    accessLevel: string;
    lastActive: string;
  }>;
  created_at: string;
  updated_at: string;
}

// Default rich Home Page CMS Data
let currentHomePageCMS: HomePageCMS = {
  hero: {
    badge: 'AI-Native QA & Conversational Intelligence v2.0',
    headline: 'Autonomous Call Quality Assurance & Sales Conversion Intelligence',
    subheadline: 'Audit 100% of customer interactions in real time. Detect buying signals, forecast deal revenue, eliminate compliance breaches, and deliver targeted agent coaching—all in one unified platform.',
    ctaPrimaryText: 'Start Enterprise Free Trial',
    ctaPrimaryLink: '#enquiry',
    ctaSecondaryText: 'Explore Live Interactive Console',
    ctaSecondaryLink: '/app',
    stats: [
      { label: 'Interaction Audits', value: '10M+' },
      { label: 'Evaluation Accuracy', value: '99.4%' },
      { label: 'Time Saved per Audit', value: '85%' },
      { label: 'SLA Uptime', value: '99.99%' },
    ],
  },
  about: {
    badge: 'About AuditAI Qalyzer Platform',
    title: 'Transforming Quality Governance with Stage 2 AI Intelligence',
    description: 'AuditAI was engineered from the ground up for modern enterprise contact centers, BPOs, and revenue teams. Legacy QA tools inspect less than 2% of calls with delayed manual scorecards. AuditAI inspects 100% of calls, chats, and emails with sub-minute turnaround and mathematical precision.',
    mission: 'Our mission is to empower frontline teams with real-time conversational clarity, actionable coaching, and predictive customer satisfaction tracking.',
    highlights: [
      'Stage 2 AI evaluation adhering strictly to versioned client SOPs',
      'Instant buying signals extraction and revenue win-probability scoring',
      'Automated root cause analysis and negative sentiment escalation alerts',
      'Enterprise-grade Cloudflare D1 SQL relational storage & R2 encrypted audio vaults',
    ],
    yearsInBusiness: '6+ Years Enterprise Experience',
    complianceStandard: 'SOC-2 Type II, ISO 27001 & HIPAA Compliant',
  },
  features: [
    {
      id: 'feat_1',
      title: 'AI Sales & Conversion Forecasting',
      description: 'Extracts structured buying signals (purchase intent, budget confirmed, competitor mentions, pricing objections). Calculates 0–100% win probability and groups leads into Commit, Best Case, and At-Risk buckets.',
      category: 'Sales Intelligence',
      icon: 'TrendingUp',
      badge: 'PRD Stage 2',
    },
    {
      id: 'feat_2',
      title: '"Data Fishing" Semantic Discovery',
      description: 'Natural-language "Ask Qalyzer" search bar across thousands of calls and messages. Automatically clusters recurring objections, product bugs, and churn reasons with vector embeddings.',
      category: 'Deep Analytics',
      icon: 'Search',
      badge: 'Vector Search',
    },
    {
      id: 'feat_3',
      title: '"What Could Have Been Done Better" Coaching Engine',
      description: 'Pinpoints exact missed opportunities turn-by-turn with side-by-side comparisons of agent statements versus ideal script rewrites aligned with company SOPs.',
      category: 'Frontline Coaching',
      icon: 'BookOpen',
      badge: 'One-Click Feedback',
    },
    {
      id: 'feat_4',
      title: 'Dynamic SOP Knowledge Hub & Impact Reports',
      description: 'Self-serve knowledge hub with effective dates and a versioned rule engine. Audits historical calls against the exact rules active on that date, and generates executive business impact reports.',
      category: 'Governance & SOP',
      icon: 'Shield',
      badge: 'Versioned Rules',
    },
    {
      id: 'feat_5',
      title: 'Predictive CSAT & Emotional Tone Tracking',
      description: 'Monitors emotional tone, silence duration, and sentiment progression turn-by-turn to predict customer satisfaction and flag escalation risks before the conversation closes.',
      category: 'Customer Experience',
      icon: 'Smile',
      badge: 'Real-Time Flags',
    },
    {
      id: 'feat_6',
      title: 'PayU Enterprise Subscription & Invoicing',
      description: 'Seamless billing integration with SHA-512 cryptographic verification, instant tier upgrades, multi-seat licensing, and automated GST-compliant invoicing.',
      category: 'Enterprise Billing',
      icon: 'CreditCard',
      badge: 'PayU Gateway',
    },
  ],
  team: [
    {
      id: 'tm_1',
      name: 'Dr. Aris Thorne',
      role: 'Chief Executive Officer & Co-Founder',
      bio: 'Former VP of Conversational AI at Global Telco. 15+ years scaling enterprise speech recognition and natural language architectures.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      linkedin: 'https://linkedin.com',
      twitter: 'https://twitter.com',
    },
    {
      id: 'tm_2',
      name: 'Rohan Mehra',
      role: 'Chief Technology Officer',
      bio: 'Ex-Google Cloud AI Infrastructure Lead. Architected real-time high-throughput streaming pipelines and distributed edge vector indexes.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      linkedin: 'https://linkedin.com',
    },
    {
      id: 'tm_3',
      name: 'Elena Rostova',
      role: 'Head of Quality Engineering & Governance',
      bio: 'Certified Six Sigma Black Belt. Pioneered automated contact center compliance audits for Fortune 500 financial institutions.',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      linkedin: 'https://linkedin.com',
    },
    {
      id: 'tm_4',
      name: 'Aditya Sen',
      role: 'Head of Enterprise Customer Success',
      bio: 'Leads partner integrations across telecom carriers (Knowlarity, Twilio) and bespoke client onboarding workflows.',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      linkedin: 'https://linkedin.com',
    },
  ],
  pricing: [
    {
      id: 'starter',
      name: 'Starter Tier',
      price: 9999,
      interval: 'month',
      callMinutes: 5000,
      agentSeats: 5,
      popular: false,
      features: [
        'Up to 5,000 call minutes / month',
        '5 Quality Auditor & Agent Seats',
        'Automated AI QA Scoring & Transcripts',
        'Basic Sentiment & Silence Detection',
        'Standard Email Support & Daily Digests',
        'PayU Secure Gateway Billing',
      ],
    },
    {
      id: 'growth',
      name: 'Growth Professional',
      price: 24999,
      interval: 'month',
      callMinutes: 25000,
      agentSeats: 20,
      popular: true,
      features: [
        'Up to 25,000 call minutes / month',
        '20 Quality Auditor & Agent Seats',
        'Root Cause Analysis (RCA) Engine',
        'AI Sales & Win Probability Forecasting',
        '"What Could Have Been Done Better" Coaching',
        'Cloudflare D1 SQL Relational Sync',
        'Priority Webhook Ingestion Queue',
        'Priority 24/7 SLA Support',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise Ultra',
      price: 49999,
      interval: 'month',
      callMinutes: 50000,
      agentSeats: 50,
      popular: false,
      features: [
        '50,000+ call minutes / month (Custom Scalable)',
        '50+ Auditor & Manager Seats',
        'Unlimited Custom QA Parameters & Scripts',
        'Knowledge Hub Effective Date Versioning',
        'Full Semantic "Data Fishing" Vector Search',
        'Cloudflare R2 Encrypted Audio Vaults',
        'Dedicated Enterprise Account Manager',
        'Custom Telephony & Webhook Engineering',
      ],
    },
  ],
  faqs: [
    {
      id: 'faq_1',
      question: 'How quickly does AuditAI process incoming call recordings?',
      answer: 'AuditAI processes audio streams asynchronously with high-speed parallel workers. A 10-minute call is transcribed, audited against all SOP rules, analyzed for buying signals and sentiment, and scored in under 45 seconds.',
      category: 'Performance',
    },
    {
      id: 'faq_2',
      question: 'Can we integrate with our existing telephony provider like Knowlarity?',
      answer: 'Yes! AuditAI features a native Knowlarity webhook integration and generic secure HTTP webhook ingestion compatible with Twilio, Exotel, Genesys, and custom Asterisk PBX systems.',
      category: 'Integration',
    },
    {
      id: 'faq_3',
      question: 'How does the Stage 2 SOP rule engine work?',
      answer: 'You can upload your standard operating procedures as PDF or plain text in Settings > Products & Processes. Our Gemini-powered rule extractor extracts structured audit criteria with suggested weights. Historical interactions are always audited against the exact SOP active on that call date.',
      category: 'AI & Methodology',
    },
    {
      id: 'faq_4',
      question: 'What payment methods does PayU support for subscriptions?',
      answer: 'PayU supports all major Indian and international Credit/Debit cards (Visa, MasterCard, RuPay, Amex), UPI (Google Pay, PhonePe, Paytm, BHIM), Net Banking across 50+ banks, and Corporate Wallets.',
      category: 'Billing',
    },
    {
      id: 'faq_5',
      question: 'Is customer conversational data encrypted and private?',
      answer: 'Yes. All audio recordings are stored in encrypted Cloudflare R2 object vaults, and transcripts/scores are isolated in Supabase and Cloudflare D1 with strict multi-tenant Row Level Security (RLS). We never train public foundation models on your proprietary data.',
      category: 'Security',
    },
    {
      id: 'faq_6',
      question: 'Can administrators revoke or grant access to employees and clients in real time?',
      answer: 'Yes. Administrators have full role-based access control (RBAC) in the Admin Panel to grant, revoke, or suspend client and employee access immediately with one click.',
      category: 'Administration',
    },
  ],
  contactInfo: {
    companyName: 'AuditAI Technologies Pvt. Ltd.',
    email: 'contact@auditai.io',
    phone: '+91 (080) 4567-8900',
    salesEmail: 'enterprise-sales@auditai.io',
    address: 'Tower 4, Level 9, Cyber City Tech Park, Outer Ring Road, Bengaluru, Karnataka 560103, India',
    supportHours: 'Monday – Saturday: 9:00 AM – 9:00 PM IST (24/7 Critical SLA for Enterprise)',
    emergencyHotline: '+91 98765 43210',
  },
  legal: {
    privacyPolicy: `AuditAI Privacy Policy (v2026.1)
Last updated: November 2026

1. Information We Collect:
We collect organization account details, user login credentials, telephony webhook metadata, audio recordings, generated transcripts, and QA evaluation metrics submitted by authorized tenants.

2. Purpose of Processing:
Data is processed strictly to generate automated quality scores, coaching recommendations, sales forecasts, and compliance flags as requested by the subscriber.

3. Data Isolation & Security:
Each client workspace is cryptographically isolated using dedicated tenant IDs and database access policies. All data at rest is encrypted with AES-256 and transmitted using TLS 1.3.

4. Retention:
Telephony audio and transcript records are retained in accordance with the tenant's chosen data retention policy (default 90 days), after which automated purge protocols apply.`,
    termsConditions: `AuditAI Terms and Conditions of Service
Last updated: November 2026

1. Acceptance of Terms:
By accessing or using the AuditAI platform, you agree to be bound by these Terms and Conditions on behalf of your legal entity.

2. Permitted Use:
The platform is licensed on a subscription basis for internal quality assurance, agent coaching, and conversation intelligence. Automated scraping, reverse engineering, or unauthorized sublicensing is strictly prohibited.

3. Telephony Compliance:
Subscribers certify that all recorded conversations submitted to the platform have complied with applicable two-party consent and regulatory recording disclosure laws in their operating jurisdiction.`,
    platformUsageRights: `AuditAI Platform Usage Rights & Service Level Agreement
Last updated: November 2026

1. License Grant:
Subscribers receive a non-exclusive, non-transferable enterprise license to execute automated audits up to the maximum call minutes and agent seats allocated in their active subscription tier.

2. Service Availability:
AuditAI maintains a 99.9% monthly uptime target for API webhook ingestion and web dashboard availability, excluding scheduled maintenance windows notified 48 hours in advance.

3. Seat Allocation:
Each licensed seat is designated for an individual QA auditor, supervisor, or manager. Sharing credentials across multiple concurrent operators is prohibited.`,
    refundPolicy: `AuditAI Subscription & Refund Policy
Last updated: November 2026

1. Billing Cycle:
Subscriptions are billed monthly or annually in advance via PayU Gateway. Invoices are generated automatically with GST compliance.

2. Cancellation:
Subscribers may cancel their subscription at any time prior to the next billing renewal date via the Subscription & Billing portal.

3. Refund Eligibility:
Due to server compute and third-party AI LLM token expenses incurred upon ingestion, subscription fees are non-refundable once the billing period has commenced. In the event of confirmed service outages exceeding SLA thresholds, prorated service credits will be applied to the subsequent invoice.`,
  },
  footer: {
    tagline: 'The Autonomous Quality Assurance & Sales Intelligence Standard for Modern Contact Centers.',
    copyright: '© 2026 AuditAI Technologies Pvt. Ltd. All rights reserved.',
    disclaimer: 'Enterprise Qalyzer v2.0 Platform is engineered for SOC-2 and HIPAA compliance environments.',
    links: [
      { label: 'Platform Features', href: '#features' },
      { label: 'About AuditAI', href: '#about' },
      { label: 'Leadership Team', href: '#team' },
      { label: 'Pricing Plans', href: '#pricing' },
      { label: 'Knowledge FAQs', href: '#faqs' },
      { label: 'Book an Enquiry', href: '#enquiry' },
      { label: 'Contact Us', href: '#contact' },
    ],
  },
  enquirySettings: {
    notifyEmail: 'inbound-leads@auditai.io',
    autoReplySubject: 'Thank you for your interest in AuditAI Enterprise Qalyzer',
    autoReplyMessage: 'We have received your enquiry. An Enterprise Solutions Architect will connect with you within 2 business hours.',
    requirePhone: true,
  },
  clientsWithUs: [
    { id: 'cwu_1', name: 'Acme Telephony Solutions', industry: 'Fintech & Collections', seats: '250+ Agents', badge: 'ISO Verified', active: true },
    { id: 'cwu_2', name: 'Apex Global HealthCare', industry: 'Healthcare BPO', seats: '180+ Agents', badge: 'HIPAA Ready', active: true },
    { id: 'cwu_3', name: 'NovaPay Financial Services', industry: 'Digital Banking', seats: '400+ Agents', badge: 'Enterprise Ultra', active: true },
    { id: 'cwu_4', name: 'Vanguard Insurance Corp', industry: 'Insurance Advisory', seats: '120+ Agents', badge: 'Growth Pro', active: true },
  ],
  updated_at: new Date().toISOString(),
};

// Seeded Inbound Enquiries Store
let enquiriesStore: InboundEnquiry[] = [
  {
    id: 'enq_001',
    name: 'Vikram Singhania',
    email: 'vikram.s@reliance-retail.example.com',
    phone: '+91 98200 12345',
    company_name: 'Reliance Consumer Care',
    team_size: '50-200 Agents',
    service_interest: 'Enterprise Ultra (50k min/mo) + Knowlarity Webhook',
    message: 'We operate 4 regional contact centers and need automated compliance auditing for Hindi and English sales calls.',
    preferred_schedule: 'Next Tuesday 11:00 AM IST',
    status: 'NEW',
    notes: 'High-value retail prospect. Needs custom Hindi script evaluation.',
    assigned_to: 'Aditya Sen',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'enq_002',
    name: 'Ananya Deshmukh',
    email: 'ananya.d@fintech-axis.example.com',
    phone: '+91 98333 55667',
    company_name: 'Axis Digital Lending',
    team_size: '20-50 Agents',
    service_interest: 'Growth Professional + Sales Forecasting',
    message: 'Looking to detect buying signals and calculate win probability for loan conversion calls.',
    preferred_schedule: 'Tomorrow 3:00 PM IST',
    status: 'SCHEDULED',
    notes: 'Demo scheduled with Head of Product. Calendar invite dispatched.',
    assigned_to: 'Rohan Mehra',
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 10).toISOString(),
  },
  {
    id: 'enq_003',
    name: 'Suresh Menon',
    email: 'suresh@menon-logistics.example.com',
    phone: '+91 98440 99881',
    company_name: 'Menon Global Freight',
    team_size: '5-20 Agents',
    service_interest: 'Starter Tier + Custom SOP Upload',
    message: 'We need to audit driver communication and dispatch escalation interactions.',
    preferred_schedule: 'Friday 4:30 PM IST',
    status: 'IN_PROGRESS',
    notes: 'Trial account configured. Reviewing pilot call ingestion.',
    assigned_to: 'Elena Rostova',
    created_at: new Date(Date.now() - 3600000 * 40).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 14).toISOString(),
  },
  {
    id: 'enq_004',
    name: 'Kavita Nair',
    email: 'kavita@edtech-nextgen.example.com',
    phone: '+91 99110 33445',
    company_name: 'NextGen EdTech',
    team_size: '20-50 Agents',
    service_interest: 'Growth Plan + Coaching Engine',
    message: 'Need automated coaching digests delivered to counselors based on missed upsells.',
    preferred_schedule: 'Completed Demo on Nov 24',
    status: 'RESOLVED',
    notes: 'Signed contract for Growth Tier. Subscription active.',
    assigned_to: 'Aditya Sen',
    created_at: new Date(Date.now() - 3600000 * 96).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 20).toISOString(),
  },
];

// Seeded Platform Users & Access Control Store
let platformUsersStore: PlatformUserAccess[] = [
  {
    id: 'usr_001',
    name: 'Master Administrator',
    email: 'admin@auditai.io',
    phone: '+91 98000 00001',
    company_name: 'AuditAI Global Operations',
    user_type: 'admin',
    role: 'Master Admin',
    status: 'ACTIVE',
    subscription_tier: 'Enterprise Ultra',
    subscription_status: 'ACTIVE',
    amount_due: 0,
    due_date: '2026-12-25',
    last_login_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    last_logout_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    login_count: 142,
    login_history: [
      { timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), ip: '103.21.244.12', userAgent: 'Chrome 122 (Windows 11)', type: 'LOGIN', status: 'SUCCESS' },
      { timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), ip: '103.21.244.12', userAgent: 'Chrome 122 (Windows 11)', type: 'LOGOUT', status: 'SUCCESS' },
      { timestamp: new Date(Date.now() - 3600000 * 8).toISOString(), ip: '103.21.244.12', userAgent: 'Chrome 122 (Windows 11)', type: 'LOGIN', status: 'SUCCESS' },
    ],
    organization_team: [
      { id: 'tm_01', name: 'Rohan Mehra', email: 'rohan@auditai.io', role: 'CTO / Technical Admin', accessLevel: 'FULL_ADMIN', lastActive: '5 mins ago' },
      { id: 'tm_02', name: 'Elena Rostova', email: 'elena@auditai.io', role: 'Lead QA Architect', accessLevel: 'QA_GOVERNOR', lastActive: '12 mins ago' },
      { id: 'tm_03', name: 'Aditya Sen', email: 'aditya@auditai.io', role: 'Partner Operations', accessLevel: 'OPERATIONS', lastActive: '1 hour ago' },
    ],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'usr_002',
    name: 'Priya Sharma (Acme Corp)',
    email: 'priya.sharma@acmecorp.example.com',
    phone: '+91 98765 43210',
    company_name: 'Acme Financial Services',
    user_type: 'client',
    role: 'Enterprise Client Admin',
    status: 'ACTIVE',
    subscription_tier: 'Enterprise Ultra',
    subscription_status: 'ACTIVE',
    amount_due: 0,
    due_date: '2026-12-15',
    last_login_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    last_logout_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    login_count: 58,
    login_history: [
      { timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), ip: '49.207.180.5', userAgent: 'Firefox 123 (macOS)', type: 'LOGIN', status: 'SUCCESS' },
      { timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), ip: '49.207.180.5', userAgent: 'Firefox 123 (macOS)', type: 'LOGOUT', status: 'SUCCESS' },
    ],
    organization_team: [
      { id: 'acme_1', name: 'Rajesh K', email: 'rajesh@acme.example.com', role: 'QA Team Lead', accessLevel: 'SUPERVISOR', lastActive: '3 hours ago' },
      { id: 'acme_2', name: 'Simran V', email: 'simran@acme.example.com', role: 'Senior Auditor', accessLevel: 'AUDITOR', lastActive: 'Yesterday' },
      { id: 'acme_3', name: 'Tanya B', email: 'tanya@acme.example.com', role: 'Compliance Officer', accessLevel: 'READ_ONLY', lastActive: '2 days ago' },
    ],
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'usr_003',
    name: 'Rahul Verma (Zenith Logistics)',
    email: 'rahul.verma@zenith-logistics.example.com',
    phone: '+91 98111 22334',
    company_name: 'Zenith Logistics Ltd.',
    user_type: 'client',
    role: 'Partner Client',
    status: 'ACTIVE',
    subscription_tier: 'Growth Professional',
    subscription_status: 'PAYMENT_DUE',
    amount_due: 24999.0,
    due_date: '2026-11-28',
    last_login_at: new Date(Date.now() - 3600000 * 14).toISOString(),
    last_logout_at: new Date(Date.now() - 3600000 * 16).toISOString(),
    login_count: 31,
    login_history: [
      { timestamp: new Date(Date.now() - 3600000 * 14).toISOString(), ip: '122.161.45.89', userAgent: 'Safari 17 (iOS)', type: 'LOGIN', status: 'SUCCESS' },
    ],
    organization_team: [
      { id: 'zen_1', name: 'Karan J', email: 'karan@zenith.example.com', role: 'Dispatch Auditor', accessLevel: 'AUDITOR', lastActive: '5 hours ago' },
      { id: 'zen_2', name: 'Meena P', email: 'meena@zenith.example.com', role: 'Support Supervisor', accessLevel: 'SUPERVISOR', lastActive: 'Yesterday' },
    ],
    created_at: '2026-02-01T00:00:00.000Z',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'usr_004',
    name: 'Neha Kapoor (Senior Auditor)',
    email: 'neha.kapoor@auditai-ops.example.com',
    phone: '+91 98990 11223',
    company_name: 'AuditAI Quality Operations',
    user_type: 'employee',
    role: 'Senior QA Auditor',
    status: 'ACTIVE',
    subscription_tier: 'Internal Enterprise',
    subscription_status: 'ACTIVE',
    amount_due: 0,
    due_date: 'N/A (Employee)',
    last_login_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    last_logout_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    login_count: 210,
    login_history: [
      { timestamp: new Date(Date.now() - 3600000 * 1).toISOString(), ip: '103.21.244.55', userAgent: 'Edge 122 (Windows 11)', type: 'LOGIN', status: 'SUCCESS' },
    ],
    organization_team: [
      { id: 'emp_01', name: 'Pooja Iyer', email: 'pooja@auditai-ops.example.com', role: 'Junior Auditor', accessLevel: 'AUDITOR', lastActive: 'Active now' },
      { id: 'emp_02', name: 'Manoj Pillai', email: 'manoj@auditai-ops.example.com', role: 'Transcript Reviewer', accessLevel: 'AUDITOR', lastActive: '20 mins ago' },
    ],
    created_at: '2026-01-10T00:00:00.000Z',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'usr_005',
    name: 'Kunal Shah (Apex Financial)',
    email: 'kunal.shah@apex-financial.example.com',
    phone: '+91 99000 88776',
    company_name: 'Apex Financial Services',
    user_type: 'client',
    role: 'Client Manager',
    status: 'REVOKED',
    subscription_tier: 'Starter Tier',
    subscription_status: 'EXPIRED',
    amount_due: 9999.0,
    due_date: '2026-11-20',
    last_login_at: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
    last_logout_at: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
    login_count: 9,
    login_history: [
      { timestamp: new Date(Date.now() - 3600000 * 24 * 6).toISOString(), ip: '115.240.90.12', userAgent: 'Chrome 121 (Windows 10)', type: 'LOGIN', status: 'SUCCESS' },
    ],
    organization_team: [
      { id: 'apex_1', name: 'Vikas G', email: 'vikas@apex.example.com', role: 'Agent Auditor', accessLevel: 'REVOKED', lastActive: '6 days ago' },
    ],
    created_at: '2026-02-10T00:00:00.000Z',
    updated_at: new Date().toISOString(),
  },
];

export class AdminPortalService {
  /**
   * Get public Home Page CMS configuration
   */
  static getHomePageCMS(): HomePageCMS {
    return { ...currentHomePageCMS };
  }

  /**
   * Update Home Page CMS configuration (Admin only)
   */
  static updateHomePageCMS(updates: Partial<HomePageCMS>): HomePageCMS {
    currentHomePageCMS = {
      ...currentHomePageCMS,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return currentHomePageCMS;
  }

  /**
   * Submit new inbound customer enquiry from Home Page
   */
  static createEnquiry(data: {
    name: string;
    email: string;
    phone: string;
    company_name: string;
    team_size?: string;
    service_interest?: string;
    message: string;
    preferred_schedule?: string;
  }): InboundEnquiry {
    const newEnquiry: InboundEnquiry = {
      id: `enq_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: data.name,
      email: data.email,
      phone: data.phone,
      company_name: data.company_name,
      team_size: data.team_size || '5-20 Agents',
      service_interest: data.service_interest || 'Enterprise QA Consultation',
      message: data.message,
      preferred_schedule: data.preferred_schedule || 'Immediate Follow-up',
      status: 'NEW',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    enquiriesStore.unshift(newEnquiry);
    return newEnquiry;
  }

  /**
   * List all enquiries with status filter
   */
  static listEnquiries(filterStatus?: string): InboundEnquiry[] {
    if (!filterStatus || filterStatus === 'ALL') {
      return [...enquiriesStore];
    }
    return enquiriesStore.filter((e) => e.status.toUpperCase() === filterStatus.toUpperCase());
  }

  /**
   * Update enquiry lifecycle status or notes
   */
  static updateEnquiry(id: string, patch: Partial<InboundEnquiry>): InboundEnquiry | null {
    const idx = enquiriesStore.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    enquiriesStore[idx] = {
      ...enquiriesStore[idx]!,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    return enquiriesStore[idx]!;
  }

  /**
   * List platform users for access control
   */
  static listUsers(filterType?: string): PlatformUserAccess[] {
    if (!filterType || filterType === 'ALL') {
      return [...platformUsersStore];
    }
    return platformUsersStore.filter((u) => u.user_type === filterType.toLowerCase());
  }

  /**
   * Add a new client or employee
   */
  static addUser(userData: {
    name: string;
    email: string;
    phone: string;
    company_name: string;
    user_type: 'client' | 'employee' | 'admin';
    role: string;
    subscription_tier?: string;
  }): PlatformUserAccess {
    const newUser: PlatformUserAccess = {
      id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      company_name: userData.company_name,
      user_type: userData.user_type,
      role: userData.role,
      status: 'ACTIVE',
      subscription_tier: userData.subscription_tier || (userData.user_type === 'client' ? 'Growth Professional' : 'Internal Enterprise'),
      subscription_status: userData.user_type === 'client' ? 'ACTIVE' : 'ACTIVE',
      amount_due: 0,
      due_date: '2026-12-31',
      last_login_at: 'Never',
      last_logout_at: 'Never',
      login_count: 0,
      login_history: [],
      organization_team: [
        {
          id: `tm_${Date.now()}`,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          accessLevel: userData.user_type === 'admin' ? 'FULL_ADMIN' : 'STANDARD',
          lastActive: 'Just added',
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    platformUsersStore.unshift(newUser);
    return newUser;
  }

  /**
   * Update access status (Grant, Revoke, Suspend) or role
   */
  static updateUserAccess(id: string, patch: Partial<PlatformUserAccess>): PlatformUserAccess | null {
    const idx = platformUsersStore.findIndex((u) => u.id === id);
    if (idx === -1) return null;

    platformUsersStore[idx] = {
      ...platformUsersStore[idx]!,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    return platformUsersStore[idx]!;
  }

  /**
   * Universal Search across Name / Email / Company Name / Phone
   * Returns complete dossier: login/logout data, subscription data, team data, access data
   */
  static universalSearch(query: string) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
      return platformUsersStore.slice(0, 10);
    }

    const qDigits = q.replace(/[^0-9]/g, '');

    return platformUsersStore.filter((u) => {
      const phoneDigits = u.phone.replace(/[^0-9]/g, '');
      const matchesPhone = qDigits.length >= 3 && phoneDigits.includes(qDigits);

      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.company_name.toLowerCase().includes(q) ||
        matchesPhone ||
        u.role.toLowerCase().includes(q) ||
        u.subscription_tier.toLowerCase().includes(q)
      );
    });
  }

  /**
   * One-click automated payment reminder dispatch
   */
  static sendPaymentReminder(userId: string): { success: boolean; message: string; user?: PlatformUserAccess } {
    const user = platformUsersStore.find((u) => u.id === userId);
    if (!user) {
      return { success: false, message: 'User record not found.' };
    }

    const timestamp = new Date().toISOString();
    user.last_payment_reminder_sent = timestamp;

    return {
      success: true,
      message: `Automated payment reminder successfully sent to ${user.name} (${user.email}) for ${user.subscription_tier} renewal of ₹${user.amount_due || 24999}.`,
      user,
    };
  }

  private static roleFeaturesStore: Record<string, string[]> = {
    super_admin: [
      'dashboard', 'alerts', 'sales_forecasting', 'data_fishing', 'knowledge_hub',
      'sop_parameters', 'scores', 'chattest', 'agents', 'qctools', 'csvupload',
      'reports', 'audittrail', 'crm_setup', 'settings', 'cloudflare_db', 'payu_billing',
      'admin_home_cms', 'admin_access', 'admin_search', 'admin_enquiries',
      'admin_subscriptions', 'admin_email', 'admin_team', 'admin_activity', 'admin_users',
    ],
    admin: [
      'dashboard', 'alerts', 'sales_forecasting', 'data_fishing', 'knowledge_hub',
      'sop_parameters', 'scores', 'chattest', 'agents', 'qctools', 'csvupload',
      'reports', 'audittrail', 'crm_setup', 'settings', 'admin_home_cms',
      'admin_access', 'admin_search', 'admin_enquiries', 'admin_email', 'admin_team',
    ],
    manager: [
      'dashboard', 'alerts', 'data_fishing', 'knowledge_hub',
      'sop_parameters', 'scores', 'chattest', 'agents', 'qctools', 'csvupload',
      'reports', 'audittrail',
    ],
    sales: [
      'dashboard', 'sales_forecasting', 'data_fishing', 'scores',
      'reports', 'admin_enquiries', 'admin_search',
    ],
    client_super_admin: [
      'dashboard', 'alerts', 'sales_forecasting', 'data_fishing', 'knowledge_hub',
      'sop_parameters', 'scores', 'chattest', 'agents', 'qctools', 'csvupload',
      'reports', 'audittrail', 'crm_setup', 'settings', 'payu_billing', 'admin_access',
    ],
    client_admin: [
      'dashboard', 'alerts', 'sales_forecasting', 'data_fishing', 'knowledge_hub',
      'sop_parameters', 'scores', 'chattest', 'agents', 'qctools', 'csvupload',
      'reports', 'audittrail', 'crm_setup', 'settings', 'admin_access',
    ],
    client_manager: [
      'dashboard', 'alerts', 'sop_parameters', 'scores', 'chattest', 'agents', 'qctools', 'reports',
    ],
    client: [
      'dashboard', 'scores', 'chattest', 'reports',
    ],
  };

  static getRoleFeatures(): Record<string, string[]> {
    return JSON.parse(JSON.stringify(this.roleFeaturesStore));
  }

  static updateRoleFeatures(role: string, features: string[]): Record<string, string[]> {
    if (!role || !Array.isArray(features)) {
      throw new Error('Valid role and features array are required.');
    }
    this.roleFeaturesStore[role] = [...new Set(features)];
    return this.getRoleFeatures();
  }

  static allocateClientPanel(userId: string, clientRole: string = 'client_super_admin'): {
    success: boolean;
    message: string;
    user?: PlatformUserAccess;
  } {
    const user = platformUsersStore.find((u) => u.id === userId);
    if (!user) return { success: false, message: 'User not found.' };
    user.status = 'ACTIVE';
    user.role = clientRole;
    return {
      success: true,
      message: `Allocated dedicated Client Admin Panel (${clientRole}) to ${user.name} (${user.company_name}).`,
      user,
    };
  }
}
