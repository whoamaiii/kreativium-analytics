import { generateUUID } from '@/lib/uuid';
import { dataStorage } from '@/lib/dataStorage';
import type { TrackingEntry, EmotionEntry } from '@/types/student';

/**
 * Seed a handful of social-trigger examples for a student.
 * Safe to run multiple times; produces new IDs and appends entries.
 */
export async function seedSocialDemoData(studentId: string, count = 6): Promise<number> {
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const t = new Date(now - (count - i) * 36e5);
    const emo: EmotionEntry = {
      id: generateUUID(),
      studentId,
      emotion: 'negative',
      intensity: 7 + (i % 3),
      timestamp: t,
      triggers: ['sosial interaksjon'],
      notes: i % 2 === 0 ? 'Konflikt i friminutt' : 'Vanskelig gruppesamarbeid',
    };
    const entry: TrackingEntry = {
      id: generateUUID(),
      studentId,
      timestamp: t,
      emotions: [emo],
      sensoryInputs: [],
      generalNotes: 'Sosial situasjon: gruppeoppgave / friminutt',
    };
    dataStorage.saveTrackingEntry(entry);
  }
  return count;
}


