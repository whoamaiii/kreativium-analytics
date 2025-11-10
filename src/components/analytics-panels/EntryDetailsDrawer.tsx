import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import type { SourceItem } from '@/types/analytics';

export interface EntryDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: SourceItem | null;
}

export function EntryDetailsDrawer({
  open,
  onOpenChange,
  source,
}: EntryDetailsDrawerProps): React.ReactElement {
  const ts = React.useMemo(() => {
    if (!source?.timestamp) return '';
    try {
      return new Date(source.timestamp).toISOString().replace('T', ' ').slice(0, 16);
    } catch {
      return String(source.timestamp);
    }
  }, [source?.timestamp]);

  const copyAsText = async () => {
    try {
      const parts: string[] = [];
      if (!source) return;
      parts.push(`${source.activity || source.place || 'Hendelse'} (${ts})`);
      if (source.note) parts.push(`Notat: ${source.note}`);
      if (source.emotions?.length) {
        parts.push(
          `Følelser: ${source.emotions.map((e) => `${e.emotion}${typeof e.intensity === 'number' ? ` (${e.intensity})` : ''}`).join(', ')}`,
        );
      }
      if (source.sensory?.length) {
        parts.push(
          `Sensorikk: ${source.sensory.map((s) => `${s.type || s.response || 'sensor'}` + (s.response ? `: ${s.response}` : '') + (typeof s.intensity === 'number' ? ` (${s.intensity})` : '')).join(', ')}`,
        );
      }
      if (source.environment) {
        const envParts: string[] = [];
        if (source.environment.lighting) envParts.push(`lys: ${source.environment.lighting}`);
        if (typeof source.environment.noiseLevel === 'number')
          envParts.push(`støy: ${source.environment.noiseLevel}`);
        if (typeof source.environment.temperature === 'number')
          envParts.push(`temperatur: ${source.environment.temperature}`);
        if (typeof source.environment.humidity === 'number')
          envParts.push(`fukt: ${source.environment.humidity}`);
        if (source.environment.timeOfDay) envParts.push(`tid: ${source.environment.timeOfDay}`);
        if (typeof source.environment.studentCount === 'number')
          envParts.push(`elever: ${source.environment.studentCount}`);
        if (envParts.length) parts.push(`Miljø: ${envParts.join(', ')}`);
        if (source.environment.notes) parts.push(`Miljønotat: ${source.environment.notes}`);
      }
      await navigator.clipboard.writeText(parts.join('\n'));
    } catch {
      // no-op
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-md w-full">
        <SheetHeader>
          <SheetTitle>Detaljer</SheetTitle>
        </SheetHeader>
        {!source && <div className="mt-4 text-sm text-muted-foreground">Ingen data</div>}
        {source && (
          <div className="mt-4 space-y-3">
            <div>
              <div className="text-sm font-medium">
                {source.activity || source.place || 'Hendelse'}
              </div>
              <div className="text-xs text-muted-foreground">{ts}</div>
            </div>
            {source.note && (
              <div className="text-sm">
                <div className="font-medium">Notat</div>
                <div className="whitespace-pre-wrap break-words">{source.note}</div>
              </div>
            )}
            {source.emotions?.length ? (
              <div>
                <div className="text-sm font-medium">Følelser</div>
                <ul className="mt-1 text-sm list-disc pl-5">
                  {source.emotions.map((e) => (
                    <li key={e.id}>
                      {e.emotion}
                      {typeof e.intensity === 'number' ? ` (intensitet ${e.intensity})` : ''}
                      {e.notes ? ` – ${e.notes}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {source.sensory?.length ? (
              <div>
                <div className="text-sm font-medium">Sensorikk</div>
                <ul className="mt-1 text-sm list-disc pl-5">
                  {source.sensory.map((s) => (
                    <li key={s.id}>
                      {s.type || s.response || 'sensor'}
                      {s.response ? `: ${s.response}` : ''}
                      {typeof s.intensity === 'number' ? ` (intensitet ${s.intensity})` : ''}
                      {s.notes ? ` – ${s.notes}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {source.place || source.socialContext || source.environment ? (
              <div>
                <div className="text-sm font-medium">Kontekst</div>
                <div className="text-sm text-muted-foreground">
                  {[source.place, source.socialContext].filter(Boolean).join(' · ')}
                </div>
                {source.environment && (
                  <div className="mt-1 text-sm text-muted-foreground">
                    {source.environment.lighting ? `Lys: ${source.environment.lighting}. ` : ''}
                    {typeof source.environment.noiseLevel === 'number'
                      ? `Støy: ${source.environment.noiseLevel}. `
                      : ''}
                    {typeof source.environment.temperature === 'number'
                      ? `Temperatur: ${source.environment.temperature}. `
                      : ''}
                    {typeof source.environment.humidity === 'number'
                      ? `Fukt: ${source.environment.humidity}. `
                      : ''}
                    {typeof source.environment.studentCount === 'number'
                      ? `Elever: ${source.environment.studentCount}. `
                      : ''}
                    {source.environment.timeOfDay ? `Tid: ${source.environment.timeOfDay}. ` : ''}
                    {source.environment.weather ? `Vær: ${source.environment.weather}. ` : ''}
                  </div>
                )}
              </div>
            ) : null}
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={copyAsText}>
                Kopier som tekst
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
