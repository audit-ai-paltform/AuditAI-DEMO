import React, { useState, useEffect } from "react";
import {
  Sparkles, TrendingUp, Search, BookOpen, Shield, Smile, CreditCard,
  CheckCircle2, ArrowRight, ChevronDown, ChevronUp, Mail, Phone, MapPin,
  Clock, Users, FileText, Lock, ShieldCheck, Check, AlertCircle, ExternalLink,
  MessageSquare, Star, ArrowUpRight, LogIn, UserCheck, RefreshCw, X,
  Sliders, Award, Zap, Cpu, Database, Activity, DollarSign, Calculator,
  Layers, CheckSquare, Eye, CornerDownRight, Play, HelpCircle, Headphones,
  Radio, FileCheck
} from "lucide-react";
import { homeCmsApi, teamAdminApi, billingApi, emailAdminApi } from "../lib/api";

export default function HomePage({ onOpenAdminLogin, onOpenClientLogin, onEnterConsole }) {
  const [cms, setCms] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeLegalModal, setActiveLegalModal] = useState(null); // 'privacy' | 'terms' | 'usage' | 'refund'
  const [activePipelineStage, setActivePipelineStage] = useState(0);
  const [activeComparisonTab, setActiveComparisonTab] = useState("after"); // 'before' | 'after'

  // Interactive ROI Calculator State
  const [roiCallVolume, setRoiCallVolume] = useState(50000);
  const [roiTeamSize, setRoiTeamSize] = useState(8);
  const [roiAuditRate, setRoiAuditRate] = useState(2); // in %

  // Selected pricing plan synced with Enquiry form
  const [selectedPlan, setSelectedPlan] = useState("Growth Professional");

  // Inbound Enquiry form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    team_size: "20-50 Agents",
    selected_plan: "Growth Professional",
    message: "",
    preferred_schedule: "",
  });
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [enquiryError, setEnquiryError] = useState("");

  // Interactive Direct Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [selectedGateway, setSelectedGateway] = useState("payu"); // 'payu' | 'razorpay'
  const [checkoutForm, setCheckoutForm] = useState({
    name: "Enterprise Client",
    email: "billing@acmetelephony.in",
    phone: "9876543210",
  });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("payment") === "success") {
        setPaymentSuccessData({
          txnid: params.get("txnid") || "TXN_VERIFIED",
          gateway: params.get("gateway") || "payu",
        });
      }
    } catch {}
    loadCMS();
  }, []);

  async function loadCMS() {
    setLoading(true);
    try {
      const [cmsRes, teamRes, plansRes] = await Promise.allSettled([
        homeCmsApi.getPublic(),
        teamAdminApi.getPublicTeam(),
        billingApi.getPublicPlans(),
      ]);

      if (cmsRes.status === "fulfilled" && cmsRes.value) {
        const cmsData = cmsRes.value.data || cmsRes.value;
        if (cmsData && cmsData.hero) setCms(cmsData);
      }
      if (teamRes.status === "fulfilled" && teamRes.value) {
        const teamData = teamRes.value.data || teamRes.value;
        if (Array.isArray(teamData) && teamData.length > 0) {
          setTeamMembers(teamData);
        }
      }
      if (plansRes.status === "fulfilled" && plansRes.value) {
        const plansData = plansRes.value.data || plansRes.value;
        if (Array.isArray(plansData) && plansData.length > 0) {
          setPlans(plansData);
        }
      }
    } catch (err) {
      console.warn("Could not load public data:", err);
    } finally {
      setLoading(false);
    }
  }

  const [enquiryClickTracked, setEnquiryClickTracked] = useState(false);

  function triggerEnquiryIntentEmail(planName, source) {
    if (enquiryClickTracked) return;
    setEnquiryClickTracked(true);
    emailAdminApi.trackEnquiryClick({
      plan: planName || selectedPlan,
      source: source || "Home Page Enquiry Form",
      email: formData.email || undefined,
    }).catch(() => {});
  }

  function handleSelectPricing(planName) {
    setSelectedPlan(planName);
    setFormData(prev => ({ ...prev, selected_plan: planName }));
    triggerEnquiryIntentEmail(planName, `Pricing Plan Card (${planName})`);
    const el = document.getElementById("enquiry-booking");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  async function handleEnquirySubmit(e) {
    e.preventDefault();
    setSubmittingEnquiry(true);
    setEnquiryError("");
    try {
      await homeCmsApi.submitEnquiry({
        ...formData,
        service_interest: formData.selected_plan || selectedPlan,
      });
      setEnquirySuccess(true);
      setFormData({
        name: "",
        email: "",
        phone: "",
        company_name: "",
        team_size: "20-50 Agents",
        selected_plan: selectedPlan,
        message: "",
        preferred_schedule: "",
      });
      setTimeout(() => setEnquirySuccess(false), 9000);
    } catch (err) {
      setEnquiryError(err.message || "Failed to submit enquiry. Please try again.");
    } finally {
      setSubmittingEnquiry(false);
    }
  }

  function handleOpenDirectCheckout(plan) {
    setCheckoutPlan(plan);
    setCheckoutError("");
    setShowCheckoutModal(true);
  }

  async function handleProceedCheckout() {
    if (!checkoutPlan) return;
    setCheckoutLoading(true);
    setCheckoutError("");
    try {
      const planCode = checkoutPlan.code || checkoutPlan.id?.replace("plan_", "") || "growth";
      const res = await billingApi.initiateCheckout({
        planCode,
        gateway: selectedGateway,
        customerName: checkoutForm.name,
        customerEmail: checkoutForm.email,
        customerPhone: checkoutForm.phone,
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to initialize payment transaction");
      }

      if (selectedGateway === "payu" && res.payuPayload) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = res.payuPayload.actionUrl;

        Object.entries(res.payuPayload).forEach(([key, val]) => {
          if (key === "actionUrl" || val === undefined) return;
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = String(val);
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
        return;
      }

      if (selectedGateway === "razorpay" && res.razorpayPayload) {
        if (window.Razorpay) {
          const rzp = new window.Razorpay({
            key: res.razorpayPayload.key,
            amount: res.razorpayPayload.amount,
            currency: res.razorpayPayload.currency,
            name: res.razorpayPayload.name,
            description: res.razorpayPayload.description,
            order_id: res.razorpayPayload.orderId,
            prefill: res.razorpayPayload.prefill,
            handler: async function (response) {
              const verifyRes = await billingApi.verifyRazorpay({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                txnid: res.razorpayPayload.txnid,
                amountPaise: res.razorpayPayload.amount,
                email: checkoutForm.email,
                name: checkoutForm.name,
              });
              if (verifyRes.success) {
                setShowCheckoutModal(false);
                setPaymentSuccessData({
                  txnid: res.razorpayPayload.txnid,
                  gateway: "razorpay",
                });
              }
            },
          });
          rzp.open();
        } else {
          // Rapid development simulation verification
          const verifyRes = await billingApi.verifyRazorpay({
            razorpay_order_id: res.razorpayPayload.orderId,
            razorpay_payment_id: `pay_sim_${Date.now()}`,
            razorpay_signature: "simulated_sha256_signature",
            txnid: res.razorpayPayload.txnid,
            amountPaise: res.razorpayPayload.amount,
            email: checkoutForm.email,
            name: checkoutForm.name,
          });
          if (verifyRes.success) {
            setShowCheckoutModal(false);
            setPaymentSuccessData({
              txnid: res.razorpayPayload.txnid,
              gateway: "razorpay",
            });
          }
        }
      }
    } catch (err) {
      setCheckoutError(err.message || "Failed to process payment checkout");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleSimulateInstantPayment() {
    if (!checkoutPlan) return;
    setCheckoutLoading(true);
    setCheckoutError("");
    try {
      const planCode = checkoutPlan.code || checkoutPlan.id?.replace("plan_", "") || "growth";
      const initRes = await billingApi.initiateCheckout({
        planCode,
        gateway: selectedGateway,
        customerName: checkoutForm.name,
        customerEmail: checkoutForm.email,
        customerPhone: checkoutForm.phone,
      });

      const txnid = initRes.order?.txnid || `txn_${Date.now()}`;
      if (selectedGateway === "payu") {
        const response = await fetch("http://localhost:3000/api/v1/billing/payu/return", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            status: "success",
            txnid,
            amount: (initRes.order?.amount_paise / 100).toFixed(2),
            productinfo: checkoutPlan.name,
            firstname: checkoutForm.name.split(" ")[0],
            email: checkoutForm.email,
            mihpayid: `payu_${Date.now()}`,
            hash: initRes.payuPayload?.hash || "",
            udf1: "00000000-0000-0000-0000-000000000001",
          }),
        });
        if (response.ok) {
          setShowCheckoutModal(false);
          setPaymentSuccessData({ txnid, gateway: "payu" });
        }
      } else {
        const verifyRes = await billingApi.verifyRazorpay({
          razorpay_order_id: initRes.razorpayPayload?.orderId || `order_${Date.now()}`,
          razorpay_payment_id: `rzp_pay_${Date.now()}`,
          razorpay_signature: "simulated_sha256_signature",
          txnid,
          amountPaise: initRes.order?.amount_paise || 999900,
          email: checkoutForm.email,
          name: checkoutForm.name,
        });
        if (verifyRes.success) {
          setShowCheckoutModal(false);
          setPaymentSuccessData({ txnid, gateway: "razorpay" });
        }
      }
    } catch (err) {
      setCheckoutError(err.message || "Simulation failed");
    } finally {
      setCheckoutLoading(false);
    }
  }

  // Dynamic ROI Calculations
  const manualAuditsPerMonth = Math.round((roiCallVolume * roiAuditRate) / 100);
  const hoursSavedPerMonth = Math.round(roiTeamSize * 45); // ~45 hours saved per auditor per month
  const estimatedAnnualSavingsINR = Math.round(hoursSavedPerMonth * 12 * 450); // ₹450/hr blended auditor cost
  const coverageGain = 100 - roiAuditRate;
  const potentialRecoveredRevenueINR = Math.round((roiCallVolume * 0.08) * 1200); // 8% buying signals * ₹1200 avg margin

  // Fallback defaults from CMS
  const hero = cms?.hero || {
    badge: "ISO 9001:2015 & ISO/IEC 27001 Certified Quality Platform",
    headline: "Autonomous Call Quality Governance & Predictive Sales Intelligence",
    subheadline: "Audit 100% of customer interactions across voice, chat, and email in real time. Detect buying signals, forecast deal revenue, enforce zero-tolerance ISO compliance, and deliver targeted agent coaching—all in sub-minute turnaround.",
    ctaPrimaryText: "Select Plan & Request Demo",
    ctaSecondaryText: "Simulate Enterprise ROI",
    stats: [
      { label: "Interaction Audits", value: "10M+" },
      { label: "Scoring Accuracy", value: "99.4%" },
      { label: "QA Cost Reduction", value: "85%" },
      { label: "Cloudflare SLA Uptime", value: "99.99%" },
    ],
  };

  const about = cms?.about || {
    badge: "About AuditAI Qalyzer Platform",
    title: "Transforming Quality Governance with Stage 2 AI Intelligence",
    description: "AuditAI was engineered from the ground up for modern enterprise contact centers, BPOs, and revenue teams. Legacy QA tools inspect less than 2% of calls with delayed manual scorecards. AuditAI inspects 100% of calls, chats, and emails with sub-minute turnaround and mathematical precision.",
    mission: "Our mission is to empower frontline teams with real-time conversational clarity, actionable coaching, and predictive customer satisfaction tracking.",
    highlights: [
      "Stage 2 AI evaluation adhering strictly to versioned client SOPs and ISO 9001 frameworks",
      "Instant buying signals extraction and revenue win-probability scoring (0–100%)",
      "Automated root cause analysis and negative sentiment escalation alerts",
      "Enterprise Cloudflare D1 SQL relational storage & R2 encrypted audio vaults",
    ],
    yearsInBusiness: "6+ Years Enterprise Experience",
    complianceStandard: "ISO 9001, ISO 27001, SOC-2 Type II, HIPAA & PCI-DSS Compliant",
  };

  const features = cms?.features || [
    {
      id: "feat_1",
      title: "AI Sales & Conversion Forecasting",
      description: "Extracts structured buying signals (purchase intent, budget confirmed, competitor mentions, pricing objections). Calculates 0–100% win probability and groups leads into Commit, Best Case, and At-Risk buckets.",
      category: "Sales Intelligence",
      icon: "TrendingUp",
      badge: "PRD Stage 2"
    },
    {
      id: "feat_2",
      title: "\"Data Fishing\" Semantic Discovery",
      description: "Natural-language \"Ask Qalyzer\" search bar across thousands of calls and messages. Automatically clusters recurring objections, product bugs, and churn reasons with vector embeddings.",
      category: "Deep Analytics",
      icon: "Search",
      badge: "Vector Search"
    },
    {
      id: "feat_3",
      title: "\"What Could Have Been Done Better\" Coaching Engine",
      description: "Pinpoints exact missed opportunities turn-by-turn with side-by-side comparisons of agent statements versus ideal script rewrites aligned with company SOPs.",
      category: "Frontline Coaching",
      icon: "BookOpen",
      badge: "One-Click Feedback"
    },
    {
      id: "feat_4",
      title: "Dynamic SOP Knowledge Hub & Impact Reports",
      description: "Self-serve knowledge hub with effective dates and a versioned rule engine. Audits historical calls against the exact rules active on that date, and generates executive business impact reports.",
      category: "Governance & SOP",
      icon: "Shield",
      badge: "Versioned Rules"
    },
    {
      id: "feat_5",
      title: "Predictive CSAT & Emotional Tone Tracking",
      description: "Monitors emotional tone, silence duration, and sentiment progression turn-by-turn to predict customer satisfaction and flag escalation risks before the conversation closes.",
      category: "Customer Experience",
      icon: "Smile",
      badge: "Real-Time Flags"
    },
    {
      id: "feat_6",
      title: "Dual Gateways: PayU & Razorpay Subscriptions",
      description: "Seamless enterprise billing integration with SHA-512 PayU and HMAC SHA-256 Razorpay verification, instant tier upgrades, multi-seat licensing, and automated GST-compliant invoicing.",
      category: "Enterprise Billing",
      icon: "CreditCard",
      badge: "PayU & Razorpay"
    }
  ];

  const team = (teamMembers.length > 0 ? teamMembers : null) || cms?.team || [
    {
      id: "tm_1",
      name: "Dr. Aris Thorne",
      role: "Chief Executive Officer & Co-Founder",
      bio: "Former VP of Conversational AI at Global Telco. 15+ years scaling enterprise speech recognition and natural language architectures.",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      linkedin: "https://linkedin.com"
    },
    {
      id: "tm_2",
      name: "Marcus Vance",
      role: "Chief Technology Officer",
      bio: "Speech ML pioneer with deep expertise in Hindi/Indic acoustic models, low-latency DSP, and distributed Cloudflare D1/R2 pipelines.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
      linkedin: "https://linkedin.com"
    },
    {
      id: "tm_3",
      name: "Elena Rostova",
      role: "Head of Product & QA Governance",
      bio: "Certified ISO 9001/27001 Lead Auditor. Specialized in translating corporate operational playbooks into mathematical AI scoring logic.",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
      linkedin: "https://linkedin.com"
    },
    {
      id: "tm_4",
      name: "David Sterling",
      role: "Head of Enterprise Solutions & Customer Success",
      bio: "Architected 500+ seat contact center transformations across North America, EMEA, and APAC fintech & telecom ecosystems.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
      linkedin: "https://linkedin.com"
    }
  ];

  const pricing = (plans.length > 0
    ? plans.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        price: p.price_paise / 100,
        interval: p.interval.toLowerCase(),
        callMinutes: p.call_limit,
        agentSeats: Math.max(5, Math.round(p.call_limit / 500)),
        features: p.features,
      }))
    : null) || cms?.pricing || [
    {
      id: "plan_starter",
      name: "Starter Pilot",
      price: 4999,
      interval: "month",
      callMinutes: 2500,
      agentSeats: 5,
      features: [
        "100% Automated QA Scoring",
        "Knowlarity Webhook Ingestion",
        "Standard SOP Rules Engine",
        "Daily Digest PDF Reports",
        "Cloudflare D1 SQL Data Storage",
        "Standard Email Support (24h SLA)",
      ],
      popular: false,
    },
    {
      id: "plan_growth",
      name: "Growth Professional",
      price: 9999,
      interval: "month",
      callMinutes: 10000,
      agentSeats: 20,
      features: [
        "Everything in Starter Pilot",
        "AI Sales & Revenue Forecasting",
        "\"What Could Have Been Done Better\" Coaching",
        "\"Data Fishing\" Vector Search",
        "Predictive CSAT & Emotional Tone Tracking",
        "Cloudflare R2 Audio Vault Access",
        "Priority Support (4h Business SLA)",
      ],
      popular: true,
    },
    {
      id: "plan_enterprise",
      name: "Enterprise Ultra",
      price: 24999,
      interval: "month",
      callMinutes: 50000,
      agentSeats: "Unlimited",
      features: [
        "Everything in Growth Professional",
        "Custom Hindi/Indic Speech Acoustic Tuning",
        "SOP Versioning & Date-Effective Audits",
        "Multi-Tenant Role Access & Audit Trails",
        "Custom Automated Payment & Webhook Triggers",
        "Dedicated Enterprise Solutions Architect",
        "24/7/365 Emergency Phone & Critical SLA",
      ],
      popular: false,
    },
  ];

  const faqs = cms?.faqs || [
    {
      id: "faq_1",
      question: "How does AuditAI evaluate 100% of calls instead of legacy 2% sampling?",
      answer: "AuditAI streams telephony recordings directly from your telephony provider (Knowlarity, Twilio, Genesis, or Cloudflare R2 vaults) through an asynchronous distributed pipeline. It executes automatic speech transcription, speaker diarization, and Stage 2 LLM rubric evaluation simultaneously within 45 seconds of call completion."
    },
    {
      id: "faq_2",
      question: "How accurate is the Hindi, English, and Hinglish speech recognition?",
      answer: "AuditAI leverages custom acoustic fine-tuning specifically tailored for Indian contact centers, achieving over 99.4% word precision across Indian English, pure Hindi, and mixed conversational Hinglish with colloquial accent tolerance."
    },
    {
      id: "faq_3",
      question: "Can we customize the audit parameters to our company's unique SOP?",
      answer: "Yes. AuditAI includes a dynamic custom parameter builder and an SOP rule engine where you define scoring rubrics, weights, zero-tolerance non-negotiable auto-fails, and effective dates. Historical calls are always audited against the rules active on that specific date."
    },
    {
      id: "faq_4",
      question: "What ISO and regulatory compliance standards are implemented?",
      answer: "AuditAI is architected in accordance with ISO 9001:2015 Quality Management Systems and ISO/IEC 27001:2022 Information Security Management. Customer call recordings are encrypted with AES-256 in dedicated isolated multi-tenant buckets with automated 90-day retention purge compliance."
    },
    {
      id: "faq_5",
      question: "How do the PayU and Razorpay payment and billing gateways work?",
      answer: "AuditAI natively integrates dual payment gateways: PayU Hosted Checkout (with SHA-512 cryptographic verification) and Razorpay Native Modal (with HMAC SHA-256 verification). Enterprise clients can choose their preferred gateway for seamless automated invoicing, corporate credit card billing, UPI, or net banking with instant GST tax invoices."
    }
  ];

  const contactInfo = cms?.contactInfo || {
    companyName: "AuditAI Technologies Pvt. Ltd.",
    email: "contact@auditai.io",
    salesEmail: "enterprise-sales@auditai.io",
    phone: "+91 (080) 4567-8900",
    emergencyHotline: "+91 98765 43210",
    supportHours: "Monday – Saturday: 9:00 AM – 9:00 PM IST (24/7 Critical SLA for Enterprise)",
    address: "Tower 4, Level 9, Cyber City Tech Park, Outer Ring Road, Bengaluru, Karnataka 560103, India",
  };

  const legal = cms?.legal || {};
  const footer = cms?.footer || {
    tagline: "The Autonomous Quality Assurance & Sales Intelligence Standard for Modern Contact Centers.",
    copyright: "© 2026 AuditAI Technologies Pvt. Ltd. All rights reserved.",
    disclaimer: "Enterprise Qalyzer v2.0 Platform is engineered for ISO 9001, ISO 27001, SOC-2 Type II, and HIPAA compliance environments.",
  };

  // 4-Stage Pipeline Data
  const pipelineStages = [
    {
      step: "01",
      title: "Omnichannel Audio Ingestion",
      shortDesc: "Sub-second webhook capture from Knowlarity, Twilio, Genesis, or R2 buckets.",
      bullets: [
        "Dual-channel lossless audio streaming",
        "Instant metadata capture (Caller ID, Agent ID, Duration, IVR Path)",
        "Zero-drop buffering with retry backoff",
        "Two-party consent automatic audio signature validation"
      ],
      payload: {
        event: "CALL_TERMINATION_WEBHOOK",
        telephony: "Knowlarity_V2_Cluster",
        channels: 2,
        samplingRate: "16000 Hz",
        audioCodec: "FLAC_AES256",
        agentId: "AGNT_8492_PBL",
        duration: "4m 18s"
      }
    },
    {
      step: "02",
      title: "Multilingual Speech & Tone AI",
      shortDesc: "Accurate Hindi, English & Hinglish transcription with speaker diarization.",
      bullets: [
        "99.4% word accuracy across 12+ Indian regional dialects",
        "Turn-by-turn customer emotion & sentiment curve tracking",
        "Silence, crosstalk, and agent talk-ratio telemetry",
        "Real-time acoustic noise suppression"
      ],
      payload: {
        engine: "Acoustic_Indic_Whisper_Pro",
        languageDetected: "Hinglish (64% Hi, 36% En)",
        customerSentimentScore: "+0.82 (Positive)",
        agentTalkRatio: "44.2%",
        deadAirDuration: "3.2s (Passes SLA)",
        confidenceRate: 0.994
      }
    },
    {
      step: "03",
      title: "Versioned SOP & ISO Compliance",
      shortDesc: "Double-blind evaluation against dynamic client rules and zero-tolerance alerts.",
      bullets: [
        "ISO 9001:2015 calibrated scorecard reproducibility",
        "Zero-tolerance auto-fail flags (abusive language, fraud, missing disclaimer)",
        "Versioned rules engine active for the specific call timestamp",
        "Automated supervisory escalation triggers within 60 seconds"
      ],
      payload: {
        sopVersion: "SOP_Fintech_v4.2.1",
        effectiveDate: "2026-11-01",
        mandatoryDisclosure: "VERIFIED",
        prohibitedPhrasesFound: 0,
        isoQualityScore: "96.5 / 100",
        complianceStatus: "CERTIFIED_PASS"
      }
    },
    {
      step: "04",
      title: "Sales Forecast & Instant Coaching",
      shortDesc: "Predicts deal conversion probability and delivers side-by-side agent feedback.",
      bullets: [
        "Buying signals extraction: budget confirmed, competitor mentioned, urgency",
        "Win probability score (0–100%) mapped to CRM stages",
        "\"What Could Have Been Done Better\" script rewrites",
        "Automated micro-coaching pushed to agent console before next call"
      ],
      payload: {
        buyingSignals: ["Budget Approved (₹2.4L)", "Timeline: End of Q4", "Decision Maker on Call"],
        dealWinProbability: "88%",
        forecastCategory: "COMMIT",
        recommendedAction: "Dispatch custom enterprise SLA proposal within 2 hours",
        coachingRewritesGenerated: 2
      }
    }
  ];

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f0f7ff",
      color: "#000000",
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      position: "relative",
      overflowX: "hidden",
    }}>
      {/* Dynamic Keyframe Animations */}
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.08); }
        }
        @keyframes shimmerLine {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes liveDotPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.4; }
        }
        .hero-action-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(2, 132, 199, 0.28) !important;
        }
        .hero-action-secondary:hover {
          transform: translateY(-2px);
          border-color: #0284c7 !important;
          background: #f5faff !important;
          box-shadow: 0 6px 18px rgba(2, 132, 199, 0.12) !important;
        }
        .hero-dock-pill {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hero-dock-pill:hover {
          background: #e0f0ff !important;
          border-color: #0284c7 !important;
          color: #0369a1 !important;
          transform: translateY(-2px);
        }
        .hero-kpi-card {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hero-kpi-card:hover {
          transform: translateY(-4px);
          border-color: #0284c7 !important;
          box-shadow: 0 12px 28px rgba(2, 132, 199, 0.12) !important;
        }
        .hero-nav-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 8px;
          max-width: 1140px;
          margin: 0 auto 36px;
          padding: 8px;
          background: #ffffff;
          border: 1px solid #cfe4ff;
          border-radius: 14px;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
        }
        @media (max-width: 1080px) {
          .hero-nav-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        @media (max-width: 580px) {
          .hero-nav-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .hero-nav-pill {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid transparent;
          color: #ffffff;
          text-decoration: none;
          font-size: 11.5px;
          font-weight: 600;
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        .hero-nav-pill:hover {
          background: rgba(56, 189, 248, 0.16);
          border-color: #7dd3fc;
          color: #38bdf8;
          transform: translateY(-1px);
        }
      `}</style>
      {/* -------------------- 1. Hero Showcase Section -------------------- */}
      <section style={{
        maxWidth: 1320,
        margin: "0 auto",
        padding: "60px 24px 65px",
        textAlign: "center",
        position: "relative",
      }}>
        {/* Ambient Glowing Orb Background */}
        <div style={{
          position: "absolute",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "650px",
          height: "320px",
          background: "radial-gradient(circle, rgba(56, 189, 248, 0.16) 0%, rgba(37, 99, 235, 0.08) 50%, transparent 75%)",
          filter: "blur(70px)",
          pointerEvents: "none",
          zIndex: 0,
          animation: "pulseGlow 8s ease-in-out infinite",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Unified Architectural Status Capsule */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            background: "#ffffff",
            border: "1px solid #cfe4ff",
            borderRadius: 9999,
            padding: "6px 18px 6px 8px",
            marginBottom: 28,
            boxShadow: "0 4px 16px rgba(2, 132, 199, 0.08)",
            animation: "floatSlow 6s ease-in-out infinite",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#0284c7",
              color: "#000000",
              padding: "4px 11px",
              borderRadius: 9999,
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}>
              <Sparkles size={12} /> AuditAI v2.0
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              fontWeight: 600,
              color: "#334155",
              letterSpacing: "0.01em",
            }}>
              <span>ISO 9001:2015 & ISO/IEC 27001 Certified Quality Platform</span>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#0284c7" }} />
              <span style={{ color: "#0284c7", fontWeight: 700 }}>SOC-2 Type II Verified</span>
            </div>
          </div>

          {/* Majestic Hero Headline */}
          <h1 style={{
            fontSize: "clamp(34px, 5.2vw, 56px)",
            fontWeight: 800,
            fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
            lineHeight: 1.14,
            maxWidth: 1040,
            margin: "0 auto 20px",
            letterSpacing: "-0.03em",
            color: "#000000",
          }}>
            Autonomous Call Quality Governance & <span style={{ color: "#0284c7" }}>Predictive Sales Intelligence</span>
          </h1>

          {/* Refined High-Contrast Subtitle */}
          <p style={{
            fontSize: "clamp(15px, 1.8vw, 17.5px)",
            color: "#334155",
            maxWidth: 820,
            margin: "0 auto 36px",
            lineHeight: 1.7,
            fontWeight: 400,
            letterSpacing: "0.01em",
          }}>
            Audit 100% of customer interactions across voice, chat, and email in real time. Detect buying signals, forecast deal revenue, enforce zero-tolerance ISO compliance, and deliver targeted agent coaching—all in sub-minute turnaround.
          </p>

          {/* Primary High-Impact CTA Row */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 22,
          }}>
            <a
              href="#pricing-enquiry"
              className="hero-action-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: "linear-gradient(135deg, #0284c7 0%, #2563eb 55%, #4f46e5 100%)",
                color: "#000000",
                textDecoration: "none",
                borderRadius: 10,
                padding: "14px 30px",
                fontSize: 14.5,
                fontWeight: 700,
                boxShadow: "0 8px 25px rgba(14, 165, 233, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
                transition: "all 0.25s ease",
              }}
            >
              {hero.ctaPrimaryText} <ArrowRight size={16} />
            </a>

            <a
              href="#roi-calculator"
              className="hero-action-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#ffffff",
                border: "1px solid #cfe4ff",
                color: "#000000",
                textDecoration: "none",
                borderRadius: 10,
                padding: "14px 26px",
                fontSize: 14.5,
                fontWeight: 600,
                boxShadow: "0 2px 10px rgba(2, 132, 199, 0.08)",
                transition: "all 0.25s ease",
              }}
            >
              <Calculator size={16} color="#0284c7" /> {hero.ctaSecondaryText}
            </a>

            <button
              onClick={() => onEnterConsole && onEnterConsole()}
              className="hero-action-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#ffffff",
                border: "1px solid #cfe4ff",
                color: "#000000",
                borderRadius: 10,
                padding: "14px 24px",
                fontSize: 14.5,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(2, 132, 199, 0.08)",
                transition: "all 0.25s ease",
              }}
            >
              <ExternalLink size={16} color="#0284c7" /> Launch Console
            </button>
          </div>

          {/* Discrete Enterprise Portal Access Dock */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            background: "#ffffff",
            border: "1px solid #cfe4ff",
            borderRadius: 30,
            padding: "6px 18px",
            boxShadow: "0 2px 12px rgba(2, 132, 199, 0.06)",
            marginBottom: 44,
          }}>
            <span style={{ fontSize: 11, color: "#0369a1", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Enterprise Portals:
            </span>
            <button
              onClick={() => onOpenAdminLogin && onOpenAdminLogin()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: "none",
                color: "#000000",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                padding: "2px 6px",
                transition: "color 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#38bdf8"}
              onMouseLeave={e => e.currentTarget.style.color = "#ffffff"}
            >
              <ShieldCheck size={13} color="#38bdf8" /> Administrator Login
            </button>
            <div style={{ width: 1, height: 14, background: "rgba(96, 165, 250, 0.3)" }} />
            <button
              onClick={() => onOpenClientLogin && onOpenClientLogin()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: "none",
                color: "#000000",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                padding: "2px 6px",
                transition: "color 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#38bdf8"}
              onMouseLeave={e => e.currentTarget.style.color = "#ffffff"}
            >
              <UserCheck size={13} color="#38bdf8" /> Partner / Client Login
            </button>
          </div>

          {/* Quick-Jump Section Navigation Grid (Symmetric, No Awkward Solitary Wrapping) */}
          <nav aria-label="Section Navigation" className="hero-nav-grid">
            <a href="#how-it-works" className="hero-nav-pill">
              <Activity size={13} color="#38bdf8" /> Architecture
            </a>
            <a href="#features" className="hero-nav-pill">
              <Layers size={13} color="#38bdf8" /> Capabilities
            </a>
            <a href="#roi-calculator" className="hero-nav-pill">
              <Calculator size={13} color="#38bdf8" /> ROI Simulator
            </a>
            <a href="#iso-standards" className="hero-nav-pill">
              <Shield size={13} color="#38bdf8" /> ISO Standards
            </a>
            <a href="#pricing-enquiry" className="hero-nav-pill">
              <CreditCard size={13} color="#38bdf8" /> Pricing & Trial
            </a>
            <a href="#team" className="hero-nav-pill">
              <Users size={13} color="#38bdf8" /> Leadership
            </a>
            <a href="#faqs" className="hero-nav-pill">
              <HelpCircle size={13} color="#38bdf8" /> FAQs
            </a>
            <a href="#contact" className="hero-nav-pill">
              <Headphones size={13} color="#38bdf8" /> Contact & SLA
            </a>
          </nav>

          {/* High-Tech Animated KPI Dashboard Strip */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 18,
            maxWidth: 1180,
            margin: "0 auto",
          }}>
            {[
              {
                value: "100%",
                label: "Automated Interaction Audits",
                subtext: "Continuous 100% inspection with zero sampling blindspots",
                tag: "FULL COVERAGE",
                tagcolor: "#0369a1",
                tagBg: "rgba(56, 189, 248, 0.15)",
                Icon: CheckCircle2,
              },
              {
                value: "99.4%",
                label: "Rubric Scoring Precision",
                subtext: "ISO 9001:2015 calibrated mathematical reproducibility",
                tag: "CALIBRATED",
                tagcolor: "#0369a1",
                tagBg: "rgba(56, 189, 248, 0.15)",
                Icon: Award,
              },
              {
                value: "85%",
                label: "QA Operational Cost Reduction",
                subtext: "Direct reduction in manual listening and scorecard turnaround",
                tag: "EFFICIENCY",
                tagColor: "#16a34a",
                tagBg: "rgba(52, 211, 153, 0.15)",
                Icon: TrendingUp,
              },
              {
                value: "99.99%",
                label: "Cloudflare Edge SLA Uptime",
                subtext: "Enterprise multi-region resilience & D1 encrypted vault",
                tag: "ACTIVE SLA",
                tagcolor: "#0369a1",
                tagBg: "rgba(56, 189, 248, 0.15)",
                Icon: ShieldCheck,
              },
            ].map((kpi, kIdx) => {
              const IconComp = kpi.Icon;
              return (
                <div
                  key={kIdx}
                  className="hero-kpi-card"
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cfe4ff",
                    borderRadius: 14,
                    padding: "24px 20px",
                    boxShadow: "0 4px 16px rgba(2, 132, 199, 0.06)",
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Top Accent Gradient Line */}
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: "linear-gradient(90deg, #38bdf8 0%, #2563eb 50%, #818cf8 100%)",
                  }} />

                  <div>
                    {/* Header with Icon and Tag */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <div style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: "rgba(56, 189, 248, 0.14)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        <IconComp size={18} color="#38bdf8" />
                      </div>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: kpi.tagColor,
                        background: kpi.tagBg,
                        border: `1px solid ${kpi.tagColor}44`,
                        padding: "2px 8px",
                        borderRadius: 10,
                        letterSpacing: "0.06em",
                      }}>
                        {kpi.tag}
                      </span>
                    </div>

                    {/* Numeric Metric */}
                    <div style={{
                      fontSize: 38,
                      fontWeight: 850,
                      fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                      letterSpacing: "-0.03em",
                      color: "#000000",
                      lineHeight: 1,
                      marginBottom: 8,
                    }}>
                      {kpi.value}
                    </div>

                    {/* Metric Title */}
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      {kpi.label}
                    </div>
                  </div>

                  {/* Subtext description */}
                  <div style={{ fontSize: 11.5, color: "#334155", lineHeight: 1.45, borderTop: "1px solid rgba(96, 165, 250, 0.15)", paddingTop: 10, marginTop: 10 }}>
                    {kpi.subtext}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* -------------------- 2. The 4-Stage Autonomous Pipeline -------------------- */}
      <section id="how-it-works" style={{ maxWidth: 1320, margin: "0 auto", padding: "75px 24px", borderTop: "1px solid rgba(96, 165, 250, 0.2)" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{
            display: "inline-block",
            background: "rgba(56, 189, 248, 0.15)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            color: "#0369a1",
            padding: "4px 14px",
            borderRadius: 16,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            marginBottom: 12
          }}>
            ISO-Standard Autonomous Execution
          </div>
          <h2 style={{ fontSize: 34, fontWeight: 800, fontFamily: "Space Grotesk" }}>
            The 4-Stage Qalyzer v2.0 Architecture
          </h2>
          <p style={{ fontSize: 15, color: "#334155", maxWidth: 720, margin: "10px auto 0", lineHeight: 1.6 }}>
            From raw telephony packet ingestion to predictive win-probability forecasting and micro-coaching dispatch in under 45 seconds.
          </p>
        </div>

        {/* Stage Selector Tabs */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12,
          marginBottom: 24
        }}>
          {pipelineStages.map((stage, idx) => {
            const active = activePipelineStage === idx;
            return (
              <button
                key={idx}
                onClick={() => setActivePipelineStage(idx)}
                style={{
                  background: active ? "rgba(21, 50, 101, 0.9)" : "rgba(13, 36, 78, 0.5)",
                  border: active ? "2px solid #38bdf8" : "1px solid rgba(96, 165, 250, 0.25)",
                  borderRadius: 12,
                  padding: "16px 18px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: active ? "0 8px 25px rgba(56, 189, 248, 0.2)" : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: active ? "#38bdf8" : "#7dd3fc", fontFamily: "Space Grotesk" }}>
                    STAGE {stage.step}
                  </span>
                  {active && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#38bdf8", boxShadow: "0 0 8px #38bdf8" }} />}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#000000", fontFamily: "Space Grotesk", marginBottom: 4 }}>
                  {stage.title}
                </div>
                <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.4 }}>
                  {stage.shortDesc}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Stage Interactive Visualizer */}
        {(() => {
          const current = pipelineStages[activePipelineStage];
          return (
            <div style={{
              background: "#ffffff",
              border: "1px solid rgba(96, 165, 250, 0.35)",
              borderRadius: 16,
              padding: 30,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 30,
              alignItems: "center",
              backdropFilter: "blur(12px)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.4)"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, background: "#38bdf8", color: "#f0f9ff", padding: "2px 8px", borderRadius: 6 }}>
                    ACTIVE PIPELINE STEP {current.step}
                  </span>
                  <span style={{ fontSize: 13, color: "#0369a1", fontWeight: 600 }}>Real-Time Automated Execution</span>
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 800, fontFamily: "Space Grotesk", marginBottom: 14 }}>
                  {current.title}
                </h3>
                <p style={{ fontSize: 14.5, color: "#334155", lineHeight: 1.6, marginBottom: 20 }}>
                  {current.shortDesc}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {current.bullets.map((b, bIdx) => (
                    <div key={bIdx} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "#000000" }}>
                      <CheckCircle2 size={16} color="#38bdf8" style={{ flexShrink: 0 }} />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Architectural Payload Terminal */}
              <div style={{
                background: "#f0f9ff",
                border: "1px solid rgba(96, 165, 250, 0.3)",
                borderRadius: 12,
                padding: 20,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 12,
                color: "#0369a1",
                overflowX: "auto"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(96, 165, 250, 0.2)", paddingBottom: 8, marginBottom: 12 }}>
                  <span style={{ color: "#000000", fontWeight: 700 }}>Telemetry Event Payload</span>
                  <span style={{ fontSize: 11, color: "#16a34a", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a" }} /> LIVE 200 OK
                  </span>
                </div>
                <pre style={{ margin: 0, color: "#334155", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                  {JSON.stringify(current.payload, null, 2)}
                </pre>
              </div>
            </div>
          );
        })()}
      </section>

      {/* -------------------- 3. Interactive ROI & Cost Savings Calculator -------------------- */}
      <section id="roi-calculator" style={{ maxWidth: 1320, margin: "0 auto", padding: "75px 24px", borderTop: "1px solid rgba(96, 165, 250, 0.2)" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{
            display: "inline-block",
            background: "rgba(56, 189, 248, 0.15)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            color: "#0369a1",
            padding: "4px 14px",
            borderRadius: 16,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            marginBottom: 12
          }}>
            Interactive Value Simulator
          </div>
          <h2 style={{ fontSize: 34, fontWeight: 800, fontFamily: "Space Grotesk" }}>
            Simulate Your Enterprise QA ROI & Hours Saved
          </h2>
          <p style={{ fontSize: 15, color: "#334155", maxWidth: 680, margin: "10px auto 0" }}>
            Adjust your monthly call volume and current QA team metrics to calculate projected cost reductions and revenue impact.
          </p>
        </div>

        <div style={{
          background: "#ffffff",
          border: "1px solid rgba(96, 165, 250, 0.35)",
          borderRadius: 18,
          padding: 34,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 36,
          alignItems: "center",
          backdropFilter: "blur(12px)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.4)"
        }}>
          {/* Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5, fontWeight: 600 }}>
                <span>Monthly Call Interactions:</span>
                <span style={{ color: "#0369a1", fontFamily: "Space Grotesk", fontSize: 17, fontWeight: 700 }}>
                  {roiCallVolume.toLocaleString()} calls
                </span>
              </div>
              <input
                type="range"
                min={5000}
                max={300000}
                step={5000}
                value={roiCallVolume}
                onChange={e => setRoiCallVolume(Number(e.target.value))}
                style={{ width: "100%", accentcolor: "#0369a1", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#0369a1", marginTop: 4 }}>
                <span>5k calls</span>
                <span>150k calls</span>
                <span>300k+ calls</span>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5, fontWeight: 600 }}>
                <span>Current QA Auditor Staff:</span>
                <span style={{ color: "#0369a1", fontFamily: "Space Grotesk", fontSize: 17, fontWeight: 700 }}>
                  {roiTeamSize} Auditors
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={50}
                step={1}
                value={roiTeamSize}
                onChange={e => setRoiTeamSize(Number(e.target.value))}
                style={{ width: "100%", accentcolor: "#0369a1", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#0369a1", marginTop: 4 }}>
                <span>2 auditors</span>
                <span>25 auditors</span>
                <span>50+ auditors</span>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5, fontWeight: 600 }}>
                <span>Current Manual Sampling Rate:</span>
                <span style={{ color: "#0369a1", fontFamily: "Space Grotesk", fontSize: 17, fontWeight: 700 }}>
                  {roiAuditRate}% of calls
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={roiAuditRate}
                onChange={e => setRoiAuditRate(Number(e.target.value))}
                style={{ width: "100%", accentcolor: "#0369a1", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#0369a1", marginTop: 4 }}>
                <span>1% (Standard)</span>
                <span>5%</span>
                <span>10% (High Cost)</span>
              </div>
            </div>
          </div>

          {/* Results Card */}
          <div style={{
            background: "rgba(13, 36, 78, 0.8)",
            border: "1px solid rgba(96, 165, 250, 0.35)",
            borderRadius: 14,
            padding: 26,
            display: "flex",
            flexDirection: "column",
            gap: 18
          }}>
            <div style={{ fontSize: 12, color: "#0369a1", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>
              Calculated Impact Simulation
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "#ffffff", padding: 14, borderRadius: 10, border: "1px solid rgba(96, 165, 250, 0.2)" }}>
                <div style={{ fontSize: 11.5, color: "#334155" }}>Monthly Hours Saved</div>
                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "Space Grotesk", color: "#0369a1", marginTop: 4 }}>
                  {hoursSavedPerMonth.toLocaleString()} hrs
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: 14, borderRadius: 10, border: "1px solid rgba(96, 165, 250, 0.2)" }}>
                <div style={{ fontSize: 11.5, color: "#334155" }}>Audit Coverage Gain</div>
                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "Space Grotesk", color: "#16a34a", marginTop: 4 }}>
                  +{coverageGain}%
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: 14, borderRadius: 10, border: "1px solid rgba(96, 165, 250, 0.2)" }}>
                <div style={{ fontSize: 11.5, color: "#334155" }}>Projected Annual Cost Reduction</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "Space Grotesk", color: "#000000", marginTop: 4 }}>
                  ₹{estimatedAnnualSavingsINR.toLocaleString()}
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: 14, borderRadius: 10, border: "1px solid rgba(96, 165, 250, 0.2)" }}>
                <div style={{ fontSize: 11.5, color: "#334155" }}>Estimated Rescued Deals</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "Space Grotesk", color: "#0369a1", marginTop: 4 }}>
                  ₹{potentialRecoveredRevenueINR.toLocaleString()}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleSelectPricing("Growth Professional")}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
                border: "none",
                color: "#000000",
                borderRadius: 8,
                padding: "12px",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 15px #7dd3fc",
              }}
            >
              Lock In These Savings With Free Trial <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* -------------------- 4. ISO Standards & Quality Governance -------------------- */}
      <section id="iso-standards" style={{ maxWidth: 1320, margin: "0 auto", padding: "75px 24px", borderTop: "1px solid rgba(96, 165, 250, 0.2)" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{
            display: "inline-block",
            background: "rgba(56, 189, 248, 0.15)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            color: "#0369a1",
            padding: "4px 14px",
            borderRadius: 16,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            marginBottom: 12
          }}>
            ISO Quality Governance Matrix
          </div>
          <h2 style={{ fontSize: 34, fontWeight: 800, fontFamily: "Space Grotesk" }}>
            Certified Enterprise Regulatory & Quality Controls
          </h2>
          <p style={{ fontSize: 15, color: "#334155", maxWidth: 700, margin: "10px auto 0" }}>
            Every interaction is calibrated against formalized ISO standards, zero-tolerance auto-fails, and multi-tenant data sovereignty.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 22 }}>
          <div style={{ background: "rgba(13, 36, 78, 0.65)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 14, padding: 24, backdropFilter: "blur(8px)" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(56, 189, 248, 0.2)", color: "#0369a1", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Award size={20} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "Space Grotesk", marginBottom: 8 }}>ISO 9001:2015 QMS</div>
            <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.55 }}>
              Standardized rubric versioning with immutable audit trails. Guarantees reproducible scoring across agent cohorts and eliminates evaluator subjectivity.
            </p>
          </div>

          <div style={{ background: "rgba(13, 36, 78, 0.65)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 14, padding: 24, backdropFilter: "blur(8px)" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(56, 189, 248, 0.2)", color: "#0369a1", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Lock size={20} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "Space Grotesk", marginBottom: 8 }}>ISO/IEC 27001 ISMS</div>
            <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.55 }}>
              End-to-end data encryption at rest (AES-256) and in transit (TLS 1.3). Strict multi-tenant logical partitioning in Cloudflare D1 SQL.
            </p>
          </div>

          <div style={{ background: "rgba(13, 36, 78, 0.65)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 14, padding: 24, backdropFilter: "blur(8px)" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(56, 189, 248, 0.2)", color: "#0369a1", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <ShieldCheck size={20} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "Space Grotesk", marginBottom: 8 }}>PCI-DSS & HIPAA Masking</div>
            <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.55 }}>
              Automated cardholder data (PAN/CVV) and Protected Health Information (PHI) acoustic redaction before transcripts are committed to storage.
            </p>
          </div>

          <div style={{ background: "rgba(13, 36, 78, 0.65)", border: "1px solid rgba(96, 165, 250, 0.25)", borderRadius: 14, padding: 24, backdropFilter: "blur(8px)" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(56, 189, 248, 0.2)", color: "#0369a1", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Layers size={20} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "Space Grotesk", marginBottom: 8 }}>Two-Party Consent Check</div>
            <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.55 }}>
              Detects mandatory recording disclosure statements within the first 15 seconds. Flags missing disclaimers immediately to protect corporate indemnity.
            </p>
          </div>
        </div>
      </section>

      {/* -------------------- 5. Features Showcase Grid -------------------- */}
      <section id="features" style={{ maxWidth: 1320, margin: "0 auto", padding: "75px 24px", borderTop: "1px solid rgba(96, 165, 250, 0.2)" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{
            display: "inline-block",
            background: "rgba(56, 189, 248, 0.15)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            color: "#0369a1",
            padding: "4px 14px",
            borderRadius: 16,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            marginBottom: 12
          }}>
            Qalyzer v2.0 Platform Capabilities
          </div>
          <h2 style={{ fontSize: 34, fontWeight: 800, fontFamily: "Space Grotesk" }}>
            Engineered for Precision Conversational Intelligence
          </h2>
          <p style={{ fontSize: 15, color: "#334155", maxWidth: 680, margin: "10px auto 0" }}>
            Every module complies with client-customized SOPs, real-time emotion detection, and high-speed telemetry.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20 }}>
          {features.map((feat) => (
            <div
              key={feat.id}
              style={{
                background: "rgba(13, 36, 78, 0.65)",
                border: "1px solid rgba(96, 165, 250, 0.22)",
                borderRadius: 14,
                padding: 24,
                backdropFilter: "blur(10px)",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                transition: "transform 0.2s ease, border-color 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
                  color: "#000000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 12px #7dd3fc"
                }}>
                  <Sparkles size={20} />
                </div>
                {feat.badge && (
                  <span style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    background: "rgba(96, 165, 250, 0.2)",
                    border: "1px solid rgba(96, 165, 250, 0.35)",
                    color: "#0369a1",
                    padding: "3px 8px",
                    borderRadius: 10,
                    textTransform: "uppercase",
                    letterSpacing: 0.5
                  }}>
                    {feat.badge}
                  </span>
                )}
              </div>

              <div style={{ fontSize: 11, color: "#0369a1", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{feat.category}</div>
              <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "Space Grotesk", marginTop: 4, marginBottom: 10 }}>{feat.title}</div>
              <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.55, flex: 1 }}>{feat.description}</div>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------- 6. Unified Pricing Plans & Consultation Booking -------------------- */}
      <section id="pricing-enquiry" style={{ maxWidth: 1320, margin: "0 auto", padding: "75px 24px", borderTop: "1px solid rgba(96, 165, 250, 0.2)" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{
            display: "inline-block",
            background: "rgba(56, 189, 248, 0.15)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            color: "#0369a1",
            padding: "4px 14px",
            borderRadius: 16,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            marginBottom: 12
          }}>
            Transparent Enterprise Pricing & Booking
          </div>
          <h2 style={{ fontSize: 34, fontWeight: 800, fontFamily: "Space Grotesk" }}>
            Select Your Plan & Book Your Enterprise Trial
          </h2>
          <p style={{ fontSize: 15, color: "#334155", maxWidth: 660, margin: "10px auto 0" }}>
            Click "Select Plan" on any tier to immediately customize your free trial or proceed to secure PayU gateway registration.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 24, marginBottom: 44 }}>
          {pricing.map((plan) => {
            const isSelected = selectedPlan === plan.name;
            return (
              <div
                key={plan.id}
                style={{
                  background: isSelected ? "rgba(21, 50, 101, 0.95)" : "rgba(13, 36, 78, 0.65)",
                  border: isSelected ? "2px solid #38bdf8" : "1px solid rgba(96, 165, 250, 0.25)",
                  borderRadius: 16,
                  padding: 30,
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  backdropFilter: "blur(10px)",
                  boxShadow: isSelected ? "0 12px 35px #7dd3fc" : "none",
                  transition: "all 0.2s ease"
                }}
              >
                {plan.popular && (
                  <div style={{
                    position: "absolute",
                    top: -12,
                    right: 24,
                    background: "#38bdf8",
                    color: "#f0f9ff",
                    fontSize: 10.5,
                    fontWeight: 800,
                    padding: "3px 12px",
                    borderRadius: 12,
                    textTransform: "uppercase",
                    letterSpacing: 0.6
                  }}>
                    Most Popular
                  </div>
                )}

                <div style={{ fontSize: 19, fontWeight: 700, fontFamily: "Space Grotesk" }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "14px 0 6px" }}>
                  <span style={{ fontSize: 36, fontWeight: 800, fontFamily: "Space Grotesk" }}>₹{Number(plan.price).toLocaleString()}</span>
                  <span style={{ fontSize: 13, color: "#0369a1" }}>/ {plan.interval || "month"}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "#334155", marginBottom: 20 }}>
                  Includes {typeof plan.callMinutes === "number" ? plan.callMinutes.toLocaleString() : plan.callMinutes} call minutes and {plan.agentSeats} seats.
                </div>

                <div style={{ height: 1, background: "rgba(96, 165, 250, 0.2)", marginBottom: 18 }} />

                <div style={{ display: "flex", flexDirection: "column", gap: 11, flex: 1, marginBottom: 26 }}>
                  {plan.features?.map((f, fIdx) => (
                    <div key={fIdx} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#f0f9ff" }}>
                      <Check size={14} style={{ flexShrink: 0, color: "#0369a1" }} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button
                    onClick={() => handleOpenDirectCheckout(plan)}
                    style={{
                      width: "100%",
                      background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
                      color: "#000000",
                      border: "1px solid rgba(56, 189, 248, 0.4)",
                      borderRadius: 8,
                      padding: "12px 18px",
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 4px 15px rgba(2, 132, 199, 0.35)",
                      transition: "transform 0.15s ease",
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                  >
                    <CreditCard size={15} color="#ffffff" /> Instant Checkout (PayU / Razorpay)
                  </button>

                  <button
                    onClick={() => handleSelectPricing(plan.name)}
                    style={{
                      width: "100%",
                      background: isSelected ? "rgba(56, 189, 248, 0.15)" : "#bae6fd",
                      color: isSelected ? "#38bdf8" : "#cbd5e1",
                      border: `1px solid ${isSelected ? "#38bdf8" : "rgba(96, 165, 250, 0.25)"}`,
                      borderRadius: 8,
                      padding: "10px 18px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    {isSelected ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <CheckCircle2 size={14} color="#38bdf8" /> Selected for Consultation
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        Book Enterprise Trial & Demo <ArrowRight size={13} />
                      </span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Integrated Inbound Consultation Enquiry Form */}
        <div
          id="enquiry-booking"
          onClick={() => triggerEnquiryIntentEmail(selectedPlan, "Direct Enquiry Form Click")}
          style={{
          maxWidth: 900,
          margin: "0 auto",
          background: "#ffffff",
          border: "2px solid rgba(56, 189, 248, 0.4)",
          borderRadius: 20,
          padding: "36px 36px",
          backdropFilter: "blur(14px)",
          boxShadow: "0 16px 45px rgba(0,0,0,0.5)"
        }}>
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(56, 189, 248, 0.15)",
              border: "1px solid #38bdf8",
              color: "#0369a1",
              padding: "4px 14px",
              borderRadius: 16,
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: 0.5,
              marginBottom: 12
            }}>
              <Sparkles size={13} /> Active Tier Selected: {selectedPlan}
            </div>
            <h3 style={{ fontSize: 26, fontWeight: 800, fontFamily: "Space Grotesk" }}>
              Request Your Pilot Setup & Migration Consultation
            </h3>
            <p style={{ fontSize: 13.5, color: "#334155", marginTop: 4 }}>
              Submit your team requirements. An enterprise solutions engineer will deploy your custom acoustic sandbox within 2 business hours.
            </p>
          </div>

          {enquirySuccess && (
            <div style={{ background: "rgba(34, 197, 94, 0.2)", border: "1px solid #86efac", borderRadius: 8, padding: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
              <CheckCircle2 size={18} color="#86efac" />
              <span>Thank you! Your consultation request has been received. Our Enterprise Solutions team will contact you shortly.</span>
            </div>
          )}

          {enquiryError && (
            <div style={{ background: "rgba(244, 63, 94, 0.2)", border: "1px solid #fda4af", borderRadius: 8, padding: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
              <AlertCircle size={18} color="#fda4af" />
              <span>{enquiryError}</span>
            </div>
          )}

          <form onSubmit={handleEnquirySubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#334155" }}>Full Name *</label>
              <input
                required
                type="text"
                placeholder="e.g. Vikram Singhania"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                style={{ width: "100%", background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.3)", borderRadius: 7, padding: "11px 13px", color: "#000000", fontSize: 13.5, boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#334155" }}>Business Email *</label>
              <input
                required
                type="email"
                placeholder="e.g. vikram@enterprise.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                style={{ width: "100%", background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.3)", borderRadius: 7, padding: "11px 13px", color: "#000000", fontSize: 13.5, boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#334155" }}>Phone Number *</label>
              <input
                required
                type="tel"
                placeholder="e.g. +91 98200 12345"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                style={{ width: "100%", background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.3)", borderRadius: 7, padding: "11px 13px", color: "#000000", fontSize: 13.5, boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#334155" }}>Company Name</label>
              <input
                type="text"
                placeholder="e.g. Acme Financial / Global BPO"
                value={formData.company_name}
                onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                style={{ width: "100%", background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.3)", borderRadius: 7, padding: "11px 13px", color: "#000000", fontSize: 13.5, boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#334155" }}>Agent Seat Size</label>
              <select
                value={formData.team_size}
                onChange={e => setFormData({ ...formData, team_size: e.target.value })}
                style={{ width: "100%", background: "#f0f9ff", border: "1px solid rgba(96, 165, 250, 0.3)", borderRadius: 7, padding: "11px 13px", color: "#000000", fontSize: 13.5 }}
              >
                <option value="1-5 Agents">1 - 5 Agents (Starter)</option>
                <option value="5-20 Agents">5 - 20 Agents (Growth)</option>
                <option value="20-50 Agents">20 - 50 Agents (Growth+)</option>
                <option value="50-200 Agents">50 - 200 Agents (Enterprise)</option>
                <option value="200+ Agents">200+ Enterprise Scale</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#334155" }}>Preferred Consultation Timeline</label>
              <input
                type="text"
                placeholder="e.g. Tomorrow 3:00 PM IST"
                value={formData.preferred_schedule}
                onChange={e => setFormData({ ...formData, preferred_schedule: e.target.value })}
                style={{ width: "100%", background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.3)", borderRadius: 7, padding: "11px 13px", color: "#000000", fontSize: 13.5, boxSizing: "border-box" }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#334155" }}>Telephony & Compliance Requirements *</label>
              <textarea
                required
                rows={3}
                placeholder="Describe your current QA challenges (e.g. Hindi/English speech accuracy, Knowlarity integration, missed upsells detection, ISO 9001 governance)..."
                value={formData.message}
                onChange={e => setFormData({ ...formData, message: e.target.value })}
                style={{ width: "100%", background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.3)", borderRadius: 7, padding: "11px 13px", color: "#000000", fontSize: 13.5, boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "center", marginTop: 8 }}>
              <button
                type="submit"
                disabled={submittingEnquiry}
                style={{
                  background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
                  color: "#000000",
                  border: "none",
                  borderRadius: 8,
                  padding: "13px 36px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: submittingEnquiry ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 6px 20px rgba(56, 189, 248, 0.4)",
                }}
              >
                {submittingEnquiry ? <RefreshCw size={16} className="spin" /> : <Mail size={16} />}
                {submittingEnquiry ? "Submitting Request..." : "Submit Consultation & Pilot Request"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* -------------------- 6B. Clients With Us Showcase (Managed by Admin) -------------------- */}
      <section id="clients-with-us" style={{ maxWidth: 1320, margin: "0 auto", padding: "65px 24px", borderTop: "1px solid rgba(96, 165, 250, 0.2)" }}>
        <div style={{ textAlign: "center", marginBottom: 38 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#0369a1", padding: "4px 14px", borderRadius: 16, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 12 }}>
            Trusted Enterprise Network
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 800, fontFamily: "Space Grotesk" }}>Clients With Us</h2>
          <p style={{ fontSize: 14.5, color: "#334155", maxWidth: 620, margin: "8px auto 0" }}>
            High-velocity contact centers, fintech leaders, and healthcare BPOs running 100% automated QA on AuditAI Qalyzer.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
          {(cms?.clientsWithUs || [
            { id: "c1", name: "Acme Telephony Solutions", industry: "Fintech & Collections", seats: "250+ Agents", badge: "ISO Verified" },
            { id: "c2", name: "Apex Global HealthCare", industry: "Healthcare BPO", seats: "180+ Agents", badge: "HIPAA Ready" },
            { id: "c3", name: "NovaPay Financial Services", industry: "Digital Banking", seats: "400+ Agents", badge: "Enterprise Ultra" },
            { id: "c4", name: "Vanguard Insurance Corp", industry: "Insurance Advisory", seats: "120+ Agents", badge: "Growth Pro" },
          ]).filter((c) => c.active !== false).map((cl) => (
            <div key={cl.id} style={{ background: "#ffffff", border: "1px solid rgba(96, 165, 250, 0.28)", borderRadius: 14, padding: 22, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, background: "rgba(56, 189, 248, 0.15)", color: "#0369a1", padding: "3px 9px", borderRadius: 10 }}>{cl.badge}</span>
                  <span style={{ fontSize: 11.5, color: "#0369a1", fontWeight: 600 }}>{cl.seats}</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, fontFamily: "Space Grotesk", color: "#000000" }}>{cl.name}</div>
                <div style={{ fontSize: 12.5, color: "#334155", marginTop: 4 }}>{cl.industry}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------- 7. Leadership & Engineering Team -------------------- */}
      <section id="team" style={{ maxWidth: 1320, margin: "0 auto", padding: "75px 24px", borderTop: "1px solid rgba(96, 165, 250, 0.2)" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{
            display: "inline-block",
            background: "rgba(56, 189, 248, 0.15)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            color: "#0369a1",
            padding: "4px 14px",
            borderRadius: 16,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            marginBottom: 12
          }}>
            Executive Leadership & Engineering
          </div>
          <h2 style={{ fontSize: 34, fontWeight: 800, fontFamily: "Space Grotesk" }}>
            The Pioneers Behind AuditAI
          </h2>
          <p style={{ fontSize: 15, color: "#334155", maxWidth: 650, margin: "10px auto 0" }}>
            Combining world-class speech analytics research, telecom infrastructure, and enterprise ISO quality governance.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {team.map((m) => (
            <div
              key={m.id}
              style={{
                background: "rgba(13, 36, 78, 0.65)",
                border: "1px solid rgba(96, 165, 250, 0.22)",
                borderRadius: 14,
                padding: 24,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backdropFilter: "blur(10px)",
              }}
            >
              <img
                src={m.avatar || m.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"}
                alt={m.name}
                style={{ width: 84, height: 84, borderRadius: "50%", objectFit: "cover", border: "3px solid #38bdf8", marginBottom: 14, boxShadow: "0 0 16px #7dd3fc" }}
              />
              <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "Space Grotesk" }}>{m.name}</div>
              <div style={{ fontSize: 12, color: "#0369a1", fontWeight: 600, marginTop: 2, marginBottom: 10 }}>{m.role}</div>
              <div style={{ fontSize: 12.5, color: "#334155", lineHeight: 1.5, marginBottom: 14 }}>{m.bio}</div>

              {(m.linkedin || m.linkedin_url) && (
                <a
                  href={m.linkedin || m.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#000000", fontSize: 11.5, fontWeight: 600, textDecoration: "none", background: "rgba(96, 165, 250, 0.18)", border: "1px solid rgba(96, 165, 250, 0.35)", padding: "4px 10px", borderRadius: 6 }}
                >
                  Connect on LinkedIn <ArrowUpRight size={12} color="#38bdf8" />
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* -------------------- 8. Executive FAQs Section -------------------- */}
      <section id="faqs" style={{ maxWidth: 1050, margin: "0 auto", padding: "75px 24px", borderTop: "1px solid rgba(96, 165, 250, 0.2)" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            display: "inline-block",
            background: "rgba(56, 189, 248, 0.15)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            color: "#0369a1",
            padding: "4px 14px",
            borderRadius: 16,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            marginBottom: 10
          }}>
            Executive FAQs
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 800, fontFamily: "Space Grotesk" }}>
            Got Questions? We Have Answers
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {faqs.map((f, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={f.id || idx}
                style={{
                  background: "rgba(13, 36, 78, 0.65)",
                  border: "1px solid rgba(96, 165, 250, 0.22)",
                  borderRadius: 10,
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                  backdropFilter: "blur(8px)",
                }}
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    color: "#000000",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <span>{f.question}</span>
                  {isOpen ? <ChevronUp size={18} color="#38bdf8" /> : <ChevronDown size={18} color="#38bdf8" />}
                </button>
                {isOpen && (
                  <div style={{ padding: "0 20px 18px", color: "#334155", fontSize: 13.5, lineHeight: 1.6, borderTop: "1px solid rgba(96, 165, 250, 0.15)", paddingTop: 12 }}>
                    {f.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* -------------------- 9. Contact Info Section -------------------- */}
      <section id="contact" style={{ maxWidth: 1320, margin: "0 auto", padding: "75px 24px", borderTop: "1px solid rgba(96, 165, 250, 0.2)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          <div style={{ background: "rgba(13, 36, 78, 0.65)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 12, padding: 22, backdropFilter: "blur(8px)" }}>
            <Mail size={22} style={{ marginBottom: 10, color: "#0369a1" }} />
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "Space Grotesk" }}>Email Support & Sales</div>
            <div style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>General: {contactInfo.email}</div>
            <div style={{ fontSize: 13, color: "#334155" }}>Enterprise Sales: {contactInfo.salesEmail}</div>
          </div>

          <div style={{ background: "rgba(13, 36, 78, 0.65)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 12, padding: 22, backdropFilter: "blur(8px)" }}>
            <Phone size={22} style={{ marginBottom: 10, color: "#0369a1" }} />
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "Space Grotesk" }}>Corporate Phone Lines</div>
            <div style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>Main: {contactInfo.phone}</div>
            <div style={{ fontSize: 13, color: "#334155" }}>24/7 SLA Hotline: {contactInfo.emergencyHotline}</div>
          </div>

          <div style={{ background: "rgba(13, 36, 78, 0.65)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 12, padding: 22, backdropFilter: "blur(8px)" }}>
            <Clock size={22} style={{ marginBottom: 10, color: "#0369a1" }} />
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "Space Grotesk" }}>Operating Hours</div>
            <div style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>{contactInfo.supportHours}</div>
          </div>

          <div style={{ background: "rgba(13, 36, 78, 0.65)", border: "1px solid rgba(96, 165, 250, 0.22)", borderRadius: 12, padding: 22, backdropFilter: "blur(8px)" }}>
            <MapPin size={22} style={{ marginBottom: 10, color: "#0369a1" }} />
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "Space Grotesk" }}>Headquarters</div>
            <div style={{ fontSize: 12.5, color: "#334155", marginTop: 4, lineHeight: 1.4 }}>{contactInfo.address}</div>
          </div>
        </div>
      </section>

      {/* -------------------- 10. Premium ISO Standard Footer -------------------- */}
      <footer style={{ borderTop: "1px solid rgba(96, 165, 250, 0.25)", background: "#ffffff", padding: "45px 24px 34px" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={18} />
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "Space Grotesk" }}>AuditAI Qalyzer v2.0</span>
              <span style={{ fontSize: 10, color: "#0369a1", border: "1px solid #7dd3fc", padding: "2px 6px", borderRadius: 4, marginLeft: 6 }}>
                ISO 9001:2015 & 27001
              </span>
            </div>

            {/* Footer Login Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => onOpenAdminLogin && onOpenAdminLogin()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#bae6fd",
                  border: "1px solid rgba(96, 165, 250, 0.35)",
                  color: "#000000",
                  borderRadius: 6,
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <ShieldCheck size={13} color="#38bdf8" /> Administrator Login
              </button>

              <button
                onClick={() => onOpenClientLogin && onOpenClientLogin()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(96, 165, 250, 0.18)",
                  border: "1px solid #38bdf8",
                  color: "#000000",
                  borderRadius: 6,
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <UserCheck size={13} color="#38bdf8" /> Partner / Client Login
              </button>

              <button
                onClick={() => onEnterConsole && onEnterConsole()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
                  color: "#000000",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 10px #7dd3fc",
                }}
              >
                Launch Console <ArrowRight size={13} />
              </button>
            </div>
          </div>

          <div style={{ height: 1, background: "rgba(96, 165, 250, 0.2)" }} />

          {/* Legal Policies Quick Links */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, fontSize: 12, color: "#334155" }}>
            <div>{footer.copyright}</div>

            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <button onClick={() => setActiveLegalModal("privacy")} style={{ background: "none", border: "none", color: "#0369a1", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Privacy Policy</button>
              <button onClick={() => setActiveLegalModal("terms")} style={{ background: "none", border: "none", color: "#0369a1", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Terms & Conditions</button>
              <button onClick={() => setActiveLegalModal("usage")} style={{ background: "none", border: "none", color: "#0369a1", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Platform Usage Rights</button>
              <button onClick={() => setActiveLegalModal("refund")} style={{ background: "none", border: "none", color: "#0369a1", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Refund Policy</button>
            </div>
          </div>

          <div style={{ fontSize: 11, color: "#0369a1", textAlign: "center", lineHeight: 1.5 }}>
            {footer.disclaimer}
          </div>
        </div>
      </footer>

      {/* -------------------- Interactive Dual-Gateway Direct Checkout Modal -------------------- */}
      {showCheckoutModal && checkoutPlan && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4, 12, 25, 0.88)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 16 }}>
          <div style={{ width: 560, maxWidth: "100%", maxHeight: "90vh", background: "#0b1f3d", border: "2px solid #38bdf8", borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", color: "#000000", boxShadow: "0 20px 50px rgba(0,0,0,0.7)", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid #1e3a66", paddingBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(56,189,248,0.15)", border: "1px solid #38bdf8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CreditCard size={18} color="#38bdf8" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, color: "#000000", fontWeight: 700 }}>
                    Instant Checkout & Activation
                  </h3>
                  <div style={{ fontSize: 12, color: "#334155" }}>Dual Gateway: PayU & Razorpay Supported</div>
                </div>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            {/* Plan Summary Badge */}
            <div style={{ background: "#f0f9ff", border: "1px solid #1e3a66", borderRadius: 12, padding: 16, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#000000" }}>{checkoutPlan.name}</div>
                <div style={{ fontSize: 12, color: "#0369a1", marginTop: 2 }}>
                  {typeof checkoutPlan.callMinutes === "number" ? checkoutPlan.callMinutes.toLocaleString() : checkoutPlan.callMinutes} Call Audits / Month • 30-Day Period
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0369a1" }}>₹{Number(checkoutPlan.price).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: "#334155" }}>+ 18% GST Invoiced</div>
              </div>
            </div>

            {/* Gateway Selection */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, color: "#334155", marginBottom: 8, fontWeight: 600 }}>
                Select Payment Gateway
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { id: "payu", title: "PayU Hosted Checkout", desc: "Cards, NetBanking, UPI (SHA-512)" },
                  { id: "razorpay", title: "Razorpay Native Modal", desc: "Instant UPI QR & Cards (HMAC-SHA256)" },
                ].map((gw) => {
                  const isSel = selectedGateway === gw.id;
                  return (
                    <button
                      key={gw.id}
                      onClick={() => setSelectedGateway(gw.id)}
                      style={{
                        background: isSel ? "rgba(56,189,248,0.15)" : "#f0f9ff",
                        border: `2px solid ${isSel ? "#38bdf8" : "#1e3a66"}`,
                        borderRadius: 10,
                        padding: "12px 14px",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: isSel ? "#38bdf8" : "#ffffff" }}>
                        {gw.title}
                      </div>
                      <div style={{ fontSize: 11, color: "#334155", marginTop: 4 }}>
                        {gw.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contact Details Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 12.5, color: "#334155", marginBottom: 4, fontWeight: 600 }}>
                  Billing Contact Name
                </label>
                <input
                  type="text"
                  value={checkoutForm.name}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, name: e.target.value })}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#f0f9ff",
                    border: "1px solid #1e3a66",
                    borderRadius: 8,
                    padding: "9px 12px",
                    color: "#000000",
                    fontSize: 13.5,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, color: "#334155", marginBottom: 4, fontWeight: 600 }}>
                    Work Email (For Tax Invoice)
                  </label>
                  <input
                    type="email"
                    value={checkoutForm.email}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, email: e.target.value })}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#f0f9ff",
                      border: "1px solid #1e3a66",
                      borderRadius: 8,
                      padding: "9px 12px",
                      color: "#000000",
                      fontSize: 13.5,
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12.5, color: "#334155", marginBottom: 4, fontWeight: 600 }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={checkoutForm.phone}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#f0f9ff",
                      border: "1px solid #1e3a66",
                      borderRadius: 8,
                      padding: "9px 12px",
                      color: "#000000",
                      fontSize: 13.5,
                      outline: "none",
                    }}
                  />
                </div>
              </div>
            </div>

            {checkoutError && (
              <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                {checkoutError}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={handleProceedCheckout}
                disabled={checkoutLoading}
                style={{
                  background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
                  color: "#000000",
                  border: "none",
                  borderRadius: 8,
                  padding: "13px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 15px rgba(2, 132, 199, 0.4)",
                }}
              >
                {checkoutLoading ? "Connecting Secure Gateway..." : `Proceed to Secure ${selectedGateway.toUpperCase()} Payment`}
                <ArrowRight size={15} />
              </button>

              <button
                onClick={handleSimulateInstantPayment}
                disabled={checkoutLoading}
                style={{
                  background: "rgba(56,189,248,0.12)",
                  color: "#0369a1",
                  border: "1px solid #38bdf8",
                  borderRadius: 8,
                  padding: "10px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Instant Test Simulation (Verify Sandbox Activation)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- Payment Success Modal -------------------- */}
      {paymentSuccessData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4, 12, 25, 0.92)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: 16 }}>
          <div style={{ width: 500, maxWidth: "100%", background: "#0b1f3d", border: "2px solid #10b981", borderRadius: 16, padding: 32, textAlign: "center", color: "#000000", boxShadow: "0 25px 60px rgba(16, 185, 129, 0.25)" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", border: "2px solid #10b981", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <CheckCircle2 size={36} color="#16a34a" />
            </div>

            <h2 style={{ margin: "0 0 10px 0", fontSize: 24, fontWeight: 800, color: "#000000" }}>
              Subscription Successfully Activated!
            </h2>

            <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#334155", lineHeight: 1.6 }}>
              Your transaction <strong>{paymentSuccessData.txnid}</strong> has been cryptographically verified through <strong>{paymentSuccessData.gateway.toUpperCase()}</strong>. Your multi-tenant quota has been updated and a GST tax invoice dispatched to your email.
            </p>

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => {
                  setPaymentSuccessData(null);
                  if (onEnterConsole) onEnterConsole();
                }}
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "#000000",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 26px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)",
                }}
              >
                Launch QA Console <ArrowRight size={16} />
              </button>

              <button
                onClick={() => setPaymentSuccessData(null)}
                style={{
                  background: "#bae6fd",
                  border: "1px solid #1e3a66",
                  color: "#334155",
                  borderRadius: 8,
                  padding: "12px 20px",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Stay on Home Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- Legal Policy Dialog Modal -------------------- */}
      {activeLegalModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4, 12, 25, 0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ width: 680, maxWidth: "100%", maxHeight: "85vh", background: "#ffffff", border: "2px solid #38bdf8", borderRadius: 14, padding: 26, display: "flex", flexDirection: "column", color: "#000000", boxShadow: "0 16px 40px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid rgba(96, 165, 250, 0.25)", paddingBottom: 10 }}>
              <div style={{ fontSize: 19, fontWeight: 700, fontFamily: "Space Grotesk", color: "#0369a1" }}>
                {activeLegalModal === "privacy" && "Privacy Policy (ISO 27001)"}
                {activeLegalModal === "terms" && "Terms and Conditions of Service"}
                {activeLegalModal === "usage" && "Platform Usage Rights & SLA"}
                {activeLegalModal === "refund" && "Subscription & Refund Policy"}
              </div>
              <button onClick={() => setActiveLegalModal(null)} style={{ background: "none", border: "none", color: "#000000", cursor: "pointer" }}><X size={20} /></button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-line", color: "#334155", paddingRight: 6 }}>
              {activeLegalModal === "privacy" && (legal.privacyPolicy || "Privacy Policy details active.")}
              {activeLegalModal === "terms" && (legal.termsConditions || "Terms and conditions active.")}
              {activeLegalModal === "usage" && (legal.platformUsageRights || "Platform usage rights active.")}
              {activeLegalModal === "refund" && (legal.refundPolicy || "Refund policy active.")}
            </div>

            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setActiveLegalModal(null)} style={{ background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)", color: "#ffffff", border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                Close Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
