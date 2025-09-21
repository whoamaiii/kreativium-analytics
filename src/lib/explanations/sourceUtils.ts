/* @unused-exports-keep: retained for analytics PDF and explanation features */
import type { SourceItem } from '@/types/analytics';

export const SOCIAL_CONTEXT_RE = /(sosial|sosiale|venn|venner|kompis|klasse|klasserom|gruppe|grupp(e|eoppgave)?|team|pararbeid|friminutt|pause|lunsj|frokost|middag|kveld(s)?stell|morgen(s)?rutine|morgenstell|morgenrutine|kantine|ute|inne|hjemme|avlast|interaksj|samarbeid|samspill|konflikt|lek|leke|presentasjon|diskusjon|overgang(er)?|medelever|familie|besøk)/i;
export const CITATION_LIMIT = 8;

export const clampText = (value: string, limit = 120): string => {
  if (!value) return '';
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
};

export const formatSourceTimestamp = (iso: string): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
};

export const sourcePrimaryLabel = (source: SourceItem): string => {
  const parts = [source.activity, source.place].filter((part) => !!part);
  if (parts.length === 0) return 'Registrering';
  return parts.join(' / ');
};

export const describeSource = (source: SourceItem, noteClamp = 120): { primary: string; secondary: string } => {
  const primary = `${sourcePrimaryLabel(source)} ${formatSourceTimestamp(source.timestamp)}`.trim();
  const emotionDetails = source.emotions
    .filter((emotion) => !!emotion.emotion)
    .slice(0, 4)
    .map((emotion) => `${emotion.emotion}${typeof emotion.intensity === 'number' ? ` (${emotion.intensity})` : ''}`)
    .join(', ');
  const sensoryDetails = source.sensory
    .filter((sense) => sense.response || sense.type)
    .slice(0, 4)
    .map((sense) => `${sense.type || 'sans'} → ${sense.response}${typeof sense.intensity === 'number' ? ` (${sense.intensity})` : ''}`)
    .join(', ');
  const secondaryParts = [
    source.note ? `notat: ${clampText(source.note, noteClamp)}` : '',
    emotionDetails ? `følelser: ${emotionDetails}` : '',
    sensoryDetails ? `sensorikk: ${sensoryDetails}` : '',
  ].filter(Boolean);
  return {
    primary,
    secondary: secondaryParts.join(' · '),
  };
};

export const describeSourceForPrompt = (source: SourceItem): string => {
  const { primary, secondary } = describeSource(source, 90);
  return secondary ? `${primary} · ${secondary}` : primary;
};

export const collectEnvironmentDetails = (source: SourceItem): Array<{ label: string; value: string }> => {
  const env = source.environment;
  if (!env) return [];
  const details: Array<{ label: string; value: string }> = [];
  if (env.timeOfDay) details.push({ label: 'Tid på dagen', value: env.timeOfDay });
  if (typeof env.studentCount === 'number') details.push({ label: 'Antall elever', value: String(env.studentCount) });
  if (env.lighting) details.push({ label: 'Belysning', value: env.lighting });
  if (typeof env.noiseLevel === 'number') details.push({ label: 'Støynivå', value: String(env.noiseLevel) });
  if (typeof env.temperature === 'number') details.push({ label: 'Temperatur', value: String(env.temperature) });
  if (typeof env.humidity === 'number') details.push({ label: 'Luftfuktighet', value: String(env.humidity) });
  if (env.weather) details.push({ label: 'Vær', value: env.weather });
  if (env.notes) details.push({ label: 'Miljønotat', value: env.notes });
  return details;
};

export const buildCopyFromSource = (source: SourceItem): string => {
  const { primary, secondary } = describeSource(source, 160);
  const lines = [primary];
  if (secondary) lines.push(secondary);
  if (source.socialContext) lines.push(`Sosial kontekst: ${source.socialContext}`);
  const environment = collectEnvironmentDetails(source);
  if (environment.length > 0) {
    lines.push('Miljødetaljer:');
    for (const item of environment) {
      lines.push(`- ${item.label}: ${item.value}`);
    }
  }
  if (source.emotions.length > 0) {
    lines.push('Følelser:');
    for (const emo of source.emotions) {
      const parts = [emo.emotion];
      if (typeof emo.intensity === 'number') parts.push(`intensitet ${emo.intensity}`);
      if (emo.notes) parts.push(`notat: ${emo.notes}`);
      lines.push(`- ${parts.join(' · ')}`);
    }
  }
  if (source.sensory.length > 0) {
    lines.push('Sensorikk:');
    for (const sensory of source.sensory) {
      const parts = [sensory.type || 'sans'];
      if (sensory.response) parts.push(sensory.response);
      if (typeof sensory.intensity === 'number') parts.push(`intensitet ${sensory.intensity}`);
      if (sensory.notes) parts.push(`notat: ${sensory.notes}`);
      lines.push(`- ${parts.filter(Boolean).join(' · ')}`);
    }
  }
  return lines.filter(Boolean).join('\n');
};
