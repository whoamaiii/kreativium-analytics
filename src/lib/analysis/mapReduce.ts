import { openRouterClient } from '@/lib/ai/openrouterClient';
import { loadAiConfig } from '@/lib/aiConfig';
import { logger } from '@/lib/logger';
import type { EmotionEntry, SensoryEntry, TrackingEntry, Goal } from '@/types/student';
import type { AnalyticsResults } from '@/types/analytics';
import type { AnalyticsResultsAI, TimeRange } from './analysisEngine';
import { validateOrRepairAiReport } from './llmUtils';
import { ZodSchema, z } from 'zod';
import type { EvidenceSource } from '@/lib/evidence/types';

export interface ChunkContext {
  range: TimeRange;
  entries: TrackingEntry[];
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  goals: Goal[];
}

// Compact per-chunk summary shape to minimize tokens
export const ZChunkSummary = z.object({
  keyFindings: z.array(z.string()).default([]),
  patterns: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    strength: z.number().min(0).max(1).optional(),
    impact: z.enum(['low','medium','high']).optional(),
  })).default([]),
  correlations: z.array(z.object({
    variables: z.tuple([z.string(), z.string()]),
    coefficient: z.number().min(-1).max(1).default(0),
    direction: z.enum(['positive','negative']).optional(),
  })).default([]),
  anomalies: z.array(z.object({
    description: z.string(),
    severity: z.enum(['low','medium','high']).default('medium'),
  })).default([]),
  suggestedInterventions: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
  })).default([]),
  predictiveInsights: z.array(z.object({
    outcome: z.string(),
    probability: z.number().min(0).max(1).default(0.5),
  })).default([]),
});
export type ChunkSummary = z.infer<typeof ZChunkSummary>;

function fmtDate(d?: Date | string): string {
  try {
    const dd = d instanceof Date ? d : new Date(d || 0);
    if (!Number.isFinite(dd.getTime())) return '';
    return dd.toISOString().slice(0,19);
  } catch { return ''; }
}

function sampleSnapshot(entries: TrackingEntry[], maxEntries = 8): string {
  const pick = (entries || []).slice(0, maxEntries);
  const lines: string[] = [];
  for (const e of pick) {
    const em = (e.emotions || []).map(x => `${x.emotion}${typeof x.intensity === 'number' ? `(${x.intensity})` : ''}`).join(', ');
    const sn = (e.sensoryInputs || []).map(x => `${x.response}${x.intensity ? `(${x.intensity})` : ''}`).join(', ');
    lines.push(`- ${fmtDate(e.timestamp)} | emotions: [${em}] | sensory: [${sn}]${e.notes ? ` | notes: ${e.notes}` : ''}`);
  }
  return lines.join('\n');
}

export function chooseChunkSpanDays(from: Date, to: Date): number {
  const ms = Math.max(0, to.getTime() - from.getTime());
  const days = Math.max(1, Math.round(ms / (1000*60*60*24)));
  if (days <= 30) return 7;     // weekly
  if (days <= 120) return 14;   // bi-weekly
  if (days <= 365) return 30;   // monthly
  return 60;                     // bi-monthly for very long
}

export function chunkByDays<T extends { timestamp: Date }>(items: T[], start: Date, end: Date, spanDays: number): Array<{ range: TimeRange; items: T[] }>{
  const chunks: Array<{ range: TimeRange; items: T[] }> = [];
  let cursor = new Date(start);
  while (cursor.getTime() < end.getTime()) {
    const chunkStart = new Date(cursor);
    const chunkEnd = new Date(Math.min(end.getTime(), chunkStart.getTime() + spanDays*24*60*60*1000 - 1));
    const inChunk = items.filter(i => i.timestamp.getTime() >= chunkStart.getTime() && i.timestamp.getTime() <= chunkEnd.getTime());
    chunks.push({ range: { start: chunkStart, end: chunkEnd }, items: inChunk });
    cursor = new Date(chunkEnd.getTime() + 1);
  }
  return chunks;
}

type MapReduceOptions = {
  evidence?: EvidenceSource[];
  aiProfile?: string;
};

function formatEvidenceForPrompt(evidence?: EvidenceSource[], limit = 5): string | undefined {
  if (!evidence || evidence.length === 0) return undefined;
  const lines = evidence.slice(0, limit).map((src) => {
    const tags = src.tags && src.tags.length ? ` [${src.tags.join(', ')}]` : '';
    const label = src.title || src.id || 'Kilde';
    return `- ${label}${tags}`;
  });
  return lines.length ? `Relevante kilder:\n${lines.join('\n')}` : undefined;
}

export async function summarizeChunk(ctx: ChunkContext, opts?: MapReduceOptions): Promise<ChunkSummary> {
  const header = `Oppsummer denne perioden kort i norsk JSON. Ingen kodeblokker.\n`+
    `Periode: ${fmtDate(ctx.range.start)} – ${fmtDate(ctx.range.end)}\n`+
    `Antall: entries=${ctx.entries.length}, emotions=${ctx.emotions.length}, sensory=${ctx.sensoryInputs.length}, goals=${ctx.goals.length}`;
  const dataset = `Snapshot (inntil 8):\n${sampleSnapshot(ctx.entries, 8)}`;
  const contextLines: string[] = [];
  if (opts?.aiProfile) contextLines.push(`AI-profil: ${opts.aiProfile}`);
  const evidenceBlock = formatEvidenceForPrompt(opts?.evidence);
  if (evidenceBlock) contextLines.push(evidenceBlock);
  const contextBlock = contextLines.length ? contextLines.join('\n') : undefined;

  const instructions = [
    'Returner KUN gyldig JSON med feltene: keyFindings[], patterns[], correlations[], anomalies[], suggestedInterventions[], predictiveInsights[].',
    'Vær kortfattet og konkret. Ingen PII. Alle tall i [0,1] der det passer.'
  ].join('\n');

  const sys = 'Svar kun på norsk. Returner KUN gyldig JSON uten kodeblokker. Ikke vis tankestrøm.';
  const sections = [header, '', dataset];
  if (contextBlock) {
    sections.push('', contextBlock);
  }
  sections.push('', instructions);
  const user = sections.join('\n');

  const { data } = await openRouterClient.chatJSON<unknown>(
    { system: sys, user },
    { ensureJson: true, refine: (v) => ZChunkSummary.parse(v) }
  );
  return data as ChunkSummary;
}

export async function reduceSummariesToFinalReport(
  summaries: ChunkSummary[],
  goals: Goal[],
  overallRange: TimeRange,
  opts?: MapReduceOptions
): Promise<{ ok: true; report: AnalyticsResults } | { ok: false; error: Error }>{
  try {
    const sys = 'Svar kun på norsk. Returner KUN gyldig JSON uten kodeblokker. Ikke vis tankestrøm.';
    const contextLines: string[] = [];
    if (opts?.aiProfile) contextLines.push(`AI-profil: ${opts.aiProfile}`);
    const evidenceBlock = formatEvidenceForPrompt(opts?.evidence, 8);
    if (evidenceBlock) contextLines.push(evidenceBlock);
    const contextBlock = contextLines.length ? contextLines.join('\n') : undefined;
    const user = [
      'Du får en liste med del-oppsummeringer (JSON) fra flere tidsperioder for samme elev.',
      'Slå dem sammen til ÉN helhetlig analyse i følgende JSON-skjema:',
      '{ summary?, keyFindings[], patterns[], correlations[], hypothesizedCauses[], suggestedInterventions[], anomalies[], predictiveInsights[], dataLineage[], confidence{} }',
      'Vær konservativ og fjern duplikater. Vektlegg konsistente mønstre som går igjen på tvers av perioder.',
      `Analyseperiode: ${fmtDate(overallRange.start)} – ${fmtDate(overallRange.end)}. Mål: praktiske tiltak og mønstre.`,
      contextBlock ?? '',
      'Del-oppsummeringer (JSON):',
      JSON.stringify(summaries).slice(0, 120000), // guard token size
      'Inkluder dataLineage med én post per kilde-type (emotion, sensor, tracking, goal) hvis relevant.'
    ].join('\n');

    const { data: raw } = await openRouterClient.chatJSON<unknown>(
      { system: sys, user },
      { ensureJson: true }
    );
    const validated = validateOrRepairAiReport(raw);
    if (!validated.ok) return { ok: false, error: validated.error };
    const report = validated.report as unknown as AnalyticsResults;
    return { ok: true, report };
  } catch (error) {
    logger.error('[mapReduce] reduceSummariesToFinalReport failed', { error: error instanceof Error ? { message: error.message, name: error.name } : String(error) });
    return { ok: false, error: error as Error };
  }
}

export async function analyzeLargePeriod(
  entries: TrackingEntry[],
  emotions: EmotionEntry[],
  sensoryInputs: SensoryEntry[],
  goals: Goal[],
  overallRange: TimeRange,
  opts?: MapReduceOptions
): Promise<AnalyticsResults | null> {
  try {
    const start = overallRange.start instanceof Date ? overallRange.start : new Date(overallRange.start);
    const end = overallRange.end instanceof Date ? overallRange.end : new Date(overallRange.end);
    const spanDays = chooseChunkSpanDays(start, end);

    const entryChunks = chunkByDays(entries, start, end, spanDays);
    const summaries: ChunkSummary[] = [];
    for (const c of entryChunks) {
      const eIn = c.items;
      const emoIn = emotions.filter(e => e.timestamp.getTime() >= (c.range.start as Date).getTime() && e.timestamp.getTime() <= (c.range.end as Date).getTime());
      const senIn = sensoryInputs.filter(s => s.timestamp.getTime() >= (c.range.start as Date).getTime() && s.timestamp.getTime() <= (c.range.end as Date).getTime());
      // Skip empty chunks to save tokens
      if ((eIn.length + emoIn.length + senIn.length) === 0) continue;
      const ctx: ChunkContext = { range: c.range, entries: eIn, emotions: emoIn, sensoryInputs: senIn, goals };
      const summary = await summarizeChunk(ctx, opts);
      summaries.push(summary);
    }

    if (summaries.length === 0) return null;
    const final = await reduceSummariesToFinalReport(summaries, goals, overallRange, opts);
    if (!final.ok) return null;
    return final.report;
  } catch (error) {
    logger.error('[mapReduce] analyzeLargePeriod error', { error: error instanceof Error ? { message: error.message } : String(error) });
    return null;
  }
}
