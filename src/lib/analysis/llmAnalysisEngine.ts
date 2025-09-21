import { dataStorage } from '@/lib/dataStorage';
import { logger } from '@/lib/logger';
import { openRouterClient } from '@/lib/ai/openrouterClient';
import { loadAiConfig } from '@/lib/aiConfig';
import type { EmotionEntry, SensoryEntry, TrackingEntry, Goal, Pattern, Correlation } from '@/types/student';
import type { AnalyticsResults } from '@/types/analytics';
import { HeuristicAnalysisEngine } from './heuristicAnalysisEngine';
import { generateAnalysisPrompt } from './promptEngineering';
import { mapAiToAnalyticsResults, mergeHeuristicWithAi } from './mapping';
import { ZAiReport } from './aiSchema';
import type { AnalysisEngine, TimeRange, AnalysisOptions, AnalyticsResultsAI, AiMetadata } from './analysisEngine';
import { buildDataLineage, computeAiConfidence, createCacheKey, limitForPrompt, toDate, validateOrRepairAiReport, withinRange } from './llmUtils';
import { analyzeLargePeriod } from './mapReduce';
import { selectEvidence, selectEvidenceWeighted, mapCategoryToTags, inferTagsFromText } from '@/lib/evidence/select';
import type { EvidenceSource } from '@/lib/evidence/types';
import { DomainTag, GradeBand } from '@/lib/evidence/types';
import { AI_EVIDENCE_DISABLED } from '@/lib/env';

type CacheEntry = { data: AnalyticsResultsAI; expires: number };

const MEMORY_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function safeResults(partial?: Partial<AnalyticsResults>): AnalyticsResultsAI {
  const base: AnalyticsResults = {
    patterns: [],
    correlations: [],
    environmentalCorrelations: [],
    predictiveInsights: [],
    anomalies: [],
    insights: [],
    suggestedInterventions: [],
    ...partial,
  } as AnalyticsResults;
  return base as AnalyticsResultsAI;
}

export class LLMAnalysisEngine implements AnalysisEngine {
  private heuristic = new HeuristicAnalysisEngine();

  // Map student grade strings to evidence grade bands
  private detectGradeBand(grade?: string | null): GradeBand | undefined {
    if (!grade) return undefined;
    const g = String(grade).trim().toLowerCase();
    if (g === 'k' || g === 'kg' || g === 'kindergarten') return GradeBand.K3;
    const num = parseInt(g.replace(/[^0-9]/g, '') || 'NaN', 10);
    if (!Number.isFinite(num)) return undefined;
    if (num >= 0 && num <= 3) return GradeBand.K3;
    if (num >= 4 && num <= 6) return GradeBand.FourSix;
    if (num >= 7 && num <= 9) return GradeBand.SevenNine;
    if (num >= 10 && num <= 12) return GradeBand.TenTwelve;
    return GradeBand.Adult;
  }

  // Infer domains from goals via category mapping
  private inferDomainsFromGoals(goals: Goal[]): DomainTag[] {
    const tags = new Set<DomainTag>();
    for (const g of goals || []) {
      for (const t of mapCategoryToTags(g.category)) tags.add(t);
    }
    return Array.from(tags);
  }

  // Infer domains from pattern/correlation descriptions
  private inferDomainsFromTextBlocks(texts: string[]): DomainTag[] {
    const tags = new Set<DomainTag>();
    for (const t of texts) {
      for (const tag of inferTagsFromText(t)) tags.add(tag);
    }
    return Array.from(tags);
  }

  private buildDomainContext(
    goals: Goal[],
    patterns: Pattern[] | undefined,
    correlations: Correlation[] | undefined,
    studentGrade?: string | null
  ): { tags: DomainTag[]; category?: string; text?: string; gradeBand?: GradeBand; weights?: Map<DomainTag, number> } {
    const patternTexts = (patterns || []).map((p) => p.description || '').filter(Boolean);
    const corrTexts = (correlations || []).map((c) => c.description || '').filter(Boolean);

    // Weighted domain inference
    const scores = new Map<DomainTag, number>();
    const bump = (t: DomainTag, w: number) => scores.set(t, (scores.get(t) ?? 0) + w);

    // Goals (high weight)
    for (const g of goals || []) for (const t of mapCategoryToTags(g.category)) bump(t as DomainTag, 0.6);

    // Pattern texts (medium)
    for (const s of patternTexts) for (const t of inferTagsFromText(s)) bump(t as DomainTag, 0.3);

    // Correlation texts (low)
    for (const s of corrTexts) for (const t of inferTagsFromText(s)) bump(t as DomainTag, 0.1);

    const rankedEntries = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
    const rankedTags = rankedEntries.map(([t]) => t);

    const category = goals[0]?.category; // simple heuristic: first active goal
    const text = [...patternTexts, ...corrTexts].join(' ').slice(0, 2000);
    const gradeBand = this.detectGradeBand(studentGrade);
    // Provide weights to downstream selection; also keep tags ordered by importance.
    const weights = new Map<DomainTag, number>(rankedEntries);
    return { tags: rankedTags, category, text, gradeBand, weights };
  }

  private async resolveEvidenceContext(
    studentId: string,
    timeframe: TimeRange | undefined,
    goals: Goal[]
  ): Promise<EvidenceSource[] | undefined> {
    if (AI_EVIDENCE_DISABLED) return undefined;

    try {
      let patterns: Pattern[] | undefined;
      let correlations: Correlation[] | undefined;

      try {
        const heurPreview = await this.heuristic.analyzeStudent(studentId, timeframe, { bypassCache: false });
        patterns = (heurPreview as any)?.patterns || [];
        correlations = (heurPreview as any)?.correlations || [];
      } catch (error) {
        try {
          logger.warn('[LLMAnalysisEngine] heuristic preview for evidence failed', { error: error instanceof Error ? error.message : String(error) });
        } catch {
          /* noop */
        }
      }

      const student = dataStorage.getStudentById(studentId);
      const domainCtx = this.buildDomainContext(goals, patterns, correlations, student?.grade);
      if (!domainCtx.tags.length && !domainCtx.text && !domainCtx.category) return undefined;

      const selectionOpts = {
        gradeBand: domainCtx.gradeBand,
        category: domainCtx.category,
        text: domainCtx.text,
        enforceDiversity: true,
      } as const;

      if (domainCtx.weights && domainCtx.weights.size > 0) {
        try {
          const weighted = Array.from(domainCtx.weights.entries()).map(([tag, weight]) => ({ tag, weight }));
          return await selectEvidenceWeighted(weighted, 5, selectionOpts);
        } catch (error) {
          try {
            logger.warn('[LLMAnalysisEngine] weighted evidence selection failed; falling back', { error: error instanceof Error ? error.message : String(error) });
          } catch {
            /* noop */
          }
        }
      }

      if (domainCtx.tags.length > 0) {
        const topTags = domainCtx.tags.slice(0, 5);
        return await selectEvidence(topTags, 5, selectionOpts);
      }

      return undefined;
    } catch (error) {
      try {
        logger.warn('[LLMAnalysisEngine] evidence selection failed; proceeding without evidence', { error: error instanceof Error ? error.message : String(error) });
      } catch {
        /* noop */
      }
      return undefined;
    }
  }

  async analyzeStudent(
    studentId: string,
    timeframe?: TimeRange,
    options?: AnalysisOptions
  ): Promise<AnalyticsResultsAI> {
    if (!studentId || typeof studentId !== 'string') {
      logger.error('[LLMAnalysisEngine] analyzeStudent: invalid studentId', { studentId });
      return safeResults({ error: 'INVALID_STUDENT_ID' });
    }

    const aiCfg = loadAiConfig();
    if (!aiCfg.enabled) {
      const heur = await this.heuristic.analyzeStudent(studentId, timeframe, options);
      return heur;
    }

    // Hoist variables for catch block access
    let entriesAll: TrackingEntry[] = [];
    let goals: Goal[] = [];
    let entries: TrackingEntry[] = [];
    let emotions: EmotionEntry[] = [];
    let sensoryInputs: SensoryEntry[] = [];
    let lineage: any;

    try {
      const key = createCacheKey(studentId, timeframe, { includeAiMetadata: options?.includeAiMetadata, aiProfile: options?.aiProfile });
      const now = Date.now();
      const found = cache.get(key);
      if (!options?.bypassCache && found && found.expires > now) {
        // Return a shallow copy with a cache hint in metadata
        const cached = JSON.parse(JSON.stringify(found.data)) as AnalyticsResultsAI;
        if (cached.ai) {
          cached.ai.caveats = Array.from(new Set([...(cached.ai.caveats || []), 'Resultater hentet fra cache']));
          cached.ai.usage = { ...(cached.ai.usage || {}), cacheReadTokens: (cached.ai.usage?.cacheReadTokens ?? 0) + 1 };
        }
        return cached;
      }

      entriesAll = dataStorage.getEntriesForStudent(studentId) || [];
      goals = dataStorage.getGoalsForStudent(studentId) || [];

      const start = toDate(timeframe?.start);
      const end = toDate(timeframe?.end);

      entries = (start || end)
        ? entriesAll.filter((e) => withinRange(e.timestamp, start, end))
        : entriesAll;

      emotions = (start || end)
        ? entries.flatMap((e) => e.emotions || [])
        : entriesAll.flatMap((e) => e.emotions || []);

      sensoryInputs = (start || end)
        ? entries.flatMap((e) => e.sensoryInputs || [])
        : entriesAll.flatMap((e) => e.sensoryInputs || []);

      const insufficient = entries.length === 0 && emotions.length === 0 && sensoryInputs.length === 0;
      if (insufficient) {
        lineage = buildDataLineage({ entries, emotions, sensoryInputs, goals }, timeframe);
        const heur = await this.heuristic.analyzeStudent(studentId, timeframe, options);
        const aiMeta = options?.includeAiMetadata ? {
          provider: 'heuristic',
          model: 'insufficient-data',
          createdAt: new Date().toISOString(),
          dataLineage: lineage,
          caveats: ['Insufficient data for AI analysis; heuristic engine used'],
          confidence: computeAiConfidence({ entries, emotions, sensoryInputs, goals }, false, true),
        } : undefined;
        return { ...(heur as AnalyticsResults), ai: aiMeta } as AnalyticsResultsAI;
      }

      const overallStart = start || entries[entries.length - 1]?.timestamp || emotions[emotions.length - 1]?.timestamp || sensoryInputs[sensoryInputs.length - 1]?.timestamp;
      const overallEnd = end || entries[0]?.timestamp || emotions[0]?.timestamp || sensoryInputs[0]?.timestamp || new Date();

      // Decide strategy: single-pass vs map-reduce
      const days = (() => {
        try { return Math.max(1, Math.round(((overallEnd as Date).getTime() - (overallStart as Date).getTime()) / (1000*60*60*24))); } catch { return 1; }
      })();
      const tooManyRecords = (entries.length + emotions.length + sensoryInputs.length) > 375; // conservative limit for local models
      const longHorizon = days > 60;
      const useMapReduce = longHorizon || tooManyRecords;

      const evidenceContext = await this.resolveEvidenceContext(studentId, timeframe, goals);
      const mapReduceOptions = { evidence: evidenceContext, aiProfile: options?.aiProfile } as const;

      let validated: any;
      let usedFallback = false;
      let repaired = false;
      let caveats: string[] = [];

      if (useMapReduce && start && end) {
        lineage = buildDataLineage({ entries, emotions, sensoryInputs, goals }, timeframe);
        const overallRange = { start, end, timezone: timeframe?.timezone } as any;
        const mergedReport = await analyzeLargePeriod(entries, emotions, sensoryInputs, goals, overallRange, mapReduceOptions);
        if (mergedReport) {
          validated = { ok: true, report: mergedReport, repaired: false, caveats: ['Map‑reduce pipeline benyttet for langt tidsrom'] };
        } else {
          // fall through to single pass if map-reduce failed
        }
      }

      if (!validated) {
        const limited = {
          entries: limitForPrompt(entries),
          emotions: limitForPrompt(emotions),
          sensoryInputs: limitForPrompt(sensoryInputs),
          goals,
        };

        lineage = buildDataLineage({ entries, emotions, sensoryInputs, goals }, timeframe);
        const { system, user } = generateAnalysisPrompt({ ...limited, timeframe }, evidenceContext, options?.aiProfile ?? 'default');
        const { data: raw, response } = await openRouterClient.chatJSON(
          { system, user },
          {
            modelName: aiCfg.modelName,
            temperature: aiCfg.temperature,
            maxTokens: aiCfg.maxTokens,
            topP: aiCfg.topP,
            timeoutMs: aiCfg.timeoutMs,
            baseUrl: aiCfg.baseUrl,
            apiKey: (aiCfg as any).apiKey,
            localOnly: (aiCfg as any).localOnly,
            ensureJson: true,
          }
        );
        validated = validateOrRepairAiReport(raw);
        if (!validated.ok) {
          const heur = await this.heuristic.analyzeStudent(studentId, timeframe, options);
          usedFallback = true;
          const baseMeta: Partial<AiMetadata> = {
            provider: 'openrouter',
            model: response.raw?.model || aiCfg.modelName,
            createdAt: new Date().toISOString(),
            latencyMs: response.metrics.durationMs,
            usage: {
              promptTokens: response.usage?.prompt_tokens,
              completionTokens: response.usage?.completion_tokens,
              totalTokens: response.usage?.total_tokens,
            },
            dataLineage: lineage,
            caveats: ['AI output invalid; heuristic fallback used'],
          };
          const conf = computeAiConfidence({ entries, emotions, sensoryInputs, goals }, false, usedFallback);
          baseMeta.confidence = conf;
          const fallback = { ...(heur as AnalyticsResults), ai: baseMeta } as AnalyticsResultsAI;
          cache.set(key, { data: fallback, expires: now + MEMORY_TTL_MS });
          return fallback;
        }
      }
      repaired = validated.repaired;
      caveats = validated.caveats || [];

      const meta: Partial<AiMetadata> = {
        provider: 'openrouter',
        model: aiCfg.modelName,
        createdAt: new Date().toISOString(),
        dataLineage: lineage,
        caveats,
      };
      const conf = computeAiConfidence({ entries, emotions, sensoryInputs, goals }, repaired, usedFallback);
      meta.confidence = conf;

      const aiResults = mapAiToAnalyticsResults(validated.report, meta);

      const merged = aiResults;

      // Annotate cache write intent
      if (merged.ai) merged.ai.usage = { ...(merged.ai.usage || {}), cacheWriteTokens: (merged.ai.usage?.cacheWriteTokens ?? 0) + 1 };
      cache.set(key, { data: merged, expires: now + MEMORY_TTL_MS });
      return merged;
    } catch (error) {
      logger.error('[LLMAnalysisEngine] analyzeStudent failed', { error: error instanceof Error ? { message: error.message, stack: error.stack, name: error.name } : error, studentId });
      try {
        const heur = await this.heuristic.analyzeStudent(studentId, timeframe, options);
        if (options?.includeAiMetadata) {
          // Ensure lineage is computed if not already done
          if (!lineage) {
            lineage = buildDataLineage({ entries, emotions, sensoryInputs, goals }, timeframe);
          }
          const aiMeta: AiMetadata = {
            provider: 'openrouter',
            model: aiCfg.modelName,
            createdAt: new Date().toISOString(),
            dataLineage: lineage,
            caveats: ['AI request failed; heuristic fallback used'],
            confidence: computeAiConfidence({ entries, emotions, sensoryInputs, goals }, false, true),
          };
          return { ...(heur as AnalyticsResults), ai: aiMeta } as AnalyticsResultsAI;
        }
        return heur;
      } catch {
        return safeResults({ error: 'LLM_ENGINE_ERROR' });
      }
    }
  }
}

export default LLMAnalysisEngine;
