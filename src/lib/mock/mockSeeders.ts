/**
 * @file src/lib/mock/mockSeeders.ts
 * Optional demo data seeders. These are never invoked automatically.
 * Use explicitly from dev tooling, tests, or a one-off script.
 */
import { dataStorage } from '@/lib/dataStorage';
import { logger } from '@/lib/logger';
import { generateUUID } from '@/lib/uuid';
import { generateUniversalMockDataForStudent as generateMockData } from '@/lib/universalDataGenerator';

export interface SeedDemoOptions {
  // Seed for existing students in storage
  forExistingStudents?: boolean;
  // Create N new demo students and seed them
  createNewStudents?: number;
  // Batches of tracking entries per student to generate (approximate)
  batchesPerStudent?: number;
}

/**
 * Seed demo tracking data for existing and/or newly-created students.
 * This function is idempotent with respect to student creation (unique ids each run)
 * but will append tracking entries each invocation.
 */
export async function seedDemoData(options: SeedDemoOptions = {}): Promise<{ totalStudentsAffected: number; totalEntriesCreated: number; }>{
  const { forExistingStudents = true, createNewStudents = 0, batchesPerStudent = 1 } = options;
  let totalStudentsAffected = 0;
  let totalEntriesCreated = 0;

  try {
    // Optionally create new demo students
    if (createNewStudents > 0) {
      for (let i = 0; i < createNewStudents; i++) {
        const id = `demo-${generateUUID()}`;
        // Minimal student object; adapt to your domain model if needed
        const student = { id, name: `Demo Student ${i + 1}` } as any;
        try {
          // Persist via storage API if available
          if ((dataStorage as any).saveStudent) {
            (dataStorage as any).saveStudent(student);
          } else {
            // Fallback: push into existing list if your storage supports it
            const students = dataStorage.getStudents();
            if (!students.find(s => s.id === id) && (dataStorage as any).setStudents) {
              (dataStorage as any).setStudents([...students, student]);
            }
          }
        } catch (e) {
          logger.warn('[seedDemoData] Unable to save new demo student', { id, error: e });
        }
      }
    }

    const students = dataStorage.getStudents();
    const targetStudents = forExistingStudents ? students : students.slice(-createNewStudents);

    for (const student of targetStudents) {
      totalStudentsAffected++;
      for (let b = 0; b < Math.max(1, batchesPerStudent); b++) {
        // Generator returns an array of TrackingEntry for this student
        const batch = generateMockData(student.id);
        for (const entry of batch) {
          try {
            dataStorage.saveTrackingEntry(entry);
            totalEntriesCreated++;
          } catch (e) {
            logger.error('[seedDemoData] Failed to save tracking entry', { studentId: student.id, error: e });
          }
        }
      }
    }

    logger.info('[seedDemoData] Demo data seeding complete', { totalStudentsAffected, totalEntriesCreated });
  } catch (error) {
    logger.error('[seedDemoData] Seeding failed', { error });
  }

  return { totalStudentsAffected, totalEntriesCreated };
}

