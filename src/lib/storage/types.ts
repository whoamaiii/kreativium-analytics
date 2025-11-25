/**
 * @file Core domain models for Kreativium storage service.
 *
 * These types define the shape of data stored in localStorage via the
 * unified storage service.
 */

export type UUID = string;

export interface Student {
  id: UUID;
  name: string;
  avatarUrl?: string;
  gradeLevel?: string;
  dateOfBirth?: string;
  language?: string;
  guardians?: Array<{
    name: string;
    relation: string;
    phone?: string;
    email?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export type EmotionLevel = 1 | 2 | 3 | 4 | 5;

export interface EmotionEntry {
  id: UUID;
  label: string;
  intensity: EmotionLevel;
  durationSeconds?: number;
  context?: string;
  trigger?: string;
  timestamp: string;
}

export interface SensoryEntry {
  id: UUID;
  sense: 'sight' | 'sound' | 'touch' | 'smell' | 'taste' | 'movement' | 'other';
  description: string;
  response?: string;
  intensity?: EmotionLevel;
  timestamp: string;
}

export interface EnvironmentalEntry {
  id: UUID;
  location?: string;
  socialContext?: string;
  temperatureC?: number;
  noiseLevel?: EmotionLevel;
  lighting?: 'bright' | 'dim' | 'natural' | 'colored' | 'moderate';
  notes?: string;
  timestamp: string;
}

export interface SessionQuality {
  emotionCount: number;
  sensoryCount: number;
  hasEnvironment: boolean;
  durationMinutes: number;
  completenessPercent: number;
  lastSavedAt?: string;
}

export interface TrackingSession {
  id: UUID;
  studentId: UUID;
  status: 'active' | 'paused' | 'completed' | 'discarded';
  startedAt: string;
  updatedAt: string;
  endedAt?: string;
  autoSaveEnabled: boolean;
  notes?: string;
  emotions: EmotionEntry[];
  sensory: SensoryEntry[];
  environment?: EnvironmentalEntry;
  tags?: string[];
  quality: SessionQuality;
}

export interface GoalMilestone {
  id: UUID;
  title: string;
  description?: string;
  targetDate?: string;
  isCompleted?: boolean;
  completedDate?: string;
  notes?: string;
}

export interface GoalDataPoint {
  id: UUID;
  timestamp: string;
  value: number;
  notes?: string;
  collectedBy?: string;
}

export interface Goal {
  id: UUID;
  studentId: UUID;
  title: string;
  description?: string;
  category: 'behavioral' | 'academic' | 'social' | 'sensory' | 'communication';
  targetDate?: string;
  status?: 'active' | 'achieved' | 'modified' | 'discontinued' | 'not_started' | 'in_progress' | 'on_hold';
  measurableObjective?: string;
  progressPercent: number;
  currentProgress?: number;
  baselineValue?: number;
  targetValue?: number;
  dataPoints?: GoalDataPoint[];
  milestones?: GoalMilestone[];
  interventions?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: UUID;
  studentId: UUID;
  type: 'pattern' | 'regression' | 'environmental' | 'achievement';
  priority: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
}

export interface XpSnapshot {
  total: number;
  streakDays: number;
  lastAwardedAt?: string;
  perModule: Record<string, number>;
}

export interface BackupSnapshot {
  version: number;
  exportedAt: string;
  students: Student[];
  sessions: TrackingSession[];
  goals: Goal[];
  alerts: Alert[];
  xp: XpSnapshot;
  settings: Record<string, unknown>;
}



