/*
  Interventions Library
  - PBIS/HLP-aligned suggestions mapped to alert kinds
  - Minimal structure for Phase 1 with localization-ready content
*/

import { AlertKind } from '@/lib/alerts/types';

export interface InterventionCard {
  id: string;
  kind: AlertKind;
  hypothesis: string;
  rationale: string;
  strategies: { id: string; title: string; description: string }[];
  evidenceBase?: string;
  reviewScheduleDays?: number; // e.g., 7 days default
  locale?: string;
}

const BASE_REVIEW_DAYS = 7;

const INTERVENTIONS: InterventionCard[] = [
  {
    id: 'safety-crisis-prevention-1',
    kind: AlertKind.Safety,
    hypothesis: 'Escalation risk due to environmental triggers',
    rationale: 'Student shows acute distress markers; reduce stimuli and provide safe space.',
    strategies: [
      { id: 'cp-1', title: 'Calm Corner', description: 'Offer a calm corner with sensory tools.' },
      { id: 'cp-2', title: 'Adult Check-In', description: 'Immediate supportive check-in by trusted adult.' },
      { id: 'cp-3', title: 'Visual Schedule', description: 'Clarify expectations with a visual schedule.' },
    ],
    evidenceBase: 'PBIS Tier 2; CPI de-escalation framework',
    reviewScheduleDays: BASE_REVIEW_DAYS,
  },
  {
    id: 'behavior-spike-deescalation-1',
    kind: AlertKind.BehaviorSpike,
    hypothesis: 'Behavior spike linked to transition difficulty',
    rationale: 'Transitions correlate with spikes; scaffold transitions and pre-correct.',
    strategies: [
      { id: 'ds-1', title: 'Pre-correction', description: 'Briefly remind expectations before transitions.' },
      { id: 'ds-2', title: 'Choice Making', description: 'Provide two acceptable choices to increase control.' },
      { id: 'ds-3', title: 'Breaks', description: 'Offer short movement breaks between activities.' },
    ],
    evidenceBase: 'HLP 7, 13; PBIS effective classroom practices',
    reviewScheduleDays: BASE_REVIEW_DAYS,
  },
  {
    id: 'context-association-env-mod-1',
    kind: AlertKind.ContextAssociation,
    hypothesis: 'Specific context elevates challenge (noise, peers, task demand)',
    rationale: 'Modify environment to reduce triggers and support access.',
    strategies: [
      { id: 'em-1', title: 'Preferential Seating', description: 'Seat away from high traffic/noise.' },
      { id: 'em-2', title: 'Task Chunking', description: 'Chunk tasks into short, manageable steps.' },
      { id: 'em-3', title: 'Peer Support', description: 'Pair with supportive peer for collaborative tasks.' },
    ],
    evidenceBase: 'HLP 19; UDL considerations',
    reviewScheduleDays: BASE_REVIEW_DAYS,
  },
  {
    id: 'intervention-due-progress-1',
    kind: AlertKind.InterventionDue,
    hypothesis: 'Intervention progress review due',
    rationale: 'Periodic review maintains fidelity and responsiveness to need.',
    strategies: [
      { id: 'pm-1', title: 'Progress Monitoring', description: 'Schedule data collection and review meeting.' },
      { id: 'pm-2', title: 'Goal Adjust', description: 'Adjust goal or strategy intensity based on data.' },
      { id: 'pm-3', title: 'Family Update', description: 'Share concise update with caregivers.' },
    ],
    evidenceBase: 'MTSS cycles; data-driven decision-making',
    reviewScheduleDays: BASE_REVIEW_DAYS,
  },
  {
    id: 'data-quality-check-1',
    kind: AlertKind.DataQuality,
    hypothesis: 'Data completeness or quality issue detected',
    rationale: 'Reliable data underpins trustworthy alerts and progress review.',
    strategies: [
      { id: 'dq-1', title: 'Fill Gaps', description: 'Prompt to enter missed observations for this week.' },
      { id: 'dq-2', title: 'Calibrate', description: 'Review rubric anchors for consistent ratings.' },
      { id: 'dq-3', title: 'Automations', description: 'Enable reminders or simplify data entry workflow.' },
    ],
    evidenceBase: 'Measurement validity practices',
    reviewScheduleDays: BASE_REVIEW_DAYS,
  },
];

export function getInterventionsByAlertKind(kind: AlertKind, locale?: string): InterventionCard[] {
  return INTERVENTIONS.filter((i) => i.kind === kind && (!locale || i.locale === locale));
}

export function getInterventionById(id: string): InterventionCard | undefined {
  return INTERVENTIONS.find((i) => i.id === id);
}

export function searchInterventions(query: string, locale?: string): InterventionCard[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return INTERVENTIONS.filter((i) => {
    const text = [i.hypothesis, i.rationale, ...i.strategies.map((s) => `${s.title} ${s.description}`)].join(' ').toLowerCase();
    return text.includes(q) && (!locale || i.locale === locale);
  });
}


