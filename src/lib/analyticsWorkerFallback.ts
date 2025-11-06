/**
 * Fallback implementation for analytics when web workers are not available
 * This runs in the main thread but with throttling to prevent UI blocking
 */

import { AnalyticsData, AnalyticsResults } from '@/types/analytics';
import { patternAnalysis } from '@/lib/patternAnalysis';
import { enhancedPatternAnalysis } from '@/lib/enhancedPatternAnalysis';
import { logger } from '@/lib/logger';
import type { Student } from '@/types/student';
import { analyticsManager } from '@/lib/analyticsManager';
import { AlertDetectionEngine } from '@/lib/alerts/engine';
import { BaselineService } from '@/lib/alerts/baseline';
import type { AlertEvent, ThresholdAdjustmentTrace } from '@/lib/alerts/types';
import { AlertTelemetryService } from '@/lib/alerts/telemetry';
import { safeGet, safeSet } from '@/lib/storage';

export class AnalyticsWorkerFallback {
  private isProcessing = false;
  private queue: Array<{
    data: AnalyticsData;
    options?: { useAI?: boolean; student?: Student };
    resolve: (value: AnalyticsResults) => void;
    reject: (error: Error) => void;
  }> = [];
  private readonly baselineService: BaselineService;
  private readonly alertEngine: AlertDetectionEngine;
  private readonly telemetry: AlertTelemetryService;

  constructor(opts?: { baselineService?: BaselineService; telemetry?: AlertTelemetryService }) {
    this.baselineService = opts?.baselineService ?? new BaselineService();
    this.alertEngine = new AlertDetectionEngine({ baselineService: this.baselineService });
    this.telemetry = opts?.telemetry ?? new AlertTelemetryService();
  }

  async processAnalytics(data: AnalyticsData, options?: { useAI?: boolean; student?: Student }): Promise<AnalyticsResults> {
    return new Promise((resolve, reject) => {
      this.queue.push({ data, options, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const { data, options, resolve, reject } = this.queue.shift()!;

    try {
      // Process in chunks to avoid blocking UI
      await new Promise(resolve => setTimeout(resolve, 0));

      // If explicit AI preference provided, route through analyticsManager to respect runtime override
      if (options && typeof options.useAI === 'boolean') {
        try {
          const student: Student | undefined = options.student ?? this.deriveStudentFromData(data);
          if (!student) {
            throw new Error('Missing student context for manager-based analytics');
          }
          try {
            logger.debug('[analyticsWorkerFallback] Routing to analyticsManager with runtime useAI', { useAI: options.useAI, studentId: student.id });
          } catch {
            /* ignore logging errors */
          }
          const managerResults = await analyticsManager.getStudentAnalytics(student, { useAI: options.useAI });
          resolve(managerResults as AnalyticsResults);
          return;
        } catch (e) {
          logger.error('Fallback: Manager-based analytics failed; continuing with local processing', e);
          // fall through to local processing as a safe fallback
        }
      }
      
      const results: AnalyticsResults = {
        patterns: [],
        correlations: [],
        environmentalCorrelations: [], // Initialize with empty array
        predictiveInsights: [],
        anomalies: [],
        insights: [],
        // Required by AnalyticsResults: always present, defaults to empty array
        // Ensures consistent result shape across all analytics paths
        suggestedInterventions: []
      };

      // Basic pattern analysis (simplified version)
      if (data.emotions.length > 0) {
        try {
          const emotionPatterns = patternAnalysis.analyzeEmotionPatterns(data.emotions, 30);
          results.patterns.push(...emotionPatterns);
        } catch (e) {
          logger.error('Fallback: Error analyzing emotion patterns', e);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI

      if (data.sensoryInputs.length > 0) {
        try {
          const sensoryPatterns = patternAnalysis.analyzeSensoryPatterns(data.sensoryInputs, 30);
          results.patterns.push(...sensoryPatterns);
        } catch (e) {
          logger.error('Fallback: Error analyzing sensory patterns', e);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI

      if (data.entries.length > 2) {
        try {
          const correlations = patternAnalysis.analyzeEnvironmentalCorrelations(data.entries);
          results.correlations = correlations;
          results.environmentalCorrelations = correlations; // Also populate environmentalCorrelations
        } catch (e) {
          logger.error('Fallback: Error analyzing correlations', e);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI

      // Enhanced analysis - predictive insights and anomaly detection
      if (data.entries.length > 1) {
        try {
          const predictiveInsights = await enhancedPatternAnalysis.generatePredictiveInsights(
            data.emotions,
            data.sensoryInputs,
            data.entries,
            data.goals ?? []
          );
          results.predictiveInsights = predictiveInsights;
        } catch (e) {
          logger.error('Fallback: Error generating predictive insights', e);
        }

        await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI

        try {
          const anomalies = enhancedPatternAnalysis.detectAnomalies(
            data.emotions,
            data.sensoryInputs,
            data.entries
          );
          results.anomalies = anomalies;
        } catch (e) {
          logger.error('Fallback: Error detecting anomalies', e);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI before detection

      try {
        const detectionAlerts = this.runAlertDetection(data);
        if (detectionAlerts.length) {
          const studentId = this.extractStudentId(data);
          if (studentId) {
            this.persistAlerts(studentId, detectionAlerts);
          }
        }
      } catch (e) {
        logger.warn('Fallback: Alert detection step failed', e);
      }

      // Generate basic insights
      if (data.entries.length < 5) {
        results.insights.push(
          `Limited data available (${data.entries.length} sessions). Continue collecting data for better insights.`
        );
      } else {
        results.insights.push(
          'Analytics processed successfully. Continue collecting data for more detailed patterns.'
        );
      }

      resolve(results);
    } catch (error) {
      logger.error('Fallback analytics failed', error);
      reject(error instanceof Error ? error : new Error('Analytics processing failed'));
    } finally {
      this.isProcessing = false;
      // Process next item in queue
      setTimeout(() => this.processQueue(), 100);
    }
  }

  private extractStudentId(data: AnalyticsData): string | null {
    return (
      data.entries?.[0]?.studentId ||
      data.emotions?.[0]?.studentId ||
      data.sensoryInputs?.[0]?.studentId ||
      null
    );
  }

  private runAlertDetection(data: AnalyticsData): AlertEvent[] {
    const studentId = this.extractStudentId(data);
    if (!studentId) return [];
    try {
      const baseline = this.baselineService.updateBaseline({
        studentId,
        emotions: data.emotions,
        sensory: data.sensoryInputs,
        tracking: data.entries,
      });
      return this.alertEngine.runDetection({
        studentId,
        emotions: data.emotions,
        sensory: data.sensoryInputs,
        tracking: data.entries,
        baseline,
        now: new Date(),
      });
    } catch (error) {
      logger.warn('Fallback: alert detection failed', error);
      return [];
    }
  }

  private persistAlerts(studentId: string, alerts: AlertEvent[]): void {
    if (!alerts.length) return;
    try {
      const existing = this.loadAlerts(studentId);
      const existingMap = new Map(existing.map((alert) => [alert.id, alert] as const));
      const combined = new Map<string, AlertEvent>();
      existing.forEach((alert) => combined.set(alert.id, alert));
      alerts.forEach((alert) => combined.set(alert.id, alert));
      const newAlerts = alerts.filter((alert) => !existingMap.has(alert.id));
      const merged = Array.from(combined.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      safeSet(this.alertsKey(studentId), JSON.stringify(merged));

      newAlerts.forEach((alert) => {
        try {
          const metadata = (alert.metadata ?? {}) as Record<string, unknown>;
          const thresholdAdjustments = metadata.thresholdTrace as Record<string, ThresholdAdjustmentTrace> | undefined;
          this.telemetry.logAlertCreated(alert, {
            predictedRelevance: alert.confidence,
            detectorTypes: (metadata.detectorTypes as string[]) ?? undefined,
            experimentKey: typeof metadata.experimentKey === 'string' ? metadata.experimentKey : undefined,
            experimentVariant: typeof metadata.experimentVariant === 'string' ? metadata.experimentVariant : undefined,
            thresholdAdjustments,
            metadataSnapshot: alert.metadata,
          });
        } catch (error) {
          logger.warn('Fallback: failed to log alert telemetry', error);
        }
      });

      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('alerts:updated', { detail: { studentId } }));
        } catch {
          // ignore dispatch failures (e.g., server-side)
        }
      }
    } catch (error) {
      logger.warn('Fallback: failed to persist alerts', error);
    }
  }

  private loadAlerts(studentId: string): AlertEvent[] {
    try {
      const raw = safeGet(this.alertsKey(studentId));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as AlertEvent[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private alertsKey(studentId: string): string {
    return `alerts:list:${studentId}`;
  }

  private deriveStudentFromData(data: AnalyticsData): Student | undefined {
    try {
      const id =
        data.entries?.[0]?.studentId ||
        data.emotions?.[0]?.studentId ||
        data.sensoryInputs?.[0]?.studentId ||
        undefined;
      if (!id) return undefined;
      // Minimal student object; name and createdAt are placeholders when not available
      return {
        id,
        name: 'Student',
        createdAt: new Date(),
      } as Student;
    } catch {
      return undefined;
    }
  }
}

export const analyticsWorkerFallback = new AnalyticsWorkerFallback();
