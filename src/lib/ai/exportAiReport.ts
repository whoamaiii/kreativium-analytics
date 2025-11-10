import type { AnalyticsResultsAI } from '@/lib/analysis/analysisEngine';
import type { InterventionResult } from '@/types/analytics';
import { resolveSources } from '@/lib/evidence';
import type { EvidenceSource } from '@/lib/evidence';

function linewrap(text: string, width = 100): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > width) {
      lines.push(current.trim());
      current = w;
    } else {
      current += (current ? ' ' : '') + w;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

type LocaleKey = 'nb' | 'sv';
const LABELS: Record<LocaleKey, Record<string, string>> = {
  nb: {
    summary: 'Sammendrag',
    keyFindings: 'Nøkkelfunn',
    patterns: 'Mønstre',
    interventions: 'Tiltak',
    udl: 'UDL-kontrollpunkter',
    hlp: 'Høyeffektpraksis (HLP)',
    tiers: 'Intervensjonsnivåer',
    scope: 'Implementeringsområde',
    sources: 'Kilder',
    goals: 'Mål',
    model: 'Modell',
    latency: 'Latens',
    tokens: 'Tokens',
    cacheRead: 'Cache: les',
    cacheWrite: 'Cache: skriv',
    caveats: 'Forbehold',
    tags: 'Tagger',
  },
  sv: {
    summary: 'Sammanfattning',
    keyFindings: 'Nyckelfynd',
    patterns: 'Mönster',
    interventions: 'Åtgärder',
    udl: 'UDL-kontrollpunkter',
    hlp: 'Höghävstångspraxis (HLP)',
    tiers: 'Interventionsnivåer',
    scope: 'Implementeringsområde',
    sources: 'Källor',
    goals: 'Mål',
    model: 'Modell',
    latency: 'Latens',
    tokens: 'Tokens',
    cacheRead: 'Cache: läs',
    cacheWrite: 'Cache: skriv',
    caveats: 'Förbehåll',
    tags: 'Taggar',
  },
};

const TAG_DISPLAY: Record<string, { nb: string; sv: string }> = {
  reading: { nb: 'Lesing', sv: 'Läsning' },
  writing: { nb: 'Skriving', sv: 'Skrivning' },
  math: { nb: 'Matematikk', sv: 'Matematik' },
  behavior: { nb: 'Atferd', sv: 'Beteende' },
  pbis: { nb: 'PBIS', sv: 'PBIS' },
  fba: { nb: 'FBA', sv: 'FBA' },
  udl: { nb: 'UDL', sv: 'UDL' },
  hlp: { nb: 'HLP', sv: 'HLP' },
  aac: { nb: 'AAC', sv: 'AAC' },
  autism: { nb: 'Autisme', sv: 'Autism' },
  sensory: { nb: 'Sensorisk', sv: 'Sensorisk' },
  pm: { nb: 'Måluppföljing', sv: 'Måluppföljning' },
};

export async function formatAiReportText(
  result: AnalyticsResultsAI,
  opts?: { includeMetadata?: boolean; locale?: LocaleKey },
): Promise<string> {
  const locale: LocaleKey = opts?.locale ?? 'nb';
  const L = LABELS[locale];
  const out: string[] = [];
  if ((result as any).summary) {
    out.push(`# ${L.summary}`);
    out.push(String((result as any).summary));
    out.push('');
  }

  out.push(`# ${L.keyFindings}`);
  const kf = ((result as any).keyFindings || []) as string[];
  out.push(...(kf.length ? kf.map((x) => `• ${x}`) : ['(Ingen)']));
  out.push('');

  out.push(`# ${L.patterns}`);
  out.push(
    ...(result.patterns || []).map(
      (p) => `• ${p.name || 'Mønster'}${p.description ? ` — ${p.description}` : ''}`,
    ),
  );
  out.push('');

  // Collect unique source IDs across all interventions for resolution
  const interventions: InterventionResult[] = ((result as any).suggestedInterventions ||
    []) as InterventionResult[];
  const uniqueSourceIds = new Set<string>();
  for (const i of interventions) {
    if (Array.isArray(i.sources)) {
      for (const id of i.sources) {
        if (typeof id === 'string' && id.trim()) uniqueSourceIds.add(id.trim());
      }
    }
  }

  // Resolve sources with graceful fallback
  let resolved: EvidenceSource[] = [];
  try {
    if (uniqueSourceIds.size > 0) {
      resolved = await resolveSources(Array.from(uniqueSourceIds));
    }
  } catch (_e) {
    resolved = [];
  }
  const idToSource = new Map<string, EvidenceSource>(resolved.map((s) => [s.id, s]));

  // Enhanced interventions with inline sources, tier/scope, and metrics
  out.push(`# ${L.interventions}`);
  if (interventions.length === 0) {
    out.push('(Ingen)');
  } else {
    for (const i of interventions) {
      const names: string[] = [];
      for (const id of i.sources || []) {
        const s = id && idToSource.get(id);
        if (s) names.push(s.title);
      }
      const sourcesText = names.length ? ` [${L.sources}: ${names.join(', ')}]` : '';
      const tierScope =
        i.tier || i.scope
          ? ` [${i.tier || ''}${i.scope ? `${i.tier ? ', ' : ''}${i.scope}` : ''}]`
          : '';
      const metricsText =
        Array.isArray(i.metrics) && i.metrics.length
          ? ` [${L.goals}: ${i.metrics.join(', ')}]`
          : '';
      out.push(
        `• ${i.title}${i.description ? ` — ${i.description}` : ''}${sourcesText}${tierScope}${metricsText}`,
      );
    }
  }
  out.push('');

  // UDL and HLP sections (if present)
  const allUdl = Array.from(
    new Set(interventions.flatMap((i) => i.udlCheckpoints || []).filter(Boolean)),
  );
  const allHlps = Array.from(new Set(interventions.flatMap((i) => i.hlps || []).filter(Boolean)));
  if (allUdl.length) {
    out.push(`# ${L.udl}`);
    for (const u of allUdl) out.push(`• ${u}`);
    out.push('');
  }
  if (allHlps.length) {
    out.push(`# ${L.hlp}`);
    for (const h of allHlps) out.push(`• ${h}`);
    out.push('');
  }

  // Tier summary and scope summary
  const tiers = interventions.map((i) => i.tier).filter(Boolean) as string[];
  const scopes = interventions.map((i) => i.scope).filter(Boolean) as string[];
  if (tiers.length) {
    const counts = tiers.reduce(
      (acc, t) => ((acc[t] = (acc[t] || 0) + 1), acc),
      {} as Record<string, number>,
    );
    out.push(`# ${L.tiers}`);
    Object.keys(counts)
      .sort()
      .forEach((k) => out.push(`• ${k}: ${counts[k]}`));
    out.push('');
  }
  if (scopes.length) {
    const counts = scopes.reduce(
      (acc, s) => ((acc[s] = (acc[s] || 0) + 1), acc),
      {} as Record<string, number>,
    );
    out.push(`# ${L.scope}`);
    Object.keys(counts)
      .sort()
      .forEach((k) => out.push(`• ${k}: ${counts[k]}`));
    out.push('');
  }

  // Dedicated sources section without duplicates; append tags inline
  if (resolved.length) {
    out.push(`# ${L.sources}`);
    const seenIds = new Set<string>();
    for (const s of resolved) {
      if (seenIds.has(s.id)) continue;
      seenIds.add(s.id);
      const lvl = s.evidenceLevel ? ` [${s.evidenceLevel} evidens]` : '';
      const year = s.year != null ? String(s.year) : 'N/A';
      const excerptText = s.shortExcerpt ? ` — ${s.shortExcerpt}` : '';
      const urlText = s.url ? ` [${s.url}]` : '';
      const tags = (Array.isArray(s.tags) ? s.tags : [])
        .map((t) => TAG_DISPLAY[String(t)]?.[locale] || String(t))
        .join(', ');
      const tagsText = tags ? ` [${L.tags}: ${tags}]` : '';
      out.push(`• ${s.title} (${year})${excerptText}${urlText}${lvl}${tagsText}`);
    }
    out.push('');
  }

  if (opts?.includeMetadata && result.ai) {
    out.push(`# AI‑metadata`);
    out.push(`${L.model}: ${result.ai.model || ''}`);
    if (result.ai.latencyMs != null)
      out.push(`${L.latency}: ${Math.round(result.ai.latencyMs)} ms`);
    if (result.ai.usage)
      out.push(
        `${L.tokens}: prompt ${result.ai.usage.promptTokens ?? 0} • completion ${result.ai.usage.completionTokens ?? 0} • total ${result.ai.usage.totalTokens ?? 0}`,
      );
    if ((result.ai.usage as any)?.cacheReadTokens)
      out.push(`${L.cacheRead}: ${(result.ai.usage as any).cacheReadTokens}`);
    if ((result.ai.usage as any)?.cacheWriteTokens)
      out.push(`${L.cacheWrite}: ${(result.ai.usage as any).cacheWriteTokens}`);
    if (Array.isArray(result.ai.caveats) && result.ai.caveats.length)
      out.push(`${L.caveats}: ${result.ai.caveats.join('; ')}`);
  }
  return out.join('\n');
}

export async function downloadPdfFromText(
  text: string,
  filename: string = 'kreativium_ai_rapport.pdf',
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const usable = pageWidth - margin * 2;
  let y = margin;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const paragraphs = text.split('\n');
  for (const para of paragraphs) {
    if (para.trim().length === 0) {
      y += 12;
      continue;
    }
    const wrapped = doc.splitTextToSize(para, usable);
    for (const line of wrapped) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 14;
    }
  }
  doc.save(filename);
}
