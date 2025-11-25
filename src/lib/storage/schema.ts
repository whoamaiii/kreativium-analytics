/**
 * @file Zod schemas for storage data validation.
 */

import { z } from 'zod';

const uuidSchema = z
  .string()
  .uuid()
  .or(
    z
      .string()
      .regex(/^[A-Za-z0-9_-]{8,}$/u),
  );

const timestampSchema = z.string().datetime();

export const studentSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  gradeLevel: z.string().optional(),
  dateOfBirth: z.string().optional(),
  language: z.string().optional(),
  guardians: z
    .array(
      z.object({
        name: z.string(),
        relation: z.string(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
      }),
    )
    .optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  notes: z.string().optional(),
});

const goalMilestoneSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  description: z.string().optional(),
  targetDate: timestampSchema.optional(),
  isCompleted: z.boolean().optional(),
  completedDate: timestampSchema.optional(),
  notes: z.string().optional(),
});

const goalDataPointSchema = z.object({
  id: uuidSchema,
  timestamp: timestampSchema,
  value: z.number(),
  notes: z.string().optional(),
  collectedBy: z.string().optional(),
});

export const emotionEntrySchema = z.object({
  id: uuidSchema,
  label: z.string().min(1),
  intensity: z.number().min(1).max(5),
  durationSeconds: z.number().int().positive().optional(),
  context: z.string().optional(),
  trigger: z.string().optional(),
  timestamp: timestampSchema,
});

export const sensoryEntrySchema = z.object({
  id: uuidSchema,
  sense: z.enum(['sight', 'sound', 'touch', 'smell', 'taste', 'movement', 'other']),
  description: z.string().min(1),
  response: z.string().optional(),
  intensity: z.number().min(1).max(5).optional(),
  timestamp: timestampSchema,
});

export const environmentalEntrySchema = z.object({
  id: uuidSchema,
  location: z.string().optional(),
  socialContext: z.string().optional(),
  temperatureC: z.number().optional(),
  noiseLevel: z.number().min(1).max(5).optional(),
  lighting: z.enum(['bright', 'dim', 'natural', 'colored', 'moderate']).optional(),
  notes: z.string().optional(),
  timestamp: timestampSchema,
});

export const sessionQualitySchema = z.object({
  emotionCount: z.number().int().nonnegative(),
  sensoryCount: z.number().int().nonnegative(),
  hasEnvironment: z.boolean(),
  durationMinutes: z.number().nonnegative(),
  completenessPercent: z.number().min(0).max(100),
  lastSavedAt: timestampSchema.optional(),
});

export const trackingSessionSchema = z.object({
  id: uuidSchema,
  studentId: uuidSchema,
  status: z.enum(['active', 'paused', 'completed', 'discarded']),
  startedAt: timestampSchema,
  updatedAt: timestampSchema,
  endedAt: timestampSchema.optional(),
  autoSaveEnabled: z.boolean(),
  notes: z.string().optional(),
  emotions: z.array(emotionEntrySchema),
  sensory: z.array(sensoryEntrySchema),
  environment: environmentalEntrySchema.optional(),
  tags: z.array(z.string()).optional(),
  quality: sessionQualitySchema,
});

export const goalSchema = z.object({
  id: uuidSchema,
  studentId: uuidSchema,
  title: z.string(),
  description: z.string().optional(),
  category: z.enum(['behavioral', 'academic', 'social', 'sensory', 'communication']),
  targetDate: z.string().optional(),
  status: z
    .enum(['active', 'achieved', 'modified', 'discontinued', 'not_started', 'in_progress', 'on_hold'])
    .optional(),
  measurableObjective: z.string().optional(),
  progressPercent: z.number().min(0).max(100),
  currentProgress: z.number().min(0).max(100).optional(),
  baselineValue: z.number().optional(),
  targetValue: z.number().optional(),
  dataPoints: goalDataPointSchema.array().optional(),
  milestones: goalMilestoneSchema.array().optional(),
  interventions: z.array(z.string()).optional(),
  notes: z.string().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const alertSchema = z.object({
  id: uuidSchema,
  studentId: uuidSchema,
  type: z.enum(['pattern', 'regression', 'environmental', 'achievement']),
  priority: z.enum(['low', 'medium', 'high']),
  title: z.string(),
  message: z.string(),
  createdAt: timestampSchema,
  readAt: timestampSchema.optional(),
});

export const xpSnapshotSchema = z.object({
  total: z.number().int().nonnegative(),
  streakDays: z.number().int().nonnegative(),
  lastAwardedAt: timestampSchema.optional(),
  perModule: z.record(z.string(), z.number().int().nonnegative()),
});

export const settingsSchema = z.record(z.string(), z.unknown());

export const backupSnapshotSchema = z.object({
  version: z.number().int().positive(),
  exportedAt: timestampSchema,
  students: z.array(studentSchema),
  sessions: z.array(trackingSessionSchema),
  goals: z.array(goalSchema),
  alerts: z.array(alertSchema),
  xp: xpSnapshotSchema,
  settings: settingsSchema,
});



