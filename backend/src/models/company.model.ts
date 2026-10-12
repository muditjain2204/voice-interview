/**
 * Company Model for Voice AI Interview Platform
 * Manages target employer profiles, culture rubrics, and company-specific interview prompts.
 */

import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import type { Company } from '../types';

export interface CompanyEvaluationFocus {
  company: Company;
  displayName: string;
  coreValues: string[];
  interviewPillars: string[];
  evaluationTips: string[];
  interviewerPersonaDirective: string;
}

export const COMPANY_INTERVIEW_PROFILES: Record<Company, CompanyEvaluationFocus> = {
  google: {
    company: 'google',
    displayName: 'Google',
    coreValues: ['General Cognitive Ability', 'Role-Related Knowledge', 'Leadership', 'Googleyness'],
    interviewPillars: ['Scale & Big-O optimization', 'Navigating Ambiguity', 'Data-driven decision making'],
    evaluationTips: ['Highlight scalability and clean boundary contracts', 'Emphasize algorithmic edge cases and Big-O efficiency'],
    interviewerPersonaDirective: 'Probe deeply on scalability tradeoffs, data volume handling (billions of queries), and handling vague specifications with structured questions.',
  },
  amazon: {
    company: 'amazon',
    displayName: 'Amazon',
    coreValues: ['Customer Obsession', 'Ownership', 'Invent and Simplify', 'Are Right, A Lot', 'Deliver Results'],
    interviewPillars: ['16 Leadership Principles', 'Customer-Backwards Design', 'Frugality & Scalability'],
    evaluationTips: ['Use the STAR method with clear personal contributions ("I", not "we")', 'Quantify metrics and business outcomes'],
    interviewerPersonaDirective: 'Evaluate adherence to Leadership Principles. Actively probe for metrics, quantifiable results, and customer-first rationale behind architectural choices.',
  },
  meta: {
    company: 'meta',
    displayName: 'Meta',
    coreValues: ['Move Fast', 'Focus on Long-Term Impact', 'Build Awesome Things', 'Live in the Future'],
    interviewPillars: ['Execution Speed', 'Bottom-Up Architecture', 'Practical Trade-offs'],
    evaluationTips: ['Focus on rapid execution and clear end-to-end design', 'Be pragmatic rather than overly academic'],
    interviewerPersonaDirective: 'Look for rapid problem breakdown, decisive engineering judgment, and minimal over-engineering. Value speed and simplicity.',
  },
  microsoft: {
    company: 'microsoft',
    displayName: 'Microsoft',
    coreValues: ['Growth Mindset', 'Customer-Centricity', 'Diversity & Inclusion', 'One Microsoft'],
    interviewPillars: ['Cross-team Collaboration', 'Backward Compatibility', 'Reliability & Cloud Scale'],
    evaluationTips: ['Demonstrate willingness to learn from failures', 'Consider enterprise legacy integration and cloud security'],
    interviewerPersonaDirective: 'Evaluate architectural maturity, security posture, enterprise compatibility (Azure/hybrid), and growth mindset in overcoming setbacks.',
  },
  apple: {
    company: 'apple',
    displayName: 'Apple',
    coreValues: ['User Privacy', 'Perfectionism', 'Cross-Functional Craftsmanship', 'Simplicity'],
    interviewPillars: ['Performance & Battery Efficiency', 'Privacy by Design', 'Pixel-level Excellence'],
    evaluationTips: ['Prioritize user experience and resource constraints', 'Demonstrate obsessive attention to detail'],
    interviewerPersonaDirective: 'Probe on memory constraints, privacy safeguards, and user-facing smoothness. Insist on high craftsmanship and detail.',
  },
  netflix: {
    company: 'netflix',
    displayName: 'Netflix',
    coreValues: ['Context Not Control', 'High Performance', 'Freedom & Responsibility', 'Stunning Colleagues'],
    interviewPillars: ['Distributed Fault Tolerance (Chaos)', 'Independent Decision Making', 'Direct Candor'],
    evaluationTips: ['Show high autonomy and courage to take calculated risks', 'Design for active degradation and high availability'],
    interviewerPersonaDirective: 'Test for mature judgment under ambiguity, proactive risk-taking, and architectural fault tolerance (fail gracefully, circuit breakers).',
  },
  uber: {
    company: 'uber',
    displayName: 'Uber',
    coreValues: ['Go Get It', 'Trip First', 'Build with Heart', 'Great Minds Do Not Think Alike'],
    interviewPillars: ['Real-Time Geospatial Systems', 'Extreme Concurrency', 'Low-Latency Dispatch'],
    evaluationTips: ['Discuss high-throughput streaming and event architectures', 'Highlight high-availability under network disruptions'],
    interviewerPersonaDirective: 'Probe on real-time streaming (Kafka, Flink), geofencing, and handling volatile network conditions on mobile clients.',
  },
  airbnb: {
    company: 'airbnb',
    displayName: 'Airbnb',
    coreValues: ['Champion the Mission', 'Be a Host', 'Embrace the Adventure', 'Be a "Cereal" Entrepreneur'],
    interviewPillars: ['Developer Velocity', 'Service-Oriented Architecture', 'Design Systems & UX'],
    evaluationTips: ['Highlight empathy for both hosts and guests', 'Discuss clean modular service interfaces and schema design'],
    interviewerPersonaDirective: 'Emphasize user empathy, modular API contracts, and clean design systems.',
  },
  stripe: {
    company: 'stripe',
    displayName: 'Stripe',
    coreValues: ['Users First', 'Move with Urgency', 'Think Rigorously', 'Trust and Reliability'],
    interviewPillars: ['API Design & Idempotency', 'Zero-Downtime Migration', 'Financial Correctness (ACID)'],
    evaluationTips: ['Emphasize idempotency keys, race condition safety, and webhook retry mechanisms', 'Focus on developer ergonomics'],
    interviewerPersonaDirective: 'Relentlessly question data consistency, idempotency, failure states, and developer experience (DX).',
  },
  openai: {
    company: 'openai',
    displayName: 'OpenAI',
    coreValues: ['Broadly Beneficial AGI', 'Scale-Oriented Mindset', 'Rigorous Empirical Thinking'],
    interviewPillars: ['Model Evaluation & Benchmarking', 'Latency vs Cost Optimization', 'Safety & Alignment'],
    evaluationTips: ['Demonstrate deep understanding of LLM mechanisms, tokenomics, and prompt engineering', 'Discuss empirical evaluations'],
    interviewerPersonaDirective: 'Focus on AI system engineering, evaluation methodologies, latency bottlenecks, and real-world deployment challenges.',
  },
  anthropic: {
    company: 'anthropic',
    displayName: 'Anthropic',
    coreValues: ['Constitutional AI', 'Safety by Design', 'Empirical Rigor', 'Honest Reasoning'],
    interviewPillars: ['Safety Steering & Red-Teaming', 'Context Caching', 'Interpretability'],
    evaluationTips: ['Emphasize AI safety, prompt injection defenses, and ethical guardrails', 'Focus on robust error boundaries'],
    interviewerPersonaDirective: 'Probe on AI safety, guardrails, context caching efficiencies, and thoughtful risk modeling.',
  },
  databricks: {
    company: 'databricks',
    displayName: 'Databricks',
    coreValues: ['Open Source Roots', 'Data-First Innovation', 'Customer Obsession'],
    interviewPillars: ['Lakehouse Architectures', 'Distributed Compute (Spark)', 'Query Optimization'],
    evaluationTips: ['Discuss data partitioning, memory spillover, and streaming computations'],
    interviewerPersonaDirective: 'Focus on large-scale distributed data processing, query execution plans, and memory management.',
  },
  snowflake: {
    company: 'snowflake',
    displayName: 'Snowflake',
    coreValues: ['Put Customers First', 'Integrity Always', 'Think Big', 'Be Excellent'],
    interviewPillars: ['Decoupled Storage & Compute', 'Multi-Tenant Isolation', 'Elastic Scaling'],
    evaluationTips: ['Explain cloud-native data warehousing and zero-copy cloning'],
    interviewerPersonaDirective: 'Probe on multi-tenant architecture, micro-partitioning, and concurrency scaling.',
  },
  deloitte: {
    company: 'deloitte',
    displayName: 'Deloitte',
    coreValues: ['Integrity', 'Care for People', 'Commitment to Each Other', 'Strength from Diversity'],
    interviewPillars: ['Enterprise Digital Transformation', 'Stakeholder Communication', 'Agile Delivery'],
    evaluationTips: ['Structure answers clearly with executive summaries', 'Balance technical feasibility with business ROI'],
    interviewerPersonaDirective: 'Focus on business value realization, enterprise risk management, and stakeholder alignment.',
  },
  pwc: {
    company: 'pwc',
    displayName: 'PwC',
    coreValues: ['Act with Integrity', 'Make a Difference', 'Care', 'Work Together', 'Reimagine the Possible'],
    interviewPillars: ['Risk Advisory', 'Governance & Compliance', 'Digital Modernization'],
    evaluationTips: ['Emphasize auditability, data governance, and regulatory requirements'],
    interviewerPersonaDirective: 'Evaluate governance frameworks, internal controls, and measurable client deliverables.',
  },
  mckinsey: {
    company: 'mckinsey',
    displayName: 'McKinsey & Company',
    coreValues: ['Obligation to Dissent', 'Client First', 'Top-down Problem Solving'],
    interviewPillars: ['MECE Problem Structuring', 'Hypothesis-Driven Synthesis', 'Strategic Prioritization'],
    evaluationTips: ['Structure communication top-down (Pyramid Principle)', 'Ensure mutually exclusive and collectively exhaustive reasoning'],
    interviewerPersonaDirective: 'Demand structured MECE breakdowns. Push the candidate to synthesize complex options into clear recommendations.',
  },
  goldman_sachs: {
    company: 'goldman_sachs',
    displayName: 'Goldman Sachs',
    coreValues: ['Client Service', 'Excellence', 'Integrity', 'Partnership'],
    interviewPillars: ['Ultra-Low Latency & High Frequency', 'Deterministic Execution', 'Risk & Compliance'],
    evaluationTips: ['Demonstrate zero tolerance for data corruption or memory leaks', 'Discuss deterministic garbage collection / memory layouts'],
    interviewerPersonaDirective: 'Probe on low-latency trading architecture, memory management, transactional consistency, and fault isolation.',
  },
  jpmorgan: {
    company: 'jpmorgan',
    displayName: 'JPMorgan Chase',
    coreValues: ['Exceptional Client Service', 'Operational Excellence', 'A Great Team and Culture'],
    interviewPillars: ['Global Payments Infrastructure', 'High Availability & Resiliency', 'Information Security'],
    evaluationTips: ['Emphasize strict compliance, encryption in transit/at rest, and disaster recovery testing'],
    interviewerPersonaDirective: 'Focus on enterprise resilience, multi-region failover, payment clearing safeguards, and cyber defense.',
  },
};

export class CompanyModel {
  /**
   * Fetch company information from DB
   */
  static async getCompanyInfo(companyName: string) {
    try {
      return await prisma.companyInfo.findUnique({
        where: { name: companyName },
      });
    } catch (error) {
      logger.error(`CompanyModel.getCompanyInfo error for ${companyName}:`, error);
      return null;
    }
  }

  /**
   * Get all supported companies
   */
  static async getAllCompanies() {
    try {
      return await prisma.companyInfo.findMany({
        orderBy: { displayName: 'asc' },
      });
    } catch (error) {
      logger.error('CompanyModel.getAllCompanies error:', error);
      return [];
    }
  }

  /**
   * Get custom evaluation profile for a company
   */
  static getProfile(company?: Company): CompanyEvaluationFocus | null {
    if (!company) return null;
    return COMPANY_INTERVIEW_PROFILES[company] || null;
  }

  /**
   * Inject company-specific culture directives into the AI interviewer prompt
   */
  static getSystemPromptSnippet(company?: Company): string {
    const profile = this.getProfile(company);
    if (!profile) return '';

    return `
Target Employer: ${profile.displayName}
Interview Focus Pillars: ${profile.interviewPillars.join(', ')}
Interviewer Directive: ${profile.interviewerPersonaDirective}
`.trim();
  }
}
