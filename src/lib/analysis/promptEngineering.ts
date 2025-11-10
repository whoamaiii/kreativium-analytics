import type { EmotionEntry, SensoryEntry, TrackingEntry, Goal } from '@/types/student';
import type { EvidenceSource } from '@/lib/evidence/types';
import type { TimeRange } from './analysisEngine';

export interface StudentAnalysisContext {
  entries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  goals: Goal[];
  timeframe?: TimeRange;
}

export interface LlmPrompt {
  system?: string;
  user: string;
}

function formatEvidenceContext(sources?: EvidenceSource[]): string | undefined {
  const list = (sources || []).filter(Boolean);
  if (!list.length) return undefined;
  const lines: string[] = ['Evidence Context:'];
  for (const s of list) {
    const raw = s.shortExcerpt ?? '';
    const sanitized = raw.replace(/\s+/g, ' ').trim();
    const excerpt = sanitized.length > 300 ? sanitized.slice(0, 300) + '…' : sanitized;
    lines.push(`- ${s.id}: ${excerpt}`);
  }
  return lines.join('\n');
}

function getSystemRules(profile?: 'iep' | 'default'): string {
  const baseNo: string[] = [
    'Svar kun på norsk. Vær konkret og respektfull.',
    'Returner KUN gyldig JSON uten kodeblokker, tags eller forklarende tekst. Ikke vis tankestrøm.',
    'Hold deg til det som støttes av dataene. Vær konservativ i antakelser.',
  ];
  if (profile === 'iep') {
    baseNo.push(
      'Kun pedagogiske anbefalinger. Ingen medisinske/kliniske diagnoser eller råd.',
      'Tiltak skal kunne gjennomføres i klasserommet og være målbare.',
    );
  }
  return baseNo.join(' ');
}

function fmtDate(d?: Date): string | undefined {
  if (!d) return undefined;
  const iso = d.toISOString();
  return iso.slice(0, 19);
}

function summarizeTimeframe(ctx: StudentAnalysisContext): string {
  const start =
    ctx.timeframe?.start instanceof Date
      ? ctx.timeframe.start
      : ctx.timeframe?.start
        ? new Date(ctx.timeframe.start)
        : undefined;
  const end =
    ctx.timeframe?.end instanceof Date
      ? ctx.timeframe.end
      : ctx.timeframe?.end
        ? new Date(ctx.timeframe.end)
        : undefined;
  const tz = ctx.timeframe?.timezone;
  const p = [
    start ? `start=${fmtDate(start)}` : undefined,
    end ? `end=${fmtDate(end)}` : undefined,
    tz ? `tz=${tz}` : undefined,
  ]
    .filter(Boolean)
    .join(', ');
  return p ? `Timeframe: ${p}` : 'Timeframe: full history available';
}

function summarizeCounts(ctx: StudentAnalysisContext): string {
  const last = ctx.entries[0]?.timestamp;
  const lastStr = last ? fmtDate(last) : 'n/a';
  return [
    `Counts: entries=${ctx.entries.length}, emotions=${ctx.emotions.length}, sensory=${ctx.sensoryInputs.length}, goals=${ctx.goals.length}`,
    `Most recent entry: ${lastStr}`,
  ].join('\n');
}

function pickRecent<T extends { timestamp: Date }>(items: T[], limit: number): T[] {
  return (items || []).slice(0, limit);
}

function sampleSnapshot(ctx: StudentAnalysisContext, maxEntries = 12): string {
  const entries = pickRecent(ctx.entries, maxEntries);
  const lines: string[] = [];
  for (const e of entries) {
    const em = (e.emotions || [])
      .map((x) => `${x.emotion}${typeof x.intensity === 'number' ? `(${x.intensity})` : ''}`)
      .join(', ');
    const sn = (e.sensoryInputs || [])
      .map((x) => `${x.response}${x.intensity ? `(${x.intensity})` : ''}`)
      .join(', ');
    const env = e.environmentalData
      ? [
          e.environmentalData.location,
          e.environmentalData.classroom?.activity,
          typeof e.environmentalData.roomConditions?.noiseLevel === 'number'
            ? `noise=${e.environmentalData.roomConditions?.noiseLevel}`
            : undefined,
          e.environmentalData.weather?.condition,
        ]
          .filter(Boolean)
          .join(' | ')
      : '';
    lines.push(
      `- ${fmtDate(e.timestamp)} | emotions: [${em}] | sensory: [${sn}]${env ? ` | env: ${env}` : ''}${e.notes ? ` | notes: ${e.notes}` : ''}`,
    );
  }
  return lines.join('\n');
}

function summarizeGoals(goals: Goal[], max = 6): string {
  if (!goals?.length) return 'No active goals provided.';
  const pick = goals.slice(0, max);
  const lines = pick.map(
    (g) =>
      `- ${g.title} [${g.category}] status=${g.status} progress=${Math.round(g.progress)}% target=${fmtDate(g.targetDate)}`,
  );
  return lines.join('\n');
}

export function generateAnalysisPrompt(
  ctx: StudentAnalysisContext,
  evidenceContext?: EvidenceSource[],
  profile: 'iep' | 'default' = 'default',
): LlmPrompt {
  const header = [summarizeTimeframe(ctx), summarizeCounts(ctx)].join('\n');

  const dataset = [
    'Recent Tracking Snapshot:',
    sampleSnapshot(ctx),
    '',
    'Goals:',
    summarizeGoals(ctx.goals),
  ].join('\n');

  const system = getSystemRules(profile);

  const evidenceBlock = formatEvidenceContext(evidenceContext);

  const baseInstructions = [
    'Returner et JSON-objekt med feltene:',
    '- summary: valgfri string',
    '- keyFindings: string[]',
    '- patterns: { name: string; description?: string; strength?: number; impact?: "low"|"medium"|"high"; evidence?: { description: string; weight?: number; sources?: ("emotion"|"behavior"|"sensor"|"environment"|"goal"|"tracking"|"system"|"external"|"other")[]; refs?: string[]; }[] }[]',
    '- correlations: { variables: [string, string]; coefficient: number; direction?: "positive"|"negative"; pValue?: number; confounders?: string[]; evidence?: { description: string }[] }[]',
    '- hypothesizedCauses: { cause: string; likelihood: number; rationale?: string; supportingEvidence?: { description: string }[] }[]',
    '- suggestedInterventions: { title: string; description: string; actions?: string[]; expectedImpact?: "low"|"medium"|"high"; timeHorizon?: "short"|"medium"|"long"; metrics?: string[]; confidence?: { overall: number; calibration?: string; caveats?: string[] }; sources?: string[]; tier?: "Tier1"|"Tier2"|"Tier3"; scope?: "classroom"|"school"; udlCheckpoints?: string[]; hlps?: string[] }[]',
    '- anomalies: { description: string; severity?: "low"|"medium"|"high"; at?: string; range?: { start: string; end: string; timezone?: string }; evidence?: { description: string }[] }[]',
    '- predictiveInsights: { outcome: string; probability: number; horizon?: "short"|"medium"|"long"; drivers?: string[]; confidence?: { overall: number; calibration?: string; caveats?: string[] } }[]',
    '- dataLineage: { source: string; type?: "emotion"|"behavior"|"sensor"|"environment"|"goal"|"tracking"|"system"|"external"|"other"; timeRange?: { start: string; end: string; timezone?: string }; fields?: string[]; notes?: string }[]',
    '- confidence: { overall: number; calibration?: string; caveats?: string[] }',
    'Regler: Alle tall i [0,1] der det er angitt; hold tekst kort; unngå PII; ingen kodeblokker; kun JSON som topp‑nivå.',
  ];

  if (profile === 'iep') {
    baseInstructions.push(
      'IEP-modus: suggestedInterventions må inkludere feltene sources: string[], metrics: string[], timeHorizon, tier, scope.',
      'IEP-modus: mål skal følge SMART-struktur (betingelse/materiell, atferd, kriterier, tidsramme).',
      'IEP-modus: kun klasseroms-gjennomførbare tiltak; ingen medisinsk rådgivning.',
      'Merk: Dette er pedagogisk veiledning og erstatter ikke medisinsk eller klinisk rådgivning.',
      'IEP-modus: tier må være en av "Tier1"|"Tier2"|"Tier3"; scope må være en av "classroom"|"school".',
      'IEP-modus: legg SMART-detaljene eksplisitt inn: betingelse/materiell i description, atferd i title/description, kriterier i metrics (målbare indikatorer), tidsramme i timeHorizon.',
    );
  }

  if (evidenceBlock) {
    baseInstructions.push(
      'Bruk kun Evidence Context for eksterne kilder, og siter kilder med id i refs/sources.',
    );
  } else {
    baseInstructions.push(
      'Ikke finn på eksterne kilder; utelat referanser hvis Evidence Context ikke er gitt.',
    );
  }

  const instructions = baseInstructions.join('\n');

  const user = [
    header,
    '',
    dataset,
    '',
    evidenceBlock ?? '',
    evidenceBlock ? '' : '',
    '',
    instructions,
  ].join('\n');

  return { system, user };
}
