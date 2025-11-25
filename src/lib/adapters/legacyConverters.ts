/**
 * @file Converters between legacy and new storage types.
 *
 * These converters bridge the gap between the old `@/types/student` types
 * and the new `@/lib/storage/types` types.
 */

import type { Student as LegacyStudent, Goal as LegacyGoal, Alert as LegacyAlert } from '@/types/student';
import type { Student as LocalStudent, Goal as LocalGoal, Alert as LocalAlert } from '@/lib/storage/types';

export const convertLegacyStudentToLocal = (student: LegacyStudent): LocalStudent => {
  const createdAt = student.createdAt ?? new Date();
  const updatedAt = student.lastUpdated ?? createdAt;
  return {
    id: student.id,
    name: student.name,
    gradeLevel: student.grade,
    dateOfBirth: student.dateOfBirth,
    notes: student.notes,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
};

export const convertLocalStudentToLegacy = (student: LocalStudent): LegacyStudent => ({
  id: student.id,
  name: student.name,
  grade: student.gradeLevel,
  dateOfBirth: student.dateOfBirth,
  notes: student.notes,
  createdAt: new Date(student.createdAt),
  lastUpdated: new Date(student.updatedAt),
  version: 1,
});

export const convertLegacyGoalToLocal = (goal: LegacyGoal): LocalGoal => {
  const createdAt = goal.createdDate ?? goal.updatedAt ?? new Date();
  const updatedAt = goal.updatedAt ?? goal.createdDate ?? new Date();
  const mapMilestones =
    goal.milestones?.map((milestone) => ({
      id: milestone.id as string,
      title: milestone.title,
      description: milestone.description,
      targetDate: milestone.targetDate?.toISOString(),
      isCompleted: milestone.isCompleted,
      completedDate: milestone.completedDate?.toISOString(),
      notes: milestone.notes,
    })) ?? [];
  const mapDataPoints =
    goal.dataPoints?.map((point) => ({
      id: point.id as string,
      timestamp: point.timestamp.toISOString(),
      value: point.value,
      notes: point.notes,
      collectedBy: point.collectedBy,
    })) ?? [];
  return {
    id: goal.id,
    studentId: goal.studentId,
    title: goal.title,
    description: goal.description,
    category: goal.category,
    targetDate: goal.targetDate ? goal.targetDate.toISOString() : undefined,
    status: goal.status,
    measurableObjective: goal.measurableObjective,
    progressPercent:
      typeof goal.progress === 'number'
        ? goal.progress
        : typeof goal.currentProgress === 'number'
          ? goal.currentProgress
          : 0,
    currentProgress: goal.currentProgress,
    baselineValue: goal.baselineValue,
    targetValue: goal.targetValue,
    dataPoints: mapDataPoints,
    milestones: mapMilestones,
    interventions: goal.interventions,
    notes: goal.notes,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
};

export const convertLocalGoalToLegacy = (goal: LocalGoal): LegacyGoal => {
  const createdAt = new Date(goal.createdAt);
  const updatedAt = new Date(goal.updatedAt);
  const targetDate = goal.targetDate ? new Date(goal.targetDate) : undefined;
  return {
    id: goal.id,
    studentId: goal.studentId,
    title: goal.title,
    description: goal.description ?? '',
    category: goal.category,
    targetDate: targetDate ?? updatedAt,
    createdDate: createdAt,
    updatedAt,
    status: goal.status ?? 'active',
    measurableObjective: goal.measurableObjective ?? goal.title,
    currentProgress: goal.currentProgress ?? goal.progressPercent ?? 0,
    progress: goal.progressPercent ?? goal.currentProgress ?? 0,
    milestones:
      goal.milestones?.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        targetDate: milestone.targetDate ? new Date(milestone.targetDate) : undefined,
        isCompleted: milestone.isCompleted ?? false,
        completedDate: milestone.completedDate ? new Date(milestone.completedDate) : undefined,
        notes: milestone.notes,
      })) ?? [],
    interventions: goal.interventions ?? [],
    baselineValue: goal.baselineValue ?? 0,
    targetValue: goal.targetValue ?? 100,
    dataPoints:
      goal.dataPoints?.map((point) => ({
        id: point.id,
        timestamp: new Date(point.timestamp),
        value: point.value,
        notes: point.notes,
        collectedBy: point.collectedBy,
      })) ?? [],
    notes: goal.notes,
  };
};

const mapLegacyAlertTypeToLocal = (type: LegacyAlert['type']): LocalAlert['type'] => {
  if (type === 'correlation') return 'pattern';
  if (type === 'environmental' || type === 'achievement' || type === 'pattern' || type === 'regression')
    return type;
  return 'pattern';
};

const mapLegacyAlertPriorityToLocal = (priority: LegacyAlert['priority']): LocalAlert['priority'] => {
  if (priority === 'urgent') return 'high';
  if (priority === 'low' || priority === 'medium' || priority === 'high') return priority;
  return 'medium';
};

export const convertLegacyAlertToLocal = (alert: LegacyAlert): LocalAlert => ({
  id: alert.id,
  studentId: alert.studentId,
  type: mapLegacyAlertTypeToLocal(alert.type),
  priority: mapLegacyAlertPriorityToLocal(alert.priority),
  title: alert.title,
  message: alert.description ?? alert.title,
  createdAt: alert.timestamp.toISOString(),
  readAt: alert.isRead ? alert.timestamp.toISOString() : alert.resolvedDate?.toISOString(),
});

export const convertLocalAlertToLegacy = (alert: LocalAlert): LegacyAlert => ({
  id: alert.id,
  studentId: alert.studentId,
  type: alert.type,
  priority: alert.priority,
  title: alert.title,
  description: alert.message,
  trigger: alert.title,
  timestamp: new Date(alert.createdAt),
  isRead: Boolean(alert.readAt),
  isResolved: Boolean(alert.readAt),
  resolvedDate: alert.readAt ? new Date(alert.readAt) : undefined,
  resolvedBy: undefined,
  actionItems: [],
  relatedData: {},
});



