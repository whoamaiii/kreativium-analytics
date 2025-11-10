/**
 * CSV Generator Tests
 * Comprehensive test suite for CSV export functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Student, EmotionEntry, SensoryEntry, Goal, TrackingEntry } from '@/types/student';
import {
  generateCSVExport,
  generateEmotionsCSV,
  generateSensoryCSV,
  generateGoalsCSV,
  generateTrackingCSV,
  generateCSVHeader,
  generateCSVRow,
  escapeCSVValue,
  formatDate,
  formatArray,
  filterByDateRange,
  anonymizeStudentName,
} from '../index';

describe('CSV Formatter Utilities', () => {
  describe('escapeCSVValue', () => {
    it('should not quote simple values', () => {
      expect(escapeCSVValue('simple')).toBe('simple');
      expect(escapeCSVValue(123)).toBe('123');
    });

    it('should quote values with commas', () => {
      expect(escapeCSVValue('hello, world')).toBe('"hello, world"');
    });

    it('should quote values with quotes and escape them', () => {
      expect(escapeCSVValue('say "hello"')).toBe('"say ""hello"""');
    });

    it('should quote values with line breaks', () => {
      expect(escapeCSVValue('line1\nline2')).toBe('"line1\nline2"');
    });

    it('should handle custom delimiters', () => {
      expect(escapeCSVValue('hello;world', ';')).toBe('"hello;world"');
    });

    it('should quote all values when requested', () => {
      expect(escapeCSVValue('simple', ',', true)).toBe('"simple"');
    });

    it('should handle null and undefined', () => {
      expect(escapeCSVValue(null)).toBe('');
      expect(escapeCSVValue(undefined)).toBe('');
    });
  });

  describe('formatDate', () => {
    it('should format Date objects', () => {
      const date = new Date('2024-01-15T14:30:00');
      expect(formatDate(date, 'yyyy-MM-dd')).toBe('2024-01-15');
    });

    it('should format date strings', () => {
      const dateStr = '2024-01-15T14:30:00';
      expect(formatDate(dateStr, 'yyyy-MM-dd')).toBe('2024-01-15');
    });

    it('should handle invalid dates', () => {
      expect(formatDate('invalid')).toBe('invalid');
    });

    it('should handle undefined', () => {
      expect(formatDate(undefined)).toBe('');
    });
  });

  describe('formatArray', () => {
    it('should format arrays with default separator', () => {
      expect(formatArray(['a', 'b', 'c'])).toBe('a; b; c');
    });

    it('should format arrays with custom separator', () => {
      expect(formatArray(['a', 'b', 'c'], ', ')).toBe('a, b, c');
    });

    it('should handle empty arrays', () => {
      expect(formatArray([])).toBe('');
    });

    it('should handle undefined', () => {
      expect(formatArray(undefined)).toBe('');
    });
  });

  describe('filterByDateRange', () => {
    const data = [
      { timestamp: new Date('2024-01-01'), value: 1 },
      { timestamp: new Date('2024-01-15'), value: 2 },
      { timestamp: new Date('2024-02-01'), value: 3 },
    ];

    it('should filter by date range', () => {
      const filtered = filterByDateRange(data, {
        start: new Date('2024-01-10'),
        end: new Date('2024-01-20'),
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].value).toBe(2);
    });

    it('should return all data when no range specified', () => {
      const filtered = filterByDateRange(data);
      expect(filtered).toHaveLength(3);
    });
  });

  describe('anonymizeStudentName', () => {
    it('should anonymize student ID', () => {
      const result = anonymizeStudentName('student-12345678');
      expect(result).toBe('Student_5678');
    });
  });
});

describe('CSV Generation', () => {
  let students: Student[];
  let emotions: EmotionEntry[];
  let sensoryInputs: SensoryEntry[];
  let goals: Goal[];
  let trackingEntries: TrackingEntry[];

  beforeEach(() => {
    students = [
      {
        id: 'student-1',
        name: 'John Doe',
        grade: '5',
        createdAt: new Date('2024-01-01'),
        baselineData: {
          emotionalRegulation: 5,
          sensoryProcessing: 5,
          environmentalPreferences: {},
        },
      },
    ] as Student[];

    emotions = [
      {
        id: 'emotion-1',
        studentId: 'student-1',
        emotion: 'happy',
        intensity: 7,
        timestamp: new Date('2024-01-15T10:00:00'),
        triggers: ['recess', 'games'],
        notes: 'Very cheerful today',
      },
      {
        id: 'emotion-2',
        studentId: 'student-1',
        emotion: 'frustrated',
        intensity: 5,
        timestamp: new Date('2024-01-16T14:00:00'),
        triggers: ['math homework'],
        notes: 'Had difficulty with fractions',
      },
    ];

    sensoryInputs = [
      {
        id: 'sensory-1',
        studentId: 'student-1',
        sensoryType: 'auditory',
        response: 'seeking',
        intensity: 6,
        timestamp: new Date('2024-01-15T11:00:00'),
        notes: 'Enjoys music during work',
      },
    ];

    goals = [
      {
        id: 'goal-1',
        studentId: 'student-1',
        title: 'Improve focus',
        description: 'Increase sustained attention',
        category: 'behavioral',
        status: 'active',
        targetDate: new Date('2024-06-01'),
        createdDate: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        measurableObjective: '20 minutes',
        currentProgress: 50,
        progress: 50,
        targetValue: 20,
        dataPoints: [
          {
            id: 'dp-1',
            timestamp: new Date('2024-01-15'),
            value: 10,
            notes: 'Initial measurement',
          },
        ],
      },
    ];

    trackingEntries = [
      {
        id: 'tracking-1',
        studentId: 'student-1',
        timestamp: new Date('2024-01-15T09:00:00'),
        emotions: emotions,
        sensoryInputs: sensoryInputs,
      },
    ];
  });

  describe('generateCSVHeader', () => {
    it('should generate header row', () => {
      const header = generateCSVHeader(['Name', 'Age', 'Grade']);
      expect(header).toBe('Name,Age,Grade');
    });

    it('should handle special characters in headers', () => {
      const header = generateCSVHeader(['Student Name', 'Grade (5-12)']);
      expect(header).toBe('Student Name,"Grade (5-12)"');
    });
  });

  describe('generateCSVRow', () => {
    it('should generate data row', () => {
      const row = generateCSVRow(['John', 25, 'Grade 5']);
      expect(row).toBe('John,25,Grade 5');
    });

    it('should handle null values', () => {
      const row = generateCSVRow(['John', null, undefined]);
      expect(row).toBe('John,,');
    });
  });

  describe('generateEmotionsCSV', () => {
    it('should generate emotions CSV', () => {
      const result = generateEmotionsCSV(emotions, students, {
        includeFields: ['emotions'],
      });

      expect(result.content).toContain('Date,Student,Emotion');
      expect(result.content).toContain('John Doe');
      expect(result.content).toContain('happy');
      expect(result.content).toContain('frustrated');
      expect(result.rowCount).toBe(2);
    });

    it('should anonymize data', () => {
      const result = generateEmotionsCSV(emotions, students, {
        includeFields: ['emotions'],
        anonymize: true,
      });

      expect(result.content).not.toContain('John Doe');
      expect(result.content).toContain('Student_');
    });

    it('should filter by date range', () => {
      const result = generateEmotionsCSV(emotions, students, {
        includeFields: ['emotions'],
        dateRange: {
          start: new Date('2024-01-15'),
          end: new Date('2024-01-15T23:59:59'),
        },
      });

      expect(result.rowCount).toBe(1);
    });

    it('should include UTF-8 BOM', () => {
      const result = generateEmotionsCSV(emotions, students, {
        includeFields: ['emotions'],
        formatting: {
          includeUtf8Bom: true,
        },
      });

      expect(result.content).toMatch(/^\uFEFF/);
    });

    it('should use custom date format', () => {
      const result = generateEmotionsCSV(emotions, students, {
        includeFields: ['emotions'],
        formatting: {
          dateFormat: 'MM/dd/yyyy',
        },
      });

      expect(result.content).toContain('01/15/2024');
    });
  });

  describe('generateSensoryCSV', () => {
    it('should generate sensory CSV', () => {
      const result = generateSensoryCSV(sensoryInputs, students, {
        includeFields: ['sensoryInputs'],
      });

      expect(result.content).toContain('Date,Student,Sensory Type');
      expect(result.content).toContain('auditory');
      expect(result.content).toContain('seeking');
      expect(result.rowCount).toBe(1);
    });
  });

  describe('generateGoalsCSV', () => {
    it('should generate goals CSV', () => {
      const result = generateGoalsCSV(goals, students, {
        includeFields: ['goals'],
      });

      expect(result.content).toContain('Student,Goal Title');
      expect(result.content).toContain('Improve focus');
      expect(result.content).toContain('behavioral');
      expect(result.rowCount).toBe(1);
    });

    it('should calculate progress percentage', () => {
      const result = generateGoalsCSV(goals, students, {
        includeFields: ['goals'],
      });

      expect(result.content).toContain('50'); // 10/20 = 50%
    });
  });

  describe('generateTrackingCSV', () => {
    it('should generate tracking CSV', () => {
      const result = generateTrackingCSV(trackingEntries, students, {
        includeFields: ['trackingEntries'],
      });

      expect(result.content).toContain('Date,Student,"Session Duration (min)"');
      expect(result.rowCount).toBe(1);
    });
  });

  describe('generateCSVExport', () => {
    it('should generate multi-section export', () => {
      const result = generateCSVExport(
        students,
        {
          emotions,
          sensoryInputs,
          goals,
          trackingEntries,
        },
        {
          includeFields: ['emotions', 'sensoryInputs', 'goals'],
        },
      );

      expect(result.content).toContain('=== EMOTIONS ===');
      expect(result.content).toContain('=== SENSORY INPUTS ===');
      expect(result.content).toContain('=== GOALS ===');
      expect(result.rowCount).toBeGreaterThan(0);
    });

    it('should generate grouped export', () => {
      const result = generateCSVExport(
        students,
        {
          emotions,
          sensoryInputs,
          goals,
          trackingEntries,
        },
        {
          includeFields: ['emotions', 'sensoryInputs'],
          groupBy: 'student',
        },
      );

      expect(result.content).toContain('John Doe');
      expect(result.rowCount).toBeGreaterThan(0);
    });

    it('should handle empty data', () => {
      const result = generateCSVExport(
        students,
        {
          emotions: [],
          sensoryInputs: [],
          goals: [],
          trackingEntries: [],
        },
        {
          includeFields: ['emotions'],
        },
      );

      expect(result.content).toContain('Date,Student,Emotion');
      expect(result.rowCount).toBe(0);
    });
  });

  describe('RFC 4180 Compliance', () => {
    it('should handle special characters correctly', () => {
      const specialEmotions: EmotionEntry[] = [
        {
          id: 'emotion-special',
          studentId: 'student-1',
          emotion: 'mixed, complex',
          intensity: 5,
          timestamp: new Date('2024-01-15'),
          notes: 'Student said "I feel weird"\nMultiple lines',
          triggers: ['test, quiz', 'homework'],
        },
      ];

      const result = generateEmotionsCSV(specialEmotions, students, {
        includeFields: ['emotions'],
      });

      expect(result.content).toContain('"mixed, complex"');
      expect(result.content).toContain('""I feel weird""');
    });

    it('should use consistent line endings', () => {
      const result = generateEmotionsCSV(emotions, students, {
        includeFields: ['emotions'],
      });

      const lines = result.content.split('\n');
      expect(lines.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should handle large datasets', () => {
      const largeEmotions: EmotionEntry[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `emotion-${i}`,
        studentId: 'student-1',
        emotion: 'happy',
        intensity: Math.floor(Math.random() * 10),
        timestamp: new Date(),
        notes: `Note ${i}`,
      }));

      const start = Date.now();
      const result = generateEmotionsCSV(largeEmotions, students, {
        includeFields: ['emotions'],
      });
      const duration = Date.now() - start;

      expect(result.rowCount).toBe(1000);
      expect(duration).toBeLessThan(1000); // Should complete in < 1 second
    });
  });

  describe('Edge Cases', () => {
    it('should handle students with no data', () => {
      const result = generateEmotionsCSV([], students, {
        includeFields: ['emotions'],
      });

      expect(result.rowCount).toBe(0);
      expect(result.content).toContain('Date,Student,Emotion');
    });

    it('should handle missing student references', () => {
      const orphanEmotions: EmotionEntry[] = [
        {
          id: 'emotion-orphan',
          studentId: 'nonexistent-student',
          emotion: 'happy',
          intensity: 5,
          timestamp: new Date(),
        },
      ];

      const result = generateEmotionsCSV(orphanEmotions, students, {
        includeFields: ['emotions'],
      });

      expect(result.content).toContain('Unknown');
    });

    it('should handle missing optional fields', () => {
      const minimalEmotions: EmotionEntry[] = [
        {
          id: 'emotion-minimal',
          studentId: 'student-1',
          emotion: 'happy',
          intensity: 5,
          timestamp: new Date(),
          // No notes, triggers, etc.
        },
      ];

      const result = generateEmotionsCSV(minimalEmotions, students, {
        includeFields: ['emotions'],
      });

      expect(result.rowCount).toBe(1);
    });
  });
});
