import { describe, it, expect } from 'vitest';
import {
  // Type guards
  isWorkerRequestMessage,
  isInsightsComputeRequest,
  isCacheControlRequest,
  isCacheClearAllRequest,
  isCacheClearStudentRequest,
  isCacheClearPatternsRequest,
  isGameEventRequest,
  isGameSessionSummaryRequest,
  isLegacyAnalyticsDataRequest,
  isWorkerResponseMessage,
  isProgressResponse,
  isPartialResponse,
  isCompleteResponse,
  isErrorResponse,
  isAlertsResponse,
  isCacheClearDoneResponse,
  // Helpers
  parseWorkerRequest,
  parseWorkerResponse,
  // Types
  type InsightsComputeRequest,
  type CacheClearAllRequest,
  type CacheClearStudentRequest,
  type CacheClearPatternsRequest,
  type GameEventRequest,
  type GameSessionSummaryRequest,
  type LegacyAnalyticsDataRequest,
  type ProgressResponse,
  type PartialResponse,
  type CompleteResponse,
  type ErrorResponse,
  type AlertsResponse,
  type CacheClearDoneResponse,
} from '../worker-messages';

describe('Worker Message Types', () => {
  describe('Request Message Type Guards', () => {
    describe('isWorkerRequestMessage', () => {
      it('returns false for null and undefined', () => {
        expect(isWorkerRequestMessage(null)).toBe(false);
        expect(isWorkerRequestMessage(undefined)).toBe(false);
      });

      it('returns false for primitives', () => {
        expect(isWorkerRequestMessage(42)).toBe(false);
        expect(isWorkerRequestMessage('string')).toBe(false);
        expect(isWorkerRequestMessage(true)).toBe(false);
      });

      it('returns false for empty objects', () => {
        expect(isWorkerRequestMessage({})).toBe(false);
      });

      it('returns true for InsightsComputeRequest', () => {
        const msg: InsightsComputeRequest = {
          type: 'Insights/Compute',
          payload: {
            inputs: {
              entries: [],
              emotions: [],
              sensoryInputs: [],
            },
          },
          cacheKey: 'test-key',
        };
        expect(isWorkerRequestMessage(msg)).toBe(true);
      });

      it('returns true for cache control messages', () => {
        expect(isWorkerRequestMessage({ type: 'CACHE/CLEAR_ALL' })).toBe(true);
        expect(isWorkerRequestMessage({ type: 'CACHE/CLEAR_STUDENT', studentId: 'test' })).toBe(
          true,
        );
        expect(isWorkerRequestMessage({ type: 'CACHE/CLEAR_PATTERNS' })).toBe(true);
      });

      it('returns true for game event messages', () => {
        expect(
          isWorkerRequestMessage({
            type: 'game:event',
            payload: { kind: 'start', ts: Date.now() },
          }),
        ).toBe(true);
        expect(isWorkerRequestMessage({ type: 'game:session_summary', payload: {} })).toBe(true);
      });

      it('returns true for legacy AnalyticsData structure', () => {
        const msg: LegacyAnalyticsDataRequest = {
          entries: [],
          emotions: [],
          sensoryInputs: [],
        };
        expect(isWorkerRequestMessage(msg)).toBe(true);
      });

      it('returns false for objects with type field but unknown type', () => {
        expect(isWorkerRequestMessage({ type: 'UNKNOWN_TYPE' })).toBe(false);
      });
    });

    describe('isInsightsComputeRequest', () => {
      const validMsg: InsightsComputeRequest = {
        type: 'Insights/Compute',
        payload: {
          inputs: {
            entries: [],
            emotions: [],
            sensoryInputs: [],
          },
        },
        cacheKey: 'test-key',
      };

      it('returns true for valid InsightsComputeRequest', () => {
        expect(isInsightsComputeRequest(validMsg)).toBe(true);
      });

      it('returns false for other message types', () => {
        const cacheMsg: CacheClearAllRequest = { type: 'CACHE/CLEAR_ALL' };
        expect(isInsightsComputeRequest(cacheMsg as any)).toBe(false);
      });

      it('handles optional fields', () => {
        const msgWithOptionals: InsightsComputeRequest = {
          ...validMsg,
          ttlSeconds: 300,
          payload: {
            ...validMsg.payload,
            prewarm: true,
            config: {} as any,
          },
        };
        expect(isInsightsComputeRequest(msgWithOptionals)).toBe(true);
      });
    });

    describe('Cache Control Type Guards', () => {
      it('isCacheControlRequest identifies all cache messages', () => {
        expect(isCacheControlRequest({ type: 'CACHE/CLEAR_ALL' } as any)).toBe(true);
        expect(
          isCacheControlRequest({ type: 'CACHE/CLEAR_STUDENT', studentId: 'test' } as any),
        ).toBe(true);
        expect(isCacheControlRequest({ type: 'CACHE/CLEAR_PATTERNS' } as any)).toBe(true);
        expect(isCacheControlRequest({ type: 'game:event', payload: {} } as any)).toBe(false);
      });

      it('isCacheClearAllRequest validates correctly', () => {
        const msg: CacheClearAllRequest = { type: 'CACHE/CLEAR_ALL' };
        expect(isCacheClearAllRequest(msg)).toBe(true);
        expect(
          isCacheClearAllRequest({ type: 'CACHE/CLEAR_STUDENT', studentId: 'test' } as any),
        ).toBe(false);
      });

      it('isCacheClearStudentRequest validates studentId', () => {
        const validMsg: CacheClearStudentRequest = {
          type: 'CACHE/CLEAR_STUDENT',
          studentId: 'student-123',
        };
        expect(isCacheClearStudentRequest(validMsg)).toBe(true);

        // Missing studentId
        expect(isCacheClearStudentRequest({ type: 'CACHE/CLEAR_STUDENT' } as any)).toBe(false);
        // Invalid studentId type
        expect(
          isCacheClearStudentRequest({ type: 'CACHE/CLEAR_STUDENT', studentId: 123 } as any),
        ).toBe(false);
      });

      it('isCacheClearPatternsRequest validates correctly', () => {
        const msg: CacheClearPatternsRequest = { type: 'CACHE/CLEAR_PATTERNS' };
        expect(isCacheClearPatternsRequest(msg)).toBe(true);
        expect(isCacheClearPatternsRequest({ type: 'CACHE/CLEAR_ALL' } as any)).toBe(false);
      });
    });

    describe('Game Event Type Guards', () => {
      it('isGameEventRequest validates correctly', () => {
        const validMsg: GameEventRequest = {
          type: 'game:event',
          payload: { kind: 'round_complete', ts: Date.now() },
        };
        expect(isGameEventRequest(validMsg)).toBe(true);

        // Missing payload
        expect(isGameEventRequest({ type: 'game:event' } as any)).toBe(false);
      });

      it('isGameSessionSummaryRequest validates correctly', () => {
        const validMsg: GameSessionSummaryRequest = {
          type: 'game:session_summary',
          payload: { score: 100, duration: 60 },
        };
        expect(isGameSessionSummaryRequest(validMsg)).toBe(true);

        // Missing payload
        expect(isGameSessionSummaryRequest({ type: 'game:session_summary' } as any)).toBe(false);
      });
    });

    describe('isLegacyAnalyticsDataRequest', () => {
      it('identifies legacy AnalyticsData structure', () => {
        const validMsg: LegacyAnalyticsDataRequest = {
          entries: [{ id: '1', studentId: 'test' } as any],
          emotions: [],
          sensoryInputs: [],
        };
        expect(isLegacyAnalyticsDataRequest(validMsg)).toBe(true);
      });

      it('rejects messages with type field', () => {
        const msgWithType = {
          type: 'some-type',
          entries: [],
          emotions: [],
          sensoryInputs: [],
        };
        expect(isLegacyAnalyticsDataRequest(msgWithType as any)).toBe(false);
      });

      it('validates array fields', () => {
        // Missing required arrays
        expect(isLegacyAnalyticsDataRequest({ entries: [] } as any)).toBe(false);

        // Non-array fields
        expect(
          isLegacyAnalyticsDataRequest({
            entries: 'not-array',
            emotions: [],
            sensoryInputs: [],
          } as any),
        ).toBe(false);
      });

      it('allows optional fields', () => {
        const msgWithOptionals: LegacyAnalyticsDataRequest = {
          entries: [],
          emotions: [],
          sensoryInputs: [],
          goals: [],
          cacheKey: 'test',
          config: {} as any,
        };
        expect(isLegacyAnalyticsDataRequest(msgWithOptionals)).toBe(true);
      });
    });
  });

  describe('Response Message Type Guards', () => {
    describe('isWorkerResponseMessage', () => {
      it('returns false for null and undefined', () => {
        expect(isWorkerResponseMessage(null)).toBe(false);
        expect(isWorkerResponseMessage(undefined)).toBe(false);
      });

      it('returns false for objects without type field', () => {
        expect(isWorkerResponseMessage({})).toBe(false);
        expect(isWorkerResponseMessage({ payload: {} })).toBe(false);
      });

      it('returns true for all response message types', () => {
        expect(isWorkerResponseMessage({ type: 'progress' })).toBe(true);
        expect(isWorkerResponseMessage({ type: 'partial' })).toBe(true);
        expect(isWorkerResponseMessage({ type: 'complete', payload: {} as any })).toBe(true);
        expect(isWorkerResponseMessage({ type: 'error', error: 'test' })).toBe(true);
        expect(isWorkerResponseMessage({ type: 'alerts', payload: { alerts: [] } })).toBe(true);
        expect(
          isWorkerResponseMessage({ type: 'CACHE/CLEAR_DONE', payload: { scope: 'all' } }),
        ).toBe(true);
      });

      it('returns false for unknown message types', () => {
        expect(isWorkerResponseMessage({ type: 'unknown' })).toBe(false);
      });
    });

    describe('Specific Response Type Guards', () => {
      it('isProgressResponse validates correctly', () => {
        const msg: ProgressResponse = {
          type: 'progress',
          progress: { stage: 'start', percent: 5 },
        };
        expect(isProgressResponse(msg)).toBe(true);
        expect(isProgressResponse({ type: 'partial' } as any)).toBe(false);
      });

      it('isPartialResponse validates correctly', () => {
        const msg: PartialResponse = {
          type: 'partial',
          payload: { patterns: [], insights: [] },
          chartsUpdated: ['patternHighlights'],
        };
        expect(isPartialResponse(msg)).toBe(true);
        expect(isPartialResponse({ type: 'complete', payload: {} as any } as any)).toBe(false);
      });

      it('isCompleteResponse validates correctly', () => {
        const msg: CompleteResponse = {
          type: 'complete',
          payload: {
            patterns: [],
            correlations: [],
            predictiveInsights: [],
            anomalies: [],
            insights: [],
            suggestedInterventions: [],
          },
        };
        expect(isCompleteResponse(msg)).toBe(true);
        expect(isCompleteResponse({ type: 'partial' } as any)).toBe(false);
      });

      it('isErrorResponse validates correctly', () => {
        const msg: ErrorResponse = {
          type: 'error',
          error: 'Something went wrong',
        };
        expect(isErrorResponse(msg)).toBe(true);
        expect(isErrorResponse({ type: 'complete', payload: {} as any } as any)).toBe(false);
      });

      it('isAlertsResponse validates correctly', () => {
        const msg: AlertsResponse = {
          type: 'alerts',
          payload: {
            alerts: [{ id: '1', type: 'warning' } as any],
            studentId: 'test',
          },
        };
        expect(isAlertsResponse(msg)).toBe(true);
        expect(isAlertsResponse({ type: 'progress' } as any)).toBe(false);
      });

      it('isCacheClearDoneResponse validates correctly', () => {
        const msg: CacheClearDoneResponse = {
          type: 'CACHE/CLEAR_DONE',
          payload: {
            scope: 'all',
            patternsCleared: 10,
            cacheCleared: 5,
          },
        };
        expect(isCacheClearDoneResponse(msg)).toBe(true);
        expect(isCacheClearDoneResponse({ type: 'complete', payload: {} as any } as any)).toBe(
          false,
        );
      });
    });
  });

  describe('Helper Functions', () => {
    describe('parseWorkerRequest', () => {
      it('returns valid message when input is valid', () => {
        const validMsg: InsightsComputeRequest = {
          type: 'Insights/Compute',
          payload: {
            inputs: {
              entries: [],
              emotions: [],
              sensoryInputs: [],
            },
          },
          cacheKey: 'test',
        };
        const result = parseWorkerRequest(validMsg);
        expect(result).toEqual(validMsg);
      });

      it('returns null for invalid messages', () => {
        expect(parseWorkerRequest(null)).toBeNull();
        expect(parseWorkerRequest(undefined)).toBeNull();
        expect(parseWorkerRequest({})).toBeNull();
        expect(parseWorkerRequest({ type: 'unknown' })).toBeNull();
        expect(parseWorkerRequest(42)).toBeNull();
      });

      it('handles legacy AnalyticsData structure', () => {
        const legacyMsg: LegacyAnalyticsDataRequest = {
          entries: [],
          emotions: [],
          sensoryInputs: [],
        };
        const result = parseWorkerRequest(legacyMsg);
        expect(result).toEqual(legacyMsg);
      });
    });

    describe('parseWorkerResponse', () => {
      it('returns valid message when input is valid', () => {
        const validMsg: ProgressResponse = {
          type: 'progress',
          progress: { stage: 'start', percent: 5 },
        };
        const result = parseWorkerResponse(validMsg);
        expect(result).toEqual(validMsg);
      });

      it('returns null for invalid messages', () => {
        expect(parseWorkerResponse(null)).toBeNull();
        expect(parseWorkerResponse(undefined)).toBeNull();
        expect(parseWorkerResponse({})).toBeNull();
        expect(parseWorkerResponse({ type: 'unknown' })).toBeNull();
        expect(parseWorkerResponse('string')).toBeNull();
      });

      it('validates all response types', () => {
        const messages = [
          { type: 'progress', progress: { stage: 'test', percent: 50 } },
          { type: 'partial', payload: {} },
          {
            type: 'complete',
            payload: {
              patterns: [],
              correlations: [],
              predictiveInsights: [],
              anomalies: [],
              insights: [],
              suggestedInterventions: [],
            },
          },
          { type: 'error', error: 'test error' },
          { type: 'alerts', payload: { alerts: [] } },
          { type: 'CACHE/CLEAR_DONE', payload: { scope: 'all' } },
        ];

        messages.forEach((msg) => {
          expect(parseWorkerResponse(msg)).toEqual(msg);
        });
      });
    });
  });

  describe('Type Safety Integration', () => {
    it('narrowing works correctly with type guards', () => {
      const msg: InsightsComputeRequest = {
        type: 'Insights/Compute',
        payload: {
          inputs: {
            entries: [],
            emotions: [],
            sensoryInputs: [],
          },
        },
        cacheKey: 'test',
      };

      if (isInsightsComputeRequest(msg)) {
        // TypeScript should narrow type here
        expect(msg.payload.inputs).toBeDefined();
        expect(msg.cacheKey).toBe('test');
      }
    });

    it('discriminated union works for response messages', () => {
      const progressMsg: ProgressResponse = {
        type: 'progress',
        progress: { stage: 'start', percent: 5 },
      };
      const completeMsg: CompleteResponse = {
        type: 'complete',
        payload: {
          patterns: [],
          correlations: [],
          predictiveInsights: [],
          anomalies: [],
          insights: [],
          suggestedInterventions: [],
        },
      };

      expect(isProgressResponse(progressMsg)).toBe(true);
      expect(isCompleteResponse(progressMsg)).toBe(false);
      expect(isCompleteResponse(completeMsg)).toBe(true);
      expect(isProgressResponse(completeMsg)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('handles messages with extra fields', () => {
      const msgWithExtra = {
        type: 'progress',
        progress: { stage: 'test', percent: 50 },
        extraField: 'should be ignored',
        anotherExtra: 123,
      };

      expect(isWorkerResponseMessage(msgWithExtra)).toBe(true);
      expect(isProgressResponse(msgWithExtra as any)).toBe(true);
    });

    it('handles cache message scope variations', () => {
      const allScope: CacheClearDoneResponse = {
        type: 'CACHE/CLEAR_DONE',
        payload: { scope: 'all', cacheCleared: 10 },
      };
      const studentScope: CacheClearDoneResponse = {
        type: 'CACHE/CLEAR_DONE',
        payload: { scope: 'student', studentId: 'test', cacheCleared: 5 },
      };
      const patternsScope: CacheClearDoneResponse = {
        type: 'CACHE/CLEAR_DONE',
        payload: { scope: 'patterns', patternsCleared: 3 },
      };

      expect(isCacheClearDoneResponse(allScope)).toBe(true);
      expect(isCacheClearDoneResponse(studentScope)).toBe(true);
      expect(isCacheClearDoneResponse(patternsScope)).toBe(true);
    });

    it('handles prewarm flag in different message types', () => {
      const insightsWithPrewarm: InsightsComputeRequest = {
        type: 'Insights/Compute',
        payload: {
          inputs: { entries: [], emotions: [], sensoryInputs: [] },
          prewarm: true,
        },
        cacheKey: 'test',
      };

      const completeWithPrewarm: CompleteResponse = {
        type: 'complete',
        payload: {
          patterns: [],
          correlations: [],
          predictiveInsights: [],
          anomalies: [],
          insights: [],
          suggestedInterventions: [],
          prewarm: true,
        },
      };

      expect(isInsightsComputeRequest(insightsWithPrewarm)).toBe(true);
      expect(isCompleteResponse(completeWithPrewarm)).toBe(true);
    });
  });
});
