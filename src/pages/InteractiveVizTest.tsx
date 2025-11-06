import React from 'react';
import { InteractiveDataVisualization } from '@/components/InteractiveDataVisualization';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';

const now = new Date();
const sampleStudentId = 'student-1';

const emotions: EmotionEntry[] = [
  {
    id: 'emotion-1',
    studentId: sampleStudentId,
    emotion: 'happy',
    intensity: 4,
    timestamp: now,
    triggers: [],
    notes: ''
  },
  {
    id: 'emotion-2',
    studentId: sampleStudentId,
    emotion: 'calm',
    intensity: 3,
    timestamp: new Date(now.getTime() + 60 * 60 * 1000),
    triggers: [],
    notes: ''
  }
];

const sensoryInputs: SensoryEntry[] = [
  {
    id: 'sensory-1',
    studentId: sampleStudentId,
    type: 'visual',
    response: 'seeking',
    intensity: 3,
    timestamp: new Date(now.getTime() + 30 * 60 * 1000),
    notes: ''
  }
];

const trackingEntries: TrackingEntry[] = [
  {
    id: 'tracking-1',
    studentId: sampleStudentId,
    timestamp: now,
    emotions,
    sensoryInputs,
    environmentalData: {
      notes: 'Sample classroom setting'
    },
    notes: ''
  }
];

export default function InteractiveVizTest() {
  return (
    <ErrorBoundary>
      <div className="p-6">
        <InteractiveDataVisualization
          emotions={emotions}
          sensoryInputs={sensoryInputs}
          trackingEntries={trackingEntries}
          studentName="Test Student"
        />
      </div>
    </ErrorBoundary>
  );
}

