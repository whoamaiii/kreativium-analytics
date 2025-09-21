import React, { memo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Eye, BarChart3, Clock, Info, TrendingUp } from 'lucide-react';
import { useAnalyticsWorker } from '@/hooks/useAnalyticsWorker';
import { TrackingEntry, EmotionEntry, SensoryEntry, Student } from '@/types/student';
import { PatternResult } from '@/lib/patternAnalysis';
import { generateInsightsStructured } from '@/lib/insights';
import { stableKeyFromPattern } from '@/lib/key';
import { useTranslation } from '@/hooks/useTranslation';
import { hashOfString } from '@/lib/key';
import { openRouterClient } from '@/lib/ai/openrouterClient';
import { buildEvidenceForPattern, computeAllowedContexts, sanitizePlainNorwegian } from '@/lib/evidence/evidenceBuilder';
import { loadAiConfig } from '@/lib/aiConfig';
import { validateAIResponse } from '@/lib/evidence/validation';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { ExplanationDock } from './ExplanationDock';
import { ExplanationSheet } from './ExplanationSheet';
import type { SourceItem } from '@/types/analytics';
import { ResizableSplitLayout } from '@/components/layouts/ResizableSplitLayout';
import { analyticsConfig } from '@/lib/analyticsConfig';
import { useSyncedPatternParams } from '@/hooks/useSyncedPatternParams';

export interface PatternsPanelProps {
  filteredData: {
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
  };
  useAI?: boolean;
  student?: Student;
}

const getPatternIcon = (type: string): React.ReactElement => {
  switch (type) {
    case 'emotion':
      return <Brain className="h-4 w-4" />;
    case 'sensory':
      return <Eye className="h-4 w-4" />;
    case 'environmental':
      return <BarChart3 className="h-4 w-4" />;
    default:
      return <TrendingUp className="h-4 w-4" />;
  }
};

const getConfidenceColor = (confidence: number): string => {
  if (confidence > 0.7) return 'text-green-600';
  if (confidence > 0.4) return 'text-yellow-600';
  return 'text-orange-600';
};

export const PatternsPanel = memo(function PatternsPanel({ filteredData, useAI = false, student }: PatternsPanelProps): React.ReactElement {
  const { results, isAnalyzing, error, runAnalysis } = useAnalyticsWorker({ precomputeOnIdle: false });
  const { tAnalytics } = useTranslation();
  const [explanations, setExplanations] = React.useState<Record<string, { status: 'idle' | 'loading' | 'ok' | 'error'; text?: string; error?: string }>>({});
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = React.useState<string>('');
  const [isSheetOpen, setIsSheetOpen] = React.useState<boolean>(false);
  const dockRef = React.useRef<HTMLDivElement>(null);
  const { patternId, explain, setPatternId, setExplain, clearPatternParams } = useSyncedPatternParams();

  // Track viewport to decide dock vs sheet
  const [isSmallViewport, setIsSmallViewport] = React.useState<boolean>(false);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 1023px)');
    const onChange = () => setIsSmallViewport(mq.matches);
    onChange();
    // Support older Safari
    if (mq.addEventListener) mq.addEventListener('change', onChange); else mq.addListener(onChange);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', onChange); else mq.removeListener(onChange); };
  }, []);
  // Determine AI availability (guard explanation feature when key is missing)
  const aiConfig = loadAiConfig();
  const aiKeyPresent = React.useMemo(() => {
    if (aiConfig?.apiKey && String(aiConfig.apiKey).trim().length > 0) return true;
    try {
      const ls = (typeof localStorage !== 'undefined')
        ? ((localStorage.getItem('OPENROUTER_API_KEY') || localStorage.getItem('VITE_OPENROUTER_API_KEY') || '').trim())
        : '';
      return ls.length > 0;
    } catch {
      return false;
    }
  }, [aiConfig?.apiKey]);

  useEffect(() => {
    runAnalysis(filteredData, { useAI, student });
    return () => {
      // ensure worker side effects are cleaned by the hook on unmount
    };
  }, [filteredData, runAnalysis, useAI, student]);

  const patterns: PatternResult[] = results?.patterns || [];
  const structured = generateInsightsStructured(
    {
      patterns: results?.patterns || [],
      correlations: (results as any)?.correlations || [],
      predictiveInsights: (results as any)?.predictiveInsights || [],
    },
    filteredData.emotions,
    filteredData.entries
  );

  const explainKey = (p: PatternResult) => stableKeyFromPattern(p);

  const buildPrompt = (p: PatternResult) => {
    const total = filteredData.entries?.length || 0;
    const pct = p.dataPoints > 0 ? Math.round((p.frequency / Math.max(1, p.dataPoints)) * 100) : undefined;
    const recs = Array.isArray(p.recommendations) && p.recommendations.length > 0 ? `\nExisting recommendations: ${p.recommendations.join('; ')}` : '';
    const studentName = student?.name || 'studenten';
    return [
      `Du er en hjelpelærer som forklarer mønstre tydelig for foresatte og lærere.`,
      `Viktige føringer: Svar alltid på norsk (bokmål). Ikke bruk Markdown eller annen formatering (ingen **, *, #, kodeblokker). Svar som ren tekst.`,
      `Bruk korte setninger og en enkel punktliste med bindestrek (-) der det passer.`,
      `Oppgave: Forklar kort hva dette mønsteret betyr for ${studentName}, hvorfor det kan oppstå, og foreslå 2–3 konkrete tiltak.`,
      `Unngå kliniske diagnoser. Skriv vennlig, konkret og uten teknisk sjargong.`,
      `Mønster: ${p.pattern} (type: ${p.type})`,
      `Beskrivelse: ${p.description}`,
      typeof pct === 'number' ? `Andel nylige økter: ${pct}% (data: ${p.frequency}/${p.dataPoints}, tidsrom: ${p.timeframe})` : `Datapunkter: ${p.dataPoints} (tidsrom: ${p.timeframe})`,
      recs,
      total ? `Totalt antall økter i utvalget: ${total}.` : '',
      `Format:`,
      `- Kort forklaring (1–2 setninger)`,
      `- Mulige årsaker (punkter)`,
      `- Forslag til tiltak (punkter)`
    ].filter(Boolean).join('\n');
  };

  const requestExplanation = async (p: PatternResult) => {
    const key = explainKey(p);
    setExplanations((prev) => ({ ...prev, [key]: { status: 'loading' } }));
    try {
      // Guard: if no API key is present, short-circuit with a friendly message
      if (!aiKeyPresent) {
        try { logger.warn('[PatternsPanel] AI explanation unavailable: missing API key'); } catch {}
        setExplanations((prev) => ({
          ...prev,
          [key]: { status: 'error', error: String(tAnalytics('ai.toggle.unavailable', { defaultValue: 'AI er ikke tilgjengelig (mangler API-nøkkel).' })) },
        }));
        return;
      }
      const evidence = buildEvidenceForPattern({
        entries: filteredData.entries as any,
        emotions: filteredData.emotions as any,
        sensoryInputs: filteredData.sensoryInputs as any,
      });
      const allowed = computeAllowedContexts({
        entries: filteredData.entries as any,
        emotions: filteredData.emotions as any,
        sensoryInputs: filteredData.sensoryInputs as any,
      });
      const prompt = [
        buildPrompt(p),
        '',
        'Tillatte kontekster (bruk bare disse hvis relevant):',
        `Steder: ${allowed.places.length ? allowed.places.join(', ') : 'ikke logget'}`,
        `Aktiviteter: ${allowed.activities.length ? allowed.activities.join(', ') : 'ikke logget'}`,
        `Triggere: ${allowed.triggers.length ? allowed.triggers.join(', ') : 'ikke logget'}`,
        '',
        'Eksempler (referer til dem med ID):',
        ...evidence.map(e => `- [${e.id}] ${e.timestamp} · ${e.description}`),
        '',
        'Regler:',
        '- Ikke nevne sted/aktivitet/årsak som ikke finnes i listen over.',
        '- Bruk ID-er fra eksempler når du viser til konkrete hendelser.',
      ].join('\n');
      const aiCfg = loadAiConfig();
      // Use centralized validation
      const { data } = await openRouterClient.chatJSON([
        { role: 'system', content: 'Du svarer alltid på norsk (bokmål). Ingen Markdown eller stjerner; ren tekst. Bruk kun fakta fra evidence og tillatte kontekster. Referer til eksempler via ID der det passer.' },
        { role: 'user', content: `${prompt}\n\nReturner JSON i formatet: { summary, causes[], interventions[], examples[] } hvor examples bruker id-ene over.` },
      ], { 
        modelName: aiCfg.modelName, 
        baseUrl: aiCfg.baseUrl, 
        temperature: 0.2, 
        maxTokens: 550, 
        localOnly: (aiCfg as any).localOnly, 
        ensureJson: true, 
        refine: (val: unknown) => validateAIResponse(val) 
      });

      // Human-friendly example rendering (map IDs to names based on evidence)
      const friendlyExamples = (data.examples || []).map((ex: any) => {
        const ev = evidence.find((e) => e.id === ex.id);
        if (!ev) {
          return ex.whyRelevant ? `- ${ex.whyRelevant}` : '';
        }
        let name = '';
        try {
          const ts = new Date(ev.timestamp).toISOString().replace('T', ' ').slice(0, 16);
          if (ev.kind === 'tracking') {
            // Prefer first part before separator as short name
            const base = (ev.description || '').split('·')[0].trim();
            name = base || 'Registrering';
            return `- ${name} (${ts})${ex.whyRelevant ? ' – ' + ex.whyRelevant : ''}`;
          }
          if (ev.kind === 'emotion') {
            const m = (ev.description || '').match(/^(.+?)\s+intensitet\s+(\d+)/i);
            name = m ? `Følelse: ${m[1]} (${m[2]})` : `Følelse`;
            return `- ${name} (${ts})${ex.whyRelevant ? ' – ' + ex.whyRelevant : ''}`;
          }
          if (ev.kind === 'sensory') {
            name = `Sensorikk: ${ev.description}`;
            return `- ${name} (${ts})${ex.whyRelevant ? ' – ' + ex.whyRelevant : ''}`;
          }
        } catch {}
        return ex.whyRelevant ? `- ${ex.whyRelevant}` : '';
      }).filter(Boolean);

      const render = [
        data.summary,
        '',
        data.causes?.length ? 'Mulige årsaker:' : '',
        ...(data.causes || []).map((c: any) => `- ${c.text}`),
        data.interventions?.length ? '\nForslag til tiltak:' : '',
        ...(data.interventions || []).map((i: any) => `- ${i.text}`),
        friendlyExamples.length ? '\nEksempler:' : '',
        ...friendlyExamples,
      ].filter(Boolean).join('\n');

      const cleaned = sanitizePlainNorwegian(render, allowed);
      setExplanations((prev) => ({ ...prev, [key]: { status: 'ok', text: cleaned } }));
    } catch (e) {
      // Non-fatal: explanation may fail; try a plain-text fallback, then show nice error
      try { logger.warn('[PatternsPanel] explanation request failed', e as Error); } catch {}
      try {
        const aiCfg = loadAiConfig();
        const fallbackPrompt = [
          buildPrompt(p),
          '',
          'Returner kun ren tekst uten Markdown. Lag korte punkter. Inkluder 2–3 konkrete tiltak og 2–3 korte eksempler (med enkle, menneskelige navn – ikke tekniske ID-er).',
        ].join('\n');
        const { content } = await openRouterClient.chat([
          { role: 'system', content: 'Svar på norsk (bokmål). Ingen Markdown – kun ren tekst. Hold det kort og bruk enkle navn på eksempler.' },
          { role: 'user', content: fallbackPrompt },
        ], { modelName: aiCfg.modelName, baseUrl: aiCfg.baseUrl, temperature: 0.2, maxTokens: 550 }, { suppressToasts: true });
        const cleaned = sanitizePlainNorwegian(String(content), computeAllowedContexts({
          entries: filteredData.entries as any,
          emotions: filteredData.emotions as any,
          sensoryInputs: filteredData.sensoryInputs as any,
        }));
        setExplanations((prev) => ({ ...prev, [key]: { status: 'ok', text: cleaned } }));
        return;
      } catch (fallbackErr) {
        try { logger.warn('[PatternsPanel] fallback explanation also failed', fallbackErr as Error); } catch {}
        const anyErr = e as any;
        const errMsg = typeof anyErr?.userMessage === 'string' && anyErr.userMessage.trim().length > 0
          ? anyErr.userMessage
          : (typeof anyErr?.message === 'string' && anyErr.message.trim().length > 0
            ? anyErr.message
            : 'Klarte ikke hente forklaring. Prøv igjen.');
        setExplanations((prev) => ({ ...prev, [key]: { status: 'error', error: errMsg } }));
      }
    }
  };

  const handleExplainClick = (p: PatternResult) => {
    const key = explainKey(p);
    setSelectedKey(key);
    setSelectedTitle(String((p as any).pattern ?? (p as any).name ?? 'Mønster'));
    // Sync URL params for deep-linking
    try {
      setPatternId(key);
      setExplain(true);
    } catch {}
    const st = explanations[key]?.status;
    if (!st || st === 'idle') {
      void requestExplanation(p);
    }
    // Desktop: scroll dock into view; Mobile: open sheet
    if (isSmallViewport) {
      setIsSheetOpen(true);
    } else {
      try { dockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch {}
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Kopiert til utklippstavlen');
    } catch {
      toast.error('Kunne ikke kopiere');
    }
  };

  const handleAddToReport = (text: string) => {
    // Placeholder for integration with report builder
    try { toast.info('Lagt til i rapportutkast'); } catch {}
  };

  const current = selectedKey ? explanations[selectedKey] : undefined;
  const currentStatus: 'idle' | 'loading' | 'ok' | 'error' = current?.status || 'idle';
  const currentText: string | undefined = current?.text;
  const currentError: string | undefined = current?.error;

  // Simple per-pattern chat storage (in-memory for the session)
  const [chatByKey, setChatByKey] = React.useState<Record<string, { role: 'user' | 'assistant' | 'system'; content: string }[]>>({});
  const chatMessages = selectedKey ? (chatByKey[selectedKey] || []) : [];
  const updateChat = React.useCallback((msgs: { role: 'user' | 'assistant' | 'system'; content: string }[]) => {
    setChatByKey((prev) => {
      const key = selectedKey;
      if (!key) return prev;
      if (prev[key] === msgs) return prev; // avoid unnecessary state churn
      return { ...prev, [key]: msgs.slice(-20) };
    });
  }, [selectedKey]);

  // Build compact, grounded system prompt for the chat
  const buildSystemPrompt = React.useCallback((): string => {
    const total = filteredData.entries?.length || 0;
    const allEntries = filteredData.entries || [];
    const recent = allEntries.slice(-40);
    const allEmotions = filteredData.emotions || [];
    const emotions = allEmotions.slice(-160);
    const allSensory = filteredData.sensoryInputs || [];
    const sensory = allSensory.slice(-160);

    // Basic compactors
    const fmtEntry = (e: any) => `${e.timestamp || e.time || ''} · ${e.activity || e.title || 'økt'}${e.note ? ` · ${String(e.note).slice(0, 80)}` : ''}`.trim();
    const fmtEmotion = (e: any) => `${e.type || e.emotion}:${e.intensity ?? e.value ?? ''}@${e.timestamp || ''}`;
    const fmtSensory = (s: any) => `${s.type || s.kind}:${s.level ?? ''}@${s.timestamp || ''}`;

    const evidence = buildEvidenceForPattern({
      entries: filteredData.entries as any,
      emotions: filteredData.emotions as any,
      sensoryInputs: filteredData.sensoryInputs as any,
      limit: 40,
    });
    const allowed = computeAllowedContexts({
      entries: filteredData.entries as any,
      emotions: filteredData.emotions as any,
      sensoryInputs: filteredData.sensoryInputs as any,
    });

    // Heuristic tagging for social-related examples, to help the AI answer
    const socialRe = /(sosial|sosiale|venn|venner|kompis|klasse|klasserom|gruppe|grupp(e|eoppgave)?|team|pararbeid|friminutt|pause|lunsj|frokost|middag|kveld(s)?stell|morgen(s)?rutine|morgenstell|morgenrutine|kantine|ute|inne|hjemme|avlast|interaksj|samarbeid|samspill|konflikt|lek|leke|presentasjon|diskusjon|overgang(er)?|medelever|familie|besøk)/i;
    const socialExamplesFromEvidence = evidence.filter((e) => socialRe.test(String(e.description)));
    // Scan the full timeline (not only evidence) for social contexts in structured fields and notes
    const socialFromTimeline = allEntries
      .map((t) => ({
        id: `tracking:${t.id}`,
        ts: t.timestamp,
        act: t.environmentalData?.classroom?.activity?.toString() || '',
        loc: t.environmentalData?.location || '',
        note: t.notes || t.generalNotes || '',
      }))
      .filter((x) => socialRe.test(`${x.act} ${x.loc} ${x.note}`))
      .slice(-60)
      .map((x) => {
        const ts = new Date(x.ts).toISOString().replace('T', ' ').slice(0, 16);
        const label = `${x.act || x.loc || 'sosial kontekst'}`;
        return `- ${label} (${ts})${x.note ? ' – ' + x.note : ''}`;
      });
    const socialExamples = [
      ...socialExamplesFromEvidence.map((e) => {
        const ts = new Date(e.timestamp).toISOString().replace('T', ' ').slice(0, 16);
        return `- ${e.description} (${ts})`;
      }),
      ...socialFromTimeline,
    ].slice(0, 60);

    // Global aggregates across the entire dataset (not just recent)
    const agg = (arr: (string | undefined)[]) => {
      const counts = new Map<string, number>();
      for (const v of arr) {
        const k = (v || '').toString().trim().toLowerCase();
        if (!k) continue; counts.set(k, (counts.get(k) || 0) + 1);
      }
      return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, c]) => `${k} (${c})`);
    };
    const topActivities = agg(allEntries.map((e) => e.environmentalData?.classroom?.activity?.toString()));
    const topPlaces = agg([ ...allEntries.map((e) => e.environmentalData?.location), ...allSensory.map((s) => s.location) ]);
    const topTriggers = agg(allEmotions.flatMap((em) => (em.triggers || []) as string[]));

    // Timespan summary across all data
    const times = allEntries.map(e => e.timestamp.getTime());
    const spanDays = times.length > 1 ? Math.max(1, Math.round((Math.max(...times) - Math.min(...times)) / (1000*60*60*24))) : 0;

    // Summaries of detected patterns/correlations (when available)
    const detectedPatterns = (results?.patterns || []).slice(0, 8).map((p: any) => {
      const name = (p.pattern || p.name || '').toString();
      const pct = typeof p.confidence === 'number' ? `${Math.round(p.confidence * 100)}%` : '';
      const freq = typeof p.frequency === 'number' && typeof p.dataPoints === 'number' ? `${p.frequency}/${p.dataPoints}` : '';
      return `- ${name}${pct ? ` (${pct})` : ''}${freq ? ` · ${freq}` : ''}`;
    });
    const correlations = (results as any)?.correlations as Array<{ factor1: string; factor2: string; correlation?: number }> | undefined;
    const correlationSummary = Array.isArray(correlations)
      ? correlations.slice(0, 8).map((c) => `- ${c.factor1} <-> ${c.factor2}${typeof c.correlation === 'number' ? ` (r=${c.correlation.toFixed(2)})` : ''}`)
      : [];

    const summary = [
      'Du svarer alltid på norsk (bokmål). Ingen Markdown; ren tekst.',
      'Svar må være konkrete og korte, med punktliste når det passer.',
      'Bruk bare fakta fra konteksten under. Hvis informasjon mangler, skriv først én setning som forklarer hva som mangler og foreslå hva brukeren kan gjøre for å få et bedre svar. Deretter svarer du på det som KAN besvares fra konteksten. Svar ALDRI kun med ordet "ukjent".',
      'Når brukeren spør om sosiale triggere:',
      '- Start med å sjekke listen "Sosiale eksempler" (under) og oppgi topp 3 relevante ID-er.',
      '- Hvis listen er tom, søk i "Eksempler" etter ord som gruppe, friminutt, diskusjon, presentasjon, samarbeid, konflikt, venner, klasse.',
      '- Hvis du fortsatt ikke finner klare eksempler, foreslå konkrete datapunkter/tidsstempler fra "Siste økter" eller "Emosjoner" som sannsynlige kandidater og forklar hvorfor, slik at brukeren kan verifisere dem.',
      'Ikke skriv tekniske ID-er (som [tracking:...]). Gi eksemplene korte navn basert på sted/aktivitet og tidspunkt (f.eks. "Friminutt i kantina 12:15").',
      '',
      `Utvalg: ${total} økter totalt (tidsrom: ${spanDays} dager). Viser de siste ${recent.length} i detalj nedenfor.`,
      '',
      currentText ? `Forklaring (sammendrag):\n${currentText}` : 'Forklaring: ukjent',
      '',
      detectedPatterns.length ? 'Mønstre oppdaget:' : '',
      ...detectedPatterns,
      detectedPatterns.length ? '' : '',
      correlationSummary.length ? 'Korrelasjoner (topp):' : '',
      ...correlationSummary,
      correlationSummary.length ? '' : '',
      'Kontekst (hele datasettet):',
      topPlaces.length ? `Steder (topp): ${topPlaces.join(', ')}` : '',
      topActivities.length ? `Aktiviteter (topp): ${topActivities.join(', ')}` : '',
      topTriggers.length ? `Triggere (topp): ${topTriggers.join(', ')}` : '',
      '',
      'Tillatte kontekster:',
      `Tillatte kontekster:`,
      `Steder: ${(allowed.places || []).join(', ') || 'ikke logget'}`,
      `Aktiviteter: ${(allowed.activities || []).join(', ') || 'ikke logget'}`,
      `Triggere: ${(allowed.triggers || []).join(', ') || 'ikke logget'}`,
      '',
      'Eksempler (ID og beskrivelse):',
      ...evidence.slice(0, 40).map((e) => `- [${e.id}] ${e.timestamp} · ${e.description}`),
      '',
      socialExamples.length ? 'Sosiale eksempler (fra hele datasettet):' : '',
      ...socialExamples.slice(0, 60),
      socialExamples.length ? '' : '',
      'Siste økter:',
      ...recent.map(fmtEntry).slice(0, 40),
      '',
      'Emosjoner (seneste):',
      ...emotions.map(fmtEmotion).slice(0, 60),
      '',
      'Sensorikk (seneste):',
      ...sensory.map(fmtSensory).slice(0, 60),
    ].join('\n');
    return summary;
  }, [filteredData.entries, filteredData.emotions, filteredData.sensoryInputs, currentText]);

  // Build lightweight sources list for transparency (top social examples)
  const sourcesList = React.useMemo(() => {
    try {
      const allEntries = filteredData.entries || [];
      const socialRe = /(sosial|sosiale|venn|venner|kompis|klasse|klasserom|gruppe|grupp(e|eoppgave)?|team|pararbeid|friminutt|pause|lunsj|frokost|middag|kveld(s)?stell|morgen(s)?rutine|morgenstell|morgenrutine|kantine|ute|inne|hjemme|avlast|interaksj|samarbeid|samspill|konflikt|lek|leke|presentasjon|diskusjon|overgang(er)?|medelever|familie|besøk)/i;
      return allEntries
        .filter((t) => socialRe.test(`${t.environmentalData?.classroom?.activity || ''} ${t.environmentalData?.location || ''} ${t.notes || t.generalNotes || ''}`))
        .slice(-10)
        .map((t) => {
          const ts = new Date(t.timestamp).toISOString().replace('T', ' ').slice(0, 16);
          const act = t.environmentalData?.classroom?.activity?.toString() || '';
          const loc = t.environmentalData?.location || '';
          const label = act || loc || 'sosial kontekst';
          const emo = (t.emotions || []).map((e) => `${e.emotion} (intensitet ${typeof e.intensity === 'number' ? e.intensity : '?'})`).join(', ');
          const sen = (t.sensoryInputs || []).map((s) => `${s.sensoryType || s.type}: ${s.response}${typeof s.intensity === 'number' ? ` (intensitet ${s.intensity})` : ''}`).join(', ');
          const happened = (t.notes || t.generalNotes || '').trim();
          const parts = [
            `${label} (${ts})`,
            happened ? `hendelse: ${happened}` : '',
            emo ? `følelser: ${emo}` : '',
            sen ? `sensorikk: ${sen}` : ''
          ].filter(Boolean);
          return parts.join(' · ');
        });
    } catch { return []; }
  }, [filteredData.entries]);

  // Build rich sources for clickable inspection and citations (top social examples)
  const sourcesRich: SourceItem[] = React.useMemo(() => {
    try {
      const entries = filteredData.entries || [];
      const socialRe = /(sosial|sosiale|venn|venner|kompis|klasse|klasserom|gruppe|grupp(e|eoppgave)?|team|pararbeid|friminutt|pause|lunsj|frokost|middag|kveld(s)?stell|morgen(s)?rutine|morgenstell|morgenrutine|kantine|ute|inne|hjemme|avlast|interaksj|samarbeid|samspill|konflikt|lek|leke|presentasjon|diskusjon|overgang(er)?|medelever|familie|besøk)/i;
      return entries
        .filter((t) => socialRe.test(`${t.environmentalData?.classroom?.activity || ''} ${t.environmentalData?.location || ''} ${t.notes || t.generalNotes || ''}`))
        .slice(-20)
        .map((t): SourceItem => ({
          id: `tracking:${t.id}`,
          timestamp: t.timestamp.toISOString(),
          activity: t.environmentalData?.classroom?.activity?.toString(),
          place: t.environmentalData?.location,
          socialContext: t.environmentalData?.socialContext,
          note: (t.notes || t.generalNotes || '').trim() || undefined,
          emotions: (t.emotions || []).map((e) => ({ id: e.id, emotion: e.emotion, intensity: e.intensity, notes: e.notes })),
          sensory: (t.sensoryInputs || []).map((s) => ({ id: s.id, type: s.sensoryType || s.type, response: s.response, intensity: s.intensity, notes: s.notes })),
          environment: t.environmentalData ? {
            lighting: t.environmentalData.roomConditions?.lighting,
            noiseLevel: t.environmentalData.roomConditions?.noiseLevel,
            temperature: t.environmentalData.roomConditions?.temperature,
            humidity: t.environmentalData.roomConditions?.humidity,
            weather: t.environmentalData.weather?.condition,
            timeOfDay: t.environmentalData.classroom?.timeOfDay,
            studentCount: t.environmentalData.classroom?.studentCount,
            notes: t.environmentalData.notes,
          } : undefined,
        }))
        .slice(-20);
    } catch { return []; }
  }, [filteredData.entries]);

  // Create S1..Sn mapping for the chat system prompt (labels only, no internal IDs)
  const citationsSeed: string[] = React.useMemo(() => {
    const top = sourcesRich.slice(-10);
    return top.map((s, idx) => {
      const n = idx + 1;
      let ts = '';
      try { ts = new Date(s.timestamp).toISOString().replace('T', ' ').slice(0, 16); } catch { ts = String(s.timestamp); }
      const label = s.activity || s.place || 'sosial kontekst';
      return `S${n}: ${label} ${ts}${s.note ? ` – ${s.note.slice(0, 80)}` : ''}`;
    });
  }, [sourcesRich]);

  const enableSplit = React.useMemo(() => {
    try { return !!analyticsConfig.getConfig().features?.explanationV2 && !isSmallViewport; } catch { return !isSmallViewport; }
  }, [isSmallViewport]);

  const leftContent = (
        <div className="space-y-4">
      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{String(tAnalytics('insights.patterns'))}</CardTitle>
          <Button variant="outline" onClick={() => runAnalysis(filteredData, { useAI, student })} disabled={isAnalyzing}>
            {isAnalyzing ? String(tAnalytics('states.analyzing')) : String(tAnalytics('actions.refreshAnalysis'))}
          </Button>
        </CardHeader>
        <CardContent>
          {isAnalyzing && (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 motion-safe:animate-spin opacity-50" />
              <p>{String(tAnalytics('states.analyzing'))}</p>
            </div>
          )}
          {!isAnalyzing && error && (
            <div className="text-center py-8 text-destructive">
              <p>{error}</p>
            </div>
          )}
          {!isAnalyzing && !error && patterns.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{String(tAnalytics('empty.noPatterns'))}</p>
              <p className="text-sm">{String(tAnalytics('insights.noPatterns'))}</p>
            </div>
          )}
          {!isAnalyzing && !error && patterns.length > 0 && (
            <div className="space-y-4">
            {patterns.map((pattern: PatternResult) => (
                <Card key={stableKeyFromPattern(pattern)} className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getPatternIcon(pattern.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-foreground">
                              {String((pattern as PatternResult & { pattern?: string; name?: string }).pattern ?? (pattern as PatternResult & { pattern?: string; name?: string }).name ?? 'Pattern')
                                .replace('-', ' ')
                                .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </h4>
                            <button
                              aria-label={String(tAnalytics('insights.explainPattern'))}
                              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] leading-none text-muted-foreground hover:bg-accent/40"
                              onClick={() => handleExplainClick(pattern)}
                              disabled={!aiKeyPresent}
                              title={!aiKeyPresent ? String(tAnalytics('ai.toggle.unavailable', { defaultValue: 'AI er ikke tilgjengelig (mangler API-nøkkel).' })) : undefined}
                            >
                              <Info className="h-3 w-3" />
                              {String(tAnalytics('insights.explainPattern'))}
                            </button>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {String((pattern as PatternResult & { description?: string }).description ?? '')}
                          </p>
                          {pattern.recommendations && (
                            <div className="mt-3">
                              <h5 className="text-sm font-medium mb-2">{String(tAnalytics('insights.recommendations'))}</h5>
                              <ul className="text-sm text-muted-foreground space-y-1">
{pattern.recommendations.map((rec) => (
                                  <li key={hashOfString(rec)} className="flex items-start gap-2">
                                    <span className="text-primary">•</span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={getConfidenceColor(pattern.confidence)}>
                          {String(tAnalytics('insights.confidencePercent', { percentage: Math.round(pattern.confidence * 100) }))}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {String(tAnalytics('confidence.calculation.dataPoints'))}: {pattern.dataPoints}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </div>
  );

  const rightContent = (
        <div className="h-full" ref={dockRef}>
          <ExplanationDock
            patternTitle={selectedTitle}
            status={currentStatus}
            text={currentText}
            error={currentError}
            onCopy={handleCopy}
            onAddToReport={handleAddToReport}
            aiEnabled={aiKeyPresent}
            systemPrompt={[
              buildSystemPrompt(),
              '',
              'Bruk kildehenvisninger [S1], [S2], ... når du refererer til konkrete eksempler. Henvis KUN til S-listen under. Ikke bruk tekniske ID-er.',
              citationsSeed.length ? 'Kildehenvisninger (S1..Sn):' : '',
              ...citationsSeed,
            ].filter(Boolean).join('\n')}
            chatMessages={chatMessages}
            onChatChange={updateChat}
            dataset={{ entries: filteredData.entries, emotions: filteredData.emotions, sensoryInputs: filteredData.sensoryInputs }}
            sourcesRich={sourcesRich}
            onClose={() => {
              try { clearPatternParams(); } catch {}
              setSelectedKey(null);
              setSelectedTitle('');
            }}
          />
        </div>
  );

  // Auto-select from URL when patterns are loaded and params present
  useEffect(() => {
    try {
      if (!explain || !patternId) return;
      const all = results?.patterns || [];
      if (!all.length) return;
      if (selectedKey === patternId) return;
      const match = all.find((p: PatternResult) => stableKeyFromPattern(p) === patternId);
      if (match) {
        // Inline open without re-writing identical URL params to avoid redundant writes
        const key = stableKeyFromPattern(match);
        setSelectedKey(key);
        setSelectedTitle(String((match as any).pattern ?? (match as any).name ?? 'Mønster'));
        const st = explanations[key]?.status;
        if (!st || st === 'idle') {
          void requestExplanation(match);
        }
        if (isSmallViewport) setIsSheetOpen(true);
      } else {
        // If patterns are loaded and no match, optionally clear params or show a light toast
        try {
          toast.message(String(tAnalytics('insights.patternNotFound', { defaultValue: 'Mønster ikke funnet for dette utvalget.' })));
        } catch {}
        try { clearPatternParams(); } catch {}
      }
    } catch {}
  }, [results?.patterns, explain, patternId, selectedKey, isSmallViewport, explanations]);

  return (
    <>
      {enableSplit ? (
        <ResizableSplitLayout
          storageKey={`split:${student?.id || 'unknown'}`}
          left={leftContent}
          right={rightContent}
          className="lg:gap-4"
        />
      ) : (
        <div className="lg:grid lg:grid-cols-[1fr_minmax(380px,520px)] 2xl:grid-cols-[1fr_minmax(420px,560px)] lg:gap-4">
          {leftContent}
          {/* Right column: persistent dock on large screens */}
          <div className="hidden lg:block sticky top-4 self-start" ref={dockRef}>
            <ExplanationDock
              patternTitle={selectedTitle}
              status={currentStatus}
              text={currentText}
              error={currentError}
              onCopy={handleCopy}
              onAddToReport={handleAddToReport}
              aiEnabled={aiKeyPresent}
              systemPrompt={[
                buildSystemPrompt(),
                '',
                'Bruk kildehenvisninger [S1], [S2], ... når du refererer til konkrete eksempler. Henvis KUN til S-listen under. Ikke bruk tekniske ID-er.',
                citationsSeed.length ? 'Kildehenvisninger (S1..Sn):' : '',
                ...citationsSeed,
              ].filter(Boolean).join('\n')}
              chatMessages={chatMessages}
              onChatChange={updateChat}
              dataset={{ entries: filteredData.entries, emotions: filteredData.emotions, sensoryInputs: filteredData.sensoryInputs }}
            sourcesRich={sourcesRich}
            onClose={() => {
              // The desktop dock is typically persistent; if closed, also clear URL params
              try { clearPatternParams(); } catch {}
              setSelectedKey(null);
              setSelectedTitle('');
            }}
            />
          </div>
        </div>
      )}

      {/* Mobile sheet */}
      <ExplanationSheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) {
            try { clearPatternParams(); } catch {}
            setSelectedKey(null);
            setSelectedTitle('');
          }
        }}
        patternTitle={selectedTitle}
        status={currentStatus}
        text={currentText}
        error={currentError}
        onCopy={handleCopy}
        onAddToReport={handleAddToReport}
        aiEnabled={aiKeyPresent}
        systemPrompt={[
          buildSystemPrompt(),
          '',
          'Bruk kildehenvisninger [S1], [S2], ... når du refererer til konkrete eksempler. Henvis KUN til S-listen under. Ikke bruk tekniske ID-er.',
          citationsSeed.length ? 'Kildehenvisninger (S1..Sn):' : '',
          ...citationsSeed,
        ].filter(Boolean).join('\n')}
        chatMessages={chatMessages}
        onChatChange={updateChat}
        sourcesRich={sourcesRich}
        dataset={{ entries: filteredData.entries, emotions: filteredData.emotions, sensoryInputs: filteredData.sensoryInputs }}
      />

      <Card>
        <CardHeader>
          <CardTitle>{String(tAnalytics('insights.title'))}</CardTitle>
        </CardHeader>
        <CardContent>
          {isAnalyzing && <p className="text-muted-foreground">{String(tAnalytics('states.analyzing'))}</p>}
          {!isAnalyzing && structured.length === 0 && (
            <p className="text-muted-foreground">{String(tAnalytics('insights.noPatterns'))}</p>
          )}
          {!isAnalyzing && structured.length > 0 && (
            <div className="space-y-3">
              {structured.map((msg, idx) => (
                <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-foreground">{String(tAnalytics(msg.key.replace(/^analytics\./, ''), msg.params as any))}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
});
