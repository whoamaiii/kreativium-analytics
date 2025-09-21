import { TrackingEntry, EmotionEntry, SensoryEntry } from "@/types/student";
import { AnalyticsData } from "@/workers/analytics.worker";
import { subDays, startOfDay } from "date-fns";
import { analyticsConfig } from '@/lib/analyticsConfig';
import type { PrecomputationConfig } from '@/lib/analyticsConfig';
import { deviceConstraints } from '@/lib/deviceConstraints';
import { logger } from '@/lib/logger';

interface PrecomputationTask {
  id: string;
  data: AnalyticsData;
  priority: number;
  timestamp: Date;
}

/**
 * AnalyticsPrecomputationManager handles background pre-computation of common analytics queries
 * to improve performance by having results ready when users need them
 */
export class AnalyticsPrecomputationManager {
  private overrides: Partial<PrecomputationConfig>;
  private taskQueue: PrecomputationTask[] = [];
  private isProcessing = false;
  private idleCallbackId: number | null = null;
  private processedTasks = new Set<string>();
  private onAnalyze: (data: AnalyticsData) => void;
  private lastScheduleAt: number = 0;
  private schedulingInFlight = false;

  constructor(
    onAnalyze: (data: AnalyticsData) => void,
    config: Partial<PrecomputationConfig> = {}
  ) {
    this.onAnalyze = onAnalyze;
    this.overrides = { ...config };
  }

  private getConfig(): PrecomputationConfig {
    try {
      const live = analyticsConfig.getConfig();
      return { ...(live.precomputation as PrecomputationConfig), ...(this.overrides || {}) };
    } catch {
      // Reasonable defaults in case of runtime access issues
      return {
        enabled: true,
        enableOnBattery: false,
        enableOnSlowNetwork: false,
        maxQueueSize: 50,
        batchSize: 5,
        idleTimeout: 5000,
        respectBatteryLevel: true,
        respectCPUUsage: true,
        respectNetworkConditions: true,
        commonTimeframes: [7, 14, 30],
        prioritizeRecentStudents: true,
        maxConcurrentTasks: 1,
        taskStaggerDelay: 100,
        maxPrecomputeTime: 16,
        precomputeOnlyWhenIdle: true,
        pauseOnUserActivity: true,
      };
    }
  }

  /**
   * Schedule precomputation based on current student data
   */
  schedulePrecomputation(
    allEntries: TrackingEntry[],
    allEmotions: EmotionEntry[],
    allSensoryInputs: SensoryEntry[]
  ): void {
    const cfg = this.getConfig();
    if (!cfg.enabled || this.isProcessing || this.schedulingInFlight) return;
    this.schedulingInFlight = true;

    // Clear existing queue
    this.taskQueue = [];

    // Get unique student IDs
    const studentIds = new Set<string>();
    allEntries.forEach(e => e.studentId && studentIds.add(e.studentId));
    allEmotions.forEach(e => e.studentId && studentIds.add(e.studentId));
    allSensoryInputs.forEach(s => s.studentId && studentIds.add(s.studentId));

    // Generate tasks for each student and timeframe
    studentIds.forEach(studentId => {
      cfg.commonTimeframes.forEach(days => {
        const task = this.createPrecomputationTask(
          studentId,
          days,
          allEntries,
          allEmotions,
          allSensoryInputs
        );
        
        if (task && !this.processedTasks.has(task.id)) {
          this.taskQueue.push(task);
        }
      });
    });

    // Also add combined analytics for all students
    cfg.commonTimeframes.forEach(days => {
      const task = this.createCombinedAnalyticsTask(
        days,
        allEntries,
        allEmotions,
        allSensoryInputs
      );
      
      if (task && !this.processedTasks.has(task.id)) {
        this.taskQueue.push(task);
      }
    });

    // Sort by priority (smaller timeframes first) and optionally prioritize recent students
    if (cfg.prioritizeRecentStudents) {
      const lastByStudent = new Map<string, number>();
      allEntries.forEach(e => {
        if (!e.studentId) return;
        const t = new Date(e.timestamp).getTime();
        const prev = lastByStudent.get(e.studentId) || 0;
        if (t > prev) lastByStudent.set(e.studentId, t);
      });
      const NOW = Date.now();
      const recentCutoff = NOW - 7 * 24 * 60 * 60 * 1000;
      this.taskQueue.sort((a, b) => {
        const aStudent = (a.id.startsWith('student:') ? a.id.split(':')[1] : null);
        const bStudent = (b.id.startsWith('student:') ? b.id.split(':')[1] : null);
        const aRecent = aStudent ? ((lastByStudent.get(aStudent) || 0) >= recentCutoff ? 0 : 1) : 2;
        const bRecent = bStudent ? ((lastByStudent.get(bStudent) || 0) >= recentCutoff ? 0 : 1) : 2;
        if (aRecent !== bRecent) return aRecent - bRecent; // recent students first
        return a.priority - b.priority;
      });
    } else {
      this.taskQueue.sort((a, b) => a.priority - b.priority);
    }

    // Limit queue size
    if (this.taskQueue.length > cfg.maxQueueSize) {
      this.taskQueue = this.taskQueue.slice(0, cfg.maxQueueSize);
    }

    // Schedule processing during idle time
    this.scheduleIdleProcessing();
    this.lastScheduleAt = Date.now();
    this.schedulingInFlight = false;
  }

  /**
   * Create a precomputation task for a specific student and timeframe
   */
  private createPrecomputationTask(
    studentId: string,
    days: number,
    allEntries: TrackingEntry[],
    allEmotions: EmotionEntry[],
    allSensoryInputs: SensoryEntry[]
  ): PrecomputationTask | null {
    const cutoffDate = subDays(new Date(), days);
    
    // Filter data for this student and timeframe
    const entries = allEntries.filter(e => 
      e.studentId === studentId && e.timestamp >= cutoffDate
    );
    const emotions = allEmotions.filter(e => 
      e.studentId === studentId && e.timestamp >= cutoffDate
    );
    const sensoryInputs = allSensoryInputs.filter(s => 
      s.studentId === studentId && s.timestamp >= cutoffDate
    );

    // Skip if no data
    if (entries.length === 0 && emotions.length === 0 && sensoryInputs.length === 0) {
      return null;
    }

    const taskId = `student:${studentId}:days:${days}`;
    
    return {
      id: taskId,
      data: { entries, emotions, sensoryInputs },
      priority: days, // Smaller timeframes have higher priority
      timestamp: new Date()
    };
  }

  /**
   * Create a precomputation task for combined analytics
   */
  private createCombinedAnalyticsTask(
    days: number,
    allEntries: TrackingEntry[],
    allEmotions: EmotionEntry[],
    allSensoryInputs: SensoryEntry[]
  ): PrecomputationTask | null {
    const cutoffDate = subDays(new Date(), days);
    
    // Filter data for timeframe
    const entries = allEntries.filter(e => e.timestamp >= cutoffDate);
    const emotions = allEmotions.filter(e => e.timestamp >= cutoffDate);
    const sensoryInputs = allSensoryInputs.filter(s => s.timestamp >= cutoffDate);

    // Skip if no data
    if (entries.length === 0 && emotions.length === 0 && sensoryInputs.length === 0) {
      return null;
    }

    const taskId = `combined:days:${days}`;
    
    return {
      id: taskId,
      data: { entries, emotions, sensoryInputs },
      priority: days + 100, // Combined analytics have lower priority
      timestamp: new Date()
    };
  }

  /**
   * Schedule processing during idle time
   */
  private scheduleIdleProcessing(): void {
    if (this.idleCallbackId !== null) {
      cancelIdleCallback(this.idleCallbackId);
    }

    const cfg = this.getConfig();
    if ('requestIdleCallback' in window && cfg.precomputeOnlyWhenIdle) {
      this.idleCallbackId = requestIdleCallback(
        (deadline) => this.processQueue(deadline),
        { timeout: cfg.idleTimeout }
      );
    } else {
      // Fallback for browsers without requestIdleCallback or when allowed outside idle
      setTimeout(() => this.processQueue(), Math.max(250, cfg.idleTimeout));
    }
  }

  /**
   * Process queued tasks during idle time
   */
  private async processQueue(deadline?: IdleDeadline): Promise<void> {
    const cfg = this.getConfig();
    if (this.taskQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    // Respect device constraints
    try {
      const allowed = await deviceConstraints.canPrecompute(cfg);
      if (!allowed) {
        this.isProcessing = false;
        this.scheduleIdleProcessing();
        return;
      }
    } catch { /* noop */ }

    this.isProcessing = true;
    let processed = 0;
    const hardStopAt = Date.now() + Math.max(8, cfg.maxPrecomputeTime);
    const batchLimit = Math.max(1, Math.min(cfg.batchSize, cfg.maxConcurrentTasks));

    // Process tasks while we have time
    while (
      this.taskQueue.length > 0 && 
      processed < batchLimit &&
      (!deadline || deadline.timeRemaining() > 10)
    ) {
      if (Date.now() > hardStopAt) break;
      const task = this.taskQueue.shift();
      if (task) {
        try {
          this.onAnalyze(task.data);
          this.processedTasks.add(task.id);
        } catch (err) {
          try { logger.error('[PrecomputationManager] Task failed', err as Error); } catch { /* noop */ }
        }
        processed++;
      }
    }

    // Schedule next batch if there are more tasks
    if (this.taskQueue.length > 0) {
      this.scheduleIdleProcessing();
    } else {
      this.isProcessing = false;
    }
  }

  /**
   * Get common data queries for precomputation
   */
  static getCommonDataQueries(
    entries: TrackingEntry[],
    emotions: EmotionEntry[],
    sensoryInputs: SensoryEntry[]
  ): AnalyticsData[] {
    const queries: AnalyticsData[] = [];
    const now = new Date();

    // Common timeframes
    const timeframes = [
      { days: 7, label: 'week' },
      { days: 14, label: 'twoWeeks' },
      { days: 30, label: 'month' }
    ];

    timeframes.forEach(({ days }) => {
      const cutoffDate = subDays(now, days);
      
      queries.push({
        entries: entries.filter(e => e.timestamp >= cutoffDate),
        emotions: emotions.filter(e => e.timestamp >= cutoffDate),
        sensoryInputs: sensoryInputs.filter(s => s.timestamp >= cutoffDate)
      });
    });

    // Today's data as half-open interval [startOfDay, startOfNextDay)
    const todayStart = startOfDay(now);
    const todayEndExclusive = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    queries.push({
      entries: entries.filter(e => e.timestamp >= todayStart && e.timestamp < todayEndExclusive),
      emotions: emotions.filter(e => e.timestamp >= todayStart && e.timestamp < todayEndExclusive),
      sensoryInputs: sensoryInputs.filter(s => s.timestamp >= todayStart && s.timestamp < todayEndExclusive)
    });

    // High-activity periods (days with more than average activity)
    const dailyActivity = new Map<string, number>();
    entries.forEach(entry => {
      const dateKey = startOfDay(entry.timestamp).toISOString();
      dailyActivity.set(dateKey, (dailyActivity.get(dateKey) || 0) + 1);
    });

    const avgActivity = Array.from(dailyActivity.values()).reduce((a, b) => a + b, 0) / dailyActivity.size;
    const highActivityDays = Array.from(dailyActivity.entries())
      .filter(([_, count]) => count > avgActivity * 1.5)
      .map(([date]) => new Date(date));

    highActivityDays.slice(0, 3).forEach(date => {
      const dayStart = startOfDay(date);
      const dayEndExclusive = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      queries.push({
        entries: entries.filter(e => e.timestamp >= dayStart && e.timestamp < dayEndExclusive),
        emotions: emotions.filter(e => e.timestamp >= dayStart && e.timestamp < dayEndExclusive),
        sensoryInputs: sensoryInputs.filter(s => s.timestamp >= dayStart && s.timestamp < dayEndExclusive)
      });
    });

    return queries;
  }

  /**
   * Clear processed tasks cache
   */
  clearProcessedTasks(): void {
    this.processedTasks.clear();
  }

  /**
   * Stop all precomputation
   */
  stop(): void {
    const cfg = this.getConfig();
    this.overrides = { ...this.overrides, enabled: false };
    this.taskQueue = [];
    if (this.idleCallbackId !== null) {
      cancelIdleCallback(this.idleCallbackId);
      this.idleCallbackId = null;
    }
    this.isProcessing = false;
  }

  /**
   * Resume precomputation
   */
  resume(): void {
    this.overrides = { ...this.overrides, enabled: true };
  }

  /**
   * Get current status
   */
  getStatus(): {
    enabled: boolean;
    queueSize: number;
    isProcessing: boolean;
    processedCount: number;
  } {
    return {
      enabled: this.getConfig().enabled,
      queueSize: this.taskQueue.length,
      isProcessing: this.isProcessing,
      processedCount: this.processedTasks.size
    };
  }
}